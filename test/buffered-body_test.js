var expect = require('chai').expect;
var express = require('express');
var rawBody = require('raw-body');
var eightTrack = require('../');
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

// TODO: This should be a separate repo
function connectRawBody(req, res, next) {
  rawBody(req, function handleBody (err, buff) {
    if (err) {
      next(err);
    }
    req.body = buff;
    next();
  });
}

describe('A server that asserts content before talking to eight-track', function () {
  serverUtils.run(1337, [
    express.urlencoded(),
    function (req, res) {
      res.send(req.body);
    }
  ]);
  serverUtils.run(1338, [
    connectRawBody,
    function assertInfo (req, res, next) {
      expect(req.body.toString()).to.equal('hello=world');
      next();
    },
    eightTrack({
      fixtureDir: __dirname + '/actual-files/buffered-body',
      url: 'http://localhost:1337'
    })
  ]);
  serverUtils._cleanupEightTrack(__dirname + '/actual-files/buffered-body');

  describe('when requested', function () {
    httpUtils.save({
      form: {
        hello: 'world'
      },
      url: 'http://localhost:1338/'
    });

    it('replies with a our header', function () {
      expect(this.err).to.equal(null);
      expect(this.res.statusCode).to.equal(200);
      expect(JSON.parse(this.body)).to.have.property('hello', 'world');
    });

    describe('when requested again', function () {
      httpUtils.save({
        form: {
          hello: 'world'
        },
        url: 'http://localhost:1338/'
      });

      it('has the same header', function () {
        expect(JSON.parse(this.body)).to.have.property('hello', 'world');
      });

      it('does not double request', function () {
        expect(this.requests[1337]).to.have.property('length', 1);
      });
    });
  });
});
