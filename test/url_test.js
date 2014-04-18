var expect = require('chai').expect;
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

describe.only('An `eight-track` server proxying a subpath', function () {
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

describe.skip('An `eight-track` server proxying a `/` subpath', function () {
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

describe.skip('An `eight-track` server proxying an HTTPS server', function () {
  // TODO: Make this an HTTPS server
  serverUtils.run(1337, function (req, res) {
    res.send('oh hai');
  });
  serverUtils.runEightServer(1338, {
    fixtureDir: __dirname + '/actual-files/redirect',
    url: 'https://localhost:1337/'
  });

  describe('when requested', function () {
    httpUtils.save('http://localhost:1338/');

    it('proxies to the server', function () {
      expect(this.err).to.equal(null);
      expect(this.res.statusCode).to.equal(200);
      expect(this.body).to.equal('oh hai');
    });
  });
});
