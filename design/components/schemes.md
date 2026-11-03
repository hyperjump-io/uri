# Schemes

*Designed, not implemented.*

RFC 3986 §1.1.1 makes URI syntax two layers: the generic syntax every URI
follows, and the rules a scheme's specification adds. `http:///a` is a
valid URI, but RFC 9110 says an `http` URI with an empty host is invalid.
The validators check both layers: the generic syntax, then the rules of
the scheme the identifier has. A validator that knows a scheme is expected
to apply its rules. One that doesn't know it says so.

## Use cases

The design is for these, and isn't stretched for others:

- **JSON Schema's `uri`, `iri`, `uri-reference`, and `iri-reference`
  formats**, in `json-schema-formats`. The values can have any scheme.
- **Identifying and referencing in JSON Schema**: resolving `$ref` against
  `$id`, the keys of a registry, and bundling. Identifiers are `https`,
  `file`, `urn:uuid`, `tag`, and schemes nobody has registered. OpenAPI's
  `$ref` and `$self` are the same case.
- **Specifications that use identifiers only as names**: JSON-LD and RDF,
  Atom's `atom:id`, the `redirect_uri`s registered with an OAuth server,
  and `did:` identifiers. Unknown
  schemes are common there, like private-use OAuth schemes and `did:`, and
  identifiers are compared as strings, so they need resolving that
  doesn't normalize.

Not supported on purpose:

- **Checking the syntax of schemes like `tel`, `geo`, `sip`, `ldap`,
  `xmpp`, `news`, or `dns` in depth.** A caller working with them uses a
  library for them, and passing a `tel` pattern still wouldn't make
  something a phone number.
- **Checking a relative reference against a scheme**, like
  `isIriReference("schema.json", { scheme: "file" })`. A caller resolves
  the reference and checks the result.

## Which functions know schemes

| Function | What it does with the scheme | Options |
| --- | --- | --- |
| `is*`, `assert*` | Checks its rules | `customSchemes`, `allowUnknownIpLiteral` |
| `resolveIri` | Checks the result's rules (see [Resolving](#resolving)) | `customSchemes` |
| `normalizeUri`, `normalizeIri` | Applies its normalization (see [Normalizing](#normalizing)) | `customSchemes` |
| `parseIri`, `toAbsoluteIri`, `toRelativeIri` | Nothing | None |

The others trust what they're given (see [Trust](trust.md)), and a value
only has a brand if its scheme passed a validator, so they don't need to
look it up.

`customSchemes` is a list of schemes made with `defineScheme`. A custom
scheme with a built-in's name replaces the built-in. That's how a
built-in's rules are turned off, too: a custom scheme with its name and no
rules. There's no option for turning off scheme checks, because that's a
generic-only validator, which "I don't know" rules out.

Schemes are looked up by scanning the built-ins and the list for the call.
It's a few entries, and a cache by options object would be a hidden
channel. Names match without case, like schemes do (RFC 3986 §3.1).

## Unknown schemes

`is*`, `assert*`, `resolveIri`, and `normalize*` throw
`UnknownSchemeError`, with `value` and `scheme`, for a scheme that isn't
built in or in `customSchemes`. Whether the identifier is valid for its
scheme can't be known, so the answer is "I don't know" (see
[Answer only what's known](../principles/answer-only-whats-known.md)).
`resolveIri` can't check its result without the rules, and `normalize*`
would make a key that's different from the one it makes with the scheme
configured, so they say so too.

`json-schema-formats` lets the error through. "I don't know" is a valid
answer to whether a value is a `uri`. A JSON Schema user with identifiers
of other schemes configures them, which `@hyperjump/json-schema` needs an
option for.

Adding a built-in after 2.0.0 isn't a breaking change for validating. It
only turns an `UnknownSchemeError` into an answer.

### Rejected

- **The generic syntax only, by default.** The JSON Schema formats were
  read as the generic syntax, and nothing would ever throw. But a
  validator that knows a scheme is expected to apply its rules, and an
  implementation that doesn't is guessing that what it doesn't check is
  fine.
- **Scheme rules for known schemes, and the generic syntax for unknown
  ones**, which is what WHATWG URL, `uri-js`, and `fast-uri` do. It's a
  guess for every unknown scheme, and adding a built-in would change
  answers that were `true`.
- **`allowUnknownScheme`**, to get the generic syntax for unknown schemes.
  It's the same guess as an option. A caller who means a specific scheme
  defines it, with no rules if it has none.
- **`schemes`**, the names of the schemes a call knows, to narrow the
  built-ins. A caller who doesn't want a built-in replaces it.

## Custom schemes

`defineScheme` makes a scheme from its name, its rules, and its
normalization. Most callers will never need one, so it's an escape hatch,
and its ergonomics aren't optimized. What it looks like is an open
question (see [Open questions](#open-questions)).

A custom scheme carries normalization as well as rules, because
`normalize*` should do its best for any scheme it's given, and a caller
can extend which schemes it knows the normalization of. Normalization
runs after the syntax-based normalization, and a scheme can turn the
syntax-based normalization off, which `urn` and `tag` need (see
[Normalizing](#normalizing)).

### Rejected

- **Composing functions instead**, like checking the scheme from
  `parseIri` and calling a checker of the caller's own for it. Every
  caller would write the dispatch, and to add one scheme they'd have to
  let every other unknown scheme through. It doesn't pass through layers
  either: `json-schema-formats` calls `isIri` itself, and a list of
  schemes is easier to hand down than a replacement for `isIri`.
- **Validation only**, with custom normalization composed after
  `normalize*`. A registry that normalizes its keys would need the
  composition everywhere it normalizes.
- **A way to register schemes**, so that every call knows them. A call's
  result would depend on what some other module registered. Code that
  uses the same options in many places wraps the functions instead.

## The `urn` scheme

The syntax of a URN is two layers too. RFC 8141 defines the first, `urn:`,
the NID, `:`, the NSS, and the r-, q-, and f-components, and its
normalization. The namespace the NID names defines the rest. So:

- The `urn` built-in checks RFC 8141's syntax, and the namespace's rules
  for a namespace it knows. It knows `uuid` (RFC 9562).
- A URN of a namespace it doesn't know is "I don't know", like an unknown
  scheme.
- A caller adds namespaces with a factory that makes a `urn` scheme, and
  passes it in `customSchemes`, where it replaces the built-in. The
  factory includes `uuid` unless it's replaced.
- `parseUrn` splits a URN into its NID, NSS, and the r-, q-, and
  f-components, for any namespace.

`urn:example` (RFC 6963), which is for documentation, isn't built in.
Checking a documentation example is the only use for it, and the factory
covers that.

### Rejected

- **No built-in `urn`**, with every caller defining it. The RFC 8141
  layer would be written again by everyone, and `uuid`'s rules would have
  to be exported.
- **A separate option for namespaces.** The factory is one way to extend
  `urn`, and replacing the built-in is already how a scheme is changed.

## Built-in schemes

`http`, `https`, `file`, `tag`, and `urn`, with the `uuid` namespace. Each
is a scheme JSON Schema's identifiers use.

Only MUST-level rules are built in. A SHOULD, like RFC 9110 saying a
recipient should treat `userinfo` in an `http` URI as an error, is a
policy that differs by caller.

`tag` and `urn` get parse functions, `parseTag` and `parseUrn`, because a
caller expects their parts: a tagging entity and a date, or a NID. The
others have nothing the generic components don't have. Parse functions
split like `parseIri` does, and trust what they're given.

Validators for one scheme, like `isUrn`, aren't in 2.0.0. No use case
needs them yet.

### Rejected

- **Every widely used scheme whose specification defines its syntax**:
  `ws`, `mailto`, `data`, `tel`, `geo`, `sip`, `ftp`, `ldap`, `news`,
  `xmpp`, `coap`, `about`, and `dns`. It was chosen because adding a
  built-in was a breaking change, which it isn't when unknown schemes
  throw. None of them has a use case here. Dropping `coap` also drops the
  question of putting its IPv6 literals in RFC 5952 form, measured in
  [IPv6 canonical form](../benchmarks/ipv6-canonical-form.md).
- **Built-ins with no rules for schemes registered with IANA without a
  syntax.** They'd be checked with the generic syntax only, which is the
  guess an unknown scheme isn't allowed.

## Resolving

`resolveIri` checks its result's scheme rules. A valid reference against
a valid base can make an invalid identifier, and the result is new data,
so checking it isn't paying for a check of trusted data (see
[Pay only for what you ask for](../principles/pay-only-for-what-you-ask-for.md)).
The base's brand says its scheme is known, so the check never needs a
scheme it doesn't have.

Where results can break their scheme's rules, with ✓ for a result that's
always valid and ✗ for one that can't be:

| Reference | `http`, `https` | `file` | `tag` | `urn` |
| --- | --- | --- | --- | --- |
| `""` | ✓ the base | ✓ | ✓ | ✓ |
| `#f` | ✓ | Open: whether `file` allows a fragment | ✓ | ✓ f-component |
| `?q` | ✓ | Open: whether `file` allows a query | ✗ `tag:x,2000:a?q`, no query in `tagURI` | ✗ `urn:ex:a?q`, needs `?=` or `?+` |
| `b` | ✓ | ✓ | ✗ `tag:b` | ✗ `urn:b` |
| `/b` | ✓ | ✓ | ✗ `tag:/b` | ✗ `urn:/b` |
| `//h/b` | ✓ | ✓ | ✗ | ✗ |
| `//` | ✗ `http://`, empty host | ✓ `file://` | ✗ | ✗ |
| Its own scheme | ✓ unless dot segments | ✓ | ✗ `tag:x,2000:a/../b` is `tag:/b` | ✗ the same |

Hierarchical schemes break only on an empty host. `tag` and `urn` break
on nearly every relative reference, and even an absolute reference can
break, because removing its dot segments (§5.2.2) changes its path.

The check is skipped where it can't fail:

- `""` returns the base.
- `#f` checks only the scheme's fragment rule. Most `$ref`s are this.
- A reference with a scheme and no dot segments is returned as it is, and
  passed a validator when it got its brand.

A result that fails can only be the reference's fault, since the base has
a brand, so the error is about the reference. Its `value` is the
reference, and its `rule` is the scheme's rule. A component the result has
from the reference is spanned in the reference. A merged path spans the
reference's path, because no one place in the reference made it.

RFC 8141 §4.3 says resolving a relative reference against a `urn` URI "is
problematic", and that applications "should generally avoid" it. It also
says resolving with the generic algorithm "should work predictably". So
resolving against a URN isn't an error: the result is checked like any
other. `c` against `urn:example:a/b` is `urn:example:a/c`, which is valid.

### Rejected

- **Not checking the result**, with callers who don't trust it calling
  `is*` on it. That works when a brand only says the generic syntax. A
  brand says the scheme's rules too (see [Trust](trust.md)), and
  `resolveIri` would give one that isn't true.
- **Checking the reference against the base's scheme, instead of the
  result.** It misses the merged path, which only the result has.
- **A rule that a scheme doesn't allow relative references.** RFC 8141's
  "should generally avoid" is advice to whoever writes the identifiers,
  not a syntax rule, and only MUST-level rules are built in. RFC 4151
  doesn't mention relative references for `tag`. Checking the result
  already rejects references that make an invalid identifier.

## Normalizing

`normalize*` applies the scheme's normalization after the syntax-based
normalization (RFC 3986 §6.2.3). It's the only function that normalizes.
`resolveIri`, `toAbsoluteIri`, and `toRelativeIri` don't (see
[Resolving](resolving.md)).

A scheme's specification can add normalizations and take away
syntax-based ones, because the scheme is the second layer of the syntax
(RFC 3986 §1.1.1):

| Scheme | Normalization | Specification |
| --- | --- | --- |
| `http`, `https` | The default port, `80` or `443`, and an empty port are removed. An empty path is `/`. | RFC 9110 §4.2.3, RFC 3986 §6.2.3 |
| `file` | A host of `localhost` is empty: "When a scheme defines a default for authority […] the reference should be normalized to an empty authority." RFC 8089 reads `localhost` "exactly as if no authority were present". | RFC 3986 §6.2.3, RFC 8089 §2 |
| `urn` | Only the scheme and the NID are lowercased, and hex digits are made uppercase. Percent-encoded characters aren't decoded ("MUST NOT be decoded"), and dot segments aren't removed, since a URN is compared "octet-by-octet" after case normalization. A `uuid` NSS is lowercased (RFC 9562 §4). | RFC 8141 §3.1 |
| `tag` | Only the scheme is lowercased. Tags are equal "if and only if they are completely indistinguishable". | RFC 4151 §2.4 |

So `normalizeIri("urn:example:%41")` is `urn:example:%41`, not
`urn:example:A`, and `file://localhost/a` is `file:///a`.

### Order

The syntax-based normalization runs first, then the scheme's. That's the
order of RFC 3986's comparison ladder (§6.2), which climbs from
syntax-based to scheme-based. So a scheme's normalization sees the host
lowercased, hex digits uppercase, and unreserved characters decoded.

Scheme names are lowercased whatever the scheme says, `tag` included.
RFC 4151 governs what comes after the scheme. Which specification applies
is decided by the scheme name, which is case-insensitive for every URI
(RFC 3986 §3.1). `TAG:x` is a valid tag too, since a quoted string in
ABNF is case-insensitive (RFC 5234 §2.3).

### Turning off the syntax-based normalization

A scheme, built in or custom, can turn off the syntax-based
normalization, which RFC 8141 and RFC 4151 forbid parts of. Then every
step but making the scheme lowercase is off, and a scheme whose
specification allows some of the steps does them itself, like `urn`
making hex digits uppercase.

### Changes aren't breaking

Normalization can be partial: it must never make identifiers equal that
are different, but it doesn't have to catch every equivalent pair (RFC
3986 §6.1). So a change to it, like a new built-in or a new step, can
only make identifiers equal that should have been. That's a fix, and it
isn't a breaking change, even though `normalize*` returns something
different.

The exception is a scheme whose specification overrides RFC 3986's
syntax-based normalization. Before its scheme is known, the syntax-based
normalization could make two of its identifiers equal that aren't. With
unknown schemes throwing, that can't happen, and `urn` and `tag`, the
known ones that override it, are built in.

### `lowercase`

Making a case-insensitive part of a component lowercase is the most common
normalization, for the NID of a URN, a `mailto` domain, or all of a `tel`
URI. The library exports a `lowercase` function that does it, so a custom
scheme doesn't have to get it right itself:

- It changes ASCII letters only. Case-insensitivity in the RFCs is
  about ASCII, and `toLowerCase` changes Unicode characters an IRI can
  have, like `İ`.
- It leaves percent-encoded characters alone, so `%2F` stays `%2F` and
  doesn't become `%2f`.

It's the only step that's exported. Only a custom scheme that turns the
syntax-based normalization off and allows some of its steps would need
the others, and an export can be added in a minor version, when a scheme
does.

### What isn't normalized

- **Empty ports of schemes without a default port.** RFC 3986 §6.2.3 says
  not to remove a delimiter whose component is empty "unless licensed to
  do so by the scheme specification". An empty port means the default
  port, so it's removed only by a scheme that has one.
- **Equivalence without a normal form**, like the order of `sip`
  parameters, ignoring the r-, q-, and f-components of a URN (RFC 8141 §3.1),
  or comparing Windows drive letters without case (RFC 8089 Appendix E.2,
  which isn't normative). The result of `normalize*` is an identifier for
  the same resource, not a key for comparing, so it can't drop or change
  what the identifier says. An `equals*` function could do it.
- **Internationalized domain names.** RFC 3987 §5.3.3 says scheme-based
  normalization may treat an internationalized domain name and its
  ASCII-compatible encoding as equivalent, but that needs IDNA tables (see
  [Domain names](#domain-names)).

### Rejected

- **Normalizing an unknown scheme with the syntax-based normalization
  only**, doing its best. With every scheme configured, an unknown scheme
  in `normalize*` means a configuration that's missing, and a registry
  would get different keys without being told.
- **Only adding to the syntax-based normalization.** RFC 8141 forbids
  decoding, and RFC 4151 forbids any change. The scheme's specification
  is the RFC that applies, so it wins (see
  [Follow the RFCs](../principles/follow-the-rfcs.md)).
- **The scheme's normalization first.** It isn't the order of the
  comparison ladder, and decoding after the scheme's functions could
  undo what they did, like `%41` becoming `A` in a part they lowercased.
- **Data fields**, like `defaultPort: 80` and `emptyPath: "/"`. They read
  like the specifications, but they can't say that part of a component
  is case-insensitive, like the NID in the path of a URN.
- **A list of case-insensitive components**, lowercased by the library.
  `urn`, `mailto`, and `sip` have case-insensitive parts of a component,
  not whole ones.
- **A flag for each syntax-based step**, like `decode: false`. One flag is
  enough, since a scheme can do the steps it does allow itself.
- **Checking a scheme's normalization against its rules.** It would cost
  on every call for a scheme with normalization, to catch bugs in the
  scheme's definition, not in the identifier.
- **Not exporting `lowercase`.** Every custom scheme with a
  case-insensitive part would write its own, and some would lowercase hex
  digits or Unicode characters.
- **Exporting every syntax-based step.** Nothing needs them yet, and
  decoding would need an API for URIs and IRIs and for each component,
  designed without a use case.
- **Removing an empty port for every scheme.** What an empty port means
  is up to the scheme.

## Errors

`assert*` reports a scheme's rule that fails with the same fields as the
generic syntax (see [Errors](errors.md)): a `reason`, the `component`, and
a span. The `rule` is the scheme's, like `"http-URI"`.

| `reason` | Message |
| --- | --- |
| `missing-component` | `an http URI must have an authority` |
| `forbidden-component` | `a tag URI can't have an authority` |
| `component-mismatch` | `a tag URI's path must be a tagging entity, a date, ":", and a name, like example.com,2004:a` |

The scheme's name in a message is its `name`. A `component-mismatch`
spans the whole component, not a character in it. The generic syntax is
checked first, so a character that no component of that kind can have
has already been reported, at its position. What a scheme adds is
structure, like a date where the path starts, and a description of the
structure says more than a position in it would.

Whether a custom scheme can give that description is open (see
[Open questions](#open-questions)).

### Rejected

- **`wrong-scheme`**, for a reference checked against a scheme that has a
  different one. Checking references against a scheme isn't supported.
- **Positions inside a scheme's pattern**, with the longest prefix that
  matches, as the generic diagnosis does. It's only exact for a
  repetition of characters. For a pattern with structure, like `tag`'s
  path, the longest match can end well before the mistake, and the
  position would point at the wrong place.

## Domain names

Hosts aren't checked against the syntax of DNS names, or of
internationalized domain names, for any scheme. It isn't a MUST-level
rule:

- RFC 3986 §3.2.2 "does not restrict the syntax of reg-name beyond what
  is necessary for interoperability". It leaves that to the resolver,
  which "might use DNS, host tables, yellow pages, NetInfo, WINS, or any
  other system". DNS syntax is a SHOULD for whoever writes the URI: "URI
  producers should use names that conform to the DNS syntax".
- RFC 9110 doesn't add a rule. A registered name in an `http` URI is "an
  indirect identifier for use with a name resolution service, such as
  DNS". So `http://my_host/` is a valid `http` URI.
- RFC 3987 §5.3.3 says internationalized domain names "SHOULD be validated by using the ToASCII
  operation" of RFC 3490. That's IDNA2003, which IDNA2008 (RFC 5891)
  replaced, and browsers use UTS #46. They disagree about some names,
  so which one is right isn't known either.

Checking DNS syntax is a policy, like rejecting `userinfo` in an `http`
URI. It's also about hosts, not one scheme: every scheme whose host is
meant for DNS would need it. A caller who wants it checks the host after
parsing, with whichever IDNA library they choose:

```js
assertIri(value);
const { host } = parseIri(value);
if (host !== undefined && !isDomainName(host)) {
  ...
}
```

### Rejected

- **A domain-name check built in, off by default.** The ASCII syntax is
  one pattern, but internationalized domain names need IDNA tables,
  which are much larger than the library, and a choice between three
  standards that disagree.
- **An option with a function that checks hosts**, like
  `isRegName: (host) => boolean`, for every scheme. It puts behavior in
  every call for a policy that the caller can apply to the parsed host
  without any option.
- **A host rule in a scheme's definition.** Patterns can't express IDNA,
  and a caller would have to replace every scheme whose host is meant for
  DNS to get one policy.
- **Normalizing internationalized domain names**, so that `http://résumé.example.org` and
  `http://xn--rsum-bpad.example.org` are equal (RFC 3987 §5.3.3). It's a
  "may", and it needs the same IDNA tables. An `equals*` function could
  do it.

## What changes for callers

- `isIri("http:///a")` is `false`, and `isIri("foo:bar")` throws
  `UnknownSchemeError`, where both were `true` in v1. So do the JSON
  Schema formats.
- `resolveIri` and `normalize*` throw `UnknownSchemeError` for a scheme
  that isn't configured, and `resolveIri` throws `InvalidIriError` for a
  result that breaks its scheme's rules, like `b` against `urn:example:a`.
- `@hyperjump/json-schema` needs an option for custom schemes, passed to
  format validation and to the registry's normalization. A schema whose
  `$id` has a scheme that isn't configured fails when it's loaded.

## Open questions

- **What `defineScheme` takes.** Before, it took a regular expression
  source for each component, written with exported rule strings like
  `pchar`, so a scheme read like its ABNF. Predicates for components were
  rejected for not reading like the ABNF. The ABNF reading mattered for
  the built-ins, and a predicate on the components,
  `(components) => boolean`, is simpler, allows rules that aren't regular,
  and needs no exported rule strings. Which rule strings are exported is
  open only if patterns stay.
- **What its normalization looks like.** Before, it was a function for
  each component, which returns the normalized component or `undefined`
  to remove it, and a `syntaxNormalization: false` flag.
- **Whether a custom scheme gives a description for errors.** It was
  dropped when only scheme-specific parse functions reported scheme
  reasons. `assert*` reports them for every scheme, so a custom scheme's
  `component-mismatch` would say `the path doesn't match tagURI` without
  one.
- **What `parseUrn` and `parseTag` return, and the URN factory's API**,
  including how a namespace gives its rules and its normalization, like
  `uuid` making its NSS lowercase.
- **Whether RFC 8089's `file-URI` allows a query or a fragment.** The
  `#f` shortcut in `resolveIri` depends on it. Also what RFC 8141 requires
  of `f-component`, and RFC 9110's exact wording on empty hosts.
- **The fields of `UnknownSchemeError`** beyond `value` and `scheme`.
- **The name `lowercase`.**
- **How expensive the scheme lookup is**, on every `is*`, `assert*`,
  `resolveIri`, and `normalize*` call. To be measured when it's built.
