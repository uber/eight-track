var fs = require('fs');
var expect = require('chai').expect;
var express = require('express');
var request = require('request');
var rimraf = require('rimraf');
var eightTrack = require('../');
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

describe('A server', function () {
  serverUtils.run(1337, function (req, res) {
    res.send('oh hai');
  });

  describe('being proxied by `eight-track`', function () {
    var fixtureDir = __dirname + '/actual-files/basic';
    serverUtils.runEightServer(1338, {
      fixtureDir: fixtureDir,
      url: 'http://localhost:1337'
    });

    describe('when requested once', function () {
      httpUtils.save('http://localhost:1338/');

      it('touches the server', function () {
        expect(this.requests[1337]).to.have.property('length', 1);
      });

      it('receives the expected response', function () {
        expect(this.err).to.equal(null);
        expect(this.res.statusCode).to.equal(200);
        expect(this.body).to.equal('oh hai');
      });

      it('writes the response to a file', function () {
        var files = fs.readdirSync(fixtureDir);
        expect(files).to.have.property('length', 1);
      });

      describe('and when requested again', function () {
        httpUtils.save('http://localhost:1338/');

        it('does not touch the server', function () {
          expect(this.requests[1337]).to.have.property('length', 1);
        });

        it('receives the expected response', function () {
          expect(this.err).to.equal(null);
          expect(this.res.statusCode).to.equal(200);
          expect(this.body).to.equal('oh hai');
        });
      });
    });
  });
});

// DEV: This is testing uniquely generated keys
describe('A server with multiple paths', function () {
  serverUtils.run(1337, function (req, res) {
    if (req.url === '/hello') {
      res.send('hello');
    } else {
      res.send('world');
    }
  });

  describe('being proxied by `eight-track`', function () {
    serverUtils.runEightServer(1338, {
      fixtureDir: __dirname + '/actual-files/multi',
      url: 'http://localhost:1337'
    });

    describe('a request to `/hello`', function () {
      httpUtils.save('http://localhost:1338/hello');

      it('replies with \'hello\'', function () {
        expect(this.err).to.equal(null);
        expect(this.body).to.equal('hello');
      });

      describe('and a request to `/world`', function () {
        httpUtils.save('http://localhost:1338/world');

        it('replies with \'world\'', function () {
          expect(this.err).to.equal(null);
          expect(this.body).to.equal('world');
        });
      });
    });
  });
});

// DEV: This tests that we save a request with query parameters
// DEV: and that it forwards the query parameters
describe('A query-echoing server being proxied', function () {
  serverUtils.run(1337, function (req, res) {
    res.send(req.query);
  });
  serverUtils.runEightServer(1338, {
    fixtureDir: __dirname + '/actual-files/query',
    url: 'http://localhost:1337'
  });

  describe('when requested with one set of query parameters', function () {
    httpUtils.save('http://localhost:1338/?hello=world');

    it('receives with its query parameters', function () {
      expect(this.err).to.equal(null);
      expect(JSON.parse(this.body)).to.deep.equal({hello:'world'});
    });

    describe('when requested again', function () {
      httpUtils.save('http://localhost:1338/?hello=world');

      it('does not double request', function () {
        expect(this.requests[1337]).to.have.property('length', 1);
      });
    });

    describe('and a request with a different set of query parameters', function () {
      httpUtils.save('http://localhost:1338/?goodbye=moon');

      it('receives a different set of parameters', function () {
        expect(this.err).to.equal(null);
        expect(JSON.parse(this.body)).to.deep.equal({goodbye:'moon'});
      });
    });
  });
});

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

describe('A server that echoes method that is being proxied', function () {
  serverUtils.run(1337, function (req, res) {
    express.urlencoded()(req, res, function (err) {
      if (err) { throw err; }
      res.send({
        method: req.method,
        body: req.body
      });
    });
  });
  serverUtils.runEightServer(1338, {
    fixtureDir: __dirname + '/actual-files/method',
    url: 'http://localhost:1337'
  });

  describe('when requested via POST', function () {
    httpUtils.save({
      method: 'POST',
      url: 'http://localhost:1338/',
      form: {
        hello: 'world'
      }
    });

    it('replies with POST', function () {
      expect(this.err).to.equal(null);
      expect(this.res.statusCode).to.equal(200);
      expect(JSON.parse(this.body)).to.deep.equal({
        method: 'POST',
        body: {
          hello: 'world'
        }
      });
    });

    describe('when requested again', function () {
      httpUtils.save({
        method: 'POST',
        url: 'http://localhost:1338/',
        form: {
          hello: 'world'
        }
      });

      it('does not double request', function () {
        expect(this.requests[1337]).to.have.property('length', 1);
      });
    });
  });
});

describe('A server that echoes HTTP headers', function () {
  serverUtils.run(1337, function (req, res) {
    res.send(req.headers);
  });
  serverUtils.runEightServer(1338, {
    fixtureDir: __dirname + '/actual-files/headers',
    url: 'http://localhost:1337'
  });

  describe('when requested with a special header', function () {
    httpUtils.save({
      headers: {
        'x-hai': 'world'
      },
      url: 'http://localhost:1338/'
    });

    it('replies with a our header', function () {
      expect(this.err).to.equal(null);
      expect(this.res.statusCode).to.equal(200);
      expect(JSON.parse(this.body)).to.have.property('x-hai', 'world');
    });

    describe('when requested again', function () {
      httpUtils.save({
        headers: {
          'x-hai': 'world'
        },
        url: 'http://localhost:1338/'
      });

      it('has the same header', function () {
        expect(JSON.parse(this.body)).to.have.property('x-hai', 'world');
      });

      it('does not double request', function () {
        expect(this.requests[1337]).to.have.property('length', 1);
      });
    });

    describe('and a request with a different set of headers', function () {
      httpUtils.save({
        headers: {
          'x-goodbye': 'moon'
        },
        url: 'http://localhost:1338/'
      });

      it('receives a different set of parameters', function () {
        expect(this.err).to.equal(null);
        expect(JSON.parse(this.body)).to.have.property('x-goodbye', 'moon');
      });
    });

  });
});

describe('An `eight-track` loading from a saved file', function () {
  serverUtils.run(1337, function (req, res) {
    // DEV: Same length as 'oh hai' for easier development =P
    res.send('NOOOOO');
  });
  serverUtils.run(1338, eightTrack({
    fixtureDir: __dirname + '/test-files/saved',
    url: 'http://localhost:1337'
  }));

  describe('a request to a canned response', function () {
    httpUtils.save({
      url: 'http://localhost:1338/'
    });

    it('uses the saved response', function () {
      expect(this.err).to.equal(null);
      expect(this.body).to.equal('oh hai');
    });
  });

  // DEV: This is a test for verifying we don't contaminate our cache
  describe('when a response is modified', function () {
    httpUtils.save({
      url: 'http://localhost:1338/'
    });
    before(function () {
      this.res.body = 'hello';
    });
    httpUtils.save({
      url: 'http://localhost:1338/'
    });

    it('does not impact the original data', function () {
      expect(this.res.body).to.equal('oh hai');
    });
  });
});

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
    _eightTrack.forwardRequest(req, function (err, externalRes, externalBody) {
      res.send(externalBody.replace('hai', 'haiii'), externalRes.statusCode);
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

// DEV: This is a regression test for https://github.com/uber/eight-track/issues/7
describe('A server being proxied by `eight-track', function () {
  serverUtils.run(1337, function (req, res) {
    res.send('oh hai');
  });
  serverUtils.runEightServer(1338, {
    fixtureDir: __dirname + '/actual-files/basic',
    url: 'http://localhost:1337'
  });

  describe('when requested with a very long URL', function () {
    var lotsOfCharacters = (new Array(9001)).join('a');
    httpUtils.save('http://localhost:1338/abc/' + lotsOfCharacters + '/def');

    describe('and when requested with a slightly different long URL', function () {
      httpUtils.save('http://localhost:1338/abc/' + lotsOfCharacters + '/deg');

      it('recognizes it as a separate response', function () {
        expect(this.requests[1337]).to.have.property('length', 2);
      });
    });
  });
});

describe('A server with distinct responses', function () {
  serverUtils.run(1337, function (req, res) {
    express.urlencoded()(req, res, function (err) {
      if (err) { throw err; }
      res.send({
        method: req.method,
        url: req.url
      });
    });
  });

  describe('proxied by an eight-track that normalizes everything', function () {
    serverUtils.runEightServer(1338, {
      fixtureDir: __dirname + '/actual-files/headers',
      url: 'http://localhost:1337',
      normalizeFn: function (info) {
        return {
          url: '/',
          method: 'GET'
        };
      }
    });

    describe('when requested', function () {
      httpUtils.save('http://localhost:1338/?hello=there');

      it('gets the expected response', function () {
        expect(this.err).to.equal(null);
        expect(JSON.parse(this.body)).to.deep.equal({
          method: 'GET',
          url: '/?hello=there'
        });
      });

      describe('when requested with something different', function () {
        httpUtils.save({
          url: 'http://localhost:1338/wat',
          method: 'POST',
          body: 'goodbye=moon'
        });

        it('gets the original response back', function () {
          expect(this.err).to.equal(null);
          expect(JSON.parse(this.body)).to.deep.equal({
            method: 'GET',
            url: '/?hello=there'
          });
        });

        it('does not touch the server', function () {
          expect(this.requests[1337]).to.have.property('length', 1);
        });
      });
    });
  });
});

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

// DEV: This is a regression test for https://github.com/uber/eight-track/issues/17
describe.only('A server being proxied by `eight-track` that delivers binary content', function () {
  describe('when requested', function () {
    serverUtils.run(1337, function (req, res) {
      var buff = new Buffer(256);
      buff.write('\u0042', 0);
      res.send(buff);
    });
    serverUtils.runEightServer(1338, {
      fixtureDir: __dirname + '/actual-files/binary',
      url: 'http://localhost:1337'
    });

    httpUtils.save({
      encoding: null,
      url: 'http://localhost:1338/'
    });

    it('does not encounter an error', function () {
      // DEV: If you see HPE_INVALID_CONSTANT, it is probably related to Content-Length due to too long of a stringify
      expect(this.err).to.equal(null);
    });
    it('replies with the binary content', function () {
      expect(this.res.statusCode).to.equal(200);
      expect(this.body[0]).to.equal(66); // 42 from hex to decimal
      expect(this.body.length).to.equal(256);
    });

    describe('and when requested again', function () {
      httpUtils.save({
        encoding: null,
        url: 'http://localhost:1338/'
      });

      it('replies with the binary content', function () {
        expect(this.err).to.equal(null);
        expect(this.res.statusCode).to.equal(200);
        expect(this.body[0]).to.equal(66); // 42 from hex to decimal
        expect(this.body.length).to.equal(256);
      });

      it('does not double request', function () {
        expect(this.requests[1337]).to.have.property('length', 1);
      });
    });
  });

  describe('when loaded from disk', function () {
    serverUtils.run(1337, function (req, res) {
      // DEV: Generate new content via commented line
      var buff = new Buffer(256); buff.write('\u0042', 0); res.send(buff);
      // res.send('Not binary content');
    });
    serverUtils.run(1338, eightTrack({
      fixtureDir: __dirname + '/test-files/saved-binary',
      url: 'http://localhost:1337'
    }));

    httpUtils.save({
      encoding: null,
      url: 'http://localhost:1338/'
    });

    it('does not encounter an error', function () {
      // DEV: If you see HPE_INVALID_CONSTANT, it is probably related to Content-Length due to too long of a stringify
      expect(this.err).to.equal(null);
    });
    it('replies with the binary content', function () {
      expect(this.res.statusCode).to.equal(200);
      expect(this.body[0]).to.equal(66); // 42 from hex to decimal
      expect(this.body.length).to.equal(256);
    });
  });
});
