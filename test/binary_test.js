
// DEV: This is a regression test for https://github.com/uber/eight-track/issues/17
describe('A server being proxied by `eight-track` that delivers binary content', function () {
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

    describe('and when requested again (loading from memory)', function () {
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
      // var buff = new Buffer(256); buff.write('\u0042', 0); res.send(buff);
      res.send('Not binary content');
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
