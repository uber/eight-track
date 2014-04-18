var https = require('https');
var express = require('express');
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
    app.use(middlewares);
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
  exports._run(function startHttpServer (app, port) {
    var server = https.createServer(app);
    server.listen(port);
    return server;
  }, port, middlewares);
};

// Start an eight-track server
exports.runEightServer = function (port, options) {
  exports.run(port, eightTrack(options));
  after(function cleanupEightTrack (done) {
    rimraf(options.fixtureDir, done);
  });
};
