# Schemes

*Designed, not implemented.*

RFC 3986 §1.1.1 makes URI syntax two layers: the generic syntax every URI
follows, and the rules a scheme's specification adds. `http:///a` is a
valid URI, but RFC 9110 says an `http` URI with an empty host is invalid.
The validators and parsers check both layers: the generic syntax, then the
rules of the scheme the identifier has.

Strict is the default. Every built-in scheme's rules apply, and an
identifier whose scheme has no rules throws, because whether it's valid for
its scheme can't be known (see
[Answer only what's known](../principles/answer-only-whats-known.md)).

## Options

`isUri`, `isAbsoluteUri`, `parseUri`, `parseAbsoluteUri`, and their IRI
forms take options:

| Option | Default | Description |
| --- | --- | --- |
| `customSchemes` | `[]` | Schemes made with `defineScheme`. One with a built-in's name replaces it. |
| `schemes` | Every built-in and custom scheme | The names of the schemes this call knows. Any other scheme is unknown. |
| `allowUnknownScheme` | `false` | Check an identifier whose scheme is unknown with the generic syntax only, instead of throwing `UnknownSchemeError` |
| `allowUnknownIpLiteral` | `false` | Validators only. Return `true` for a future IP literal that's otherwise valid, instead of throwing `UnsupportedIpVersionError`. |

```js
isIri(value);                                         // built-in schemes, strict
isIri(value, { customSchemes: [tagScheme] });         // built-ins and tag
isIri(value, { schemes: ["https"] });                 // https only, anything else throws
isIri(value, { schemes: [], allowUnknownScheme: true }); // generic syntax only
```

- A name in `schemes` that no built-in or custom scheme has is a
  `TypeError`, where the call is, not an unknown scheme. Two custom
  schemes with the same name are a `TypeError` too. Names match without
  case, like schemes do (RFC 3986 §3.1).
- A known scheme that's left out of `schemes` is unknown. To allow a
  scheme without checking any rules of its own, define it with none:
  `defineScheme({ name: "data" })`. That's also how a built-in's rules are
  turned off: a custom scheme with its name and no rules replaces it.
- `allowUnknownIpLiteral` doesn't apply to parsers, which accept future IP
  literals already, because they only need the syntax (see
  [Future IP versions](future-ip-versions.md)). The types say so: parse
  options are the scheme options, and validate options are the scheme
  options and `allowUnknownIpLiteral`. One object of validate options
  still works for both, since TypeScript only rejects unknown properties
  in an object literal.

## Checking an identifier

1. The generic syntax. An identifier that fails it is invalid: `false`
   from a validator, `InvalidUriError` or `InvalidIriError` from a
   parser. Its scheme isn't looked up, because a string that isn't valid
   doesn't reliably have one.
2. Its scheme's rules, if the scheme is known. An identifier that fails
   them is invalid, and the parser's error has the scheme's rule, like
   `"http-URI"`.
3. Otherwise, the scheme is unknown. It throws `UnknownSchemeError`, with
   `value` and `scheme`, from validators and parsers, unless
   `allowUnknownScheme` is `true`.

Schemes are looked up by scanning the list for the call. It's a few
entries, and a cache by options object would be a hidden channel.

## References

A relative reference has no scheme to look up. It gets one when it's
resolved, so the reference functions take the scheme it will be resolved
under, by name, with `customSchemes` so that the name can be a custom one:

```js
isIriReference("//example.com/a", { scheme: "https" });
```

- The given scheme's rules apply to the components the reference has,
  without looking the scheme up. A rule that's only about the absolute
  form, like `http` requiring an authority, doesn't apply to a reference
  that doesn't have one.
- One of a scheme's rules is its name: a scheme component, if there is
  one, is the scheme's name. So a reference with a different scheme of its
  own fails the given scheme's rules.
  `isIriReference("http://a/b", { scheme: "file" })` is `false`.
- Without `scheme`, a relative reference gets the generic syntax only, and
  a reference with a scheme of its own is checked by that scheme, like
  `isIri` checks it, with the same options.

### Rejected

- **Checking a reference against both schemes**, the given one and its
  own. It let a reference with a different scheme pass, if it happened to
  fit the given scheme's component rules, like `http://a/b` for `file`.
  With the name as one of the given scheme's rules, a reference with its
  own scheme only passes if it's the given scheme, and the second check
  adds nothing.
- **A separate rule that a different scheme is invalid.** The scheme's
  name is one of its rules, so it isn't a rule of its own.

## Defining a scheme

`defineScheme` makes a scheme from its name, the rule its specification
names it by, and rules for its components:

```js
const tagScheme = defineScheme({
  name: "tag",
  rule: "tagURI",
  authority: "forbidden",
  path: (rules) => `...`
});
```

- The name is a rule: the scheme component is the name, without case.
- `"required"` and `"forbidden"` say whether a component has to be there
  or can't be, fragments included. A pattern can't, since an empty pattern
  means the component is there but empty.
- A component's pattern is a regular expression source, checked whenever
  the component is there. It's written as a function of the rule strings
  the library exports, `pchar`, `segment`, `regName`, and the rest, named
  after the RFC's rules. `defineScheme` calls it once with the URI rules
  and once with the IRI rules, the way the generic grammar is built (see
  [Grammar](grammar.md#uris-and-iris)), so one definition covers both. For
  IRIs, `pchar` is `ipchar`, so a scheme doesn't have to know which it's
  compiled for.
- Fragments have rules like any other component. RFC 8141 defines the
  fragment of a URN as `f-component`, and a scheme can forbid fragments.
- `defineScheme` compiles the patterns when it's called, so a bad pattern
  fails where it's written, and once for every call that uses it.

The built-in schemes are made the same way, from their RFC's ABNF, so they
can be checked against it like the generic grammar.

### Rejected

- **A scheme value or a list of them as the only option.** A list given
  replaced the built-ins, so adding one custom scheme meant spreading the
  built-ins back in, and only one scheme could be checked at a time in the
  first version.
- **Generic checks for unknown schemes by default.** Strict is the rule.
- **No rules for fragments.** A fragment's meaning comes from the media
  type (RFC 3986 §3.5), but that doesn't stop a scheme from constraining
  its syntax, and some specifications do.
- **Predicates for components.** They allow rules that aren't regular,
  like RFC 4151's date, but they don't read like the ABNF and can't be
  checked against the RFC.
- **Separate URI and IRI patterns.** Every scheme would write its rules
  twice.
- **Mapping an IRI to a URI, then checking the URI's rules** (RFC 3987
  §3.1). One pattern per scheme, but the mapping would cost on every
  check.
- **A way to register schemes**, so that every call knows them. A call's
  result would depend on what some other module registered. Code that
  uses the same options in many places wraps the functions instead.

## Built-in schemes

A built-in is a scheme whose specification defines its syntax, preferably
in ABNF, that's widely used. Adding a built-in later changes results for
callers who don't name their `schemes`, so as many as can be are built in
from the start, and adding one later is a breaking change.

Only MUST-level rules are built in. A SHOULD, like RFC 9110 saying a
recipient should treat `userinfo` in an `http` URI as an error, is a
policy that differs by caller.

Candidates, each to be checked against its specification before it's
built in:

| Schemes | Specification |
| --- | --- |
| `http`, `https` | RFC 9110 |
| `ws`, `wss` | RFC 6455 |
| `file` | RFC 8089 |
| `urn` | RFC 8141 |
| `mailto` | RFC 6068 |
| `data` | RFC 2397 |
| `tel` | RFC 3966 |
| `tag` | RFC 4151 |
| `geo` | RFC 5870 |
| `sip`, `sips` | RFC 3261 |
| `ftp` | RFC 1738 |
| `ldap` | RFC 4516 |
| `news`, `nntp` | RFC 5538 |
| `xmpp` | RFC 5122 |
| `coap`, `coaps` | RFC 7252 |
| `about` | RFC 6694 |
| `dns` | RFC 4501 |

## Not in scope yet

- Scheme-based normalization (RFC 3986 §6.2.3), like dropping `:80` from
  an `http` URI. It changes which identifiers are equal, which matters for
  comparing JSON Schema identifiers, so it's a decision of its own.
- URN namespaces, like `urn:uuid:` (RFC 9562), which add rules for the
  namespace a URN names. `urn`'s definition shouldn't rule them out.
- Scheme options for `resolve*`, `toRelative*`, `normalize*`, and
  `toAbsolute*`. Whether those should be more tolerant than the
  validators is a separate question.

## What changes for callers

- `isIri("http:///a")` is `false`, and `isIri("foo:bar")` throws
  `UnknownSchemeError`, where both were `true` in v1. Migrate from v1
  lists it.
- The JSON Schema `uri` and `iri` formats are the generic syntax, so
  `json-schema-formats` passes `{ schemes: [], allowUnknownScheme: true }`.

## Open questions

- Which candidates are built in. Each needs its specification's syntax
  checked, and some, like `ftp` and `news`, are from RFCs that are old or
  obsolete.
- Whether schemes that are registered with IANA but whose specifications
  don't define a syntax should be built in with no rules, so they're known
  but checked with the generic syntax only. Strict by default makes an
  unknown scheme throw, so this decides how often that happens.
- RFC details to check: whether RFC 8089's `file-URI` allows a query or a
  fragment, what RFC 8141 requires of `f-component`, and RFC 9110's exact
  wording on empty hosts.
- How expensive the default path is, with a scheme lookup and that
  scheme's rules on every call. To be measured before choosing how the
  built-ins are compiled.
- Which rule strings are exported for custom schemes, since they become
  public API.
