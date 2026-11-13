# Scheme rules

How the rules of a built-in scheme are defined and checked (see
[Schemes](schemes.md) for which schemes are built in, and why).

A built-in has a rule for each component that has one: left out,
`"required"`, `"forbidden"`, or a pattern the component has to match when
it's there. The scheme's rules are compiled once, when the library
loads, into one regular expression for the whole identifier.

A pattern can also have a check, a function for what a regular expression
can't say, with a hint that says whether it could fail. Only `http`'s
host has one, for its A-labels, and it runs only on a value with `xn--`
(see [Domain names](domain-names.md#how-its-checked)).

## Patterns only add structure

A pattern doesn't replace the generic component. It's added to it, as a
lookahead at the position where the component starts:

```
(?=pattern(?=what can follow the component))generic component
```

The generic component is what's matched, so a scheme can only reject
more than the generic syntax, never accept more, and the `Iri` brand
holds (see [Trust](trust.md)).

The generic syntax has already checked the characters, in the URI or the
IRI form, so a pattern only has to check structure, and one pattern
works for both forms. Checking the characters again cost as much as the
generic syntax: `isIri` of a `urn:uuid` took 140 milliseconds with the
built-ins' patterns written with the generic rules, and 112 without.

## Patterns come from ABNF

A pattern is a lookahead, so it runs against the rest of the identifier,
not its component alone. Whoever writes one by hand has to know that:

- `.` and wide classes can match the delimiter that ends the component, so
  the pattern runs past it. `http`'s host was `/.+/u` at first, and it let
  `http:///a` through, since the host is empty and `.+` matched `/a`.
- `^` and `$` mean the start and end of the whole identifier. A path
  pattern `/^a.*$/u` rejects every path.
- A lookahead in a pattern sees the components after it.

So the built-ins' patterns are compiled from their specifications' ABNF
by `@hyperjump/abnf`, with a context for each component (see
[ABNF](abnf.md)). The compiler knows the component, so a pattern can't
match the delimiters that end it. ABNF has no anchors and can't look
ahead or behind, and the rules can be copied from the RFC.

- **In an IRI, RFC 3986's rules mean RFC 3987's.** A context's rules
  define `pchar` as `ipchar`, and so on, because an IRI is valid for a
  scheme when its URI is (RFC 3987 §3.1), and the URI of an IRI
  percent-encodes what `ipchar` adds.
- **ASCII contexts**, like `asciiPath`, have RFC 3986's rules as they
  are, for schemes that are ASCII in an IRI too: `urn`, `did`, and
  `data`. ABNF can't say "ASCII in an IRI", so the context does.

The generated patterns took as long as hand-written ones did, within 3%.

## Checking

`is*` for an identifier with a built-in scheme tests the scheme's whole
pattern, which is the generic syntax with the scheme's rules. That's one
regular expression, with no splitting, and its answer is the answer. Any
other value is tested against the generic pattern only.

`assert*` tests the same pattern, and only a value that fails is looked
at again, to say why: the generic pattern says whether it's an identifier
at all, and the scheme's rules say which one it breaks (see
[Errors](errors.md#scheme-rules)). So `is*` and `assert*` agree, which
differential tests check.

- The scheme is found by comparing a built-in's name with the start of
  the value, a character at a time and without case, instead of slicing
  the name out and making it lowercase. That took `isIri` from 163
  milliseconds to 138. Only the built-ins whose names start with the
  value's first letter are compared (see
  [The `data` scheme](../benchmarks/data-scheme.md)). A name that's found
  for a value that isn't valid is harmless, since the scheme's pattern
  checks its name.
- `is*` doesn't look at a value that failed again. `isIri` of an invalid
  value takes a fifth of the time it did when it looked again (see
  [Future IP literals](../benchmarks/future-ip-literals.md)).
- On `assert*`'s second look, and in `resolveIri`'s check of its result,
  each component's pattern is sticky and tested where its component
  starts in the value, without slicing it out. Slicing made `resolveIri`
  1.1 times as slow.

Rules are per component, not for the whole identifier, because:

- `assert*` says which component failed and why, with a span.
- `resolveIri`'s `#f` and `?q` shortcuts check only the components they
  change (see [Resolving](resolving.md#checking-the-result)).
- The RFCs' rules for a whole identifier leave out the fragment, which
  RFC 3986 §3.5 leaves to the generic syntax, so `http-URI` would forbid
  one.

## Rejected

- **Predicates**, `{ test: (text) => boolean }`, which this design had
  first. Each scheme's rules ran on the split components, after the
  generic pattern had checked the same characters, so every identifier
  was scanned twice. `isIri` took 1.7 times what v1's does, and takes
  0.38 times that with patterns. A check is a predicate, but its hint
  keeps it from splitting a value it can't reject.
- **Hand-written patterns.** See
  [Patterns come from ABNF](#patterns-come-from-abnf).
- **Building the regular expression on each call.** A `new RegExp` costs
  about 6 microseconds, even with V8's cache of compiled sources, which
  is 50 times a test.
- **Matching exactly where the component ends**, by capturing what
  follows it and requiring the pattern to be followed by exactly that, with
  a backreference. It matches the generic component twice, which made
  `https` take twice as long.
- **Checking with a lookbehind that a pattern didn't cross its
  component's delimiter.** Each step back from a greedy pattern scans the
  prefix again, and `https` took 544 milliseconds where the lookahead
  takes 106.
- **A pattern for the whole identifier**, instead of one per component.
  It loses which component failed, and the shortcuts.
- **Hand-written checks for the built-ins**, apart from their
  definitions. One path checks every built-in.
