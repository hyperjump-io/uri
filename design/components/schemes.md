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
   `"http-URI"`, and says which of its rules failed (see
   [Errors](#errors)).
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
- A scheme's path rule applies only to a path that is the path of what
  the reference resolves to, apart from removing dot segments. That's a
  reference with a scheme or an authority. Any other path is relative,
  and gets the generic syntax only. `schema.json` isn't `file`'s
  `path-absolute`, but against `file:///a/b.json` it resolves to
  `file:///a/schema.json`, which is. The path it resolves to is checked
  when it's resolved (see
  [Resolving, relativizing, and normalizing](#resolving-relativizing-and-normalizing)).
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
- **A scheme's path rule for every path a reference has.** A relative
  path is only part of the path it resolves to, so the rule asks the
  wrong question of it. `isIriReference("schema.json", { scheme: "file" })`
  would be `false`, for a reference that resolves to a valid `file` URI.

## Resolving, relativizing, and normalizing

`resolve*`, `toRelative*`, `toAbsolute*`, and `normalize*` check scheme
rules too, as strictly as the validators. Looser checks would hide broken
data, which is why `resolve*` checks its base even when it isn't used
(see [Resolving](resolving.md)). They take `customSchemes`, `schemes`, and
`allowUnknownScheme`, which mean what they mean for the validators. They
don't take `scheme`, because what they work on always has a scheme of its
own: a base, a `URI`, or what a reference resolves to.

`resolve*` checks:

1. The base, with its scheme's rules, whether the reference uses it or
   not.
2. The reference, with the generic syntax only.
3. The result, with its scheme's rules.

The result is checked instead of the reference because resolving makes a
path that neither input has. Resolving `b` against `urn:example:a` merges
the paths into `urn:b`, which has no namespace-specific string. Checking
the result also catches what the reference brings: `//` against
`http://a/b` is `http://`, which has an empty host. Every part of the
reference that's kept is in the result, so checking the reference against
the scheme as well would add nothing.

A result that fails can only be the reference's fault, since the base has
already passed, so the error is about the reference. Its `value` is the
reference, and its `rule` is the scheme's rule. A component the result has
from the reference is spanned in the reference. A merged path spans the
reference's path, because no one place in the reference made it. A
reference with a scheme of its own that's unknown throws
`UnknownSchemeError`, unless `allowUnknownScheme` is `true`.

RFC 8141 §4.3 says resolving a relative reference against a `urn` URI "is
problematic", and that applications "should generally avoid" it. It also
says resolving with the generic algorithm "should work predictably" for
`urn` URIs. So
resolving against a URN isn't an error: the result is checked like any
other. `c` against `urn:example:a/b` is `urn:example:a/c`, which is valid.

`toRelative*` checks `uri` and `base` with their schemes' rules. Its
result resolves to `uri`, which has passed, so it isn't checked.
`toAbsolute*` and `normalize*` check what they're given. `normalize*`
also checks its result, but only when it removed dot segments, because
that's the only step that can break a scheme's rule (see
[Normalizing](#normalizing)).

### Rejected

- **The generic syntax only.** A base like `http:///a` would resolve
  references, and the problem would show up later, if at all: `//host/x`
  against it gives a valid result. Valid inputs can also make an invalid
  result, like `//` against `http://a/b`.
- **Checking the reference against the base's scheme, instead of the
  result.** It misses the merged path, which only the result has.
- **A rule that a scheme doesn't allow relative references.** RFC 8141's
  "should generally avoid" is advice to whoever writes the identifiers,
  not a syntax rule, and only MUST-level rules are built in. RFC 4151
  doesn't mention relative references for `tag`. Checking the result
  already rejects references that make an invalid identifier.

## Defining a scheme

`defineScheme` makes a scheme from its name, the rule its specification
names it by, and rules for its components:

```js
const tagScheme = defineScheme({
  name: "tag",
  rule: "tagURI",
  authority: "forbidden",
  path: {
    pattern: (rules) => `...`,
    description: "a tagging entity, a date, \":\", and a name, like example.com,2004:a"
  }
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
- A pattern can be given by itself, or with a `description` of what the
  component has to be, for error messages (see [Errors](#errors)).
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

## Errors

An identifier that fails its scheme's rules gets the same error fields as
one that fails the generic syntax (see [Errors](errors.md)): a `reason`,
the `component`, and a span. The message is made from the scheme's
definition, so a custom scheme's errors are as useful as a built-in's:

| `reason` | Message |
| --- | --- |
| `missing-component` | `an http URI must have an authority` |
| `forbidden-component` | `a tag URI can't have an authority` |
| `component-mismatch` | `a tag URI's path must be a tagging entity, a date, ":", and a name, like example.com,2004:a` |
| `wrong-scheme` | `the scheme must be file` |

The scheme's name in a message is its `name`. A pattern without a
`description` falls back to the rule: `the path doesn't match tagURI`.

A `component-mismatch` spans the whole component, not a character in it.
The generic syntax is checked first, so a character that no component of
that kind can have has already been reported, at its position. What a
scheme's pattern adds is structure, like a date where the path starts,
and a description of the structure says more than a position in it would.

### Rejected

- **Positions inside a scheme's pattern**, with the longest prefix that
  matches, as the generic diagnosis does. It's only exact for a
  repetition of characters. For a pattern with structure, like `tag`'s
  path, the longest match can end well before the mistake, and the
  position would point at the wrong place.
- **Messages without a description**, from the scheme's rule name only.
  "Doesn't match tagURI" is the same message that the generic errors
  were changed to get rid of.

## Normalizing

Every function that returns an identifier normalizes it with its scheme's
rules too, after the syntax-based normalization (RFC 3986 §6.2.3). It's in
2.0.0 because adding it later would change what `resolve*`, `toRelative*`,
and `normalize*` return, the way adding a built-in scheme would. It also
makes `https://example.com` and `https://example.com/` the same `$id`.

A scheme's specification can add normalizations and take away
syntax-based ones, because the scheme is the second layer of the syntax
(RFC 3986 §1.1.1):

| Scheme | Normalization | Specification |
| --- | --- | --- |
| `http`, `https` | The default port, `80` or `443`, and an empty port are removed. An empty path is `/`. | RFC 9110 §4.2.3, RFC 3986 §6.2.3 |
| `ws`, `wss` | The same as `http` and `https` | RFC 6455 |
| `file` | An authority of `localhost` is removed, since RFC 8089 reads it "exactly as if no authority were present" | RFC 8089 §2 |
| `urn` | Percent-encoded characters aren't decoded: "Percent-encoded characters MUST NOT be decoded." Their hex digits are still made uppercase. | RFC 8141 §3.1 |
| `tag` | None at all, syntax-based included. Tags are equal "if and only if they are completely indistinguishable". | RFC 4151 §2.4 |

So `normalizeIri("urn:example:%41")` is `urn:example:%41`, where it was
`urn:example:A` before scheme rules.

A scheme declares its normalization as data in `defineScheme`, like its
validation rules:

```js
defineScheme({
  name: "http",
  rule: "http-URI",
  authority: "required",
  defaultPort: 80,
  emptyPath: "/",
  ...
});
```

- `defaultPort` is the port that's removed. A scheme with a default port
  also has an empty port removed, since an empty port means the default.
- `emptyPath` is what an empty path is normalized to.
- An authority that means the same as none, like `file`'s `localhost`.
- Steps of the syntax-based normalization that the scheme turns off, like
  decoding for `urn`, or all of them for `tag`.

What isn't normalized:

- **Fragments.** "The fragment component is not subject to any
  scheme-based normalization" (RFC 3986 §6.2.3), so `defineScheme` has no
  fragment normalization, even though a fragment can have rules.
- **Empty ports of other schemes.** RFC 3986 §6.2.3 says not to remove a
  delimiter whose component is empty "unless licensed to do so by the
  scheme specification". An empty port means the default port, so it's
  removed only for a scheme that has one. `foo://a:/` keeps its `:`
  (see [Answer only what's known](../principles/answer-only-whats-known.md)).
- **Unknown schemes.** With `allowUnknownScheme`, an identifier whose
  scheme is unknown gets the syntax-based normalization only, the way it
  gets the generic syntax only. So `normalizeIri("urn:example:%41",
  { schemes: [], allowUnknownScheme: true })` is `urn:example:A`. The
  user docs say so, since it's a surprise.

`normalize*` checks its result when it removed dot segments, which can
make a path that a scheme's rule doesn't allow, like merging paths can in
`resolve*`. Dropping a port, removing an authority, or making an empty
path `/` can't break a rule, so other results aren't checked.

### Rejected

- **Leaving it until after 2.0.0.** It changes the results of every
  function that returns an identifier, so it's a breaking change whenever
  it's added. And the syntax-based normalization is already wrong for
  `urn` and `tag` without it.
- **Only adding to the syntax-based normalization.** RFC 8141 forbids
  decoding, and RFC 4151 forbids any change. The scheme's specification
  is the RFC that applies, so it wins (see
  [Follow the RFCs](../principles/follow-the-rfcs.md)).
- **A normalization function**, `(components) => components`. It's pure
  and more flexible, but it can't be checked against the specification
  like data can, and it could break the scheme's own rules, so every
  result would have to be checked. It can be added if a scheme needs it.
- **Removing an empty port for every scheme.** What an empty port means
  is up to the scheme.
- **Equivalence that isn't a normal form**, like ignoring the r-, q-,
  and f-components (RFC 8141 §3.1), or comparing Windows drive letters
  without case (RFC 8089 Appendix E.2, which isn't normative). The
  result of `normalize*` is an identifier for the same resource, not a
  key for comparing, so it can't drop or change what the identifier
  says. An `equals*` function could do it, and adding one later isn't a
  breaking change.

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

- URN namespaces, like `urn:uuid:` (RFC 9562), which add rules for the
  namespace a URN names. `urn`'s definition shouldn't rule them out.

## What changes for callers

- `isIri("http:///a")` is `false`, and `isIri("foo:bar")` throws
  `UnknownSchemeError`, where both were `true` in v1. Migrate from v1
  lists it.
- `resolveIri("foo:bar", "https://a/")` throws `UnknownSchemeError`, and
  so does a base with an unknown scheme. Callers that resolve identifiers
  with schemes that aren't built in pass options.
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
  built-ins are compiled. `resolve*` checks two identifiers with their
  schemes' rules, the base and the result.
- How a scheme says that part of a component is case-insensitive, so
  it's made lowercase. RFC 8141 makes the NID of a URN case-insensitive, and
  the NID is in the path. RFC 3986 §6.2.3 gives `mailto` as another
  example. The data in [Normalizing](#normalizing) doesn't cover it yet.
- The names of the normalization fields in `defineScheme`.
- Whether a `tag` URI's scheme is lowercased. RFC 3986 makes the scheme
  case-insensitive for every URI, and RFC 4151 says tags are compared
  without any change. The design follows RFC 4151 for now.
- Normalization rules for the other candidates, like `mailto`'s domain,
  checked against each specification with its syntax.
- Which rule strings are exported for custom schemes, since they become
  public API.
