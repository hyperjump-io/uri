# Errors

Each error is its own class, so it can be told apart with `instanceof`
instead of by its message.

| Class | Extends | Properties | Thrown when |
| --- | --- | --- | --- |
| `InvalidUriError` | `Error` | `value`, `rule`, `reason`, `component`, `start`, `end` | A value isn't the kind of URI a function needs |
| `InvalidIriError` | `Error` | `value`, `rule`, `reason`, `component`, `start`, `end` | A value isn't the kind of IRI a function needs |

`InvalidUriError` and `InvalidIriError` are thrown by `assert*`, which
checks like `is*` does, and by `resolveIri` and `urlToIri` for a result
that breaks its scheme's rules. The other functions trust what they're
given, so they don't throw (see [Trust](trust.md)).

`value` is the string that was given. `rule` is the RFC rule it doesn't
match: `"URI"`, `"URI-reference"`, or `"absolute-URI"`, or their IRI
forms, or a scheme's rule, like `"http-URI"`, for a value that breaks its
scheme's rules. `resolveIri` trusts both of its arguments, and its only
error is a result that breaks its scheme's rules, which is about the
reference, with the scheme's rule (see
[Resolving](resolving.md#checking-the-result)).

The rest say what's wrong and where:

- `reason` is a code from the list in [Reasons](#reasons).
- `rule`'s type is `UriRule | (string & {})`, or the IRI form, since a
  scheme's rule can be any string. `(string & {})` keeps the RFC rules in
  an editor's completions, which plain `string` would swallow.
- `component` is the component the problem is in: `"scheme"`,
  `"authority"`, `"userinfo"`, `"host"`, `"port"`, `"path"`, `"query"`, or
  `"fragment"`. Its type is `keyof IdentifierComponents`, which is that
  list, so it needs no name of its own. The generic diagnosis never says
  `"authority"`, because each of the authority's parts has its own rule.
  It's for scheme rules, like a scheme that requires an authority.
- `start` and `end` are the part of `value` that's wrong, as
  `value.slice(start, end)`. They're UTF-16 indexes, like every index of a
  JavaScript string, and like positions in the Language Server Protocol.
  A character outside the Basic Multilingual Plane is two. Something
  that's missing is an empty span where it would go, like `0` and `0` for
  a missing scheme.

The constructors are private in the declarations, so throwing them isn't
part of the API (see [Types](types.md)).

## Messages

A message is v1's, then what's wrong and where:

```text
InvalidIriError: Invalid IRI: http://exa mple.com — " " isn't allowed in a host, at 10
InvalidUriError: Invalid absolute-URI: http://a/b#c — an absolute-URI can't have a fragment
InvalidUriError: Invalid URI: http://a/é — "é" isn't allowed in a URI, at 9; percent-encode it or use the IRI functions
InvalidUriError: Invalid URI: http://a/%zz — "%" must be followed by two hex digits, at 9
InvalidUriError: Invalid URI: 1a:b — a scheme has to start with a letter, at 0
```

A character that can't be seen, like a space other than U+0020 or a
control character, is written as its code point, like `U+00A0`. Visible
means a letter, mark, number, punctuation, symbol, or U+0020.

Every reason about a character or a part of the value gives where it
starts, including the hint for a character an IRI allows. The position
comes before the hint, which ends the message because it says what to do
about it. A reason about the rule's shape, like a missing scheme or a
fragment in an absolute rule, has no position, since the problem isn't a
character.

A scheme that starts with something other than a letter says so, instead
of naming the character. `"1" isn't allowed in a scheme` would be wrong,
since a scheme can have digits after its first character.

## Diagnosing

The patterns only say whether a value matches. When `assert*`'s pattern
fails, a second step finds out why. Only the error path runs it.
Validators return `false` without it, and a valid value never reaches it.

1. **Split** the value with RFC 3986 Appendix B's regular expression,
   which matches any string. A value that isn't valid still has
   components, by where its delimiters are. The `d` flag gives each
   component's indexes. Appendix B needs at least one character before a
   scheme's `:`, so `:a` has no scheme, and is a `missing-scheme` for the
   URI and absolute functions.
2. **Check the rule's shape.** An `absolute-URI` can't have a fragment, a
   `URI` has to have a scheme, and a relative reference's first segment
   can't have a `:`.
3. **Check each component** with an anchored pattern for that component,
   built from the same rule strings as the whole pattern, in `rules()`.
   For the first one that fails, the longest prefix that its rule's
   characters match ends where the bad character is. A `%` there is
   `invalid-percent-encoding`, and anything else is `invalid-character`.
   A scheme and a port can't be percent-encoded, so a `%` in either is
   `invalid-character`.

The rule's shape is checked before the characters, so
`assertAbsoluteUri("http://a b/#c")` is `fragment-not-allowed`, not the
space. The fragment is wrong whatever else is fixed.

`rules()` returns the component rules with the three whole patterns, and
each is compiled as `^(?:rule)` to match the longest prefix it allows.
Every one is greedy, so the first match is the longest. The path rule is
picked the way `hier-part` and `relative-part` pick it: `path-abempty`
after an authority, `path-absolute` for a path that starts with `/`,
`path-rootless` after a scheme, and `path-noscheme` otherwise. A host
that isn't an IP literal is checked with `reg-name`, which allows every
`IPv4address`, so it fails exactly when `host` does.

The authority is split like `split()` splits it. The first `@` ends the
userinfo, since neither part can have one, so `http://a@b@c` is an
`invalid-character` at the second `@`, in the host. A host that starts
with `[` ends at the first `:` after its `]`. Without a `]`, the rest of
the authority is the literal that's wrong.

Every component except an IP literal is a repetition of characters and
`pct-encoded`, so the longest prefix finds the exact character. An IP
literal that fails is `invalid-ip-literal`, with the whole literal as the
span. Saying which part of an IPv6 address is wrong would need a parser
for it.

The diagnosis is a pure function of the rule strings, the rule's name,
and the value. It isn't a second grammar: the patterns are still the only
definition of what's valid, and the component patterns are made from the
same constants.

It can still disagree with the patterns. It has to find a problem in
every value the pattern rejects, and none in a value the pattern accepts.
It's checked that way by differential testing, on the same random inputs
as the grammar (see
[Grammar](grammar.md#changes-are-checked-by-differential-testing)): for
each of the six rules, `assert*` throws exactly when the validator
returns `false`, and every span is inside the value.

The error says it found a problem, without checking. A value the pattern
rejects always has one, and checking would be code that the differential
test shows can't run.

A URI given a character that's allowed in an IRI gets a hint to
percent-encode it or use the IRI functions, since that's the usual mistake.

### A `:` in a relative reference

`1a:b` can be read two ways. Appendix B reads `1a` as a scheme, which
isn't valid because a scheme starts with a letter. It could also be a
relative path whose first segment has a `:`, which isn't allowed either
(`segment-nz-nc`), and is fixed with `./1a:b`. A reference function
can't know which was meant, so it says both:

```text
InvalidUriError: Invalid URI-reference: 1a:b — "1a" isn't a scheme, which has to start with a letter, and a relative path can't have ":" in its first segment unless it starts with "./"
```

It's `colon-in-first-segment` when everything before the `:` would be
allowed in a segment, so the `:` is the only problem with the path
reading. Otherwise, the bad character is wrong either way, and the error
is `invalid-character` in the scheme, as Appendix B reads it. The URI and
absolute functions don't allow a relative path, so for them it's always
the scheme.

The span is the first segment, up to its `/`, so `1a:b/c` is `1a:b`. The
scheme reading says what's wrong with the scheme, which isn't always its
first character. A scheme can't have `_` but a segment can, so:

```text
InvalidIriError: Invalid IRI-reference: a_b:c — "a_b" isn't a scheme, which can't have "_", and a relative path can't have ":" in its first segment unless it starts with "./"
```

A reference like `:a/b` has nothing before the `:`, so Appendix B gives
it no scheme, and there's only the path reading. It has a position, like
the other reasons about a part of the value.

## Reasons

| `reason` | Span | Example |
| --- | --- | --- |
| `invalid-character` | The character | `http://exa mple.com` |
| `invalid-percent-encoding` | The `%` and up to two characters after it | `http://a/%zz` |
| `invalid-ip-literal` | The literal, with its brackets | `http://[::g]/` |
| `missing-scheme` | Empty, at 0 | `assertUri("/a")` |
| `fragment-not-allowed` | The fragment, with its `#` | `assertAbsoluteUri("http://a#b")` |
| `colon-in-first-segment` | The first segment | `assertUriReference("1a:b")` |
| `missing-component` | Empty, where it would go | `http:/a`, by `http`'s rules |
| `forbidden-component` | The component, with its delimiter | A query on a scheme that forbids one |
| `component-mismatch` | The component | A component that doesn't match its scheme's pattern |

The last three are for scheme rules (see [Scheme rules](#scheme-rules)).

`reason` is a union of these strings in the declarations,
`InvalidIdentifierReason`, so a caller can `switch` on it and TypeScript
checks every case. Adding one later breaks that `switch`, so the list is
settled before 2.0.0.

## Scheme rules

`assert*` reports a scheme's rule that fails with the same fields as the
generic syntax: a `reason`, the `component`, and a span. The `rule` is
the scheme's, like `"http-URI"`.

| `reason` | Message |
| --- | --- |
| `missing-component` | `an http URI must have an authority` |
| `forbidden-component` | `a did URI can't have an authority` |
| `component-mismatch` | `a did URI's path must be a method name, ":", and a method-specific ID, in ASCII, like example:123456` |

The scheme's name in a message is its name, and its article is "an" for
a name that's read letter by letter from one whose letter name starts
with a vowel sound, like `http`, and for a word that starts with a vowel
other than `u`: `an http URI`, `a did URI`, `a urn URI`.

- A `component-mismatch` spans the whole component, not a character in
  it.
- A `missing-component` is an empty span where the component would go,
  like `5` for `http:/a`'s authority.
- A `forbidden-component` spans the component with its delimiter, like
  `?b` or `//a`, so a forbidden empty query isn't an empty span, which
  would read as a missing one.

The generic syntax is checked first, so a character that no component of
that kind can have has already been reported, at its position. What a
scheme adds is structure, like a method name where the path starts, and
a description of the structure says more than a position in it would.

### Rejected

- **`wrong-scheme`**, for a reference checked against a scheme that has a
  different one. Checking references against a scheme isn't supported.
- **Positions inside a scheme's pattern**, with the longest prefix that
  matches, as the generic diagnosis does. It's only exact for a
  repetition of characters. For a pattern with structure, like `urn`'s
  path, the longest match can end well before the mistake, and the
  position would point at the wrong place.

## Rejected

- **`Error` only**, as in v1. Callers could only tell errors apart by
  their messages.
- **One class per rule**, like `InvalidAbsoluteUriError`. Six classes for
  what `rule` says in one property.
- **One `InvalidIdentifierError` for URIs and IRIs.** A caller of the IRI
  functions would have to check `rule` to know an IRI was meant, and the
  type of `rule` couldn't be narrowed by `instanceof`.
- **Keeping v1's messages as they were.** That was the first decision,
  so code that matches them would keep working. But they only say the
  value isn't valid, not why, and that's the most common thing a caller
  needs to know. v1's text is still where the message starts, so a match
  on the start of it still works.
- **A message only.** A language server needs a span to underline, and
  shouldn't have to parse a message to get one.
- **Parsers that validate, as the way to get a reason**: a caller who
  wanted to know why called the parser and caught the error. A caller who
  trusts a value paid for the check on every parse, and an option to turn
  it on is two functions in one. `assert*` is that, as six exports (see
  [Trust](trust.md)).
- **Diagnosing in validators.** They return a boolean, and JSON Schema's
  format validation calls them on every value.
- **A second grammar for diagnosing**, such as a recursive-descent parser
  that reports where it fails. It could say exactly what's wrong inside an
  IPv6 address, but it would be another definition of what's valid, and
  one that doesn't read like the ABNF.
- **Code points for positions.** They're what a person counts, but every
  JavaScript string method and the Language Server Protocol use UTF-16
  indexes, and converting would be the caller's job either way.
- **`reason` as a `string`**, so adding one isn't a breaking change.
  Callers couldn't `switch` on it with the types' help.
- **Picking one reading of `1a:b`.** Either one is wrong for the callers
  who meant the other.
- **"Has to start with a letter" for every scheme reading of a `:`.** It's
  wrong for `a_b:c`, where the first character is fine.
- **The position at the end, after the hint.** "Use the IRI functions, at
  9" reads as if the functions are at 9.
- **The last `@` ending the userinfo.** It would put the error in the
  userinfo instead of the host. Neither is better, and the first `@`
  is how `split()` reads a valid authority.
- **`invalid-character` after an IP literal's `]`**, for `[::1]x`. The
  literal is the whole host, so it's `invalid-ip-literal` over all of it,
  as for any literal that fails.
- **Checking the characters before the rule's shape.** A fragment in an
  absolute-URI is wrong however its characters are fixed, so it's said
  first.
