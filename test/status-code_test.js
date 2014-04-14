var expect = require('chai').expect;
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

describe('A failing server that is being proxied', function () {
  serverUtils.run(1337, function (req, res) {
    res.send('error', 500);
  });
  serverUtils.runEightServer(1338, {
    fixtureDir: __dirname + '/actual-files/status',
    url: 'http://localhost:1337'
  });

  describe('when requested', function () {
    httpUtils.save('http://localhost:1338/');

    it('replies with a 500 status code and its message', function () {
      expect(this.err).to.equal(null);
      expect(this.res.statusCode).to.equal(500);
      expect(this.body).to.equal('error');
    });

    describe('when requested again', function () {
      httpUtils.save('http://localhost:1338/');

      it('has the same status code', function () {
        expect(this.res.statusCode).to.equal(500);
      });

      it('does not double request', function () {
        expect(this.requests[1337]).to.have.property('length', 1);
      });
    });
  });
});
