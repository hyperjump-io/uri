# Getters

First recorded 2026-11-04, on Node.js 22.22.1, when `getScheme`,
`getPath`, `getQuery`, and `getFragment` were added (see
[Parsing](../components/parsing.md#getters)).

`benchmark/getters.js` times each getter against the same component from
`parseIri`, in one process. The scheme is of `compare.js`'s four
identifiers. The others are of eight references: those four, `#/$defs/foo`,
`../other.json`, `https://example.com/schema#foo`, and `meta/core`. Times
are the median of 5 runs of 1,000,000 iterations, in milliseconds, from the
second of two runs of the script, which agreed within 3%.

| Component | `parseIri` | Getter | Getter/`parseIri` |
| --- | --- | --- | --- |
| Scheme, of 4 | 536 | 83 | 0.15x |
| Path, of 8 | 864 | 538 | 0.62x |
| Query, of 8 | 903 | 241 | 0.27x |
| Fragment, of 8 | 909 | 162 | 0.18x |

`toAbsoluteIri` of the 8 took 181, about what `getFragment` takes, since
both are one `indexOf("#")` and a slice.

`getPath` needs where the path ends, which is `indexOf("#")` and
`indexOf("?")` over the whole value, as `split` does, so it only saves
building the components. Three ways of finding its end, in one process, the
second of two rounds:

| | Milliseconds |
| --- | --- |
| `indexOf`, as built | 639 |
| A loop over `charCodeAt` from the path's start | 777 |
| A global regular expression from the path's start | 957 |
| `parseIri(value).path` | 958 |

V8's `indexOf` is faster than a loop in JavaScript, even over more of the
string.
