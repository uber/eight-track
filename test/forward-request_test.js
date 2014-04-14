var expect = require('chai').expect;
var rimraf = require('rimraf');
var eightTrack = require('../');
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

describe('An `eight-track` with a response modifier', function () {
  serverUtils.run(1337, function (req, res) {
    res.send('oh hai', 418);
  });
  var fixtureDir =  __dirname + '/actual-files/response-modifier';
  var _eightTrack = eightTrack({
    fixtureDir: fixtureDir,
    url: 'http://localhost:1337'
  });
  serverUtils.run(1338, function (req, res) {
    _eightTrack.forwardRequest(req, function (err, remoteRes, remoteBody) {
      res.send(remoteBody.replace('hai', 'haiii'), remoteRes.statusCode);
    });
  });
  after(function cleanupEightTrack (done) {
    rimraf(fixtureDir, done);
  });


  describe('receiving a request', function () {
    httpUtils.save({
      url: 'http://localhost:1338/'
    });

    it('responds through our modifier', function () {
      expect(this.err).to.equal(null);
      expect(this.res.statusCode).to.equal(418);
      expect(this.body).to.equal('oh haiii');
    });

    describe('when requested again', function () {
      httpUtils.save({
        url: 'http://localhost:1338/'
      });

      it('has the same header', function () {
        expect(this.body).to.equal('oh haiii');
      });

      it('does not double request', function () {
        expect(this.requests[1337]).to.have.property('length', 1);
      });
    });
  });
});
