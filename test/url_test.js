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

  describe('when requested', function () {
    it('concatenates the path', function () {

    });
  });
});

describe.skip('An `eight-track` server with a `/` subpath', function () {
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
});
