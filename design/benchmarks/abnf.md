# ABNF

First recorded 2026-11-04, on Node.js 22.22.1, from a prototype of the
compiler from ABNF to regular expressions (see
[ABNF](../components/abnf.md)). Last run the same day, when it was built
(see [Built](#built)). The prototype compiled `{ abnf }` rules in
`defineScheme`, and wrote every built-in in ABNF. It's
`benchmark/abnf.js`, with `benchmark/v2-abnf.js`, a copy of `src/` that
uses it.

## Checked by differential testing

`benchmark/differential-abnf.js` is `differential-define.js` with the
prototype against `src/`, and the custom schemes written in ABNF for the
prototype and as `RegExp`s for `src/`. Every validator, every assertion,
`normalizeIri`, and `resolveIri` against nine bases had to give the same
answers and the same errors. On three seeds, about 238,000 inputs and 3.4
million checks each, nothing differed. The tests in `src/` passed against
the prototype too.

Two changes showed the test can tell:

- `"/a"` in place of `%s"/a"` in a custom scheme, which is
  case-insensitive in ABNF and not in the `RegExp`, made 12 differences.
- Not removing the delimiters from character sets made 17,859, like
  `http://?` being valid. That's what makes a compiled pattern exact.

## Speed

`benchmark/bench-abnf.js` is `bench-define.js` with the prototype
against `src/`, each in its own process: `node benchmark/bench-abnf.js
patterns`, then `abnf`. Times are the median of 3 processes, each the
median of 5 runs of 200,000 iterations, in milliseconds.

| Function | `RegExp`s | ABNF | ABNF/`RegExp`s |
| --- | --- | --- | --- |
| `isIri` | 120 | 119 | 0.99x |
| `isIri`, the `https` URI | 122 | 117 | 0.96x |
| `isIri`, with a query and a fragment | 118 | 118 | 1.00x |
| `isIri`, the `urn:uuid` | 118 | 121 | 1.03x |
| `isIri`, the `file` URI | 76 | 76 | 1.00x |
| `isIri`, with 3 custom schemes | 129 | 128 | 0.99x |
| `isIri`, a custom scheme with no rules | 50 | 50 | 1.00x |
| `isIri`, four invalid identifiers | 230 | 234 | 1.02x |
| `isUri` | 151 | 146 | 0.97x |
| `assertIri` | 126 | 124 | 0.98x |
| `resolveIri`, four kinds of reference | 361 | 358 | 0.99x |
| `resolveIri`, `#f` | 60 | 59 | 0.98x |
| `normalizeIri` | 198 | 198 | 1.00x |

It took the compiler's rewrites to get there (see
[Rewrites](../components/abnf.md#rewrites)). Compiled directly, `file`
took 82 and `urn:uuid` 125:

- `file`'s `path-absolute` was nested loops,
  `\/(?:(?:[^#%/?]|%HH)+(?:\/(?:[^#%/?]|%HH)*)*)?`. Matching `%` as one
  character and the star identities made it `\/(?:[^#/?][^#?]*)?`, and
  `file` took 79. As `\/(?!\/)[^?#]*`, it took 76, which is the
  hand-written pattern. Four forms of it in `src/`, each in 3
  processes: 79 to 80 for the nested form with or without escapes, and
  75 to 77 for `(?!\/)`.
- `urn`'s classes were ASCII written out in ranges, like
  `[\u{21}\u{24}-\u{2E}0-\u{3B}\u{3D}\u{40}-Z\u{5F}a-z\u{7E}]`. Choosing
  whichever class has the fewest ranges gave
  `[^#/?\u{A0}-\u{10FFFF}]`, and starting its last range at U+7F, which
  the alphabet allows, gave `[^#/?\u{7F}-\u{10FFFF}]`. 2 million tests of
  `urn:uuid`'s pattern by itself, the second of two rounds:

  | Last range starts at | Milliseconds |
  | --- | --- |
  | U+A0 | 282 |
  | U+80 | 258 |
  | U+7F | 254 |

  Widening every range as far as the alphabet allows made single
  characters into classes, like `[>?]` for `?`, and the same test took
  280.

Single patterns timed in one process were misleading: the first of two
rounds differed by up to 10% where the second didn't. The table above is
from separate processes.

## Loading

`benchmark/load-abnf.js` times importing the library, then
`defineScheme` with a path rule, 2,000 times, in its own process. The
median of 3:

| | `RegExp`s | ABNF |
| --- | --- | --- |
| Importing the library | 5 ms | 27 ms |
| `defineScheme` | 81 µs | 173 µs |

Most of the difference was compiling the built-ins: about 8 milliseconds
for `http`'s and `https`'s host, which inline RFC 3986's `IP-literal`, and
about 6 for parsing RFC 3986's and RFC 3987's rules. Before compiled
character sets were kept and set operations were linear, the host took 22
milliseconds by itself.

Built with esbuild 0.24.0, minified:

| | `RegExp`s | ABNF |
| --- | --- | --- |
| Minified | 22.6 KB | 39.6 KB |
| Gzipped | 8.1 KB | 13.7 KB |

That's why the built-ins' patterns are generated, and the compiler is a
package of its own (see [Shipping](../components/abnf.md#shipping)).

## Built

When the compiler was built, with contexts and the built-ins' patterns
generated into `src/patterns.js`, `src/` was compared with a snapshot of
itself from just before, with the hand-written patterns
(`benchmark/v2-hand-patterns.js`, from `8e8816e`).

`benchmark/differential-generated.js` is `differential-abnf.js` with
`src/` against the snapshot, and the custom schemes compiled with the
contexts. On three seeds, about 238,000 inputs and 3.4 million checks
each, nothing differed. `"/a"` in place of `%s"/a"` made 12 differences
again.

`benchmark/bench-generated.js` is `bench-abnf.js` with the snapshot
(`hand`) against `src/` (`generated`). The machine was slower than for
the prototype's runs, by about 1.7 times for both, so the columns compare
and the runs don't. The median of 3 processes:

| Function | Hand-written | Generated | Generated/hand-written |
| --- | --- | --- | --- |
| `isIri` | 207 | 209 | 1.01x |
| `isIri`, the `https` URI | 207 | 206 | 1.00x |
| `isIri`, with a query and a fragment | 202 | 208 | 1.03x |
| `isIri`, the `urn:uuid` | 205 | 205 | 1.00x |
| `isIri`, the `file` URI | 131 | 129 | 0.98x |
| `isIri`, with 3 custom schemes | 223 | 224 | 1.00x |
| `isIri`, a custom scheme with no rules | 85 | 85 | 1.00x |
| `isIri`, four invalid identifiers | 403 | 400 | 0.99x |
| `isUri` | 260 | 253 | 0.97x |
| `assertIri` | 214 | 217 | 1.01x |
| `resolveIri`, four kinds of reference | 637 | 632 | 0.99x |
| `resolveIri`, `#f` | 109 | 109 | 1.00x |
| `normalizeIri` | 339 | 348 | 1.03x |

Importing the library, 10 times each in its own process, took a median
of 13.2 milliseconds with the hand-written patterns and 14.1 with the
generated ones, which are another module of 5 KB. The runs of each
spread over more than that, from 11 to 18 milliseconds.
