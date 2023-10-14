# tsdocs-test

Run code documentation as tests using `@example` directives.

## Features

- [ ] Accurate sourcemaps support.
- [ ] Framework agnostic for integration.

## Caveats (Currently)

- Uses regex for finding JSDOC comments, rather than the typescript compiler due to simplicity in implementation. If anyone can figure this out that would be awesome!
- Sourcemaps aren't translated yet, but will happen soon.
