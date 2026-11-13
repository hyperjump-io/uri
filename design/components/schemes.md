# Schemes

RFC 3986 §1.1.1 makes URI syntax two layers: the generic syntax every URI
follows, and the rules a scheme's specification adds. `http:///a` is a
valid URI, but RFC 9110 says an `http` URI with an empty host is invalid.
The validators check both layers for the schemes that are built in: the
generic syntax, then the scheme's rules. An identifier with any other
scheme is checked with the generic syntax only.

## Use cases

The design is for these, and isn't stretched for others:

- **JSON Schema's `uri`, `iri`, `uri-reference`, and `iri-reference`
  formats**, in `json-schema-formats`. The values can have any scheme.
- **Identifying and referencing in JSON Schema**: resolving `$ref` against
  `$id`, the keys of a registry, and bundling. Identifiers are `https`,
  `file`, `urn:uuid`, `tag`, and schemes nobody has registered. OpenAPI's
  `$ref` and `$self` are the same case.
- **Retrieving in `@hyperjump/browser`**, which fetches `http`, `https`,
  `file`, and `data` URLs, and normalizes an identifier before it fetches
  it.
- **Specifications that use identifiers only as names**: JSON-LD and RDF,
  Atom's `atom:id`, the `redirect_uri`s registered with an OAuth server,
  and `did:` identifiers. Unknown schemes are common there, like
  private-use OAuth schemes, and identifiers are compared as strings, so
  they need resolving that doesn't normalize.

Not supported on purpose:

- **Checking the syntax of schemes like `tel`, `geo`, `sip`, `ldap`,
  `xmpp`, `news`, or `dns` in depth.** A caller working with them uses a
  library for them.
- **Defining a scheme**, to have its rules checked (see
  [Unknown schemes](#unknown-schemes)).
- **Checking a relative reference against a scheme**, like
  `isIriReference("schema.json", { scheme: "file" })`. A caller resolves
  the reference and checks the result.

## Which functions know schemes

| Function | What it does with the scheme |
| --- | --- |
| `is*`, `assert*` | Checks a built-in's rules (see [Scheme rules](scheme-rules.md)) |
| `resolveIri` | Checks the result against a built-in's rules (see [Resolving](resolving.md#checking-the-result)) |
| `normalizeUri`, `normalizeIri` | Applies a built-in's normalization (see [Normalizing](normalizing.md#scheme-based-normalization)) |
| `urlToIri` | Checks the result against a built-in's rules (see [URLs](urls.md#checking-the-result)) |
| `parseIri`, `toAbsoluteIri`, `toRelativeIri`, and the getters | Nothing |

None of them take options. The functions that do nothing with a scheme
trust what they're given (see [Trust](trust.md)), and a value only has a
brand if a validator checked it, so they don't need to look a scheme up.

## Built-in schemes

| Scheme | Specification | Built in for |
| --- | --- | --- |
| [`http`, `https`](schemes/http.md) | RFC 9110 | A host that isn't empty, A-labels, and the default port |
| [`file`](schemes/file.md) | RFC 8089 | An absolute path, no userinfo or port, and `localhost` |
| [`urn`](schemes/urn.md) | RFC 8141 | Its syntax, the `uuid` namespace, and no decoding |
| [`tag`](schemes/tag.md) | RFC 4151 | No normalization. It has no rules |
| [`did`](schemes/did.md) | DID 1.1 | Its syntax |
| [`data`](schemes/data.md) | RFC 2397 | Its syntax, and no normalization of the data |

Adding a built-in after 2.0.0 is a breaking change, and so is fixing one
of its rules. So a scheme is built in only when:

1. it's in a use case,
2. its specification adds MUST-level syntax beyond the generic syntax,
   or forbids parts of the syntax-based normalization, and
3. that specification is stable.

A SHOULD is a policy that differs by caller, and isn't built in. The one
rule that isn't a MUST is `http`'s A-labels, which converting them needs
(see [Domain names](domain-names.md#checking)).

### Rejected

- **Every widely used scheme whose specification defines its syntax**:
  `ws`, `mailto`, `tel`, `geo`, `sip`, `ftp`, `ldap`, `news`, `xmpp`,
  `coap`, `about`, and `dns`. None of them has a use case here, and each
  built-in is rules that can't be fixed without a major version. `ws`
  forbids a fragment (RFC 6455 §3), a MUST, but nothing here uses it.
  Dropping `coap` also drops the question of putting its IPv6 literals in
  RFC 5952 form. `data` was in this list until 2026-11-13.
- **Built-ins with no rules for schemes registered with IANA without a
  syntax.** They'd be checked with the generic syntax, which an unknown
  scheme gets anyway.

## Unknown schemes

For a scheme that isn't built in:

- `is*` and `assert*` check the generic syntax only.
- `resolveIri` checks nothing more than resolving guarantees, since there
  are no rules to check its result against.
- `normalize*` applies RFC 3986's syntax-based normalization only.

So every value the library makes or validates is valid for every scheme
it knows, and is valid generic syntax for the rest. A brand says the same
(see [Trust](trust.md#what-a-brand-says)).

### What it costs

- **Adding a built-in is a breaking change.** It can turn a `true` into a
  `false`. So is adding a URN namespace, and fixing a built-in's rule.
  The built-ins are settled before 2.0.0, by a strict test (see
  [Built-in schemes](#built-in-schemes)).
- **Nobody can loosen a built-in.** A built-in's rule that's stricter
  than what's used in practice has no way around it, so `file` makes an
  exception to its ABNF (see [`file`](schemes/file.md#a-query-is-allowed)).
- **`normalize*` can be wrong for an unknown scheme.** A scheme's
  specification can forbid parts of the syntax-based normalization, as
  RFC 8141 and RFC 4151 do, so applying it could make two different
  identifiers of that scheme equal, or change what one says, as it did a
  `data` URL's data. The built-ins include the schemes in the use cases
  that do this. For the rest, it's a known limitation.

### Rejected

- **Custom schemes**, which this design had until 2026-11-06. An unknown
  scheme threw `UnknownSchemeError`, by a principle that's retired (see
  [Principles](../principles/README.md#rejected)), and a caller defined
  their schemes with `defineScheme` and passed them to every function
  that knows schemes. Adding a built-in wasn't breaking. It was dropped
  because the set of schemes had to reach every call that validated,
  resolved, or normalized, through every layer of every dependent:

  - `@hyperjump/browser`'s media type plugins resolve `$ref`s while they
    parse, so a plugin's signature would change to get the set, and so
    would public utilities like `fromJref`.
  - `@hyperjump/json-schema`'s formats call `isIri` with only the value.
  - The set would come from more than one place: a URI scheme plugin
    brings its own scheme, and the user's configuration brings others.
  - Two calls given different sets disagree without saying so. A
    registry normalizing a `urn` key with a custom `urn` and one
    normalizing it without get different keys.

  The existing dependents could manage it, but every caller would carry
  the same burden, and it's easy to get wrong. Wrapping the functions, a
  value for the set, a factory that binds the functions to a set, schemes
  that can only add, brands that name the set, and a registry were each
  considered. None of them gets the set through the layers, and a
  registry makes a call's result depend on what another module
  registered. The design of custom schemes is in this document as of
  `1aa6c9e`.
- **Scheme rules only where an identifier is used as its scheme**:
  `resolveIri` checking the generic syntax only, and only format
  validation, retrieval, and registry keys knowing schemes. A resolved
  value would have a brand while invalid for its scheme, which is the
  guarantee this library gives (see
  [Resolving](resolving.md#checking-the-result)).
- **The generic syntax only for every scheme**, with no built-in rules.
  A validator that knows a scheme is expected to apply its rules.

## Cost

`isIri` takes 0.75 times what v1's does, with the schemes' rules that v1
didn't check (see [Comparison with v1](../benchmarks/v1-comparison.md)).
Before schemes, with the generic syntax only, it took about 0.6 times
what it does now.

- An identifier with an unknown scheme is the generic check alone, after
  one look at its first letter for a built-in (see
  [Built-in schemes](../benchmarks/built-in-schemes.md) and
  [The `data` scheme](../benchmarks/data-scheme.md)).
- A value that's invalid is tested once, and `is*` doesn't look at it
  again (see [Future IP literals](../benchmarks/future-ip-literals.md)).
- `did` takes twice as long as it did with the generic syntax only, and
  `data` 1.35 times, for their rules.
