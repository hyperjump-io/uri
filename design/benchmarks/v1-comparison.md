# Comparison with v1

First recorded 2026-11-01, against v1 at `1.4.0`, on Node.js 22.22.1.
Last run 2026-11-13, with the built-in schemes and the trust contract:

| Function | v1 | v2 | v2/v1 |
| --- | --- | --- | --- |
| `parseIri` | 197 | 60 | 0.31x |
| `isIri` | 187 | 141 | 0.75x |
| `resolveIri` | 661 | 318 | 0.48x |
| `toAbsoluteIri` | 327 | 10 | 0.03x |
| `normalizeIri` | 327 | 206 | 0.63x |
| `toRelativeIri` | 1500 | 142 | 0.09x |

Every function is faster than v1. `isIri` checks the schemes' rules,
which v1 didn't. The others trust what they're given, and
`resolveIri`, `toAbsoluteIri`, and `toRelativeIri` don't normalize, so
they do less than v1's (see [Trust](../components/trust.md)).
`toRelativeIri` is given identifiers that are already normalized.

## Before schemes and trust

The rest of this document is from 2026-11-01, before scheme validation
and the trust contract, after `toRelative*` stopped parsing each
identifier twice. It's what validating without captures and then
splitting gained by itself.

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
