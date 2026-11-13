# Grammar

The patterns are built from the ABNF of RFC 3986 Appendix A and RFC 3987
§2.2, rule for rule (see [Follow the RFCs](../principles/follow-the-rfcs.md)).
Each constant is a rule, named after it in camel case: `path-abempty` is
`pathAbEmpty`, and `IPv6address` is `ipV6Address`. Each holds exactly its
rule, without the delimiter before it, so `port` is `*DIGIT`, not
`":" *DIGIT`. The patterns have no capture groups. They only validate (see
[Parsing](parsing.md)). The one rule they don't have is `IP-literal`,
which is checked on its own (see [IP literals](#ip-literals)).

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

## IP literals

The patterns don't have `IP-literal`. In its place, they have its shape:
a `[`, then any of the characters it can have between its brackets
(`unreserved`, `sub-delims`, and `:`), then a `]`. That's
`ipLiteralShape`. In a value a pattern accepts, a `[` can only be where an
IP literal starts, because no other rule allows one. So every validator
and assertion also checks a value that has a `[` against
`ipLiteralPattern`, which is exactly `IP-literal` (`hasValidIpLiteral`).
`http`'s and `https`'s host rule has the same shape, for the same reason.
The patterns accept more than the grammar does, and the check rejects
exactly what they accept that the grammar doesn't, so the functions
accept the same values as before. The errors are the same too, because a
value whose literal fails the check is diagnosed the way a value the
pattern rejected is.

It's for the first time a pattern is used. V8 compiles a regular
expression to bytecode the first time it runs, and to native code the
second time, and `IPv6address` was most of each large pattern. The first
two uses of `iriReferencePattern` took about 12.5 milliseconds, most of it
in V8's bytecode peephole optimizer. A dependent like `json-schema` uses
several of the large patterns for the first time when it compiles its
first schema. With the shape, the first two uses take 0.7 to 1.5
milliseconds, and the IPv6 grammar is only compiled for a value that has
an IP literal (see [IP-literal's shape](../benchmarks/ip-literal-shape.md)).

The cost is an `indexOf("[")` on every call. It makes `is*` and `assert*`
1 to 14 percent slower on a value without an IP literal, up to 25
nanoseconds. A value with one is about twice as fast.

### Rejected

- **Giving the first match a string of 1,000 characters or more**, so that
  V8 compiles it straight to native code. It took 2.2 milliseconds instead
  of 12.5, without changing a pattern. But it depends on a threshold in
  V8's source, which can change in any release, and the IPv6 grammar is
  still compiled for every pattern.
- **Compiling the patterns when the library loads.** It moves the cost
  rather than removing it, and a caller who only splits and resolves would
  pay for it (see
  [Pay only for what you ask for](../principles/pay-only-for-what-you-ask-for.md)).
- **Smaller Unicode classes.** Collapsing `ucschar`'s ranges into one, only
  to measure it, didn't make a first use any faster.

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
without a test failing. So a change is checked against the version before
it, on random strings built from the characters that delimit and start
rules: each of the six rules' patterns, and every function. The scripts
are `benchmark/differential*.js`, which aren't committed.
