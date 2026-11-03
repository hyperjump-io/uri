# Parsing

*Designed, not implemented:* `parseIri` only splits. `src/` still
validates first, as described in [Validating, then splitting](#validating-then-splitting).

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

- **Validating while parsing**, as before. A caller who'd checked a value
  paid for the pattern again on every parse, and `resolve*` and
  `normalize*` paid for it on every call, since they parse. Most of the
  time in a parse was the pattern.
- **Three parse functions with no brands**, and **one returning the
  reference shape**. See [Trust](trust.md#rejected).

## Validating, then splitting

How `src/` parses now, and how the validators find future IP literals:

1. **Validate** with the rule's regular expression, built from the ABNF
   with no capture groups, using `test`.
2. **Split** the valid string into its components at its delimiters.

Captures were the most expensive part of matching, and only parsing
needed them.

## Splitting

`split` only runs on a string that its rule's pattern has accepted, or,
in the new design, that's trusted to be one. Then
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

Validators use the same fact for future IP literals: `[` is only allowed in
an IP literal, so a validator splits out the host only for a valid string
with a `[` in it, and checks whether the host starts with `[v` (see
[Future IP versions](future-ip-versions.md)).

The split can disagree with the patterns without any test failing, so it
was checked against the version with capture groups: 146,686 inputs, the
strings in the tests plus random strings built from delimiters and the
characters around them, 33,904 of them valid IRI-references. All 16
single-argument functions, and `resolve*` and `toRelative*` against five
bases, gave the same results and the same errors, 5.3 million calls in
all. `src/parse.test.js` has the cases where a delimiter is most likely to
be mistaken for the end of a component.

## Performance

Every function is faster than v1, which used capture groups: `isIri` 2.2
times, the others 1.2–1.4 times (see
[Comparison with v1](../benchmarks/v1-comparison.md)).

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
  `ipVFuture` for the validators.
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
