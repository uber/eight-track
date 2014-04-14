var expect = require('chai').expect;
var express = require('express');
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

describe.only('A server that echoes method that is being proxied', function () {
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
