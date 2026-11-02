# IPv6 canonical form

First recorded 2026-11-02, on Node.js 22.22.1. These are the measurements
for the open question in [Schemes](../components/schemes.md#open-questions)
about whether `coap` puts IPv6 literals in RFC 5952 form, like
`2001:db8::1` for `2001:DB8:0:0:0:0:0:1`.

There are two prototypes. Each takes an `IPv6address` that's already
valid and lowercase, the way the host is after the syntax-based
normalization:

- `benchmark/ipv6-canonical.js` splits the address and makes arrays.
- `benchmark/ipv6-canonical-fast.js` makes one pass over the string.

## Correctness

`benchmark/ipv6-canonical-differential.js` and
`benchmark/ipv6-canonical-fast-differential.js` compare each prototype
with Node's `URL` on 300,000 random valid addresses, with and without
`::`, and with and without a dotted IPv4 part. Neither has a difference.

`URL` writes IPv4-mapped addresses (`::ffff:0:0/96`) in hex, and RFC 5952
§5 says to use mixed notation, like `::ffff:192.0.2.1`. So the 45,198
mapped addresses were checked separately: each result is valid, and
putting it in canonical form again doesn't change it.

## Time

`benchmark/ipv6-canonical-fast-bench.js`, with `tinybench` for one second
per task. Times are the median, in nanoseconds:

| Address | Arrays | One pass |
| --- | --- | --- |
| `2001:db8:0:0:0:0:0:1` | 425 | 191 |
| `2001:db8::1`, already canonical | 639 | 160 |
| `::1` | 357 | 79 |
| `::ffff:192.0.2.1` | 868 | 363 |

`normalizeIri("coap://[2001:db8::1]:5683/sensors/temp")` takes 573. With
the one-pass version, a `coap` identifier with an IPv6 literal would take
about 15% to 60% longer to normalize. An identifier without one only pays
for checking the host for `[`, which is below what the benchmark can measure.

## Size

Gzipped with `gzip -9`, before minifying. `src/index.js` is as it is,
and each prototype is added to it without its comments:

| | Bytes |
| --- | --- |
| `src/index.js` | 6,464 |
| `src/index.js` with the arrays version | 7,167 |
| `src/index.js` with the one-pass version | 7,084 |

The one-pass version adds about 620 bytes, or about 10%, for every user,
whether they use `coap` or not.

## For and against

For building it in:

- The rule for built-in normalization is that what a component function
  can express is built in, and a `host` function can express this.
  Leaving it out would be the first exception.
- RFC 7252 §6.3 says it outright: IP literals "are in recommended form
  [RFC5952]" is part of its normal form.
- Adding it after 2.0.0 is a breaking change, so leaving it out means a
  false negative until a major version.

Against:

- Every user pays about 10% in size, for a case that's probably rare: a
  `coap` identifier with an IPv6 literal, compared with one written
  differently.

Either way:

- If `coap` isn't a built-in, the question goes away. A caller who
  defines `coap` can do it in a `host` function.
- RFC 5952 form for every scheme isn't an option. An IP literal is the
  same address under any scheme, but RFC 3986's syntax-based
  normalization doesn't include it, and no other candidate's
  specification licenses it.
