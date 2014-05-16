var https = require('https');
var express = require('express');
var pem = require('pem');
var rimraf = require('rimraf');
var eightTrack = require('../../');

before(function () {
  this.requests = {};
});

// Helper for starting HTTP and HTTPS servers
exports._run = function (listenFn, port, middlewares) {
  var _app;
  before(function createRequestNamespace () {
    this.requests[port] = [];
  });
  before(function startServer () {
    // Save requests as they come in
    var app = express();
    var that = this;
    app.use(function (req, res, next) {
      that.requests[port].push(req);
      next();
    });

    // Use our middlewares and start listening
    if (!Array.isArray(middlewares)) {
      middlewares = [middlewares];
    }
    middlewares.forEach(function (middleware) {
      app.use(middleware);
    });
    _app = listenFn(app, port);
  });
  after(function deleteServer (done) {
    _app.close(done);
  });
};

// Start up an HTTP/HTTPS server
exports.run = function (port, middlewares) {
  exports._run(function startHttpServer (app, port) {
    return app.listen(port);
  }, port, middlewares);
};

exports.runHttps = function (port, middlewares) {
  // Generate an HTTPS certificate
  before(function generateCertificate (done) {
    pem.createCertificate({days: 1, selfSigned: true}, function saveCertificate (err, keys) {
      this.certificate = keys;
      done(err);
    });
  });
  after(function cleanupCertificate () {
    delete this.certificate;
  });

  // Start the HTTPS server with said certificate
  exports._run(function startHttpsServer (app, port) {
    var server = https.createServer({
      key: this.certificate.serviceKey,
      cert: this.certificate.certificate
    }, app);
    server.listen(port);
    return server;
  }, port, middlewares);
};

// Start an eight-track server
exports._cleanupEightTrack = function (fixtureDir) {
  after(function cleanupEightTrack (done) {
    rimraf(fixtureDir, done);
  });
};
exports.runEightServer = function (port, options) {
  exports.run(port, eightTrack(options));
  exports._cleanupEightTrack(options.fixtureDir);
};
