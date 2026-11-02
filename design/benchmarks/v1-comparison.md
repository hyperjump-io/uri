# Comparison with v1

First recorded 2026-11-01, against v1 at `1.4.0`.

`benchmark/compare.js` times each IRI function in v1 and v2 on the same
four identifiers: an `https` URI, one with a query and a fragment, a
`urn`, and a `file` URI. `resolveIri` resolves four kinds of reference
against the first. Each row is the median of 5 runs of 200,000
iterations.

| Function | v2/v1 |
| --- | --- |
| `parseIri` | 1.17x |
| `isIri` | 1.00x |
| `resolveIri` | 0.92x |
| `toAbsoluteIri` | 1.04x |
| `normalizeIri` | 1.06x |

- `parseIri` is slower because it builds an object with only the
  components that are there, instead of returning the regular
  expression's `groups` (see
  [Identifiers](../components/identifiers.md#components)).
- The others parse too, but they're at parity. Composing and normalizing
  the result is most of their cost.

## Building or deleting

`benchmark/parse-shape.js` compares ways of making the result from a
simplified pattern's `groups`, on the same four identifiers. Times are
for 300,000 iterations, in milliseconds.

| Result | Time |
| --- | --- |
| v1's `groups`, with `path2` deleted | 231 |
| A new object with only the components that are there | 279 |
| `groups` with every `undefined` group deleted | 584 |
