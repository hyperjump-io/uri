# Other implementations

First recorded 2026-11-01, on Node.js 24.20.0, against identifier-js
0.5.4, fast-uri 4.2.3, uri-js 4.4.1, and Node.js's `URL`. Last run
2026-11-09, after `http` and `https` A-labels were checked and converted
(see [A-labels](a-labels.md)), with v1, v2 from before schemes, v2 with
predicates, and v2 from before A-labels added.

The scripts are in `benchmark/other-implementations/`, which has its own
`package.json` so the other libraries aren't dependencies of this one.
Install them with `npm ci` and run `node run-all.mjs`, both with Node.js
24. identifier-js 0.5.4 requires Node.js 24. On Node.js 22, npm installs
0.0.15, from August, without saying so.

`libs.mjs` maps each operation to each library's closest equivalent, on
IRIs where the library has them. `check.mjs` prints every result, and
they all agree on the ASCII inputs. v1 is `benchmark/v1/`, from the
`v1.4.0` tag, v2 before schemes is `benchmark/v2-before-schemes.js` (see
[Schemes and trust](schemes-and-trust.md)), v2 with predicates is
`benchmark/v2-predicates.js` (see [`defineScheme`](define-scheme.md)), and
v2 before A-labels is `benchmark/v2-before-punycode/`, from `9b0263c`.

## Speed

`time.mjs` runs 200,000 iterations over four inputs, each library and
operation in its own process, after 3 warm-up runs. Times are the median
of 5 runs, in milliseconds.

| Operation | v1 | v2, before schemes | v2, predicates | v2, before A-labels | v2 | identifier-js | fast-uri | uri-js | `URL` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Validate, ASCII | 210 | 106 | 334 | 135 | 143 | 278 | 909 | 1080 | 70 |
| Validate, Unicode | 227 | 109 | 313 | 129 | 142 | 327 | 1135 | 2145 | 150 |
| Validate, `xn--` | 238 | 136 | 284 | 160 | 1461 | 401 | 1682 | 1768 | 172 |
| Parse, ASCII | 216 | 159 | 57 | 60 | 58 | 501 | 913 | 1044 | 153 |
| Parse, Unicode | 238 | 197 | 85 | 86 | 84 | 615 | 1123 | 2154 | 378 |
| Normalize, ASCII | 333 | 243 | 205 | 189 | 203 | 1370 | 2059 | 2857 | 169 |
| Normalize, Unicode | 411 | 319 | 205 | 205 | 220 | 1552 | 2735 | 5096 | 364 |
| Normalize, `xn--` | 2001 | 1915 | 1830 | 1825 | 2348 | 2298 | 2798 | 4518 | 303 |
| Resolve | 1318 | 600 | 376 | 366 | 363 | 2551 | 2953 | 3239 | 388 |
| To relative | 2076 | 1112 | 964 | 937 | 959 | 2239 | | | |

- The ASCII inputs are the four in [Comparison with v1](v1-comparison.md).
  The Unicode inputs have the same shapes with non-ASCII characters in the
  host, path, query, or fragment. The `xn--` inputs are internationalized
  domain names as URLs serialize them, with five A-labels in four IRIs:
  `https://xn--caf-dma.example/a/b`, `https://www.xn--mnchen-3ya.de/`,
  `https://xn--e1afmkfd.xn--p1ai/a`, and `https://xn--r8jz45g.jp/` with a
  percent-encoded Japanese path, query, and fragment.
- v2 checks each A-label with a `URL.parse` round trip, so it validates
  `xn--` inputs 9.1 times slower than before A-labels. That's slower than
  identifier-js and `URL`, which don't check them, and about as fast as
  fast-uri and uri-js. Normalizing them is 1.3 times slower than before,
  since most of that row is decoding the Japanese path. Without `xn--`,
  validating is 6% slower, for the scan for `xn--`, and the rest is the
  same within noise.
- Resolve resolves `#/$defs/foo`, `../other.json`, `meta/core`, and
  `https://example.com/x` against
  `https://json-schema.org/draft/2020-12/schema`. To relative finds four
  targets relative to the same base.
- v2's validate checks the schemes' rules, with one pattern per scheme.
  With predicates, it was slower than v1's and about as fast as
  identifier-js's. Its other functions trust their input, so they don't
  check it, and resolve and to relative don't normalize. v1 and v2 before
  schemes do both.
- Resolve and to relative are bimodal from one run to the next, for
  every library. In four more runs of resolve, v2 took 357, 333, 788, and
  791, v2 with predicates 340, 372, 342, and 336, and `URL` 344 to 372, so
  on a fast run v2's resolve is about as fast as `URL`'s. To relative
  took v2 390 to 452, and 867 once, and v2 with predicates 394 to 432.
  Differences that size between runs are noise.
- fast-uri and uri-js have no relative form. Each library's validate is
  its validator, or parsing without an error for fast-uri and uri-js,
  which have none.

## What each one does

The libraries don't do the same work, so their times aren't all
comparable.

`strictness.mjs` gives each validator ten invalid IRIs:

| Invalid IRI | `@hyperjump/uri` | identifier-js | fast-uri | uri-js | `URL` |
| --- | --- | --- | --- | --- | --- |
| `foo` | Rejects | Rejects | Accepts | Accepts | Rejects |
| `http://exa mple.com/` | Rejects | Rejects | Rejects | Accepts | Rejects |
| `http://[::1/` | Rejects | Rejects | Rejects | Accepts | Rejects |
| `http://a/%zz` | Rejects | Rejects | Rejects | Accepts | Accepts |
| `1http://x` | Rejects | Rejects | Rejects | Accepts | Rejects |
| `http://a:b:c/` | Rejects | Rejects | Rejects | Accepts | Rejects |
| `http://a/b{c}` | Rejects | Rejects | Accepts | Accepts | Accepts |
| `http://a#b#c` | Rejects | Rejects | Accepts | Accepts | Accepts |
| `http://[:::1]/` | Rejects | Rejects | Rejects | Accepts | Rejects |
| `http://a/\b` | Rejects | Rejects | Accepts | Accepts | Accepts |

- fast-uri and uri-js parse leniently, so their validate is much less
  work than a validator's. `foo` is a valid reference, but not an IRI.
- fast-uri and `URL` turn IRIs into URIs: `café` is `caf%C3%A9`, and a
  Unicode host is encoded in ASCII (`xn--`). `@hyperjump/uri`, identifier-js, and uri-js
  keep them IRIs. `@hyperjump/uri` and uri-js also convert an `xn--` host
  to Unicode when they normalize an IRI. identifier-js keeps it in ASCII.
- `URL` is the WHATWG URL Standard, not RFC 3986 and RFC 3987, and it's
  native code in Node.js, so it's a reference point rather than an
  alternative (see [Follow the RFCs](../principles/follow-the-rfcs.md#rejected)).
- identifier-js's normalizing does more: default ports, RFC 5952 IPv6
  text, and rules for `http`, `file`, and `urn`. Its resolve and
  relative forms throw for `urn`.

## identifier-js

identifier-js is the closest to this library: the same function names
and component types, strict validation, and IRIs kept as IRIs. Its
grammar is data, expanded with `url-templates` and compiled to regular
expressions on first use, then cached. Like this library, it validates
without capture groups, but it parses with named groups, which made a
match about 2.4 times as slow here (see
[Parsing strategies](parsing-strategies.md#where-the-time-goes)). It also
chooses a grammar by scheme on every call, which makes a new `RegExp`.

It was 2.3–5.6 times slower than v2 before schemes. Against v2 now, it's
1.9 times slower to validate ASCII and 2.3 times slower for Unicode, and
2.3–8.6 times slower at everything else, except `xn--` inputs. It
validates those 3.6 times faster, since it doesn't check A-labels, and
normalizes them as fast, without converting them.
