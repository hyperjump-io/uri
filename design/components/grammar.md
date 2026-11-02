# Grammar

The patterns are built from the ABNF of RFC 3986 Appendix A and RFC 3987
§2.2, rule for rule (see [Follow the RFCs](../principles/follow-the-rfcs.md)).
Each constant is a rule, named after it in camel case: `path-abempty` is
`pathAbEmpty`, and `IPv6address` is `ipV6Address`. Each holds exactly its
rule, without the delimiter before it, so `port` is `*DIGIT`, not
`":" *DIGIT`. The patterns have no capture groups. They only validate (see
[Parsing](parsing.md)).

## Paths

Each path rule is its own constant: `pathAbEmpty`, `pathAbsolute`,
`pathNoScheme`, `pathRootless`, and `pathEmpty`. They're combined the way
the RFC combines them, in `hierPart` and `relativePart`, and
`URI-reference` is `URI / relative-ref`:

```js
const hierPart = `(?://${authority}${pathAbEmpty}|${pathAbsolute}|${pathRootless}|${pathEmpty})`;
const relativePart = `(?://${authority}${pathAbEmpty}|${pathAbsolute}|${pathNoScheme}|${pathEmpty})`;
```

A reference without a scheme tries the `URI` alternative first. It fails
at the first character, or at the first character that a scheme can't
have, so trying `relative-ref` second costs nothing measurable.

### Rejected

- **One rule for every path without an authority**, as before:
  `(?!//)(?:(?:(?<=${scheme}:)${segmentNz}|${segmentNzNc})${pathAbEmpty}|${pathAbEmpty})`.
  It matched the same strings, but it isn't an RFC rule, and checking it
  against the RFC meant working out four rules from one. The `(?<=…)`
  for a scheme existed because `URI-reference` was written as a `URI` with
  an optional scheme, so a rootless path had to know whether a scheme came
  before it. It was no faster (see
  [Parsing strategies](../benchmarks/parsing-strategies.md#the-grammars-shape)).

## URIs and IRIs

RFC 3987 defines the IRI rules again, but each one is RFC 3986's, with
`iunreserved` in place of `unreserved`, and with `iprivate` allowed in
`iquery`. So the rules that differ are written once, in
`rules(unreserved, iprivate)`, which returns the source of the three
patterns, and it's called once for each form. The rules that are the same
for both, like `scheme`, `port`, and `IP-literal`, are constants outside
it.

`ucschar` is a constant, and `iunreserved` is `unreserved`'s characters
and `ucschar`, as RFC 3987 defines it. `ucschar` is the ranges without
brackets, so that it can go inside `iunreserved`'s class. The `u` flag
doesn't allow nested classes (see [Parsing](parsing.md#rejected) for
the `v` flag, which does).

### Rejected

- **A copy of every rule for IRIs**, `iregName`, `ihost`, `ipchar`, and
  the rest, as RFC 3987 writes them. It's about 20 more lines that differ
  from the URI rules only in `iunreserved`, and the copies can drift apart.

## `IPv6address`

`IPv6address` is its nine alternatives as an array, aligned the way the
RFC aligns them, with the spaces removed before they're joined. On one
line, as before, it was 400 characters, and comparing it with the RFC
meant counting repetitions.

## Small things

- `DIGIT` is `digit`, `[0-9]`, rather than `\d`, so the rule reads like
  the ABNF. With the `u` flag, `\d` is the same, but that has to be known.
- A `-` in a class is escaped, even where it can't be a range, like in
  `[a-zA-Z0-9\-._~]`. Unescaped after a range, as in `[a-zA-Z0-9-._~]`,
  it reads like one.
- Characters in a class are in the RFC's order, so `scheme`'s are
  `+`, `-`, `.`.
- `ALPHA` and `HEXDIG` match both cases, because ABNF strings are
  case-insensitive (RFC 5234 §2.3). That's also why `IPvFuture` starts
  with `[vV]`.

## Changes are checked by differential testing

A change to the grammar can make a pattern accept something different
without a test failing. The paths, the `rules` function, and the layout
of `IPv6address` were checked against the previous patterns on 500,000
random strings, built from the characters that delimit and start rules,
for each of the six rules, and every function was checked against the
previous version on 153,359 inputs and 5.5 million calls. There were no
differences. The scripts are in `benchmark/`, which isn't committed.
