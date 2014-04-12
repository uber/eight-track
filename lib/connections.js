var EventEmitter = require('events').EventEmitter;
var util = require('util');
var _ = require('underscore');
var async = require('async');
var deepClone = require('clone');
var concat = require('concat-stream');

// Create generic connection to inherit from
function GenericConnection(req, res) {
  // Inherit from event emitter
  EventEmitter.call(this);

  // Save the req and res for later
  this.req = req;
  this.res = res;
}
GenericConnection.pickMessageInfo = function (message) {
  // DEV: Refer to http://nodejs.org/api/http.html#http_http_incomingmessage
  var info = {};
  // DEV: This is an antipattern where we lose our stack trace
  ['httpVersion', 'headers', 'trailers', 'method', 'url', 'statusCode'].forEach(function (key) {
    info[key] = deepClone(message[key]);
  });
  return info;
};
util.inherits(GenericConnection, EventEmitter);

// Define a container for input/output of an incoming request
function IncomingConnection(req, res) {
  // Inherit from event emitter
  GenericConnection.call(this, req, res);

  // Collect the request body
  var that = this;
  req.pipe(concat(function (incomingBuff) {
    // Save the body and emit a `loaded` event
    // DEV: The delay is so `async.waterfall` still operates when we enter it
    that.buffer = incomingBuff.length ? incomingBuff : '';
    async.setImmediate(function () {
      that.emit('loaded');
    });
  }));
}
IncomingConnection.getRequestInfo = function (req, buff) {
  var info = GenericConnection.pickMessageInfo(req);
  delete info.statusCode;
  info.buffer = buff;
  return info;
};
util.inherits(IncomingConnection, GenericConnection);
_.extend(IncomingConnection.prototype, {
  getRequestInfo: function () {
    return IncomingConnection.getRequestInfo(this.req, this.buffer);
  }
});

// Define a container for input/output of an outgoing request
function OutgoingConnection(req, res) {
  // Inherit from event emitter
  GenericConnection.call(this, req, res);

  // Collect the request body
  var that = this;
  res.pipe(concat(function (outgoingBuff) {
    // Save the body and emit a `loaded` event
    that.buffer = outgoingBuff;
    async.setImmediate(function () {
      that.emit('loaded');
    });
  }));
}
OutgoingConnection.getResponseInfo = function (res, buff) {
  var info = GenericConnection.pickMessageInfo(res);
  delete info.url;
  delete info.method;
  info.buffer = buff;
  return info;
};
util.inherits(OutgoingConnection, GenericConnection);
_.extend(OutgoingConnection.prototype, {
  getResponseInfo: function () {
    return OutgoingConnection.getResponseInfo(this.res, this.buffer);
  }
});


module.exports = {
  GenericConnection: GenericConnection,
  IncomingConnection: IncomingConnection,
  OutgoingConnection: OutgoingConnection
};
