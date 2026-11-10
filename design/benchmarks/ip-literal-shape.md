# IP-literal's shape

First recorded 2026-11-10, on Node.js 22.22.1, when the patterns got
`IP-literal`'s shape in place of the rule, and `hasValidIpLiteral`
started checking it on its own (see
[Grammar](../components/grammar.md#ip-literals)). The snapshot from before
is `benchmark/v2-before-ip-shape/`, from `4ca56b3`.

## Where a first use went

`json-schema` compiled its first schema in about 18 milliseconds, and
running it with `--no-regexp-tier-up` halved that. Most of the difference
was the first use of `@hyperjump/uri`'s large patterns. Each of these is
the first two `test` calls in a fresh process, which is when V8 compiles
a pattern to bytecode and then to native code. Milliseconds:

| Pattern, before | Length | Default | No peephole optimization | No tier-up |
| --- | --- | --- | --- | --- |
| `uriPattern` | 3,146 | 5.9 | 2.5 | |
| `iriReferencePattern` | 12,058 | 12.7 | 5.1 | 2.3 |
| `https`'s IRI pattern | 7,082 | 11.2 | 4.7 | |

"No peephole optimization" is `--no-regexp-peephole-optimization`, and
the same on Node.js 23.7.0. With `--regexp-interpret-all`, the first call
was as slow and the second took no measurable time, so it's compiling,
not matching. Taking parts out of the patterns, only to measure them:

| First call of each, in ms | Before | No `IPv6address` | `ucschar` as one range | Both |
| --- | --- | --- | --- | --- |
| `uriPattern` | 4.8 | 0.5 | 7.3 | 0.5 |
| `iriReferencePattern` | 10.9 | 1.1 | 10.9 | 1.0 |
| `https`'s IRI pattern | 9.0 | 4.3 | 15.5 | 4.3 |

`https`'s pattern still took 4.3 milliseconds without `IPv6address` in the
generic rules, because its host rule, `httpHost`, had `IP-literal` too.

## First use

`benchmark/cold-ip-shape.js` times the first two calls of one function
in a fresh process. Milliseconds, the median of 3:

| | Before | Now |
| --- | --- | --- |
| `assertIriReference("#/definitions/a")` | 13.4 | 1.5 |
| `isIriReference("../other.json#/a")` | 12.7 | 1.4 |
| `assertIri("https://openui5.org/schema/m.json")` | 10.8 | 0.7 |
| `isUri("https://openui5.org/schema/m.json")` | 10.7 | 0.7 |
| `isIri` of a `urn:uuid:` | 0.4 | 0.4 |
| `isIri("http://[::1]/a")` | 10.7 | 5.2 |

A value with an IP literal still compiles `ipLiteralPattern`, which is
most of what's left for `http://[::1]/a`. Importing the library took about
the same, 7 milliseconds, because a pattern isn't compiled until it's used.

In the jsonschema-benchmark, `json-schema`'s compile time over its 36
schemas went from a geometric mean of 40.7 milliseconds to 20.3, and
every schema was faster, by 8 to 37 milliseconds.

## After warming up

`benchmark/bench-ip-shape.js` times both versions in one process.
Nanoseconds a call, the best of 25 runs of 10,000 calls, from two runs:

| | Before | Now |
| --- | --- | --- |
| `isIri`, `https` | 205 | 222 |
| `assertIriReference`, `https` | 205 | 224 |
| `isUri`, `https` | 262 | 286 |
| `isIri`, `urn:uuid:` | 181 | 184 |
| `assertIriReference`, relative | 106 | 116 |
| `isIri`, Unicode | 189 | 201 |
| `isIri`, an IPv6 host | 662 | 353 |
| `normalizeIri`, `https` | 270 | 264 |

Across both runs, a value without an IP literal was 1 to 14 percent
slower, up to 25 nanoseconds, which is the `indexOf("[")`. A value with an
IPv6 host was about twice as fast. `normalize*` didn't change.

## Same answers

`benchmark/differential-ip-shape.js` compares every `is*`, `assert*`, and
`normalize*` function with the snapshot's, including each error's class,
message, and fields. Its 60,000 values are IP literals, valid and not,
and random strings in brackets, with every kind of scheme, userinfo, and
what comes after the host. There were no differences on each of three
seeds, 840,000 checks each. `benchmark/differential-ip.js` against the
snapshot also had none, on 1.46 million checks for each of three seeds.
