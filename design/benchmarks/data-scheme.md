# The `data` scheme

First recorded 2026-11-13, on Node.js 22.22.1, when `data` was built in
(see [`data`](../components/schemes/data.md)).

`benchmark/bench-data.js` times `src/` against a snapshot from before
(`benchmark/v2-before-data/`, from `b35239e`), where `data` is an unknown
scheme. Run each in its own process: `node benchmark/bench-data.js
before`, then `now`. Times are the median of 5 runs of 200,000
iterations, in milliseconds, from the second of two runs of each, which
agreed within 2%. The rows with 100 KB of data are 2,000 iterations.

`isIri`, `assertIri`, `resolveIri`, and `normalizeIri` are of
`compare.js`'s four identifiers and four references. The unknown scheme
and `did` are the ones in [Built-in schemes](built-in-schemes.md). `data`
is `data:application/json,%7B%22type%22:%22string%22%7D`, four times.
The data in base64 is a 122-character URL with two parameters, and the
100 KB is base64 too.

"Built in" is `41ade61`, with `data` built in and nothing else changed.
"Now" has the two changes below.

| | Before | Built in | Now | Now/before |
| --- | --- | --- | --- | --- |
| `isIri` | 133 | 132 | 131 | 0.98x |
| `isIri`, an unknown scheme | 123 | 130 | 109 | 0.89x |
| `isIri`, `did` | 109 | 112 | 97 | 0.89x |
| `isIri`, `data` | 80 | 127 | 108 | 1.35x |
| `isIri`, `data` in base64 | 194 | 345 | 289 | 1.49x |
| `isIri`, 100 KB of data | 164 | 343 | 340 | 2.07x |
| `isIriReference` | 70 | 81 | 58 | 0.83x |
| `assertIri` | 133 | 138 | 130 | 0.98x |
| `assertIri`, `data` | 81 | 126 | 107 | 1.32x |
| `resolveIri` | 356 | 355 | 316 | 0.89x |
| `resolveIri`, a `data` reference | 72 | 73 | 73 | 1.01x |
| `resolveIri`, `#f` against `data` | 56 | 176 | 65 | 1.16x |
| `normalizeIri` | 206 | 212 | 204 | 0.99x |
| `normalizeIri`, an unknown scheme | 200 | 208 | 201 | 1.00x |
| `normalizeIri`, `data` | 3184 | 97 | 97 | 0.03x |
| `normalizeIri`, 100 KB of data | 113 | 5 | 5 | 0.04x |

A `data` URL takes longer to check because it has rules now, where it
had the generic syntax only. Normalizing one takes a thirtieth of the
time, because nothing but the scheme and the fragment is normalized.

## What a seventh built-in cost

Building it in made the other values slower: 6% for an unknown scheme,
and 16% for `isIriReference`, whose relative references have no scheme.
Each was compared with the name of every built-in, one more than before.

The built-ins are looked up by the first letter of their names now. A
value that doesn't start with `d`, `f`, `h`, `t`, or `u` has no built-in
scheme, which one look finds. That's most relative references, and it
made them faster than before `data`: `isIriReference` takes 0.83 times
what it did.

## A fragment against a base with rules

`resolveIri("#/$defs/foo", base)` took three times as long against a
`data` base as it had, and `urn` and `did` bases already took that. A
CPU profile (`benchmark/profile/loop-data.js resolve`) had 38% of the
time in testing the fragment's pattern. The pattern was tested on the
result, `base + reference`, which V8 keeps as two pieces until something
reads it, and a regular expression has to copy it into one string first.

The result ends with the reference, so the pattern is tested on the
reference now, and so is a `?q` reference's. The base's scheme is found
without slicing its name out. It takes 1.16 times what it did before
`data` had rules, and `resolveIri` of the four references against an
`https` base takes 0.89 times.

## The data is scanned twice

A scheme's pattern is the generic syntax with each rule as a lookahead
(see [Scheme rules](../components/scheme-rules.md#patterns-only-add-structure)),
so a `data` URL's path is
matched by RFC 2397's pattern and then by the generic path. For 100 KB of
data that's 170 microseconds, where the generic syntax alone took 82.

`benchmark/profile/micro-data.js` times other patterns for `data`, one
in each process, on the three `data` URLs, 800,000 iterations of the
first two and 2,000 of the 100 KB:

| Pattern | `data` | In base64 | 100 KB |
| --- | --- | --- | --- |
| The one that's built | 91 | 208 | 333 |
| The URI grammar's parts, and a lookahead that ends at the `,` | 86 | 168 | 245 |
| The IRI grammar's parts, and a lookahead that ends at the `,` | 75 | 191 | 258 |
| The same, and a scan for a character that isn't ASCII | 110 | 251 | 321 |

- **Rejected: a lookahead that ends at the `,`**, with the data left to
  the generic path. The data has to be ASCII, which the generic path of
  an IRI doesn't check. Checking it with a second scan takes what the
  lookahead saved. Using the URI grammar's parts for a scheme that's
  ASCII would check it, and saves a quarter on 100 KB and less on a short
  URL. It would also mean a rule that isn't a pattern for its whole
  component, and errors for a character that isn't ASCII that don't come
  from a component's rule, for `urn` and `did` too. That's a lot to
  change for a quarter of 170 microseconds.

## Differential test

`benchmark/differential-data.js` compares every validation function,
`normalizeIri`, `normalizeUri`, and `resolveIri` with the snapshot from
before the two changes (`benchmark/v2-data-unoptimized/`, from
`41ade61`), on random values made of scheme names and pieces of
identifiers. It found no differences in about 3,890,000 checks on each of
three seeds.
