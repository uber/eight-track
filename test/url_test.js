var expect = require('chai').expect;
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

// TODO: Should we extend `query`?
// TODO: It feels like URL extension deserves to be its own node module

describe.only('An `eight-track` server with a subpath', function () {
  serverUtils.run(1337, function (req, res) {
    res.send(req.url);
  });
  serverUtils.runEightServer(1338, {
    fixtureDir: __dirname + '/actual-files/redirect',
    url: 'http://localhost:1337/hello'
  });

  describe('when requested with a path', function () {
    httpUtils.save('http://localhost:1338/world');

    it('concatenates the path', function () {
      expect(this.err).to.equal(null);
      expect(this.body).to.equal('/hello/world');
    });
  });
});

describe.skip('An `eight-track` server with a `/` subpath', function () {
  serverUtils.run(1337, function (req, res) {
    res.send(req.url);
  });
  serverUtils.runEightServer(1338, {
    fixtureDir: __dirname + '/actual-files/redirect',
    url: 'http://localhost:1337/'
  });

  describe('when requested with a path', function () {
    httpUtils.save('http://localhost:1338/world');

    it('uses the normal path', function () {
      expect(this.err).to.equal(null);
      expect(this.body).to.equal('/world');
    });
  });
});
