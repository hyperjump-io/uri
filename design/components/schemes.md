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
- **Specifications that use identifiers only as names**: JSON-LD and RDF,
  Atom's `atom:id`, the `redirect_uri`s registered with an OAuth server,
  and `did:` identifiers. Unknown
  schemes are common there, like private-use OAuth schemes, and
  identifiers are compared as strings, so they need resolving that
  doesn't normalize.

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
| `is*`, `assert*` | Checks a built-in's rules |
| `resolveIri` | Checks the result against a built-in's rules (see [Resolving](#resolving)) |
| `normalizeUri`, `normalizeIri` | Applies a built-in's normalization (see [Normalizing](#normalizing)) |
| `parseIri`, `toAbsoluteIri`, `toRelativeIri` | Nothing |

None of them take options. The others trust what they're given (see
[Trust](trust.md)), and a value only has a brand if a validator checked
it, so they don't need to look a scheme up.

Schemes are looked up by scanning the built-ins. Names match without
case, like schemes do (RFC 3986 §3.1).

## Unknown schemes

For a scheme that isn't built in:

- `is*` and `assert*` check the generic syntax only.
- `resolveIri` checks nothing more than resolving guarantees, since there
  are no rules to check its result against.
- `normalize*` applies RFC 3986's syntax-based normalization only.

So every value the library makes or validates is valid for every scheme
it knows, and is valid generic syntax for the rest. A brand says the same
(see [Trust](trust.md#what-a-brand-says)).

This was decided on 2026-11-06, reversing the design before it, where an
unknown scheme threw `UnknownSchemeError` and a caller defined their
schemes and passed them in `customSchemes` (see
[Rejected](#rejected)). The scheme set had to reach every call that
validated, resolved, or normalized, through every layer of every
dependent:

- `@hyperjump/browser`'s media type plugins resolve `$ref`s while they
  parse, so a plugin's signature would change to get the set, and so
  would public utilities like `fromJref`.
- `@hyperjump/json-schema`'s formats call `isIri` with only the value.
- The set would come from more than one place: a URI scheme plugin, like
  one for `did:`, brings its own scheme, and the user's configuration brings
  others. Something would have to combine them.
- Two calls given different sets disagree without saying so. A registry
  normalizing a `urn` key with a custom `urn` and one normalizing it
  without get different keys.

The existing dependents could manage it, but every caller we don't know
about would carry the same burden, and it's easy to get wrong.

### What it costs

- **Adding a built-in is a breaking change.** It can turn a `true` into a
  `false`. So is adding a URN namespace, and fixing a built-in's rule.
  The built-ins are settled before 2.0.0, by a strict test (see
  [Built-in schemes](#built-in-schemes)).
- **Nobody can loosen a built-in.** Replacing one with a custom scheme was
  the escape hatch. A built-in's rule that's stricter than what's used in
  practice has no way around it, so `file` makes an exception to its ABNF
  (see [Built-in schemes](#built-in-schemes)).
- **`normalize*` can be wrong for an unknown scheme.** A scheme's
  specification can forbid parts of the syntax-based normalization, as
  RFC 8141 and RFC 4151 do, so applying it could make two different
  identifiers of that scheme equal. The built-ins include the schemes in
  the use cases that do this, `urn` and `tag`. For the rest, it's a known
  limitation.

### Rejected

- **`UnknownSchemeError` for an unknown scheme, with custom schemes to
  configure them**, which this design had until 2026-11-06. A validator
  that doesn't know a scheme said "I don't know", by a principle that's
  retired now (see [Principles](../principles/README.md#rejected)), and
  adding a built-in wasn't breaking. It was dropped for the reasons
  above. The design of custom schemes, `defineScheme`, `urnScheme`,
  `lowercaseComponent`, `ComponentPattern`, and the contexts in
  `@hyperjump/uri/abnf`, is in this document as of `1aa6c9e`.

Ways of keeping custom schemes that were considered before dropping them:

- **Passing `customSchemes`, and callers wrapping the functions** to not
  repeat it. Wrapping doesn't help a caller pass the set through layers,
  and nothing stops two calls having different sets.
- **A scheme-set value**, like `knownSchemes([did])`, passed in place of
  the options. It saves rebuilding the set on each call, and nothing else.
- **A factory that returns the functions that know schemes, bound to a
  set**, like `withSchemes([did])`. Validating, resolving, and
  normalizing with one set couldn't disagree. But the functions are
  passed through layers instead of the set, the set still has to be
  combined from plugins and configuration, and a caller can still import the
  unbound functions in another file.
- **Custom schemes that can only add**, never replace a built-in, so two
  sets would give the same answer wherever both give one, and a mistake
  would be an `UnknownSchemeError`, never a silent difference. It doesn't
  help pass the set through layers, which was the main problem.
- **Brands that say which set they were checked under**, at the type
  level. JavaScript callers wouldn't get it, and it was already rejected
  once (see [Trust](trust.md#rejected)).
- **Scheme rules only where an identifier is used as its scheme**:
  `resolveIri` checking the generic syntax only, and only format
  validation, retrieval, and registry keys knowing schemes. Most of the
  passing goes away. But a resolved value would have a brand while
  invalid for its scheme, which is the guarantee this library gives (see
  [Resolving](#resolving)).
- **A registry of schemes**, so every call knows them. A call's result
  would depend on what some other module registered.

Other rejected answers for unknown schemes:

- **The generic syntax only for every scheme**, with no built-in rules.
  A validator that knows a scheme is expected to apply its rules.
- **`allowUnknownScheme`**, an option for the generic syntax. Unknown
  schemes get it now without an option.

## How a built-in's rules are checked

A built-in has a rule for each component that has one, internally:
left out, `"required"`, `"forbidden"`, or a pattern the component has to
match when it's there. The scheme's rules are compiled once, when the
library loads, into one regular expression for the whole identifier.

A pattern can also have a check, a function for what a regular expression
can't say, with a hint that says whether it could fail. Only `http`'s
host has one, for its A-labels, and it runs only on a value with `xn--`
(see [Domain names](domain-names.md#how-its-checked)).

### Patterns only add structure

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

### Patterns come from ABNF

The built-ins' patterns are compiled from their specifications' ABNF by
`@hyperjump/abnf`, with a context for each component from `src/abnf.js`
(see [ABNF](abnf.md)). The compiler knows the component, so a pattern
can't match the delimiters that end it, and can't run past it. A
hand-written pattern could: `http`'s host was `/.+/u` at first, and it
let `http:///a` through, since the host is empty and `.+` matched `/a`.

They're generated into `src/patterns.js` by
`scripts/generate-patterns.js`, which has their ABNF, and committed, so
nothing is compiled from ABNF when the library loads. The generated
patterns took as long as the hand-written ones did, within 3% (see
[ABNF](../benchmarks/abnf.md)).

- **In an IRI, RFC 3986's rules mean RFC 3987's.** A context's rules
  define `pchar` as `ipchar`, and so on, because an IRI is valid for a
  scheme when its URI is (RFC 3987 §3.1), and the URI of an IRI
  percent-encodes what `ipchar` adds.
- **ASCII contexts**, like `asciiPath`, have RFC 3986's rules as they
  are, for schemes that are ASCII in an IRI too: `urn` and `did`.

### Checking

`is*` for an identifier with a built-in scheme tests the scheme's whole
pattern, which is the generic syntax with the scheme's rules. That's one
regular expression, with no splitting, and its answer is the answer. Any
other value is tested against the generic pattern only.

`assert*` tests the same pattern, and only a value that fails is looked
at again, to say why: the generic pattern says whether it's an identifier
at all, and the scheme's rules say which one it breaks. So `is*` and
`assert*` agree, which differential tests check.

- The scheme is found by comparing each built-in's name with the start of
  the value, a character at a time and without case, instead of slicing
  the name out and making it lowercase. That took `isIri` from 163
  milliseconds to 138. A name that's found for a value that isn't valid
  is harmless, since the scheme's pattern checks its name.
- `is*` used to look at a value that failed again too, to throw for an IP
  literal of a future version. Without it, `isIri` of an invalid value
  takes a fifth of the time (see
  [Future IP literals](../benchmarks/future-ip-literals.md)).
- On `assert*`'s second look, and in `resolveIri`'s check of its result, each
  component's pattern is sticky and tested where its component starts in
  the value, without slicing it out. Slicing made `resolveIri` 1.1 times
  as slow.

Rules are per component, not for the whole identifier, because:

- `assert*` says which component failed and why, with a span (see
  [Errors](#errors)).
- `resolveIri`'s `#f` and `?q` shortcuts check only the components they
  change (see [Resolving](#resolving)).

### Rejected

- **Predicates**, `{ test: (text) => boolean }`, which this design had
  first. Each scheme's rules ran on the split components, after the
  generic pattern had checked the same characters, so every identifier
  was scanned twice. `isIri` was 1.7 times v1's time (see
  [Schemes and trust](../benchmarks/schemes-and-trust.md)). A check is a
  predicate, but its hint keeps it from splitting a value it can't
  reject.
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

## The `urn` scheme

The syntax of a URN is two layers too. RFC 8141 defines the first, `urn:`,
the NID, `:`, the NSS, and the r-, q-, and f-components, and its
normalization. The namespace the NID names defines the rest. So:

- The `urn` built-in checks RFC 8141's syntax for every URN.
- It checks the namespace's rules for `uuid` (RFC 9562), the only
  namespace that's built in.
- A URN of any other namespace is checked with RFC 8141's syntax only,
  like an unknown scheme is checked with the generic syntax.
- `parseUrn` splits a URN into its NID, NSS, and the r-, q-, and
  f-components, for any namespace.

Adding a namespace is a breaking change, like adding a scheme. No other
namespace is in a use case.

The path's pattern is RFC 8141's `NID ":" NSS`, with a branch for `uuid`:
its NID, without case, and RFC 9562's `UUID` for the NSS. So a URN is
checked in one test, its namespace included. `urn`'s normalization runs
first, then `uuid`'s, which makes the NSS lowercase.

### Rejected

- **No built-in `urn`.** RFC 8141's syntax is in a use case, and every
  caller would otherwise get only the generic syntax.
- **`urnScheme(namespaces)`**, a factory for a `urn` scheme with more
  namespaces, and **`UnknownUrnNamespaceError`** for a namespace that
  isn't known. They went with custom schemes, for the same reasons (see
  [Unknown schemes](#unknown-schemes)).
- **More built-in namespaces**, like `ietf` (RFC 2648, RFC 3553), which
  OAuth uses for names like `urn:ietf:params:oauth:grant-type:…`, or
  `oid` and `isbn`. They're compared as strings there, and no use case
  validates them.

## Built-in schemes

`http`, `https`, `file`, `urn` with the `uuid` namespace, `tag`, and
`did`.

Adding a built-in after 2.0.0 is a breaking change, and so is fixing one
of its rules. So a scheme is built in only when:

1. it's in a use case,
2. its specification adds MUST-level syntax beyond the generic syntax,
   or forbids parts of the syntax-based normalization, and
3. that specification is stable.

A SHOULD, like RFC 9110 saying a recipient should treat `userinfo` in an
`http` URI as an error, is a policy that differs by caller, and isn't
built in.

What the specifications say, for the rules that took looking up:

- **`http` and `https` need a host.** A sender "MUST NOT generate" an
  `http` URI "with an empty host identifier. A recipient that processes
  such a URI reference MUST reject it as invalid." (RFC 9110 §4.2.1, and
  §4.2.2 for `https`.)
- **`http` and `https` A-labels, which aren't a MUST.** A label that
  starts with `xn--` has to be an A-label. RFC 9110 doesn't say so, and
  the IDNA RFCs don't make a fake A-label an error in a URI. It's
  checked because `normalizeIri` converts A-labels to Unicode, and a fake
  one has no Unicode form. RFC 5891 §5.3 says a label that's converted
  "MUST be rejected" when it doesn't convert back to the original (see
  [Domain names](domain-names.md#checking)).
- **`file` needs a path that starts with `/`.** `auth-path = [ file-auth ]
  path-absolute`, and `local-path = path-absolute` (RFC 8089 §2), so
  `file://` and `file:a` are invalid, and so is `file:////a`, since
  `path-absolute` can't start with `//`.
- **`file` has no userinfo or port.** `file-auth = "localhost" / host`,
  and `host` is RFC 3986's, which doesn't include them. So
  `file://user@host/a` and `file://host:80/a` are invalid, and so is
  `file://c:/path`, whose `c:` is a host and an empty port.
- **`file` allows a fragment.** RFC 8089's `file-URI` doesn't name one,
  but fragment semantics "are independent of the URI scheme and thus
  cannot be redefined by scheme specifications" (RFC 3986 §3.5), so a
  scheme's ABNF leaves it out. RFC 9110 §4.2.5 says so of its own: "The
  fragment identifier component is not part of the scheme definition for
  a URI scheme".
- **`file` allows a query, which is an exception to RFC 8089.** Its
  `file-URI` doesn't have `[ "?" query ]`, where `http-URI` does, and a
  query has no exception like a fragment's. But RFC 8089 never says a
  query MUST NOT be there, and Node.js makes `file:` URLs with queries:
  `import("./a.js?v=2")` gives the module an `import.meta.url` with one,
  which is a common way to load a module again. Without custom schemes,
  a caller couldn't loosen the rule, and `resolveIri` would throw for
  any `?q` against a `file:` base. The other rules are kept, because only
  RFC 8089's nonstandard forms break them (Appendix E: `file:c:/path`,
  `file:////host/share`, and userinfo).
- **`tag` has no rules.** RFC 4151 §2.1 has `tagURI`'s ABNF, but says
  "To allow for such developments, software that processes tags MUST NOT
  reject them on the grounds that they are outside the syntax defined
  above", and §3 says it again: "to allow for future expansion, software
  MUST NOT reject tags which do not conform to the syntax specified in
  Section 2." So a tag is checked with the generic syntax only. It's
  built in for its normalization, which RFC 4151 §2.4 forbids (see
  [Normalizing](#normalizing)).
- **`urn` is ASCII in an IRI too.** RFC 8141 §2 "does not extend the URN
  syntax to allow direct use of characters outside the ASCII range", and
  the r-, q-, and f-components each say they "MUST be percent-encoded".
  So `urn:ex:é` is a valid IRI and an invalid URN. ABNF can't say this,
  so `urn`'s patterns are compiled with the ASCII contexts.
- **RFC 8141's `alphanum` isn't in RFC 3986.** RFC 8141 says it is, but
  RFC 3986 Appendix D removed it from RFC 2396. `urn`'s rules define it,
  `alphanum = ALPHA / DIGIT`, as RFC 2396 did.
- **`urn`'s query is written for the query.** RFC 8141's
  `rq-components = [ "?+" r-component ] [ "?=" q-component ]` starts with
  the query's delimiter, so the query's rule is
  `"+" r-component [ "?=" q-component ] / "=" q-component`, with RFC
  8141's `r-component` and `q-component`.
- **A URN's f-component is a fragment**: `f-component = fragment`, with
  the ASCII rule above. It isn't part of URN-equivalence ("SHALL NOT be
  taken into account", §2.3.3).
- **`did` follows DID 1.1's syntax.** DID 1.1 is a W3C Candidate
  Recommendation (5 March 2026), and its syntax is the same as DID Core
  1.0's (a Recommendation, 2022), so it's stable. "All DID URLs MUST
  conform to the DID URL Syntax ABNF Rules" (§3.2):

  ```
  did                = "did:" method-name ":" method-specific-id
  method-name        = 1*method-char
  method-char        = %x61-7A / DIGIT
  method-specific-id = *( *idchar ":" ) 1*idchar
  idchar             = ALPHA / DIGIT / "." / "-" / "_" / pct-encoded
  did-url            = did path-abempty [ "?" query ] [ "#" fragment ]
  ```

  So a DID has no authority, and its path is
  `method-name ":" method-specific-id path-abempty`. A method's name is
  lowercase, so `did:Example:a` is invalid, and a method-specific ID
  can't end with `:`. Every rule is ASCII, so a DID is ASCII in an IRI
  too, like a URN. A method can restrict the syntax further (§7.1), and
  each method is unknown, like a URN namespace that isn't built in. DID
  doesn't define normalization, which it leaves to each method, so the
  syntax-based normalization applies. 1.1 dropped 1.0's DID parameters,
  like `versionTime`, which were about values in a query, not syntax.

`urn` gets a parse function, `parseUrn`, because a caller expects its
parts: a NID and an NSS. The others have nothing the generic components
don't have, that a use case needs. Parse functions split like `parseIri`
does, and trust what they're given.

They return a field for each part of the
RFC's grammar, named after its rule:

```ts
// RFC 8141: "urn" ":" NID ":" NSS [ "?+" r-component ] [ "?=" q-component ] [ "#" f-component ]
type UrnComponents = {
  readonly nid: string;
  readonly nss: string;
  readonly rComponent?: string;
  readonly qComponent?: string;
  readonly fComponent?: string;
};

parseUrn(value: Iri): UrnComponents
```

- There's no `scheme`. It's always `urn`.
- Values are as written, like `parseIri`'s: nothing is decoded or
  lowercased. A caller who wants them normalized normalizes first.
- A part that isn't there isn't a key. An r-component and a q-component
  have at least one character (RFC 8141), so only `fComponent` can be
  empty: `urn:a:b#` has `fComponent: ""`, like a generic fragment.
- It takes an `Iri`, since a brand doesn't say which scheme a value has.
  For another scheme the result is undefined, like for a value that was
  cast.

### Rejected parse results

- **An `assignedName` field**, `urn:NID:NSS`, which RFC 8141 compares URNs
  by. It's a slice of the input a caller can rebuild in a line, so it's
  left out until something needs it.
- **A template literal type for the input**, like `` `urn:${string}` ``.
  It rejects `URN:a:b`, which is valid, since schemes are case-insensitive.

Validators for one scheme, like `isUrn`, and a `parseDid`, aren't in
2.0.0. No use case needs them yet, and a function can be added in a minor
version.

### Rejected

- **`tag`'s rules from RFC 4151 §2.1**, which this design had until
  2026-11-06, with a query allowed because `specific` includes `?`. RFC
  4151 says not to reject a tag outside that syntax.
- **`parseTag`**, which split a tag into its `authorityName`, `date`, and
  `specific`. A tag outside §2.1's syntax is still a tag, so a parser of
  its parts can't take every tag, and no use case needs them.
- **`file` without a query**, as RFC 8089's ABNF has it, which this
  design had until 2026-11-06. See the exception above.
- **Leaving `did` out, because it isn't an RFC.** The reason to follow
  the RFCs is that someone who knows the specification can predict what
  happens (see [Follow the RFCs](../principles/follow-the-rfcs.md)), and
  that holds for a W3C specification with ABNF too. It's in a use case,
  and leaving it out would mean the generic syntax only until 3.0.
- **Every widely used scheme whose specification defines its syntax**:
  `ws`, `mailto`, `data`, `tel`, `geo`, `sip`, `ftp`, `ldap`, `news`,
  `xmpp`, `coap`, `about`, and `dns`. None of them has a use case here,
  and each built-in is rules that can't be fixed without a major version.
  `ws` forbids a fragment (RFC 6455 §3), a MUST, but nothing here uses
  it. Dropping `coap` also drops the question of putting its IPv6
  literals in RFC 5952 form, measured in
  [IPv6 canonical form](../benchmarks/ipv6-canonical-form.md).
- **Built-ins with no rules for schemes registered with IANA without a
  syntax.** They'd be checked with the generic syntax, which an unknown
  scheme gets anyway.

## Resolving

`resolveIri` checks its result against its scheme's rules, when the
scheme is built in. A valid reference against a valid base can make an
invalid identifier, and the result is new data, so checking it isn't
paying for a check of trusted data (see
[Pay only for what you ask for](../principles/pay-only-for-what-you-ask-for.md)).
A result with an unknown scheme has no rules to check.

Where results can break their scheme's rules, with ✓ for a result that's
always valid and ✗ for one that can't be. `tag` has no rules, so its
results are always valid:

| Reference | `http`, `https` | `file` | `urn` | `did` |
| --- | --- | --- | --- | --- |
| `""` | ✓ the base | ✓ | ✓ | ✓ |
| `#f` | ✓ | ✓ | ✓ f-component, if it's ASCII | ✓ if it's ASCII |
| `?q` | ✓ | ✓ | ✗ `urn:ex:a?q`, needs `?=` or `?+` | ✓ if it's ASCII |
| `b` | ✓ | ✓ | ✗ `urn:b` | ✗ `did:b`, but ✓ against `did:ex:a/c` |
| `/b` | ✓ | ✓ | ✗ `urn:/b` | ✗ `did:/b` |
| `//h/b` | ✓ | ✓, but ✗ `//u@h/b` and `//h:1/b` | ✗ | ✗ |
| `//` | ✗ `http://`, empty host | ✗ `file://`, no `path-absolute` | ✗ | ✗ |
| Its own scheme | ✓ unless dot segments | ✓ | ✗ `urn:ex:a/../b` is `urn:b` | ✗ the same |

Hierarchical schemes break only on an empty host, and for `file`, an
empty path, userinfo, or a port. `urn` and `did` break on nearly every
relative reference that isn't a fragment, and even an absolute reference
can break, because removing its dot segments (§5.2.2) changes its path.
DID 1.1 §3.2.1 says relative DID URLs "MUST" be resolved with RFC 3986
§5, so `/b` against a DID isn't special.

The check is skipped where it can't fail:

- `""` returns the base.
- `#f` checks only the scheme's fragment rule, which for `urn` and `did`
  is that it's ASCII. Most `$ref`s are this.
- `?q` checks only the query's and the fragment's rules, the only
  components it changes. Rules are per component, so the others, which
  are the base's, still hold.
- A reference with a scheme and no dot segments is returned as it is, and
  passed a validator when it got its brand.
- A reference without an authority, which is merged with the base,
  checks only the path's, the query's, and the fragment's rules. The
  result's authority is the base's. For `http` and `https`, which have
  rules only for the authority and the host, that's nothing, and
  `resolveIri` of `../other.json` went from 862 milliseconds to 805.

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
  `is*` on it. A brand says the rules of a built-in scheme too (see
  [Trust](trust.md)), and `resolveIri` would give one that isn't true.
- **Checking the reference against the base's scheme, instead of the
  result.** It misses the merged path, which only the result has.
- **A rule that a scheme doesn't allow relative references.** RFC 8141's
  "should generally avoid" is advice to whoever writes the identifiers,
  not a syntax rule, and only MUST-level rules are built in. DID 1.1
  allows them. Checking the result already rejects references that make
  an invalid identifier.

## Normalizing

`normalize*` applies the scheme's normalization after the syntax-based
normalization (RFC 3986 §6.2.3). It's the only function that normalizes.
`resolveIri`, `toAbsoluteIri`, and `toRelativeIri` don't (see
[Resolving](resolving.md)). An unknown scheme gets the syntax-based
normalization only (see [Unknown schemes](#unknown-schemes)).

A scheme's specification can add normalizations and take away
syntax-based ones, because the scheme is the second layer of the syntax
(RFC 3986 §1.1.1):

| Scheme | Normalization | Specification |
| --- | --- | --- |
| `http`, `https` | The default port, `80` or `443`, and an empty port are removed. An empty path is `/`. `normalizeIri` converts an A-label to Unicode, like `xn--caf-dma` to `café` (see [Domain names](domain-names.md#converting)). | RFC 9110 §4.2.3, RFC 3986 §6.2.3, RFC 3987 §5.3.3 |
| `file` | A host of `localhost` is empty: "When a scheme defines a default for authority […] the reference should be normalized to an empty authority." RFC 8089 reads `localhost` "exactly as if no authority were present". | RFC 3986 §6.2.3, RFC 8089 §2 |
| `urn` | Only the scheme and the NID are lowercased, and hex digits are made uppercase. Percent-encoded characters aren't decoded ("MUST NOT be decoded"), and dot segments aren't removed, since a URN is compared "octet-by-octet" after case normalization. A `uuid` NSS is lowercased (RFC 9562 §4). | RFC 8141 §3.1 |
| `tag` | Only the scheme is lowercased. Tags are equal "if and only if they are completely indistinguishable". | RFC 4151 §2.4 |
| `did` | The syntax-based normalization only. DID leaves normalization to each method (§7.1). | DID 1.1 |

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
(RFC 3986 §3.1).

### How it's defined

Internally, a built-in's normalization is a function for each component
it normalizes, which returns the normalized component, or `undefined` to
remove it, like a default port. A function only runs when its component
is there. `urn` and `tag` turn off the syntax-based normalization, and
`urn` does the steps RFC 8141 allows itself, like making hex digits
uppercase.

### Fragments

A fragment always gets the syntax-based normalization, for `urn` and
`tag` too. A scheme can't turn it off, and has no function for it,
because a fragment's semantics "are independent of the URI scheme and
thus cannot be redefined by scheme specifications" (RFC 3986 §3.5). RFC
8141's "MUST NOT be decoded" is about URN-equivalence, which doesn't take
the f-component into account (§2.3.3), and RFC 4151 has nothing to say
about a fragment. So `normalizeIri("urn:example:a#%7e")` is
`urn:example:a#~`.

- **Rejected: leaving the fragment of `urn` and `tag` alone.** It's what
  turning off the syntax-based normalization did at first. Two URNs that
  differ only in how a fragment is encoded stayed different.
- **Rejected: a function for the fragment in a scheme's normalization**,
  which `urn` used to make hex digits uppercase. It gave the scheme a say
  over the fragment, and it did less than the syntax-based normalization.

### ASCII schemes

`urn` and `did` are ASCII in an IRI too (see
[Built-in schemes](#built-in-schemes)), so
`normalizeIri` normalizes them like `normalizeUri` does: a
percent-encoded Unicode character stays encoded. Decoding it would make
an identifier that breaks its scheme's rules, like `did:example:é` from
`did:example:%C3%A9`.

### Changes aren't breaking

Normalization can be partial: it must never make identifiers equal that
are different, but it doesn't have to catch every equivalent pair (RFC
3986 §6.1). So a new step for a built-in can only make identifiers equal
that should have been. That's a fix, and it isn't a breaking change, even
though `normalize*` returns something different. A registry normalizes
when it stores and when it looks up, so both use the new step and find
the same entry. A key kept from an older version, like one in a cache on
disk, misses once.

A new built-in is a breaking change anyway, for its rules (see
[Unknown schemes](#unknown-schemes)), so its normalization comes with it.

### What isn't normalized

- **Empty ports of schemes without a default port.** RFC 3986 §6.2.3 says
  not to remove a delimiter whose component is empty "unless licensed to
  do so by the scheme specification". An empty port means the default
  port, so it's removed only by a scheme that has one.
- **Equivalence without a normal form**, like ignoring the r-, q-, and
  f-components of a URN (RFC 8141 §3.1), or comparing Windows drive
  letters without case (RFC 8089 Appendix E.2, which isn't normative).
  The result of `normalize*` is an identifier for the same resource, not
  a key for comparing, so it can't drop or change what the identifier
  says. An `equals*` function could do it.
- **Unicode labels of a host, beyond making them lowercase.** UTS #46
  maps them with NFC and case folding, which needs IDNA tables (see
  [Domain names](domain-names.md#known-limitations)).

### Rejected

- **Throwing for an unknown scheme**, which this design had until
  2026-11-06, since a registry would get different keys once the scheme
  was configured. Without custom schemes, there's nothing to configure.
- **Only adding to the syntax-based normalization.** RFC 8141 forbids
  decoding, and RFC 4151 forbids any change. The scheme's specification
  is the one that applies, so it wins (see
  [Follow the RFCs](../principles/follow-the-rfcs.md)).
- **The scheme's normalization first.** It isn't the order of the
  comparison ladder, and decoding after the scheme's functions could
  undo what they did, like `%41` becoming `A` in a part they lowercased.
- **Removing an empty port for every scheme.** What an empty port means
  is up to the scheme.

## Errors

`assert*` reports a scheme's rule that fails with the same fields as the
generic syntax (see [Errors](errors.md)): a `reason`, the `component`, and
a span. The `rule` is the scheme's, like `"http-URI"`.

| `reason` | Message |
| --- | --- |
| `missing-component` | `an http URI must have an authority` |
| `forbidden-component` | `a did URI can't have an authority` |
| `component-mismatch` | `a did URI's path must be a method name, ":", and a method-specific ID, like example:123456` |

The scheme's name in a message is its name, and its article is "an" for
a name that's read letter by letter from one whose letter name starts
with a vowel sound, like `http`, and for a word that starts with a vowel
other than `u`: `an http URI`, `a did URI`, `a urn URI`. A
`component-mismatch` spans the whole component, not a character in it.
A `missing-component` is an empty span where the component would go, like
`5` for `http:/a`'s authority. A `forbidden-component` spans the component
with its delimiter, like `?b` or `//a`, so a forbidden empty query isn't
an empty span, which would read as a missing one.

`uuid`'s pattern that fails is a `component-mismatch` of the path,
spanning only the NSS: `a uuid URN's NSS must be a UUID, like
f81d4fae-7dec-11d0-a765-00a0c91e6bf6`.

`resolveIri`'s errors are always `InvalidIriError`, because one function
resolves URIs and IRIs. A `Uri` result that breaks its rules is still
reported as an IRI. The generic syntax is
checked first, so a character that no component of that kind can have
has already been reported, at its position. What a scheme adds is
structure, like a method name where the path starts, and a description
of the structure says more than a position in it would.

### Rejected

- **`wrong-scheme`**, for a reference checked against a scheme that has a
  different one. Checking references against a scheme isn't supported.
- **Positions inside a scheme's pattern**, with the longest prefix that
  matches, as the generic diagnosis does. It's only exact for a
  repetition of characters. For a pattern with structure, like `urn`'s
  path, the longest match can end well before the mistake, and the
  position would point at the wrong place.

## Domain names

Hosts aren't checked against DNS syntax, except that a label that starts
with `xn--` in an `http` or `https` host has to be an A-label, and
`normalizeIri` converts it to Unicode (see
[Domain names](domain-names.md)).

## What changes for callers

- `isIri("http:///a")` is `false`, where it was `true` in v1. So is the
  JSON Schema `uri` format.
- `isIri("foo:bar")` is `true`, as in v1, and so is any identifier with
  a scheme that isn't built in and valid generic syntax.
- `resolveIri` throws `InvalidIriError` for a result that breaks a
  built-in scheme's rules, like `b` against `urn:example:a`.
- `isIri("http://xn--abc.example/")` is `false`, since `xn--abc` isn't an
  A-label.
- Nothing needs configuring. `@hyperjump/json-schema` and
  `@hyperjump/browser` don't pass schemes anywhere.

## Cost

Measured when the built-ins' patterns were built (see
[`defineScheme`](../benchmarks/define-scheme.md)). `isIri` of the four
benchmark identifiers takes 119 milliseconds, where it took 315 with
predicates and 81 with the generic syntax only, before schemes. It's 0.7
times v1's, where it was 1.7 times. A value that's invalid took 1.2
times as long as with predicates then, since it was tested against its
scheme's pattern first. Since `is*` stopped looking at one again, it
takes a fifth of that.

Without custom schemes (see
[Built-in schemes](../benchmarks/built-in-schemes.md)), the functions
take what they did, within 5%. An identifier with an unknown scheme is
the generic check alone, after the scan of the built-ins' names, and
`isIri` of one takes what it took with the scheme defined with no rules.
`did` takes twice as long as a custom `did` with no rules did, for its
rules.
