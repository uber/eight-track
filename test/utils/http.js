// Load in dependencies
var request = require('request');
var requestMocha = require('request-mocha');

// Helper for mocha to save request information
module.exports = requestMocha(request);
