// Load in dependencies
var request = require('request');

// Helper for mocha to save request information
exports._save = function (options) {
  // Request to the URL and save results to `this` context
  return function _saveFn (done) {
    var that = this;
    request(options, function (err, res, body) {
      that.err = err;
      that.res = res;
      that.body = body;
      done();
    });
  };
};

exports.save = function (options) {
  before(exports._save(options));
};
