var expect = require('chai').expect;
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

describe('A server that asserts content before talking to eight-track', function () {
  serverUtils.run(1337, function (req, res) {
    res.send(req.headers);
  });
  serverUtils.runEightServer(1338, {
    fixtureDir: __dirname + '/actual-files/headers',
    url: 'http://localhost:1337'
  });

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

    describe('and a request with a different body', function () {
      httpUtils.save({
        form: {
          goodbye: 'moon'
        },
        url: 'http://localhost:1338/'
      });

      it('receives a different set of parameters', function () {
        expect(this.err).to.equal(null);
        expect(JSON.parse(this.body)).to.have.property('goodbye', 'moon');
      });
    });
  });
});
