var expect = require('chai').expect;
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

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
