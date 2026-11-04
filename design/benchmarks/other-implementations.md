# Other implementations

First recorded 2026-11-01, on Node.js 24.20.0, against identifier-js
0.5.4, fast-uri 4.2.3, uri-js 4.4.1, and Node.js's `URL`. Last run
2026-11-03, after scheme validation and the trust contract, with v1 and
v2 from before them added.

The scripts are in `benchmark/other-implementations/`, which has its own
`package.json` so the other libraries aren't dependencies of this one.
Install them with `npm ci` and run `node run-all.mjs`, both with Node.js
24. identifier-js 0.5.4 requires Node.js 24. On Node.js 22, npm installs
0.0.15, from August, without saying so.

`libs.mjs` maps each operation to each library's closest equivalent, on
IRIs where the library has them. `check.mjs` prints every result, and
they all agree on the ASCII inputs. v1 comes from the `json-schema`
checkout next to this repo, at `1.4.0`, and v2 before schemes is
`benchmark/v2-before-schemes.js` (see
[Schemes and trust](schemes-and-trust.md)).

## Speed

`time.mjs` runs 200,000 iterations over four inputs, each library and
operation in its own process, after 3 warm-up runs. Times are the median
of 5 runs, in milliseconds.

| Operation | v1 | v2, before schemes | v2 | identifier-js | fast-uri | uri-js | `URL` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Validate, ASCII | 207 | 104 | 331 | 269 | 917 | 1031 | 70 |
| Validate, Unicode | 227 | 111 | 317 | 327 | 1130 | 2205 | 151 |
| Parse, ASCII | 220 | 160 | 57 | 504 | 910 | 1034 | 153 |
| Parse, Unicode | 238 | 196 | 84 | 613 | 1133 | 2142 | 340 |
| Normalize, ASCII | 319 | 226 | 183 | 1282 | 2134 | 2842 | 174 |
| Normalize, Unicode | 403 | 321 | 205 | 1559 | 2788 | 5406 | 380 |
| Resolve | 853 | 596 | 373 | 2093 | 3494 | 3534 | 546 |
| To relative | 2333 | 1027 | 512 | 2347 | | | |

- The ASCII inputs are the four in [Comparison with v1](v1-comparison.md).
  The Unicode inputs have the same shapes with non-ASCII characters in the
  host, path, query, or fragment.
- Resolve resolves `#/$defs/foo`, `../other.json`, `meta/core`, and
  `https://example.com/x` against
  `https://json-schema.org/draft/2020-12/schema`. To relative finds four
  targets relative to the same base.
- v2's validate checks the schemes' rules, which makes it slower than
  v1's and about as fast as identifier-js's. Its other functions trust
  their input, so they don't check it, and resolve and to relative don't
  normalize. v1 and v2 before schemes do both.
- The other libraries' resolve times were 10–50% higher than on
  2026-11-01, when `URL` was 350 and fast-uri 2769. Differences that size
  between runs are noise.
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
  keep them IRIs.
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
about as fast to validate, and 4.6–8.8 times slower at everything else.
