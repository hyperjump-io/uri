# Parsing

## Splitting only

`parseIri` takes an identifier that's been checked (see [Trust](trust.md))
and splits it into its components at its delimiters, which is RFC 3986
Appendix B, with the authority split into `userinfo`, `host`, and `port`.
It doesn't validate, and it never throws: Appendix B's regular expression
matches any string. A caller who doesn't trust a value calls `assertIri`
or `isIri` first (see
[Pay only for what you ask for](../principles/pay-only-for-what-you-ask-for.md)).

Splitting doesn't depend on which characters are allowed, so the URI and
IRI forms of `parse` are one function, and the reference, full, and
absolute forms are its overloads, which differ only in their return
types. `parseUri` and the rest were the same function under other names.

The validators still test the whole rule's pattern, built from the ABNF
with no capture groups (see [Grammar](grammar.md)). The patterns stay the
definition of what's valid, and only `is*`, `assert*`, and `normalize*`
need them, so a caller who only splits and resolves doesn't load them.

### Rejected

- **Validating while parsing**, as v1 did. A caller who'd checked a value
  paid for the pattern again on every parse, and `resolve*` and
  `normalize*` paid for it on every call, since they parse. Most of the
  time in a parse was the pattern.
- **Three parse functions with no brands**, and **one returning the
  reference shape**. See [Trust](trust.md#rejected).

## Splitting

`split` only runs on a string that its rule's pattern has accepted, or
that's trusted to be one. Then
each delimiter can only be where its component ends, so the first one of
each kind ends that component:

- A scheme can't have `:`, and a relative reference's first segment can't
  either (`segment-nz-nc`), so a `:` before the first `/` ends a scheme.
- An authority can't have `/`, a path can't have `?`, and a query can't
  have `#`.
- Neither `userinfo` nor `host` can have `@`, so an `@` ends the
  `userinfo`.
- Only an IP literal can have `:` or `[`, so the port's `:` is the first
  one after the `]`, if the host starts with `[`.

The split can disagree with the patterns without any test failing, so it
was checked against the version with capture groups, on the strings in
the tests and random strings built from delimiters and the characters
around them. Every function gave the same results and the same errors.
`src/parse.test.js` has the cases where a delimiter is most likely to be
mistaken for the end of a component.

## Getters

`getScheme`, `getPath`, `getQuery`, and `getFragment` each get one
component, the way `split` finds it, without splitting out the others.
They trust what they're given, like `parseIri` (see [Trust](trust.md)).

The dependents mostly want one component. `json-schema`'s `$id`,
`$dynamicRef`, and bundler, and `browser`'s `get`, want a fragment, often
next to `toAbsoluteIri`, which removes it. `browser`'s scheme plugins,
`json-schema`'s bundler, and `json-language-server` want a scheme.
`parseIri` takes about 0.1 microseconds, and a getter for a scheme or a
fragment takes a fifth of that or less (see [Getters](../benchmarks/getters.md)).

- `getScheme(value: Iri): string` is `value` up to its first `:`. It
  takes an `Iri`, which always has a scheme.
- `hasScheme(value: IriReference): value is Iri` is whether a `:` comes
  before the first `/`, `?`, or `#`. A relative reference's first segment
  can't have a `:`, so one before those ends a scheme. It's a type guard,
  so it's how a reference becomes an `Iri` without being checked again
  (see [Trust](trust.md#what-a-brand-says)). `getScheme` can't answer it:
  it takes an `Iri`, so it can assume the first `:` ends the scheme, and
  a value it returns can't narrow what it was given.
- `getFragment(value: IriReference): string | undefined` is what's after
  the first `#`.
- `getQuery(value: IriReference): string | undefined` is what's after the
  first `?`, if it's before the first `#`, up to it.
- `getPath(value: IriReference): string` skips the scheme and the
  authority the way `split` does, and ends where the query or the fragment
  starts. It's only 1.6 times as fast as `parseIri(value).path`, because
  finding where the path ends needs `indexOf("#")` and `indexOf("?")` over
  the whole value, as `split` does, so it only saves building the
  components.

They're checked against `parseIri`, in `src/parse.test.js` and by
`benchmark/differential-getters.js`, which also compares `hasScheme` with
`isIri`, since its narrowing says a checked reference with a scheme is an
`Iri`.

### Rejected

- **A getter for every component**, like `getHost` and `getPort`. Nothing
  in the dependents gets only one of them. They can be added in a minor
  version.
- **One function for any component**, like `getComponent(value, "fragment")`.
  Its return type would depend on the name, and each call would dispatch on
  it.
- **Scanning for `getPath`'s end from where the path starts**, a character
  at a time, instead of `indexOf` over the whole value. It was 1.2 to 1.3
  times slower than `indexOf`, and a global regular expression with
  `lastIndex` was 1.5 to 1.6 times slower.

## Performance

Every function is faster than v1, which used capture groups (see
[Comparison with v1](../benchmarks/v1-comparison.md)). `isIri` takes 0.75
times what v1's does, with the schemes' rules that v1 didn't check, and
`parseIri`, which only splits, takes 0.31 times.

## Why URIs are slower than IRIs

The URI pattern is about 1.3 times slower than the IRI pattern on the same
ASCII strings, so `isUri` is slower than `isIri`. It's how V8's regular
expression compiler, `irregexp`, compiles the ASCII-only `unreserved` class,
not what the class matches or how the grammar is written (see
[Parsing strategies](../benchmarks/parsing-strategies.md#why-the-uri-pattern-is-slower)).

- Adding one character from U+0080 to U+00FF to `unreserved`, which never
  occurs in the input, makes the URI pattern as fast as the IRI pattern.
  V8 compiles a pattern separately for strings it stores one byte per
  character, and only a character that can be in one of those changes the
  class.
- With `--no-regexp-optimization`, both are the same speed.
- In the bytecode, the ASCII class is tested with a quick check first, a
  mask for "is it ASCII", which always passes on a URI, on each character
  of the loops in the authority. The Latin-1 class can't be checked with
  that mask, so it goes straight to the class's table. That this check is
  the cost is a reading of the bytecode. Release builds of Node.js can't
  trace which instructions run.

It isn't fixed, because each fix is wrong or costs as much as it saves:

- A Latin-1 character in the URI classes would make `isUri` accept a
  character that a URI can't have.
- Validating a URI as an IRI, then checking that it's ASCII, gives the
  same answers, because a URI is an ASCII IRI. The check is an extra pass
  that costs about what it saves (see
  [Parsing strategies](../benchmarks/parsing-strategies.md#the-u-flag)).

Dependents call the IRI functions much more than the URI ones, and it's
the engine's behavior, which can change in any release of V8.

## Rejected

Measured in [Parsing strategies](../benchmarks/parsing-strategies.md).

- **Capture groups**, as in v1. Named groups made a match about 2.4 times
  as slow as the same pattern without them, and they needed groups that
  weren't components, like `path2` for a path without an authority and
  `ipVFuture`, which v1's validators threw for.
- **A parser composed from a function for each rule**, like a small
  version of `json-schema`'s kernel: the grammar as data, compiled to
  closures. The rules would still read like the ABNF, but V8 compiles a
  regular expression to native code, and composed functions make a call
  for each rule at each character. The
  kernel wins by specializing a varied input, a schema, into closures. The
  grammar here is one fixed expression, and the template strings already
  compile it from named rules. Not prototyped, because the split made
  every function faster than v1 without changing how the grammar is
  written.
- **Splitting first, then validating each component** with its own
  capture-free pattern, with Appendix B's regular expression or with
  `indexOf`. Five smaller matches cost about as much as one large one, and
  splitting with Appendix B's regular expression has its own captures. It
  was 1.1 times slower with the regular expression and 1.05 times faster
  with `indexOf`. Validating the whole string, then splitting, was 1.4
  times faster.
- **Checking for non-ASCII characters first**, and validating an ASCII
  string with the URI pattern, which doesn't need the `u` flag. For an
  ASCII string, the URI and IRI rules accept the same strings, so it's
  correct, but it's slower. The `u` flag costs nothing here, the check is
  an extra pass over the string, and the URI pattern is slower than the
  IRI pattern even on ASCII. It was 1.8 times slower on ASCII and 1.3 times
  slower on Unicode. A profile of a dependent project once suggested the
  `u` flag was slow. That was with capture groups, which were most of the
  cost of a match.
- **The `v` flag** instead of `u`. Nested classes would let
  `iunreserved` be `[${unreserved}${ucschar}]`, the way RFC 3987 defines
  it, but `u` can get the same named `ucschar` by keeping its ranges
  unbracketed. The set operations don't help, because the ABNF never
  subtracts or intersects sets, and `pchar` includes `pct-encoded`, which
  isn't one character. Inside a class, `v` needs `(`, `)`, `-`, and `/`
  escaped, so `sub-delims` reads less like the RFC. It was 1.25 times
  slower on ASCII, and about the same on Unicode. It needs Node.js 20,
  Chrome 112, Firefox 116, or Safari 17, and the patterns are built when
  the module loads, so on anything older, importing the package throws a
  `SyntaxError`.
- **Deleting the `undefined` groups from `match.groups`**, to leave out
  missing components. It was twice as slow as building a new object, and
  the result is still a null-prototype object.
