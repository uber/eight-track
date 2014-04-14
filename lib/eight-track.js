var assert = require('assert');
var crypto = require('crypto');
var url = require('url');
var _ = require('underscore');
var async = require('async');
var Store = require('fs-memory-store');
var request = require('request');
var Message = require('./message');

function EightTrack(options) {
  // Assert we received the expected options
  assert(options.url, '`eight-track` expected `options.url` but did not receive it');
  assert(options.fixtureDir, '`eight-track` expected `options.fixtureDir` but did not receive it');

  // Pre-emptively parse options
  var remoteUrl = options.url;
  if (typeof remoteUrl === 'string') {
    remoteUrl = url.parse(remoteUrl);
  }

  // Save remoteUrl and fixtureDir for later
  this.remoteUrl = remoteUrl;
  this.normalizeFn = options.normalizeFn || _.identity;
  this.store = new Store(options.fixtureDir);
}
EightTrack.prototype = {
  getConnectionKey: function (conn) {
    // Generate an object representing the request
    var info = conn.getRequestInfo();

    // Normalize the info
    info = this.normalizeFn(info) || info;

    // Stringify the info and hash it
    if (info.body && Buffer.isBuffer(info.body)) {
      info.body = info.body.toString('base64');
    }
    var json = JSON.stringify(info);
    var md5 = crypto.createHash('md5');
    md5.update(json);
    var hash = md5.digest('hex');

    // Compound method, url, and hash to generate the key
    // DEV: We truncate URL at 32 characters to prevent ENAMETOOLONG
    // https://github.com/uber/eight-track/issues/7
    var url = encodeURIComponent(info.url).substr(0, 32);
    return info.method + '_' + url + '_' + hash;
  },

  _serializeBody: function (obj) {
    // Serialize the buffer for disk
    var _buff = obj.body;
    var bodyEncoding = 'utf8';
    var body = _buff.toString(bodyEncoding);

    // If the buffer is not utf8-friendly, serialize it to base64
    var testBuffer = new Buffer(body, bodyEncoding);
    if (testBuffer.length !== _buff.length) {
      bodyEncoding = 'base64';
      body = _buff.toString(bodyEncoding);
    }

    // Save the new body
    var retObj = _.omit(obj, 'body');
    retObj.bodyEncoding = bodyEncoding;
    retObj.body = body;

    // Return our object ready for serialization
    return retObj;
  },
  getConnection: function (key, cb) {
    this.store.get(key, function handleGet (err, info) {
      // If there was an error, callback with it
      if (err) {
        return cb(err);
      // Otherwise, if there was no info, callback with it
      } else if (!info) {
        return cb(err, info);
      }

      // Otherwise, de-serialize the buffer
      console.log('heeee');
      var _body = info.response.body;
      console.log('wwwwww');
      info.response.body = _body.length ? new Buffer(_body, info.response.bodyEncoding || 'utf8') : '';
      console.log('bbbb');
      cb(null, info);
    });
  },
  saveConnection: function (key, _info, cb) {
      console.log('444444444');
    var info = _.clone(_info);
    info.request = this._serializeBody(info.request);
    info.response = this._serializeBody(info.response);
    console.log(info);
    this.store.set(key, info, cb);
      console.log('66666');
  },

  createRemoteRequest: function (localReqMsg) {
    // Prepate the URL for headers logic
    var localReq = localReqMsg.connection;
    var localUrl = url.parse(localReq.url);
    var _url = _.defaults({
      path: localUrl.path
    }, this.remoteUrl);

    // Set up headers
    var headers = localReq.headers;

    // If there is a host, use our new host for the request
    if (headers.host) {
      headers = _.clone(headers);
      delete headers.host;

      // Logic taken from https://github.com/mikeal/request/blob/v2.30.1/request.js#L193-L202
      headers.host = _url.hostname;
      if (_url.port) {
        if ( !(_url.port === 80 && _url.protocol === 'http:') &&
             !(_url.port === 443 && _url.protocol === 'https:') ) {
          headers.host += ':' + _url.port;
        }
      }
    }

    // Forward the original request to the new server
    var remoteReq = request({
      // DEV: Missing `httpVersion`
      headers: headers,
      // DEV: request does not support `trailers`
      trailers: localReq.trailers,
      method: localReq.method,
      url: _url,
      body: localReqMsg.body,
      // DEV: This is probably an indication that we should no longer use `request`. See #19.
      followRedirect: false
    });
    return remoteReq;
  },

  forwardRequest: function (localReq, callback) {
    // Create a connection to pass around between methods
    // DEV: This cannot be placed inside the waterfall since in 0.8, we miss data + end events
    var localReqMsg = new Message(localReq);
    var requestKey, remoteResMsg, connInfo;

    function sendConnInfo(connInfo) {
      return callback(null, connInfo.response, connInfo.response.body);
    }

    var that = this;
    async.waterfall([
      function loadIncomingBody (cb) {
        localReqMsg.on('loaded', cb);
      },
      function findSavedConnection (cb) {
        requestKey = that.getConnectionKey(localReqMsg);
        that.getConnection(requestKey, cb);
      },
      function createRemoteReq (connInfo, cb) {
        // If we successfully found the info, reply with it
        if (connInfo) {
          return sendConnInfo(connInfo);
        }

        // Forward the original request to the new server
        var remoteReq = that.createRemoteRequest(localReqMsg);

        // When we receive a response, load the response body
        remoteReq.on('error', cb);
        remoteReq.on('response', function handleRes (remoteRes) {
          remoteResMsg = new Message(remoteRes);
          remoteResMsg.on('loaded', cb);
        });
      },
      function saveIncomingRemote (cb) {
        // Save the incoming request and remote response info
        connInfo = {
          request: localReqMsg.getRequestInfo(),
          response: remoteResMsg.getResponseInfo()
        };
        that.saveConnection(requestKey, connInfo, cb);
      }
    ], function handleResponseInfo (err) {
      if (err) {
        return callback(err);
      } else {
        return sendConnInfo(connInfo);
      }
    });
  },

  handleConnection: function (localReq, localRes) {
    // DEV: remoteRes is not request's response but an internal response format
    this.forwardRequest(localReq, function handleForwardedResponse (err, remoteRes, remoteBody) {
      // If there was an error, emit it
      if (err) {
        localReq.emit('error', err);
        localRes.end();
      // Otherwise, send the response
      } else {
        localRes.writeHead(remoteRes.statusCode, remoteRes.headers);
        console.log('sending');
        localRes.write(remoteBody);
        // localRes.write('moo');
        console.log('wat2');
        localRes.end();
      }
    });
  }
};

function middlewareCreator(options) {
  // Create a new eight track for our middleware
  var eightTrack = new EightTrack(options);

  // Define a middleware to handle requests `(req, res)`
  function eightTrackMiddleware(localReq, localRes) {
    eightTrack.handleConnection(localReq, localRes);
  }

  // Add on prototype methods (e.g. `forwardRequest`)
  var keys = Object.getOwnPropertyNames(EightTrack.prototype);
  keys.forEach(function bindEightTrackMethod (key) {
    eightTrackMiddleware[key] = function executeEightTrackMethod () {
      eightTrack[key].apply(eightTrack, arguments);
    };
  });

  // Return the middleware
  return eightTrackMiddleware;
}

// Expose class on top of middlewareCreator
middlewareCreator.EightTrack = EightTrack;

// Expose our middleware constructor
module.exports = middlewareCreator;
