# Parsing strategies

First recorded 2026-11-01. These are the measurements behind
[Parsing](../components/parsing.md). The scripts are `benchmark/breakdown.js`,
`benchmark/split.js`, and `benchmark/parse-shape.js`. Times are the
median of 3 runs, in milliseconds.

## Where the time goes

300,000 iterations over the four identifiers in
[Comparison with v1](v1-comparison.md), with the version that used
capture groups:

| | Time |
| --- | --- |
| `parseIri` | 335 |
| `isIri` | 280 |
| The IRI pattern's `exec`, with named groups | 271 |
| The same pattern with every group made non-capturing, `test` | 114 |

Matching was most of `parseIri`, and captures were most of matching.

## Ways to parse

200,000 iterations over six identifiers: the four, one with `userinfo`,
`port`, a query, and a fragment, and one with an IPv6 host and a port.
Each prototype gave the same components as `parseIri` for all six.

| | Time |
| --- | --- |
| `parseIri`, one pattern with named groups | 350 |
| Appendix B's regular expression to split, then a capture-free pattern for each component | 387 |
| `indexOf` to split, then a capture-free pattern for each component | 333 |
| The whole rule's capture-free pattern, then `indexOf` to split | 244 |

## Making the result

300,000 iterations over the four identifiers, with a simplified pattern,
to compare only how the result is made from `match.groups`:

| Result | Time |
| --- | --- |
| v1's `groups`, with `path2` deleted | 231 |
| A new object with only the components that are there | 279 |
| `groups` with every `undefined` group deleted | 584 |

Splitting replaced all three, so this only matters for the rejected
alternatives.
