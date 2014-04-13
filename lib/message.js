var EventEmitter = require('events').EventEmitter;
var util = require('util');
var _ = require('underscore');
var async = require('async');
var deepClone = require('clone');
var concat = require('concat-stream');

// Create connection
function Message(connection) {
  // Inherit from event emitter
  EventEmitter.call(this);

  // Save the connection
  this.connection = connection;

  // Buffer the content of the connecftion
  var that = this;
  connection.pipe(concat(function handleBuffer (buff) {
    // Save the body and emit a `loaded` event
    // DEV: The delay is so `async.waterfall` still operates when we enter it
    that.body = buff.toString();
    async.setImmediate(function () {
      that.emit('loaded');
    });
  }));
}
Message.pickMessageInfo = function (message) {
  // DEV: Refer to http://nodejs.org/api/http.html#http_http_incomingmessage
  var info = {};
  // DEV: This is an antipattern where we lose our stack trace
  ['httpVersion', 'headers', 'trailers', 'method', 'url', 'statusCode'].forEach(function (key) {
    info[key] = deepClone(message[key]);
  });
  return info;
};
Message.getRequestInfo = function (req, body) {
  var info = Message.pickMessageInfo(req);
  delete info.statusCode;
  info.body = body;
  return info;
};
Message.getResponseInfo = function (res, body) {
  var info = Message.pickMessageInfo(res);
  delete info.url;
  delete info.method;
  info.body = body;
  return info;
};
util.inherits(Message, EventEmitter);
_.extend(Message.prototype, {
  getRequestInfo: function () {
    return Message.getRequestInfo(this.connection, this.body);
  },
  getResponseInfo: function () {
    return Message.getResponseInfo(this.connection, this.body);
  }
});

module.exports = Message;
