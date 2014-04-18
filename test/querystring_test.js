var expect = require('chai').expect;
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

// DEV: This tests that we save a request with query parameters
// DEV: and that it forwards the query parameters
describe.only('A query-echoing server being proxied', function () {
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
