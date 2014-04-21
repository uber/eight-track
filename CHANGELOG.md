# eight-track changelog
2.0.0 - Allow subpaths for proxy URLs. Fixes #2

1.9.1 - Cleaned up files left by `git-sqwish`

1.9.0 - Moved body from string to buffer. Fixes #17

1.8.0 - Refactored `eight-track` again; see https://github.com/uber/eight-track/pull/27 for details

1.7.0 - Added `forwardRequest` method

1.6.1 - Increased performance test threshold for Travis CI

1.6.0 - Moved to deep clone for `pickMessageInfo`. Fixes #22

1.5.0 - Stopped following redirects for all requests. Fixes #18

1.4.1 - Bumping version due to bad publish

1.4.0 - Added memory cache for faster requests

1.3.1 - Added documentation for `normalizeFn`

1.3.0 - Truncate urls in filenames to 32 characters

1.2.0 - Added `normalizeFn` as an option

1.1.0 - Break down eight-track into `middleware`, `EightTrack`, `connections`, and `fs-store`

1.0.0 - Moved `response` information into namespace and started saving `request` information

0.2.0 - Fixed `Host` header regression. Fixed #4

0.1.0 - Initial release
