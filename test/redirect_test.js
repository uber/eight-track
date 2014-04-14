var expect = require('chai').expect;
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

// DEV: This is a regression test for https://github.com/uber/eight-track/issues/18
describe('A server with redirect being proxied by `eight-track`', function () {
  serverUtils.run(1337, function (req, res) {
    if (req.url === '/') {
      res.redirect('/main');
    } else {
      res.send('oh hai');
    }
  });
  serverUtils.runEightServer(1338, {
    fixtureDir: __dirname + '/actual-files/redirect',
    url: 'http://localhost:1337'
  });

  describe('when a redirect route is requested', function () {
    httpUtils.save({
      url: 'http://localhost:1338/',
      followRedirect: false
    });

    it('replies with redirect information', function () {
      expect(this.err).to.equal(null);
      expect(this.res.statusCode).to.equal(302);
      expect(this.res.headers).to.have.property('location', '/main');
    });

    describe('when the rediect route is requested again', function () {
      httpUtils.save({
        url: 'http://localhost:1338/',
        followRedirect: false
      });

      it('replies with redirect information', function () {
        expect(this.err).to.equal(null);
        expect(this.res.statusCode).to.equal(302);
        expect(this.res.headers).to.have.property('location', '/main');
      });

      it('does not double request', function () {
        expect(this.requests[1337]).to.have.property('length', 1);
      });
    });

    describe('when the route is requested and follows redirects', function () {
      httpUtils.save({
        url: 'http://localhost:1338/'
      });

      it('receives main\'s content', function () {
        expect(this.err).to.equal(null);
        expect(this.res.statusCode).to.equal(200);
        expect(this.res.req).to.have.property('path', '/main');
        expect(this.body).to.equal('oh hai');
      });
    });
  });
});
