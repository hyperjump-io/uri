# Other implementations

First recorded 2026-11-01, on Node.js 24.20.0, against identifier-js
0.5.4, fast-uri 4.2.3, uri-js 4.4.1, and Node.js's `URL`. Last run
2026-11-13, after `data` was built in (see
[The `data` scheme](data-scheme.md)).

The scripts are in `benchmark/other-implementations/`, which has its own
`package.json` so the other libraries aren't dependencies of this one.
Install them with `npm ci` and run `node run-all.mjs`, both with Node.js
24. identifier-js 0.5.4 requires Node.js 24. On Node.js 22, npm installs
0.0.15, from August, without saying so.

`libs.mjs` maps each operation to each library's closest equivalent, on
IRIs where the library has them. `check.mjs` prints every result, and
they all agree on the ASCII inputs. v1 is `benchmark/v1/`, from the
`v1.4.0` tag. `libs.mjs` also has snapshots of v2 from before schemes,
with predicates, and from before A-labels, which `run-all.mjs` times
too.

## Speed

`time.mjs` runs 200,000 iterations over four inputs, each library and
operation in its own process, after 3 warm-up runs. Times are the median
of 5 runs, in milliseconds.

| Operation | v1 | v2 | identifier-js | fast-uri | uri-js | `URL` |
| --- | --- | --- | --- | --- | --- | --- |
| Validate, ASCII | 208 | 154 | 268 | 921 | 1031 | 70 |
| Validate, Unicode | 223 | 151 | 325 | 1115 | 2131 | 151 |
| Validate, `xn--` | 235 | 1381 | 400 | 1665 | 1752 | 173 |
| Parse, ASCII | 218 | 57 | 490 | 920 | 1035 | 153 |
| Parse, Unicode | 240 | 84 | 601 | 1114 | 2131 | 342 |
| Normalize, ASCII | 313 | 187 | 1259 | 1890 | 2592 | 157 |
| Normalize, Unicode | 369 | 205 | 1393 | 2585 | 4838 | 343 |
| Normalize, `xn--` | 1905 | 2027 | 2127 | 2648 | 4246 | 291 |
| Resolve | 756 | 396 | 1962 | 2834 | 3114 | 399 |
| To relative | 1944 | 412 | 2071 | | | |

- The ASCII inputs are the four in [Comparison with v1](v1-comparison.md).
  The Unicode inputs have the same shapes with non-ASCII characters in the
  host, path, query, or fragment. The `xn--` inputs are internationalized
  domain names as URLs serialize them, with five A-labels in four IRIs:
  `https://xn--caf-dma.example/a/b`, `https://www.xn--mnchen-3ya.de/`,
  `https://xn--e1afmkfd.xn--p1ai/a`, and `https://xn--r8jz45g.jp/` with a
  percent-encoded Japanese path, query, and fragment.
- v2 checks each A-label with a `URL.parse` round trip, so it validates
  `xn--` inputs 9 times slower than other `https` inputs (see
  [A-labels](a-labels.md)). That's slower than v1, identifier-js, and
  `URL`, which don't check them, and about as fast as fast-uri and
  uri-js. Most of the normalize row for `xn--` is decoding the Japanese
  path.
- Resolve resolves `#/$defs/foo`, `../other.json`, `meta/core`, and
  `https://example.com/x` against
  `https://json-schema.org/draft/2020-12/schema`. To relative finds four
  targets relative to the same base.
- v2's validate checks the schemes' rules, with one pattern per scheme.
  Its other functions trust their input, so they don't check it, and
  resolve and to relative don't normalize. v1 does both.
- Resolve and to relative are bimodal from one run to the next, for
  every library: v2's resolve has taken 333 to 791, and `URL`'s 344 to
  399. Differences that size between runs are noise.
- fast-uri and uri-js have no relative form. Each library's validate is
  its validator, or parsing without an error for fast-uri and uri-js,
  which have none.

### Checked first

`time-checked.mjs` times v2 with each value checked right before it's
used, which is what v1 and identifier-js do in every function: `isIri`
and then `parseIri` or `normalizeIri`, `isIriReference` and then
`resolveIri`, and `isIri`, `normalizeIri`, and then `toRelativeIri`
against a base normalized once.

| Operation | v2, checked first | v1 |
| --- | --- | --- |
| Parse, ASCII | 221 | 218 |
| Parse, Unicode | 246 | 240 |
| Normalize, ASCII | 370 | 313 |
| Normalize, Unicode | 401 | 369 |
| Normalize, `xn--` | 3363 | 1905 |
| Resolve | 403 | 756 |
| To relative | 921 | 1944 |

Checked first, v2 parses as fast as v1 and normalizes 1.2 times slower,
since it checks the scheme's rules and v1 didn't.

### On the website

[Performance](../../website/performance.md) says v2 is faster than other
libraries, without a table. Against identifier-js, the fastest of the
three, it validates 1.7 times as fast for ASCII and 2.2 times for
Unicode, and parses, normalizes, resolves, and finds a relative reference
4.9 to 8.6 times as fast. The page says "about twice" and "5 to 9 times".
It's slower only with `xn--` hosts, which the page says under what costs
more. The getters' shares of `parseIri`'s time on the page are from
`benchmark/getters.js` on Node.js 24.20.0, and are what
[Getters](getters.md) has for Node.js 22.

- **Rejected: the table on the page**, with what each library does
  differently, which the first draft had. It names other libraries'
  versions, so it goes stale when they release.

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

It's 1.7 times slower than v2 to validate ASCII and 2.2 times slower for
Unicode, and 4.9 to 8.6 times slower at everything else, except `xn--`
inputs. It validates those 3.5 times faster, since it doesn't check
A-labels, and normalizes them about as fast, without converting them.
