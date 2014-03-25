var fs = require('fs');
var assert = require('assert');
var async = require('async');
var request = require('request');
var eightTrack = require('../');
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

describe('A repeated request run 1000 times', function () {
  // Create 1MB long string to load
  var expectedStr = new Array(1e6).join('a');
  var fixtureDir = __dirname + '/actual-files/performance';

  // Prime the test data so it loads from disk
  serverUtils.run(1337, function (req, res) {
    res.send(expectedStr);
  });
  serverUtils.run(1338, eightTrack({
    fixtureDir: fixtureDir,
    url: 'http://localhost:1337'
  }));
  httpUtils.save('http://localhost:1338/');
  before(function () {
    assert.strictEqual(fs.readdirSync(fixtureDir).length, 1);
  });

  // Run our actual server
  serverUtils.runEightServer(1339, {
    fixtureDir: fixtureDir,
    url: 'http://localhost:1337'
  });

  before(function (done) {
    var that = this;
    this.startTime = Date.now();
    async.timesSeries(100, function (i, cb) {
      // Make a request
      request('http://localhost:1339/', function (err, res, body) {
        // If there was an error, callback with it
        if (err) {
          return cb(err);
        }

        // Otherwise, assert the body and callback
        assert.strictEqual(body, expectedStr);
        cb();
      });
    }, function (err) {
      that.endTime = Date.now();
      done(err);
    });
  });

  // DEV: This is Travis CI time for consistency
  it('takes no longer than 1800ms/100 to load', function () {
    var runTime = this.endTime - this.startTime;
    assert(runTime < 1800, 'Expected: < 1800, Actual: ' + runTime);
  });
});
