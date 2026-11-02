# Parsing

Validating and parsing are two steps:

1. **Validate** with the rule's regular expression, built from the ABNF
   with no capture groups, using `test`.
2. **Split** the valid string into its components at its delimiters,
   which is RFC 3986 Appendix B.

The regular expressions stay the definition of what's valid, and they read
like the RFC (see [Follow the RFCs](../principles/follow-the-rfcs.md)).
Each constant holds exactly the rule it's named after: `port` is `*DIGIT`,
and `query` is `*( pchar / "/" / "?" )`, without the `:` or `?` that comes
before it. Captures were the most expensive part of matching, and only
parsing needed them.

## Splitting

`split` only runs on a string that its rule's pattern has accepted. Then
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

## Open questions

- The URI pattern is about 1.4 times slower than the IRI pattern on the
  same ASCII strings, so `isUri` is slower than `isIri`. It isn't the `u`
  flag or the unescaped `-` in `unreserved` (see
  [Parsing strategies](../benchmarks/parsing-strategies.md#the-u-flag)).

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
- **Deleting the `undefined` groups from `match.groups`**, to leave out
  missing components. It was twice as slow as building a new object, and
  the result is still a null-prototype object.
