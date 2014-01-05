// Start up a basic applciation
var express = require('express');
var eightTrack = require('../');
var request = require('request');
express().use(function (req, res) {
  console.log('Pinged!');
  res.send('Hello World!');
}).listen(1337);

// Create a server using a `eight-track` middleware to the original
express().use(eightTrack({
  url: 'http://localhost:1337',
  fixtureDir: 'directory/to/save/responses'
})).listen(1338);

// Hits original server, triggering a `console.log('Pinged!')` and 'Hello World!' response
request('http://localhost:1338/', function (_, $, body) { console.log(body); });

// Hits saved response but still receieves 'Hello World!' response
request('http://localhost:1338/', function (_, $, body) { console.log(body); });
