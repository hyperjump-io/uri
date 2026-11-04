# Schemes and trust

These are the times of the predicates that schemes had at first. Since
then, `defineScheme` compiles patterns, and `isIri` is 0.44 times what it
was here (see [`defineScheme`](define-scheme.md)).

First recorded 2026-11-03, on Node.js 22.22.1, when scheme validation and
the trust contract were built (see [Schemes](../components/schemes.md)
and [Trust](../components/trust.md)).

`benchmark/bench-schemes.js` times `src/` against a snapshot of it from
just before, `benchmark/v2-before-schemes.js`, each in its own process:
`node benchmark/bench-schemes.js before`, then `now`. It uses
`compare.js`'s four identifiers: an `https` URI, one with a query and a
fragment, a `urn:uuid`, and a `file` URI. Times are the median of 5 runs
of 200,000 iterations, in milliseconds.

| Function | Before | After | After/before |
| --- | --- | --- | --- |
| `isIri` | 81 | 311 | 3.84x |
| `isIri`, a `did:` identifier, with no rules | 50, generic only | 87 | 1.74x |
| `isIri`, with 3 custom schemes | | 320 | |
| `assertIri`, against the old `parseIri`'s check | 144 | 314 | 2.18x |
| `parseIri` | 143 | 58 | 0.41x |
| `resolveIri`, four kinds of reference | 506 | 372 | 0.74x |
| `resolveIri`, `#f` | 379 | 64 | 0.17x |
| `toAbsoluteIri` | 243 | 7 | 0.03x |
| `normalizeIri` | 258 | 206 | 0.80x |
| `toRelativeIri`, normalized | 589 | 139 | 0.24x |

- The functions that trust their input are 1.25 to 35 times faster. Most
  of what they did before was the pattern, which they no longer test, and
  `resolveIri` and `toRelativeIri` no longer normalize.
- `isIri` pays for the schemes' rules. The lookup is a small part of it:
  a scheme with no rules costs 37 milliseconds more than the generic
  check alone, and three custom schemes in the list cost no more than
  none. The rest is splitting the identifier for the rules, and the
  patterns of `urn` (its path, and `uuid`'s NSS) and `file` (its path).
- Per identifier, before and after: 104 and 260 for the `https` URI, 111
  and 265 with a query and a fragment, 60 and 375 for the `urn:uuid`, and
  58 and 278 for the `file` URI, in 800,000 iterations each.
- Checking only the components a scheme has rules for, in any order, took
  `isIri` from 358 to 311. The components' order is only needed to report
  the first that fails.

Compared with v1 (`compare.js`, the same day), `isIri` is now 1.73 times
slower than v1's: 318 against 183. Every other function is faster than
v1's, but they also do less, since v1's checked and normalized.

| Function | v1 | v2 | v2/v1 |
| --- | --- | --- | --- |
| `parseIri` | 195 | 59 | 0.31x |
| `isIri` | 183 | 318 | 1.73x |
| `resolveIri` | 651 | 375 | 0.58x |
| `toAbsoluteIri` | 321 | 10 | 0.03x |
| `normalizeIri` | 322 | 207 | 0.64x |
| `toRelativeIri` | 1476 | 142 | 0.10x |

## Size

`src/index.js` went from 36,854 bytes to 60,382, and from 9,513 to 15,003
gzipped, comments included. It wasn't minified, because esbuild isn't
installed here.

## Checked by differential testing

`benchmark/differential-schemes.js` runs the snapshot and `src/` on the
same random inputs as the other differential tests, plus the built-in
schemes' delimiters and parts. For a scheme with no rules, every function
has to give the snapshot's answer: `is*` the same booleans, `assert*` the
old parsers' errors, `parseIri` the same components, `normalizeIri` the
same string, and `normalizeIri(resolveIri(...))` and
`toRelativeIri(normalizeIri(...), normalizeIri(...))` what the snapshot's
`resolveIri` and `toRelativeIri` gave. A built-in scheme may only reject
more, and its errors' spans have to be in the value. On three seeds, about
235,000 inputs and 1.83 million checks each, nothing differed but the
percent-encoded dot segments in
[Resolving](../components/resolving.md#percent-encoded-dot-segments), 6 on
one seed.
