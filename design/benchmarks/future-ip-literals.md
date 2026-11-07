# Future IP literals

First recorded 2026-11-06, on Node.js 22.22.1, when
`UnsupportedIpVersionError` was dropped and an IP literal of a future
version became a host like any other (see
[Future IP versions](../components/future-ip-versions.md)).

`benchmark/bench-ip.js` times `src/` against a snapshot from before
(`benchmark/v2-ip-error/`, from `0c248d1`). Run each in its own process:
`node benchmark/bench-ip.js before`, then `now`. Times are the median of
5 runs of 200,000 iterations, in milliseconds, from the second of two
runs of each, which agreed within 3%.

`isIri` and `assertIri` are of `compare.js`'s four identifiers, and the
invalid values are `https:///a`, `urn:uuid:x`, `file:a`, and
`https://a b/`. The unknown scheme is
`foo://example.com/a/b?x=1#/$defs/foo` and the IPv6 literal is
`https://[::1]:8080/a`, four times each. `isIriReference` is of
`#/$defs/foo`, `../other.json`, and two of the identifiers.

| | Before | Now | Now/before |
| --- | --- | --- | --- |
| `isIri` | 123 | 120 | 0.98x |
| `isIri`, an unknown scheme | 118 | 112 | 0.95x |
| `isIri`, invalid | 192 | 40 | 0.21x |
| `isIri`, an IPv6 literal | 127 | 126 | 0.99x |
| `isIriReference` | 104 | 98 | 0.94x |
| `assertIri` | 123 | 122 | 0.99x |

An invalid value took the slow path before, the generic pattern and the
scheme's rules, only to see whether it had a future IP literal to throw
for. `is*` is the scheme's pattern alone now, and `assert*` still takes
the slow path, to say what's wrong.

`benchmark/differential-ip.js` compares every function with the
snapshot, except the answers the snapshot threw
`UnsupportedIpVersionError` for, and checks that `is*` and `assert*`
agree on every input, those included. It found no differences in about
1,460,000 checks on each of three seeds, with about 2,800 answers that
threw before.
