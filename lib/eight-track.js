var assert = require('assert');
var crypto = require('crypto');
var url = require('url');
var _ = require('underscore');
var async = require('async');
var request = require('request');
var connections = require('./connections');
var FsStore = require('./fs-store');

function EightTrack(options) {
  // Assert we received the expected options
  assert(options.url, '`eight-track` expected `options.url` but did not receive it');
  assert(options.fixtureDir, '`eight-track` expected `options.fixtureDir` but did not receive it');

  // Pre-emptively parse options
  var externalUrl = options.url;
  if (typeof externalUrl === 'string') {
    externalUrl = url.parse(externalUrl);
  }

  // Save externalUrl and fixtureDir for later
  this.externalUrl = externalUrl;
  this.normalizeFn = options.normalizeFn || _.identity;
  this.store = new FsStore({
    directory: options.fixtureDir
  });
}

EightTrack.sendResponse = function (res, info) {
  res.writeHead(info.statusCode, info.headers);
  res.write(info.body);
  res.end();
};

EightTrack.prototype = {
  getConnectionKey: function (conn) {
    // Generate an object representing the request
    var info = conn.getRequestInfo();

    // Normalize the info
    info = this.normalizeFn(info) || info;

    // Stringify the info and hash it
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

  getConnection: function (key, cb) {
    this.store.get(key, cb);
  },
  saveConnection: function (key, connInfo, cb) {
    this.store.set(key, connInfo, cb);
  },

  createExternalRequest: function (internalConn) {
    // Prepate the URL for headers logic
    var internalReq = internalConn.req;
    var internalUrl = url.parse(internalReq.url);
    var _url = _.defaults({
      path: internalUrl.path
    }, this.externalUrl);

    // Set up headers
    var headers = internalReq.headers;

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
    var externalReq = request({
      // DEV: Missing `httpVersion`
      headers: headers,
      // DEV: request does not support `trailers`
      trailers: internalReq.trailers,
      method: internalReq.method,
      url: _url,
      body: internalConn.body
    });
    return externalReq;
  },

  handleConnection: function (internalReq, internalRes) {
    // Create a connection to pass around between methods
    // DEV: This cannot be placed inside the waterfall since in 0.8, we miss data + end events
    var incomingConn = new connections.IncomingConnection(internalReq, internalRes);
    var requestKey, externalConn, connInfo;

    var that = this;
    async.waterfall([
      function loadIncomingBody (cb) {
        incomingConn.on('loaded', cb);
      },
      function findSavedConnection (cb) {
        requestKey = that.getConnectionKey(incomingConn);
        that.getConnection(requestKey, cb);
      },
      function createExternalReq (connInfo, cb) {
        // If we successfully found the info, reply with it
        if (connInfo) {
          return EightTrack.sendResponse(internalRes, connInfo.response);
        }

        // Forward the original request to the new server
        var externalReq = that.createExternalRequest(incomingConn);

        // When we receive a response, load the response body
        externalReq.on('error', cb);
        externalReq.on('response', function handleRes (externalRes) {
          externalConn = new connections.OutgoingConnection(externalReq, externalRes);
          externalConn.on('loaded', cb);
        });
      },
      function saveIncomingOutgoing (cb) {
        // Save the incoming request and outgoing response info
        connInfo = {
          request: incomingConn.getRequestInfo(),
          response: externalConn.getResponseInfo()
        };
        that.saveConnection(requestKey, connInfo, cb);
      },
      function forwardResponseToOriginal (cb) {
        EightTrack.sendResponse(internalRes, connInfo.response);
        cb(null);
      }
    ], function handleError (err) {
      if (err) {
        return internalReq.emit('error', err);
      }
    });
  }
};

function middlewareCreator(options) {
  // Create a new eight track for our middleware
  var eightTrack = new EightTrack(options);

  // Define a middleware to handle requests `(req, res)`
  function eightTrackMiddleware(internalReq, internalRes) {
    eightTrack.handleConnection(internalReq, internalRes);
  }

  // Return the middleware
  return eightTrackMiddleware;
}

// Expose class on top of middlewareCreator
middlewareCreator.EightTrack = EightTrack;

// Expose our middleware constructor
module.exports = middlewareCreator;
