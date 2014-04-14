var expect = require('chai').expect;
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

// DEV: This is a regression test for https://github.com/uber/eight-track/issues/21
describe('A server being proxied by `eight-track` with a noramlizeFn that modifies a deep property', function () {
  serverUtils.run(1337, function (req, res) {
    res.send(req.headers);
  });
  serverUtils.runEightServer(1338, {
    fixtureDir: __dirname + '/actual-files/deep-normalize',
    url: 'http://localhost:1337',
    normalizeFn: function (info) {
      info.headers.hai = true;
      return info;
    }
  });

  describe('when requested', function () {
    httpUtils.save({
      url: 'http://localhost:1338/',
      followRedirect: false
    });

    it('the server does not receive the deep modification', function () {
      expect(this.err).to.equal(null);
      expect(this.res.statusCode).to.equal(200);
      expect(JSON.parse(this.body)).to.not.have.property('hai');
    });
  });
});
