var expect = require('chai').expect;
var express = require('express');
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

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
