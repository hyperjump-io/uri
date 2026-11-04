# `defineScheme`

First recorded 2026-11-04, on Node.js 22.22.1, when `defineScheme`
replaced the schemes' predicates with patterns compiled into one pattern
per scheme (see [Schemes](../components/schemes.md#custom-schemes)). Last
run the same day, after the built-ins' patterns stopped checking
characters again, and `resolveIri` stopped checking a merged result's
authority.

`benchmark/bench-define.js` times `src/` against a snapshot of it from
just before, `benchmark/v2-predicates.js`, each in its own process:
`node benchmark/bench-define.js predicates`, then `patterns`. It uses
`compare.js`'s four identifiers: an `https` URI, one with a query and a
fragment, a `urn:uuid`, and a `file` URI. Times are the median of 5 runs
of 200,000 iterations, in milliseconds.

| Function | Predicates | Patterns | Patterns/predicates |
| --- | --- | --- | --- |
| `isIri` | 315 | 119 | 0.38x |
| `isIri`, the `https` URI | 252 | 122 | 0.48x |
| `isIri`, with a query and a fragment | 269 | 119 | 0.44x |
| `isIri`, the `urn:uuid` | 384 | 119 | 0.31x |
| `isIri`, the `file` URI | 271 | 77 | 0.28x |
| `isIri`, with 3 custom schemes | 321 | 130 | 0.40x |
| `isIri`, a custom scheme with no rules | 87 | 49 | 0.56x |
| `isIri`, four invalid identifiers | 193 | 230 | 1.19x |
| `isUri` | 332 | 150 | 0.45x |
| `assertIri` | 307 | 126 | 0.41x |
| `resolveIri`, four kinds of reference | 371 | 357 | 0.96x |
| `resolveIri`, `#f` | 64 | 61 | 0.95x |
| `normalizeIri` | 205 | 200 | 0.98x |

- A valid identifier is one test of its scheme's pattern, and finding the
  scheme. The pattern alone took 111 milliseconds for the `https` URI,
  where the generic pattern takes 99.
- Finding the scheme by slicing its name out and making it lowercase
  took 33 to 38 milliseconds of each. Comparing the name with the start
  of the value took `isIri` from 163 to 138.
- An invalid identifier is tested against its scheme's pattern, then the
  generic pattern, then each rule, so it takes longer.

Compared with v1 (`compare.js`, the same day), `isIri` is 0.69 times
v1's: 127 against 185. It was 1.73 times with predicates.

On Node.js 24.20.0, in
[Other implementations](other-implementations.md#speed), validating took
130 milliseconds for ASCII and 126 for Unicode, where it took 333 and 317
with predicates, and 265 and 332 for identifier-js.

## Two tests instead of one

Testing the generic pattern, then a pattern with only the scheme's rules,
was slower than one pattern with both. The scheme's pattern was built on
Appendix B's split, with each component a run of characters up to its
delimiter, and the scheme's patterns as lookaheads where the components
start. 800,000 tests of each identifier, without finding the scheme:

| | `https` | `urn:uuid` | `file` |
| --- | --- | --- | --- |
| One pattern, and finding the scheme | 126 | 152 | 107 |
| The generic pattern | 96 | 53 | 48 |
| The scheme's rules on Appendix B's split | 65 | 107 | 58 |
| Both | 166 | 161 | 111 |

The scheme's lookaheads cost `https` about 15 in one pattern, less than a
second test does, which still scans the whole value. What made `urn` and
`file` slow was their patterns checking each character again, with the
generic rules like `pchar`. With only the structure, one pattern took
`urn:uuid` from 140 to 112, and `file` from 101 to 76.

## Resolving

`resolveIri` checks its result's rules one component at a time, with
each pattern sticky and tested where its component starts. 800,000
resolutions of each reference against
`https://json-schema.org/draft/2020-12/schema`:

| Reference | Predicates | Every component | The path, query, and fragment |
| --- | --- | --- | --- |
| `../other.json` | 814 | 862 | 805 |
| `meta/core` | 416 | 458 | 401 |

- With every component checked, `https`'s host was a regular expression,
  where its predicate was `host !== ""`.
- A reference without an authority keeps the base's, which is trusted, so
  only the components it can change are checked, and `https` has no rules
  for those.
- Slicing a component out to test its pattern, before patterns were
  sticky, made the four kinds of reference take 441, against 403 for the
  snapshot in the same runs.

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
