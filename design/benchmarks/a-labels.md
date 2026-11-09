# A-labels

First recorded 2026-11-09, on Node.js 22.22.1, when `http` and `https`
hosts' `xn--` labels had to be A-labels, and `normalizeIri` converted
them to Unicode (see [Domain names](../components/domain-names.md)).

`benchmark/bench-punycode.js` times `src/` against a snapshot from before
(`benchmark/v2-before-punycode/`, from `9b0263c`). Run each in its own
process: `node benchmark/bench-punycode.js before`, then `now`. Times
are nanoseconds a call, the mean of two runs of each, and each run is
the median of 5 runs of 200,000 iterations of four calls.

`isIri` and `normalizeIri` without `xn--` are of `compare.js`'s four
identifiers. The one label is `https://xn--rsum-bpad.example/a/b`, the two
are `https://xn--caf-dma.xn--rsum-bpad.example/a/b`, the invalid one is
`https://xn--abc.example/a/b`, and the path is
`https://example.com/xn--a`.

| | Before | Now |
| --- | --- | --- |
| `isIri`, no `xn--` | 151 | 162 |
| `isIri`, `xn--` in the path | 104 | 371 |
| `isIri`, one `xn--` label | 158 | 1,568 |
| `isIri`, two `xn--` labels | 225 | 2,606 |
| `isIri`, an invalid `xn--` label | 129 | 1,042 |
| `isUri`, one `xn--` label | 214 | 1,710 |
| `assertIri`, one `xn--` label | 160 | 1,648 |
| `normalizeIri`, no `xn--` | 246 | 256 |
| `normalizeIri`, a Unicode host | 226 | 241 |
| `normalizeIri`, one `xn--` label | 228 | 766 |
| `normalizeIri`, two `xn--` labels | 223 | 1,008 |
| `normalizeUri`, one `xn--` label | 218 | 236 |

`benchmark/bench-punycode-parts.js` times the parts of a label's check:

| | Nanoseconds |
| --- | --- |
| Decoding `rsum-bpad` | 175 |
| `new URL`, a valid Unicode host | 809 |
| `new URL`, an invalid host, which throws | 3,696 |
| `URL.parse`, a valid Unicode host | 814 |
| `URL.parse`, an invalid host, which returns `null` | 484 |
| `new URL`, an ASCII host | 221 |

Before the check was in validation, `normalizeIri` converted only the
labels that passed the round trip, and left the rest. It took 1,780
nanoseconds for one label, 2,290 for two, and 5,300 for an invalid label
with `new URL`, or 1,120 with `URL.parse`.

The hint was a regular expression at first,
`/^[^:]*:\/\/[^/?#]*xn--/i`, which only matches in the authority. With it,
`isIri` without `xn--` took 179 nanoseconds, and with `xn--` in the path,
154. The `indexOf` scan for `--` is faster for the first and splits the
second.

`benchmark/differential-punycode.js` checks 300,000 random labels on
three seeds: the decoder against Node's deprecated `punycode.decode`,
that an `http` IRI with a label is valid only when Node's
`url.domainToUnicode` converts it, that `assertIri` throws a host
`component-mismatch` for an invalid one, and that `normalizeIri`'s result
is valid, normalizes to itself, has no `xn--`, and is the same host to
`URL`. It found no differences. It also checks that `normalizeUri`, IP
literals, and a scheme other than `http` aren't converted.
