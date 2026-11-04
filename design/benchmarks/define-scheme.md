# `defineScheme`

First recorded 2026-11-04, on Node.js 22.22.1, when `defineScheme`
replaced the schemes' predicates with patterns compiled into one pattern
per scheme (see [Schemes](../components/schemes.md#custom-schemes)).

`benchmark/bench-define.js` times `src/` against a snapshot of it from
just before, `benchmark/v2-predicates.js`, each in its own process:
`node benchmark/bench-define.js predicates`, then `patterns`. It uses
`compare.js`'s four identifiers: an `https` URI, one with a query and a
fragment, a `urn:uuid`, and a `file` URI. Times are the median of 5 runs
of 200,000 iterations, in milliseconds.

| Function | Predicates | Patterns | Patterns/predicates |
| --- | --- | --- | --- |
| `isIri` | 312 | 138 | 0.44x |
| `isIri`, the `https` URI | 255 | 122 | 0.48x |
| `isIri`, with a query and a fragment | 267 | 120 | 0.45x |
| `isIri`, the `urn:uuid` | 385 | 140 | 0.36x |
| `isIri`, the `file` URI | 282 | 99 | 0.35x |
| `isIri`, with 3 custom schemes | 320 | 148 | 0.46x |
| `isIri`, a custom scheme with no rules | 87 | 49 | 0.56x |
| `isIri`, four invalid identifiers | 195 | 232 | 1.19x |
| `isUri` | 334 | 170 | 0.51x |
| `assertIri` | 309 | 144 | 0.47x |
| `resolveIri`, four kinds of reference | 371 | 399 | 1.08x |
| `resolveIri`, `#f` | 64 | 60 | 0.94x |
| `normalizeIri` | 209 | 223 | 1.07x |

- A valid identifier is one test of its scheme's pattern, and finding the
  scheme. The pattern alone took 111 milliseconds for the `https` URI,
  where the generic pattern takes 99, and 123 for the `urn:uuid`, which
  has RFC 8141's lookahead, its namespace's, and the generic path.
- Finding the scheme by slicing its name out and making it lowercase
  took 33 to 38 milliseconds of each. Comparing the name with the start
  of the value took `isIri` from 163 to 138.
- An invalid identifier is tested against its scheme's pattern, then the
  generic pattern, then each rule, so it takes longer.
- `resolveIri` and `normalizeIri` didn't change. Between runs of the
  snapshot, `resolveIri` took 371 to 408, and `normalizeIri` 204 to 209.
  Slicing a component out to test its pattern made `resolveIri` 441,
  and testing a sticky pattern where the component starts made it 395,
  in the same runs where the snapshot took 403.

Compared with v1 (`compare.js`, the same day), `isIri` is 0.78 times
v1's: 153 against 198. It was 1.73 times with predicates.

On Node.js 24.20.0, in
[Other implementations](other-implementations.md#speed), validating took
151 milliseconds for ASCII and 134 for Unicode, where it took 337 and 334
with predicates, and 268 and 328 for identifier-js.

## Checked by differential testing

`benchmark/differential-define.js` runs the snapshot and `src/` on the
same random inputs as the other differential tests, with the same custom
schemes written as predicates for the snapshot and as patterns for
`src/`: two with no rules, one with a required authority, a forbidden
port, and patterns on the path and the query, one with required and
forbidden components only, and a `urn` with two namespaces, one with a
pattern. Every validator, every assertion, `normalizeIri`, and
`resolveIri` against nine bases had to give the same answers and the same
errors, spans and messages included. On three seeds, about 238,000 inputs
and 3.4 million checks each, nothing differed.

With `http`'s host as `/.+/u`, which can match the path after an empty
host, the first seed found 18,365 differences, like `http://?`, which the
predicates rejected.
