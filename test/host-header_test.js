var expect = require('chai').expect;
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

// DEV: Regression test for https://github.com/uber/eight-track/issues/4
describe('A server that echoes HTTP headers', function () {
  serverUtils.run(1337, function (req, res) {
    res.send(req.headers);
  });
  serverUtils.runEightServer(1338, {
    fixtureDir: __dirname + '/actual-files/headers',
    url: 'http://localhost:1337'
  });

  describe('when requested with a `Host` header', function () {
    httpUtils.save({
      headers: {
        host: '127.0.0.1:9001'
      },
      url: 'http://localhost:1338/'
    });

    it('replies with a proper `Host` header', function () {
      expect(this.err).to.equal(null);
      expect(this.res.statusCode).to.equal(200);
      expect(JSON.parse(this.body)).to.have.property('host', 'localhost:1337');
    });

    it('does not affect the original header', function () {
      expect(this.res.req._headers).to.have.property('host', '127.0.0.1:9001');
    });

    describe('when requested again', function () {
      httpUtils.save({
        headers: {
          host: '127.0.0.1:9001'
        },
        url: 'http://localhost:1338/'
      });

      it('has the proper `Host` header', function () {
        expect(JSON.parse(this.body)).to.have.property('host', 'localhost:1337');
      });

      it('does not affect the original header', function () {
        expect(this.res.req._headers).to.have.property('host', '127.0.0.1:9001');
      });

      it('does not double request', function () {
        expect(this.requests[1337]).to.have.property('length', 1);
      });
    });
  });
});
