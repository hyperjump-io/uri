# Comparison with v1

First recorded 2026-11-01, against v1 at `1.4.0`. Last run 2026-11-01,
after `toRelative*` stopped parsing each identifier twice.

`benchmark/compare.js` times each IRI function in v1, in v2 when it
parsed with capture groups, and in v2, on the same four identifiers: an
`https` URI, one with a query and a fragment, a `urn`, and a `file` URI.
`resolveIri` resolves four kinds of reference against the first, and
`toRelativeIri` finds each identifier relative to the first. Times are
the median of 5 runs of 200,000 iterations, in milliseconds.

| Function | v1 | v2, capture groups | v2 | v2/v1 |
| --- | --- | --- | --- | --- |
| `parseIri` | 193 | 220 | 142 | 0.73x |
| `isIri` | 182 | 184 | 84 | 0.46x |
| `resolveIri` | 640 | 594 | 479 | 0.75x |
| `toAbsoluteIri` | 314 | 331 | 245 | 0.78x |
| `normalizeIri` | 315 | 327 | 262 | 0.83x |
| `toRelativeIri` | 1621 | 1622 | 646 | 0.40x |

- With capture groups, `parseIri` was 1.15 times slower than v1, because
  it built an object with only the components that are there, instead of
  returning the regular expression's `groups` (see
  [Identifiers](../components/identifiers.md#components)).
- Validating without captures and then splitting made every function
  faster than v1 (see [Parsing](../components/parsing.md)). `isIri` gains
  the most, because it no longer captures anything.
- The functions that compose an identifier gain less, because composing
  and normalizing the result is a large part of them.
- `toRelativeIri` was 0.82x before it normalized components instead of
  parsing each identifier twice. Timed before and after that change, each
  in its own process on Node.js 24, it went from 1,527 to 861
  milliseconds, and `normalizeIri`, `resolveIri`, and `toAbsoluteIri`
  didn't change by more than the noise between runs. `normalizeIri` is
  0.76x to 0.83x from one run of this benchmark to the next.
