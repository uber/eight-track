var express = require('express');
var rimraf = require('rimraf');
var eightTrack = require('../../');

before(function () {
  this.requests = {};
});

exports.run = function (port, middlewares) {
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
    _app = app.listen(port);
  });
  after(function deleteServer (done) {
    _app.close(done);
  });
};

exports.runEightServer = function (port, options) {
  exports.run(port, eightTrack(options));
  after(function cleanupEightTrack (done) {
    rimraf(options.fixtureDir, done);
  });
};
