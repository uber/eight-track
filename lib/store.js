var fs = require('fs');
var path = require('path');
var deepClone = require('clone');
var mkdirp = require('mkdirp');

// DEV: I am quite confident this exists as a node module but cannot find a match =(

// DEV: We use disk as truth because while it is slow,
// DEV: it makes for only one location to load response from
function Store(options) {
  this.dir = options.directory;
  this.memoryCache = {};
}
Store.prototype = {
  getFilepath: function (key) {
    return path.join(this.dir, key + '.json');
  },
  get: function (key, cb) {
    var memoryCache = this.memoryCache;
    var cachedData = memoryCache[key];
    if (cachedData) {
      process.nextTick(function () {
        // DEV: Technically, this clone is not necessary since res.send serializes
        // However, it is good to future proof against internal changes
        cb(null, deepClone(cachedData));
      });
    } else {
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
        memoryCache[key] = data;
        cb(null, deepClone(data));
      });
    }
  },
  set: function (key, data, cb) {
    var filepath = this.getFilepath(key);
    var that = this;
    mkdirp(path.dirname(filepath), function (err) {
      if (err) {
        return cb(err);
      }
      that.memoryCache[key] = data;
      fs.writeFile(filepath, JSON.stringify(data, null, 2), cb);
    });
  }
};

// Export the store
module.exports = Store;
