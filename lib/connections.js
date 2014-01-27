var EventEmitter = require('events').EventEmitter;
var util = require('util');
var _ = require('underscore');
var async = require('async');
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
  return _.pick(message, 'httpVersion', 'headers', 'trailers', 'method', 'url', 'statusCode');
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
    that.body = incomingBuff.toString();
    async.setImmediate(function () {
      that.emit('loaded');
    });
  }));
}
IncomingConnection.getRequestInfo = function (req, body) {
  var info = GenericConnection.pickMessageInfo(req);
  delete info.statusCode;
  info.body = body;
  return info;
};
util.inherits(IncomingConnection, GenericConnection);
_.extend(IncomingConnection.prototype, {
  getRequestInfo: function () {
    return IncomingConnection.getRequestInfo(this.req, this.body);
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
    that.body = outgoingBuff.toString();
    async.setImmediate(function () {
      that.emit('loaded');
    });
  }));
}
OutgoingConnection.getResponseInfo = function (res, body) {
  var info = GenericConnection.pickMessageInfo(res);
  delete info.url;
  delete info.method;
  info.body = body;
  return info;
};
util.inherits(OutgoingConnection, GenericConnection);
_.extend(OutgoingConnection.prototype, {
  getResponseInfo: function () {
    return OutgoingConnection.getResponseInfo(this.res, this.body);
  }
});


module.exports = {
  GenericConnection: GenericConnection,
  IncomingConnection: IncomingConnection,
  OutgoingConnection: OutgoingConnection
};