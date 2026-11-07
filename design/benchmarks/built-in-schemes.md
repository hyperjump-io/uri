# Built-in schemes

First recorded 2026-11-06, on Node.js 22.22.1, when custom schemes were
dropped and unknown schemes got the generic syntax only (see
[Schemes](../components/schemes.md#unknown-schemes)).

`benchmark/bench-builtins.js` times `src/` against a snapshot from before
(`benchmark/v2-custom-schemes/`, from `0d29a79`). The snapshot is given
the schemes `src/` doesn't know, `foo` and `did`, as custom schemes with
no rules, which is what it needed to answer at all. Run each in its own
process: `node benchmark/bench-builtins.js before`, then `now`. Times are
the median of 5 runs of 200,000 iterations, in milliseconds, from the
second of two runs of each, which agreed within 2%.

`isIri` and `assertIri` are of `compare.js`'s four identifiers. The
unknown scheme is `foo://example.com/a/b?x=1#/$defs/foo`, four times, and
`did` is `did:example:123456789abcdefghi`, four times. `resolveIri` is of
four references against an `https` base, or a `foo` one.

| | Before | Now | Now/before |
| --- | --- | --- | --- |
| `isIri` | 128 | 122 | 0.95x |
| `isIri`, an unknown scheme | 117 | 120 | 1.03x |
| `isIri`, `did` | 52 | 102 | 1.96x |
| `assertIri` | 130 | 122 | 0.94x |
| `resolveIri` | 361 | 359 | 0.99x |
| `resolveIri`, an unknown scheme | 283 | 296 | 1.05x |
| `normalizeIri` | 209 | 193 | 0.92x |
| `normalizeIri`, an unknown scheme | 192 | 199 | 1.04x |

`did` takes twice as long because it has rules now, where the snapshot's
had none.

The first build took 170 for `isIri` of an unknown scheme. A value whose
scheme isn't built in took the slow path: the generic pattern, then
`checkScheme`, which sliced the scheme's name out and scanned the
built-ins again. The validators find the built-in scheme once now, and
give it to `checkScheme`, so a value without one is the generic pattern
and the check for a future IP literal.

`benchmark/differential-builtins.js` compares every function with the
snapshot, given the new built-ins as custom schemes, and asked again with
an unknown scheme or URN namespace defined with no rules when it throws
for one. It found no differences in about 3,750,000 checks on each of
three seeds.
