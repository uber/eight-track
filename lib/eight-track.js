var assert = require('assert');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var url = require('url');
var _ = require('underscore');
var concat = require('concat-stream');
var mkdirp = require('mkdirp');
var request = require('request');

function EightTrack() {
  // this.fixtureDir is set in `eightTrack`
}

EightTrack.pickMessageInfo = function (message) {
  // DEV: Refer to http://nodejs.org/api/http.html#http_http_incomingmessage
  return _.pick(message, 'httpVersion', 'headers', 'trailers', 'method', 'url', 'statusCode');
};
EightTrack.getRequestKey = function (req, body) {
  // Generate an object representing the request
  var info = EightTrack.pickMessageInfo(req);
  delete info.statusCode;
  info.body = body;

  // Stringify the info and hash it
  var json = JSON.stringify(info);
  var md5 = crypto.createHash('md5');
  md5.update(json);
  var hash = md5.digest('hex');

  // Compound method, url, and hash to generate the key
  return req.method + '_' + encodeURIComponent(req.url) + '_' + hash;
};
EightTrack.sendResponse = function (res, info) {
  res.writeHead(info.statusCode, info.headers);
  res.write(info.body);
  res.end();
};

EightTrack.prototype = {
  // DEV: We use disk as truth because while it is slow,
  // DEV: it makes for only one location to load response from
  getFilepath: function (key) {
    return path.join(this.fixtureDir, key + '.json');
  },
  getResponse: function (key, cb) {
    // DEV: Emulate async behavior before moving to disk
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
      var responseInfo;
      try {
        responseInfo = JSON.parse(content);
      } catch (err) {
        return cb(err);
      }
      cb(null, responseInfo);
    });
  },
  saveResponse: function (key, responseInfo, cb) {
    var filepath = this.getFilepath(key);
    mkdirp(path.dirname(filepath), function (err) {
      if (err) {
        return cb(err);
      }
      fs.writeFile(filepath, JSON.stringify(responseInfo, null, 2), cb);
    });
  }
};

function eightTrackCreator(options) {
  // Assert we received the expected options
  assert(options.url, '`eight-track` expected `options.url` but did not receive it');
  assert(options.fixtureDir, '`eight-track` expected `options.fixtureDir` but did not receive it');

  // Pre-emptively parse options
  var externalUrl = options.url;
  if (typeof externalUrl === 'string') {
    externalUrl = url.parse(externalUrl);
  }

  // Define a middleware to handle requests `(req, res)`
  function eightTrack(internalReq, internalRes) {
    // Create reference similar to `this` to encourage OOP thought
    var that = eightTrack;
    that.fixtureDir = options.fixtureDir;

    // Collect the body
    // DEV: If we ever go even deeper, consider moving to async.waterfall
    internalReq.pipe(concat(function (internalBuff) {
      // Generate a key based on the internal request and body
      var internalBody = internalBuff.toString();
      var requestKey = EightTrack.getRequestKey(internalReq, internalBody);

      // If there is a request that already exists
      that.getResponse(requestKey, function handleGetRes (err, responseInfo) {
        // If there was an error, emit it
        if (err) {
          return internalReq.emit('error', err);
        }

        // If we successfully found the info, reply with it
        if (responseInfo) {
          return EightTrack.sendResponse(internalRes, responseInfo);
        }

        // Forward the original request to the new server
        var internalUrl = url.parse(internalReq.url);
        var externalReq = request({
          // DEV: Missing `httpVersion`
          headers: internalReq.headers,
          // DEV: request does not support `trailers`
          trailers: internalReq.trailers,
          method: internalReq.method,
          url: _.defaults({
            path: internalUrl.path
          }, externalUrl),
          body: internalBody
        });

        // If there is an error, forward it
        externalReq.on('error', function handleReqError (err) {
          internalReq.emit('error', err);
        });

        // When we receive a response
        externalReq.on('response', function handleRes (externalRes) {
          // Forward and save request on end
          externalRes.pipe(concat(function handleResEnd (externalBuff) {
            // Save the response
            var responseInfo = EightTrack.pickMessageInfo(externalRes);
            delete responseInfo.url;
            delete responseInfo.method;
            responseInfo.body = externalBuff.toString();
            that.saveResponse(requestKey, responseInfo, function handleSaveRes (err) {
              // If there is an error, emit it
              if (err) {
                return internalReq.emit('error', err);
              }

              // Forwarding response to original
              EightTrack.sendResponse(internalRes, responseInfo);
            });
          }));
        });
      });
    }));
  }

  // Inherit from `EightTrack`
  // DEV: Inspired by https://github.com/senchalabs/connect/blob/2.12.0/lib/connect.js#L64-L74
  EightTrack.call(eightTrack);
  _.extend(eightTrack, EightTrack.prototype);

  // Return the middleware
  return eightTrack;
}

// Expose class on top of eightTrackCreator
eightTrackCreator.EightTrack = EightTrack;

// Expose our middleware constructor
module.exports = eightTrackCreator;
