var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

// DEV: I am quite confident this exists as a node module but cannot find a match =(

// DEV: We use disk as truth because while it is slow,
// DEV: it makes for only one location to load response from
function FsStore(options) {
  this.dir = options.directory;
}
FsStore.prototype = {
  getFilepath: function (key) {
    return path.join(this.dir, key + '.json');
  },
  get: function (key, cb) {
    fs.readFile(this.getFilepath(key), function parseResponse (err, content) {
      // If there was an error
      if (err) {
        // If the file was not found, send back nothing
        if (err.code === 'ENOENT') {
          return cb(null, null);
        // Otherwise, send back the error
        } else {
          return cb(err);
        }
      }

      // Otherwise, parse the file
      // DEV: We use a try/catch in case the JSON is invalid
      var data;
      try {
        data = JSON.parse(content);
      } catch (err) {
        return cb(err);
      }
      cb(null, data);
    });
  },
  set: function (key, data, cb) {
    var filepath = this.getFilepath(key);
    mkdirp(path.dirname(filepath), function (err) {
      if (err) {
        return cb(err);
      }
      fs.writeFile(filepath, JSON.stringify(data, null, 2), cb);
    });
  }
};

// Export the store
module.exports = FsStore;