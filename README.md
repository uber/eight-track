# eight-track [![Build status](https://travis-ci.org/uber/eight-track.png?branch=master)](https://travis-ci.org/uber/eight-track)

Record and playback HTTP requests

This is built to make testing against third party services a breeze. No longer will your test suite fail because an external service is down.

> `eight-track` is inspired by [`cassette`][] and [`vcr`][]

[`cassette`]: https://github.com/uber/cassette
[`vcr`]: https://rubygems.org/gems/vcr

## Getting Started
Install the module with: `npm install eight-track`

```javascript
// Start up a basic applciation
var express = require('express');
var eightTrack = require('eight-track');
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
request('http://localhost:1338/', console.log);

// Hits saved response but still receieves 'Hello World!' response
request('http://localhost:1338/', console.log);
```

## Documentation
`eight-track` exposes `eightTrack` as its `module.exports`.

### `eightTrack(options)`
Middleware creator for new `eightTrack's`. This *is not* a constructor.

- options `Object` - Container for parameters
    - url `String|Object` - URL of a server to proxy to
        - If it is a string, it should be the base URL of a server
        - If it is an object, it should be parameters for [`url.format`][]
    - fixtureDir `String` - Path to load/save HTTP responses
        - Files will be saved with the format `{{method}}_{{encodedUrl}}_{{hashOfRequestContent}}.json`
        - An example filename is `GET_%2F_658e61f2a6b2f1ae4c127e53f28dfecd.json`
    - normalizeFn `Function` - Function to adjust `request's` save location signature
        - If you would like to make two requests resolve from the same response file, this is how.
        - The function signature should be `function (info)` and can either mutate the `info` or return a fresh object
        - `info` will have the following properties
             - httpVersion `String` - HTTP version received from `request` (e.g. `1.0`, `1.1`)
             - headers `Object` - Headers received by `request`
             - trailers `Object` - Trailers received by `request`
             - method `String` - HTTP method that was used (e.g. `GET`, `POST`)
             - url `String` - Pathname that `request` arrived from
             - body `Buffer` - Buffered body that was written to `request`
        - Existing `normalizeFn` libraries (e.g. `multipart/form-data` can be found below)

[`url.format`]: http://nodejs.org/api/url.html#url_url_format_urlobj

`eightTrack` returns a middleware with the signature `function (req, res)`

```js
// Example of string url
eightTrack({
  url: 'http://localhost:1337',
  fixtureDir: 'directory/to/save/responses'
});

// Example of object url
eightTrack({
  url: {
    protocol: 'http:',
    hostname: 'localhost',
    port: 1337
  },
  fixtureDir: 'directory/to/save/responses'
});
```

#### `normalizeFn` libraries
- `multipart/form-data` - Ignore randomly generated boundaries and consolidate similar `multipart/form-data` requests
    - Website: https://github.com/twolfson/eight-track-normalize-multipart

### `eightTrack.forwardRequest(req, cb)`
Forward an incoming HTTP request in a [`mikeal/request`][]-like format.

- req `http.IncomingMessage` - Inbound request to an HTTP server (e.g. from `http.createServer`)
    - Documentation: http://nodejs.org/api/http.html#http_http_incomingmessage
- cb `Function` - Callback function with `(err, res, body)` signature
    - err `Error` - HTTP error if any occurred (e.g. `ECONNREFUSED`)
    - res `Object` - Container that looks like an HTTP object but simiplified due to saving to disk
        - httpVersion `String` - HTTP version received from external server response (e.g. `1.0`, `1.1`)
        - headers `Object` - Headers received by response
        - trailers `Object` - Trailers received by response
        - statusCode `Number` - Status code received from external server response
        - body `Buffer` - Buffered body that was written to response
    - body `Buffer` - Sugar variable for `res.body`

[`mikeal/request`]: https://github.com/mikeal/request

## Examples
### Proxy server with subpath
`eight-track` can talk to servers that are behind a specific path

```js
// Start up a server that echoes our path
express().use(function (req, res) {
  res.send(req.path);
}).listen(1337);

// Create a server using a `eight-track` middleware to the original
express().use(eightTrack({
  url: 'http://localhost:1337/hello',
  fixtureDir: 'directory/to/save/responses'
})).listen(1338);

// Logs `/hello/world`, concatenated result of `/hello` and `/world` pathss
request('http://localhost:1338/world', console.log);
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint via [grunt](https://github.com/gruntjs/grunt) and test via `npm test`.

## License
Copyright (c) 2014 Uber

Licensed under the MIT license.
