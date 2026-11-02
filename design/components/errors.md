# Errors

*The diagnosis is designed, not implemented.*

Each error is its own class, so it can be told apart with `instanceof`
instead of by its message.

| Class | Extends | Properties | Thrown when |
| --- | --- | --- | --- |
| `InvalidUriError` | `Error` | `value`, `rule`, `reason`, `component`, `start`, `end` | A value isn't the kind of URI a function needs |
| `InvalidIriError` | `Error` | `value`, `rule`, `reason`, `component`, `start`, `end` | A value isn't the kind of IRI a function needs |
| `UnsupportedIpVersionError` | `Error` | `value`, `host` | A validator is given a future IP literal (see [Future IP versions](future-ip-versions.md)) |

`value` is the string that was given. `rule` is the RFC rule it doesn't
match: `"URI"`, `"URI-reference"`, or `"absolute-URI"`, or their IRI
forms. When a function takes two identifiers, like `resolveUri`, the rule
says which one was wrong: the reference is a `URI-reference` and the base
is an `absolute-URI`.

The rest say what's wrong and where:

- `reason` is a code from the list in [Reasons](#reasons).
- `component` is the component the problem is in: `"scheme"`,
  `"authority"`, `"userinfo"`, `"host"`, `"port"`, `"path"`, `"query"`, or
  `"fragment"`.
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
InvalidUriError: Invalid URI: http://a/é — "é" isn't allowed in a URI; percent-encode it or use the IRI functions
InvalidUriError: Invalid URI: http://a/%zz — "%" must be followed by two hex digits, at 9
```

A character that can't be seen, like a space other than U+0020 or a
control character, is written as its code point, like `U+00A0`.

## Diagnosing

The patterns only say whether a value matches. When a parser's pattern
fails, a second step finds out why. Only the error path runs it.
Validators return `false` without it, and a valid value never reaches it.

1. **Split** the value with RFC 3986 Appendix B's regular expression,
   which matches any string. A value that isn't valid still has
   components, by where its delimiters are.
2. **Check the rule's shape.** An `absolute-URI` can't have a fragment, a
   `URI` has to have a scheme, and a relative reference's first segment
   can't have a `:`.
3. **Check each component** with an anchored pattern for that component,
   built from the same rule strings as the whole pattern, in `rules()`.
   For the first one that fails, the longest prefix that its rule's
   characters match ends where the bad character is. A `%` there is
   `invalid-percent-encoding`, and anything else is `invalid-character`.

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
as the grammar (see [Grammar](grammar.md#changes-are-checked-by-differential-testing)).

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

## Reasons

| `reason` | Span | Example |
| --- | --- | --- |
| `invalid-character` | The character | `http://exa mple.com` |
| `invalid-percent-encoding` | The `%` and up to two characters after it | `http://a/%zz` |
| `invalid-ip-literal` | The literal, with its brackets | `http://[::g]/` |
| `missing-scheme` | Empty, at 0 | `parseUri("/a")` |
| `fragment-not-allowed` | The fragment, with its `#` | `parseAbsoluteUri("http://a#b")` |
| `colon-in-first-segment` | The first segment | `parseUriReference("1a:b")` |
| `missing-component` | Empty, where it would go | `http:/a`, by `http`'s rules |
| `forbidden-component` | The component | A query on a scheme that forbids one |
| `component-mismatch` | The component | A component that doesn't match its scheme's pattern |
| `wrong-scheme` | The scheme | `isIriReference("http://a/b", { scheme: "file" })` |

The last four are for scheme rules (see
[Schemes](schemes.md#errors)).

`reason` is a union of these strings in the declarations, so a caller can
`switch` on it and TypeScript checks every case. Adding one later breaks
that `switch`, so the list is settled before 2.0.0, with the scheme
reasons in it.

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
- **A diagnosis function for validators**, like `explainIri`, for a
  caller who got `false` and wants to know why. That's six more exports,
  or one that takes a rule name. A caller who wants the reason calls the
  parser and catches the error.
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
