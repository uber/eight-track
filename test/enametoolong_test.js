var expect = require('chai').expect;
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

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
