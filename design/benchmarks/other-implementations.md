# Other implementations

First recorded 2026-11-01, on Node.js 24.20.0, against identifier-js
0.5.4, fast-uri 4.2.3, uri-js 4.4.1, and Node.js's `URL`.

The scripts are in `benchmark/other-implementations/`, which has its own
`package.json` so the other libraries aren't dependencies of this one.
Install them with `npm ci` and run `node run-all.mjs`, both with Node.js
24. identifier-js 0.5.4 requires Node.js 24. On Node.js 22, npm installs
0.0.15, from August, without saying so.

`libs.mjs` maps each operation to each library's closest equivalent, on
IRIs where the library has them. `check.mjs` prints every result, and
they all agree on the ASCII inputs.

## Speed

`time.mjs` runs 200,000 iterations over four inputs, each library and
operation in its own process, after 3 warm-up runs. Times are the median
of 5 runs, in milliseconds.

| Operation | `@hyperjump/uri` | identifier-js | fast-uri | uri-js | `URL` |
| --- | --- | --- | --- | --- | --- |
| Validate, ASCII | 105 | 267 | 923 | 1032 | 70 |
| Validate, Unicode | 111 | 333 | 1137 | 2238 | 149 |
| Parse, ASCII | 164 | 503 | 915 | 1036 | 158 |
| Parse, Unicode | 198 | 619 | 1132 | 2188 | 345 |
| Normalize, ASCII | 229 | 1283 | 1899 | 2595 | 160 |
| Normalize, Unicode | 297 | 1408 | 2516 | 5134 | 363 |
| Resolve | 508 | 1905 | 2769 | 3162 | 350 |
| To relative | 868 | 1992 | | | |

- The ASCII inputs are the four in [Comparison with v1](v1-comparison.md).
  The Unicode inputs have the same shapes with non-ASCII characters in the
  host, path, query, or fragment.
- Resolve resolves `#/$defs/foo`, `../other.json`, `meta/core`, and
  `https://example.com/x` against
  `https://json-schema.org/draft/2020-12/schema`. To relative finds four
  targets relative to the same base.
- To relative was run again after `toRelative*` stopped parsing each
  identifier twice. Before, it was 1570 for `@hyperjump/uri` and 2125 for
  identifier-js.
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

It was 2.3–5.6 times slower.
