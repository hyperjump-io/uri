# Order in a file

What a file exports comes first, and the helpers it uses come after it.
Opening a file shows what it does, without scrolling past the helpers to
get to the point.

- Imports, then constants the exports use, then the exports, then the
  helpers that aren't exported.
- A file with several exports has all of them before its helpers.
- A test file is its `describe` and `test` calls, then its helpers.
- Something used while the module loads has to come before what uses it,
  because only function declarations are hoisted.

In `src/index.js`, the grammar's regular expressions are constants the
exports use, so they come first. Most exports are made by a helper called
while the module loads, like `createValidator(uriPattern)`. Those helpers
are function declarations, so they're hoisted and can come after the
exports. The other helpers are arrow functions, which are only called
after the module has loaded. The strategies make their errors in arrow
functions, because the error classes are exports and aren't defined yet
when the strategies are. `rules`, which builds the grammar's patterns, is
an arrow function among the constants, because it belongs to the grammar
and the module calls it right after defining it.
