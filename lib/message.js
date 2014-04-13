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
    that.body = buff.length ? buff : '';
    async.setImmediate(function () {
      that.emit('loaded');
    });
  }));
}
util.inherits(Message, EventEmitter);
_.extend(Message.prototype, {
  pickMessageInfo: function () {
    // DEV: Refer to http://nodejs.org/api/http.html#http_http_incomingmessage
    var info = {};
    // DEV: This is an antipattern where we lose our stack trace
    ['httpVersion', 'headers', 'trailers', 'method', 'url', 'statusCode'].forEach(function (key) {
      info[key] = deepClone(this.connection[key]);
    }, this);
    return info;
  },
  getRequestInfo: function () {
    var info = this.pickMessageInfo();
    delete info.statusCode;
    info.body = this.body;
    return info;
  },
  getResponseInfo: function () {
    var info = this.pickMessageInfo();
    delete info.url;
    delete info.method;
    info.body = this.body;
    return info;
  }
});

module.exports = Message;
