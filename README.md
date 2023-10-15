# jsdoc-as-tests

Run code documentation as tests using `@example` directives.

Work in progress, it's not even on NPM yet. Use with caution.
You'll likely need to fork this locally to get a js build working locally for now.

## Features

- [ ] Accurate sourcemaps support.
- [ ] Framework agnostic for integration.

## How it works

Within your runnable code you can add a jsdoc style comment like below:

```ts
/**
 * @example Title of your test
 * ```language 
 * import * as assert from 'node:assert'
 *
 * // include assertions, usually with the assertion library of your choice.
 * assert.equal("7", "7")
 * ```
 *
 */
export const implementation = "Crikey!"
```

The core library will produce a function currently called `getCodeComments` that exracts the codeblocks out and allows the test runner to apply transformations to the code.
The test runner is responsible for calling `getCodeComments` and producing results that the test runner understands.

Badabing, badaboom, code examples as tests.

## Caveats (Currently)

- Uses regex for finding JSDOC comments, rather than the typescript compiler due to simplicity in implementation. If anyone can figure this out that would be awesome, but not even sure if it's worth it.
- Sourcemaps aren't translated yet, but will happen soon.
- Sourcemaps are mostly plugged into integrations.
