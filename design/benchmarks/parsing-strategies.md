# Parsing strategies

First recorded 2026-11-01. These are the measurements behind
[Parsing](../components/parsing.md). The scripts are `benchmark/breakdown.js`,
`benchmark/split.js`, and `benchmark/parse-shape.js`. Times are the
median of 3 runs, in milliseconds.

## Where the time goes

300,000 iterations over the four identifiers in
[Comparison with v1](v1-comparison.md), with the version that used
capture groups:

| | Time |
| --- | --- |
| `parseIri` | 335 |
| `isIri` | 280 |
| The IRI pattern's `exec`, with named groups | 271 |
| The same pattern with every group made non-capturing, `test` | 114 |

Matching was most of `parseIri`, and captures were most of matching.

## Ways to parse

200,000 iterations over six identifiers: the four, one with `userinfo`,
`port`, a query, and a fragment, and one with an IPv6 host and a port.
Each prototype gave the same components as `parseIri` for all six.

| | Time |
| --- | --- |
| `parseIri`, one pattern with named groups | 350 |
| Appendix B's regular expression to split, then a capture-free pattern for each component | 387 |
| `indexOf` to split, then a capture-free pattern for each component | 333 |
| The whole rule's capture-free pattern, then `indexOf` to split | 244 |

## Making the result

300,000 iterations over the four identifiers, with a simplified pattern,
to compare only how the result is made from `match.groups`:

| Result | Time |
| --- | --- |
| v1's `groups`, with `path2` deleted | 231 |
| A new object with only the components that are there | 279 |
| `groups` with every `undefined` group deleted | 584 |

Splitting replaced all three, so this only matters for the rejected
alternatives.

## The `u` flag

`benchmark/unicode-flag-one.js` and `benchmark/unicode-flag.js` time
`test` with the capture-free patterns, 300,000 iterations over the four
identifiers, each variant in its own process. The Unicode identifiers
are four of the same shapes, with non-ASCII characters in the host, path,
query, or fragment.

| ASCII identifiers | Time |
| --- | --- |
| The IRI pattern, with the `u` flag | 110–115 |
| The IRI pattern without the `u` flag, its non-ASCII ranges replaced, for timing only | 113 |
| The URI pattern, without the `u` flag | 160 |
| A check for non-ASCII characters, then the URI pattern | 203 |

| Unicode identifiers | Time |
| --- | --- |
| The IRI pattern, with the `u` flag | 132 |
| A check for non-ASCII characters, then the IRI pattern | 166 |

- The `u` flag doesn't make the IRI pattern slower.
- The URI pattern is slower than the IRI pattern on the same ASCII
  strings. It isn't the flag: the URI pattern takes the same time with it.
  It isn't the unescaped `-` in `unreserved` either (see
  [Why the URI pattern is slower](#why-the-uri-pattern-is-slower)).
- A check with a `charCodeAt` loop was slower than with a regular
  expression.

## The `v` flag

`benchmark/v-grammar.js` writes the IRI grammar for the `v` flag, and
`benchmark/v-flag-time.js` times it with `test`, 300,000 iterations over
the same identifiers as [The `u` flag](#the-u-flag), each variant in its
own process. Both `v` versions and the merged `u` version accepted the
same strings as the current pattern, on 300,000 random strings, 104,634
of them valid (`benchmark/v-flag.js`). "Merged" puts each rule's
one-character alternatives in one class, like `pchar` as
`[unreserved sub-delims : @]` or `pct-encoded`.

| | ASCII | Unicode |
| --- | --- | --- |
| `u`, as written | 111 | 129 |
| `v`, the same structure | 139 | 134 |
| `v`, merged | 132 | 125 |
| `u`, merged, with the nested classes flattened | 104–108 | 113 |

- `v` is slower on ASCII, whichever way the grammar is written.
- Merging is faster with `u` too, about 12% on Unicode, and 3–7% on
  ASCII, which is close to noise. It isn't done, because the RFC writes
  each of those rules as alternatives, with `pct-encoded` among them.

## The grammar's shape

`benchmark/rfc-grammar.js` writes the grammar rule for rule from the RFCs,
with `hier-part`, `relative-part`, and `URI-reference` as
`URI / relative-ref` (see [Grammar](../components/grammar.md)).
`benchmark/rfc-grammar-time.js` times `test` with it and with the
patterns before, 300,000 iterations, each in its own process. The
reference rules are timed on the four identifiers and four references:
`#/$defs/foo`, `../other.json`, `meta/core`, and `/schemas/person.json?x`.

| Rule | Before | Rule for rule |
| --- | --- | --- |
| IRI | 113–115 | 111–112 |
| IRI-reference | 167 | 166–168 |
| URI | 159 | 152–154 |
| URI-reference | 224–225 | 221–225 |

The functions, timed with `benchmark/compare.js`, were the same as in
[Comparison with v1](v1-comparison.md), within a few milliseconds.

## Why the URI pattern is slower

The scripts are `benchmark/uri-slow*.js`, and
`benchmark/bytecode-histogram.py` and `benchmark/bytecode-diff.py`
compare bytecode from `--print-regexp-bytecode`. Each variant is timed
in its own process, on the four identifiers unless a row says otherwise.

### One ingredient at a time

The patterns are built with `rules`, 300,000 iterations.

| Pattern | Time |
| --- | --- |
| `rules(unreserved)`, the URI pattern | 150 |
| `rules(iunreserved, iprivate)`, the IRI pattern | 114 |
| `rules(iunreserved)`, without `iprivate` | 113 |
| `rules(unreserved, iprivate)` | 154 |
| `rules` with `\u00A0` added to `unreserved` | 115 |
| `rules` with `\u0080-\uFFFF` added to `unreserved` | 135 |

### One character added to `unreserved`

| Added | Time |
| --- | --- |
| Nothing | 150 |
| `\u0080`, `\u00A0`, or `\u00FF` | 112–113 |
| `\u0080-\u00FF` | 130 |
| `\u0100`, `\u4E00`, or `\uFFFF` | 150–154 |
| `\u0001`, `\x7F`, `!`, or `%` | 149–154 |

### Where in the grammar

The Latin-1 class in one rule at a time, 1,200,000 iterations, with the
grammar written out so each rule's class can be chosen:

| Latin-1 class in | Time |
| --- | --- |
| No rule | 153 |
| Every rule | 114 |
| `regName` | 149 |
| `userinfo` | 141 |
| `pchar` | 137 |

Each identifier on its own, ASCII class and Latin-1 class:

| Identifier | ASCII | Latin-1 |
| --- | --- | --- |
| `https://json-schema.org/draft/2020-12/schema` | 218 | 149 |
| `https://example.com/a/b/c?x=1#/$defs/foo` | 205 | 152 |
| `urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66` | 84 | 83 |
| `file:///home/user/schemas/main.json` | 110 | 73 |

Small patterns with the same shape, like `^(?:[…]*@)?[…]*$` for an
authority, a `pchar` loop, or a path of segments, differed by 8% at most.

### The engine

The first identifier, ASCII class and Latin-1 class:

| | ASCII | Latin-1 |
| --- | --- | --- |
| Native code | 212 | 150 |
| `--regexp-interpret-all`, the bytecode interpreter | 998 | 850 |
| `--no-regexp-optimization` | 432 | 441 |

The bytecode for the whole pattern is 21,343 instructions with the ASCII
class and 21,338 with the Latin-1 class. They differ in how classes are
checked: with the ASCII class, a loop's class is tested with
`AND_CHECK_CHAR` with the mask `0x80` first, and with the Latin-1 class,
with `CHECK_GT 0x7f` and `CHECK_BIT_IN_TABLE`. `--trace-regexp-bytecodes`
and `--trace-regexp-assembler`, which would show which instructions run,
print nothing in release builds.
