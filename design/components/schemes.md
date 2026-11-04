# Schemes

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
| `is*`, `assert*` | Checks its rules | `customSchemes` |
| `resolveIri` | Checks the result's rules (see [Resolving](#resolving)) | `customSchemes` |
| `normalizeUri`, `normalizeIri` | Applies its normalization (see [Normalizing](#normalizing)) | `customSchemes` |
| `parseIri`, `toAbsoluteIri`, `toRelativeIri` | Nothing | None |

The others trust what they're given (see [Trust](trust.md)), and a value
only has a brand if its scheme passed a validator, so they don't need to
look it up.

`customSchemes` is a list of schemes, each made by `defineScheme` (see
[Custom schemes](#custom-schemes)). A custom
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

A scheme is made by `defineScheme`, from a definition with its name, the
rule its specification names it by, patterns for its components, and its
normalization. Most callers will never need one, so it's an escape hatch,
and its ergonomics aren't optimized. The built-ins are made the same way.

```js
import { defineScheme } from "@hyperjump/uri";
import { host, path } from "@hyperjump/uri/abnf";
import { abnf } from "@hyperjump/abnf";

const httpScheme = defineScheme({
  name: "http",
  rule: "http-URI",
  validate: {
    authority: "required",
    host: {
      pattern: abnf(host)`IP-literal / 1*( unreserved / pct-encoded / sub-delims )`,
      description: "non-empty"
    }
  },
  normalize: {
    port: (port) => port === "80" || port === "" ? undefined : port,
    path: (path) => path === "" ? "/" : path
  }
});

const tagScheme = defineScheme({
  name: "tag",
  rule: "tagURI",
  syntaxNormalization: false,
  validate: {
    authority: "forbidden",
    path: {
      pattern: abnf(path)`
        tag-path = taggingEntity ":" specific

        taggingEntity = authorityName "," date
        authorityName = DNSname / emailAddress
        date = year ["-" month ["-" day]]
        year = 4DIGIT
        month = 2DIGIT
        day = 2DIGIT
        DNSname = DNScomp *( "."  DNScomp ) ; see RFC 1035 [3]
        DNScomp = alphaNum [*(alphaNum /"-") alphaNum]
        emailAddress = 1*(alphaNum /"-"/"."/"_") "@" DNSname
        alphaNum = DIGIT / ALPHA
        specific = *( pchar / "/" / "?" ) ; pchar from RFC 3986 [1]
      `,
      description: "a domain name or an email address, \",\", a date, and \":\", like example.com,2004:a"
    }
  }
});
```

Everything under `tag-path` is RFC 4151 §2.1, pasted in.

The top level of a definition has only what's about the
whole scheme: `name`, `rule`, and `syntaxNormalization`. The rules and the
normalization are each an object keyed by component, `validate` and
`normalize`, and both are optional. A scheme with neither is known and
adds nothing: `defineScheme({ name: "data", rule: "dataurl" })`.

`validate` can name any component but `scheme`, which the name decides.
That includes `fragment`: `urn` checks that it's ASCII, and a scheme can
forbid one. Each component's rule is one of:

- Left out: no rule. The component can be there or not, and anything the
  generic syntax allows.
- `"required"` or `"forbidden"`: it has to be there, or can't be. These
  give `missing-component` and `forbidden-component` (see
  [Errors](#errors)).
- `{ pattern, description? }`: a regular expression the component has
  to match when it's there, compiled from ABNF for that component (see
  [Patterns come from ABNF](#patterns-come-from-abnf)). Not matching gives
  `component-mismatch`, with the `description` in the message when there
  is one.

### Patterns only add structure

A pattern doesn't replace the generic component. It's added to it, as a
lookahead at the position where the component starts:

```
(?=pattern(?=what can follow the component))generic component
```

The generic component is what's matched, so a scheme can only reject
more than the generic syntax, never accept more. A pattern that's too
loose makes the scheme's rule loose, and nothing else. So `isIri` can't
return `true` for something that isn't an IRI, whatever a custom scheme
says, and the `Iri` brand holds (see [Trust](trust.md)).

The generic syntax has already checked the characters, in the URI or the
IRI form, so a pattern only has to check structure, and one pattern
works for both forms. Checking the characters again cost as much as the
generic syntax: `isIri` of a `urn:uuid` took 140 milliseconds with the
built-ins' patterns written with the generic rules, and 112 without.

A pattern ends where what can follow its component starts: `:`, `/`,
`?`, `#`, or the end of the value for a host, `?`, `#`, or the end for a
path, and so on. A hand-written pattern that can match its component's
delimiter, like `.+` or `a\?b` for a path, runs past the end of the
component. That's a loose rule, not an invalid IRI, and errors check it
the same way, so `is*` and `assert*` always agree. But a caller had to
know it: `http`'s host was `/.+/u` at first, and it let `http:///a`
through, since the host is empty and `.+` matched `/a`. The differential
test against the predicates found it (see
[`defineScheme`](../benchmarks/define-scheme.md)). That's why patterns
come from ABNF.

### Patterns come from ABNF

A pattern is compiled from ABNF by `@hyperjump/abnf`'s tag, with a
context for its component from `@hyperjump/uri/abnf` (see
[ABNF](abnf.md)). The compiler knows the component, so its pattern can't
match the delimiters that end it, and can't run past it. ABNF has no
anchors, and can't look ahead, so the other ways a pattern could see
outside its component are gone too. And a scheme's ABNF is in its RFC.

`@hyperjump/uri/abnf` exports a context for each component: `authority`,
`userinfo`, `host`, `port`, `path`, `query`, and `fragment`. They're data:
the component's characters and delimiters, and RFC 3986's and RFC 3987's
rules. Nothing in it depends on the compiler, and `@hyperjump/uri` doesn't
import it, so a caller who doesn't define a scheme loads neither.

- **In an IRI, RFC 3986's rules mean RFC 3987's.** A context's rules
  define `pchar` as `ipchar`, and so on, because an IRI is valid for a
  scheme when its URI is (RFC 3987 §3.1), and the URI of an IRI
  percent-encodes what `ipchar` adds. ("Scheme-specific restrictions are
  applied to IRIs by converting IRIs to URIs and checking the URIs against
  the scheme-specific restrictions.") So `tag`'s `specific`, written with
  `pchar`, allows `é` in an IRI. The compiler doesn't know about the
  renaming. It's in the contexts' rules. It's the same as converting,
  except in a rule that counts characters, like `2pchar`: `é` is one
  `ipchar`, and two `pct-encoded` in its URI, one for each byte of its
  UTF-8. No built-in counts them, and a scheme that does is a known
  limitation.
- **An ASCII context for each component**, like `asciiPath`, has RFC
  3986's rules as they are, so a pattern is ASCII in an IRI too. `urn`
  uses them, because RFC 8141 doesn't allow characters outside ASCII (see
  [Built-in schemes](#built-in-schemes)).

`ComponentPattern<C>` is a brand on `RegExp`, in the types only, like the
other brands (see [Trust](trust.md)). A context's tag returns one, and
`validate`'s rule for a component takes one for that component:

```ts
declare const component: unique symbol;
export type ComponentPattern<C extends SchemeComponent> = RegExp & { readonly [component]: C };
```

- A hand-written `RegExp` doesn't type-check, so writing one takes a
  cast, `as ComponentPattern<"path">`. The cast is where the delimiters
  are the caller's to get right, and that's said in its documentation, the
  one place it needs saying.
- The component is in the type, so a host's pattern can't be given for a
  path, whose delimiters are different.
- At runtime a pattern is any `RegExp` with exactly the `u` flag, as
  before. A pattern compiled at build time and loaded with
  `new RegExp(source, "u")` works, with the cast.

The built-ins are written in ABNF, from their RFCs: `tag`'s and
`urn:uuid`'s rules are pasted in, and `file`'s path is RFC 3986's
`path-absolute`. Their patterns are generated by a script and committed,
so nothing is compiled when the library loads (see
[ABNF](abnf.md#shipping)). The generated patterns took as long as the
hand-written ones did, within 3% (see [ABNF](../benchmarks/abnf.md)).

### `defineScheme`

`defineScheme` builds the scheme's patterns, once. It puts each pattern
in the generic grammar in place of its component's lookahead, and keeps
only the parts of the grammar a rule allows: `authority: "required"`
keeps only `"//" authority path-abempty`, and `query: "forbidden"` drops
`[ "?" query ]`. It compiles, for URIs and for IRIs, the whole
identifier, the absolute form, and each component's pattern by itself
for errors. It throws a `TypeError` for a pattern whose flags aren't
exactly `u` (see [Patterns are `RegExp`s](#patterns-are-regexps)), or for
a `name` that isn't a valid scheme. A plain object in `customSchemes` is
a `TypeError` too, when it's looked up.

What it returns is a value. It's frozen, and its compiled patterns are
behind a symbol, so the only way to make one is `defineScheme`. It isn't
registered anywhere. A caller keeps it, and passes it in `customSchemes`.

Patterns are compiled with the `u` flag in both forms, so a pattern that
compiles for one compiles for the other.

A validator for an identifier with a scheme finds the scheme, then tests
its whole pattern. That's one regular expression, with no splitting.
Only a value that fails is looked at again: the generic pattern says
whether it's an identifier at all, and the scheme's rules say which one
it breaks, for `is*` and `assert*` alike. So the slow path decides every
`false` and every error, and the fast path only ever returns `true`.

- The fast path finds the scheme by comparing each scheme's name with the
  start of the value, a character at a time and without case, instead of
  slicing the name out and making it lowercase. That took `isIri` from 163
  milliseconds to 138. A name that's found wrongly is harmless, since the
  scheme's pattern checks its name.
- On the slow path, and in `resolveIri`'s check of its result, each
  component's pattern is sticky and tested where its component starts in
  the value, which is the way the scheme's pattern tests it, without
  slicing it out. Slicing made `resolveIri` 1.1 times as slow as with
  predicates. Sticky, the difference is within the noise between runs.

The name is `defineScheme` because a caller writes a definition and gets
a scheme. That it compiles is how it works, not what it's for.

### Patterns are `RegExp`s

A pattern is a `RegExp`, and only its `source` is used, put inside the
scheme's larger pattern. The compiler is a tag that returns one, so
`defineScheme` doesn't need the compiler, and a pattern compiled at build
time is the same kind of value as one compiled when it's defined.

It has to have the `u` flag and no other. Its source is compiled with the
`u` flag, so a literal without it could be valid where it's written and a
syntax error in `defineScheme`, like `/a\-b/`. With the flag, it's
checked where it's written by the same rules it's compiled with. The
other flags can't mean what they say inside a larger pattern: `i` would
apply to nothing, `m` would change what `^` and `$` mean in the whole
identifier, and `g` and `y` are about `lastIndex`, which only the source
leaves behind.

No built-in needs a component that's required and has a pattern at once:
`http`'s required authority and its host's pattern are on different
components, and a path is always there. If a custom scheme needs it,
`{ required: true, pattern }` can be added in a minor version.

Rules are per component, not for the whole identifier, because of two
things the built-ins need:

- `assert*` says which component failed and why, with a span (see
  [Errors](#errors)).
- `resolveIri`'s `#f` shortcut checks only the fragment's rule (see
  [Resolving](#resolving)).

A custom scheme carries normalization as well as rules, because
`normalize*` should do its best for any scheme it's given, and a caller
can extend which schemes it knows the normalization of. Normalization
runs after the syntax-based normalization, and a scheme can turn the
syntax-based normalization off, which `urn` and `tag` need (see
[Normalizing](#normalizing)). Normalization is functions, not patterns,
because it changes text.

### Rejected

- **Predicates**, `{ test: (text) => boolean }`, which this design had
  first. Each scheme's rules ran on the split components, after the
  generic pattern had checked the same characters, so every identifier
  was scanned twice. `isIri` was 1.7 times v1's time, and four times what
  the generic check alone took, almost all of it splitting and the
  scheme's own patterns (see
  [Schemes and trust](../benchmarks/schemes-and-trust.md)). No built-in
  needs a rule that a regular expression can't say. `{ test }` can be
  added in a minor version for a scheme that does, and a scheme with one
  would take the slow path.
- **Patterns written with exported rule strings**, like `pchar`, put in
  place of the generic component. The rule strings, in URI and IRI forms,
  would be public API that a rename breaks, and a pattern that's too loose
  would let through what isn't an IRI. Keeping the generic component and
  adding the pattern as a lookahead needs neither.
- **Building the regular expression on each call**, from the scheme's
  patterns. A `new RegExp` costs about 6 microseconds, even with V8's
  cache of compiled sources, which is 50 times a test. That's
  identifier-js's cost (see
  [Other implementations](../benchmarks/other-implementations.md#identifier-js)).
- **A cache of compiled patterns keyed by the scheme object.** It's a
  hidden channel. A compiled scheme is a value the caller keeps instead.
- **Matching exactly where the component ends**, by capturing what
  follows it and requiring the pattern to be followed by exactly that, with
  a backreference. A pattern couldn't run past its component. But it
  matches the generic component twice, which made `https` take twice
  as long, to catch a pattern that's the scheme's own bug.
- **Checking with a lookbehind that a pattern didn't cross its
  component's delimiter**, like `(?<=^[^?#]*)` after a path's pattern.
  It's exact too, but each step back from a greedy pattern like `.+`
  scans the prefix again, and `https` took 544 milliseconds where the
  lookahead takes 106.
- **A fast pattern for each built-in, beside its predicates.** It was as
  fast, but each rule was written twice, and only the built-ins had it.
- **A plain object**, with no `defineScheme`. It was chosen when there was
  nothing to compile. With patterns there is, and keeping what's compiled
  anywhere but in the value is a hidden channel.
- **One predicate on all the components**, `(components) => boolean`. It
  can't say which component failed, so `assert*` would lose its reasons
  unless the predicate returned them, which rebuilds the rules per
  component inside a callback. And `#f` would check the whole identifier
  again.
- **A pattern for the whole identifier**, instead of one per component.
  It loses which component failed, and `#f`, for the same reasons.
- **`true` and `false` instead of `"required"` and `"forbidden"`.**
  Leaving a component out is the third state, anything goes, so `true`
  could be read as "may have one", which is a no-op.
- **Component rules at the top level**, next to `name` and `rule`. Every
  component name would sit with the scheme's own properties, and the
  type would mix them. Grouped, rules and normalization have the same
  shape.
- **`rules` for the group.** It's too close to `rule`, the RFC rule's
  name. `validate` pairs with `normalize`.
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
- **A string for `pattern`.** It needs `String.raw` or doubled
  backslashes, and a mistake in it isn't found until `defineScheme` runs.
  ABNF is a string too, but it's compiled by the tag where it's written,
  and it has no backslashes.
- **Hand-written `RegExp`s, with the delimiters documented as the
  caller's to get right**, which this design had before patterns came
  from ABNF. Every caller writing a pattern had to know that it runs
  against the rest of the identifier, and that `.`, `^`, and `$` don't
  mean what they look like they mean there. The built-ins got it wrong
  once.
- **`{ abnf }`, compiled by `defineScheme`**, which the prototype did.
  Everyone would load the compiler (see [ABNF](abnf.md#rejected)).
- **A brand checked at runtime.** A pattern compiled at build time
  couldn't have it, and JavaScript callers would get an error for a
  pattern that works. The other brands are in the types only too.
- **One brand for every component.** A host's pattern would type-check
  as a path's, and their delimiters are different.
- **An `ascii` option in the definition**, which `urn` would set. It's a
  choice of context instead, made where the pattern is compiled, which is
  the only place it means anything.
- **A `RegExp` with any flags, ignoring them.** `/a/i` would read as
  case-insensitive and not be. The `u` flag is required, not just
  allowed, so a pattern is checked where it's written the way it's
  compiled.
- **`compileScheme`**, for what it does, and **`scheme`**, the shortest.
  A caller thinks of defining a scheme, and compiling is how it works.

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

The factory is `urnScheme`, and it takes
namespaces keyed by NID:

```js
import { urnScheme } from "@hyperjump/uri";
import { asciiPath } from "@hyperjump/uri/abnf";
import { abnf } from "@hyperjump/abnf";

const urn = urnScheme({
  isbn: {
    pattern: abnf(asciiPath)`isbn = "97" ( "8" / "9" ) ( 10DIGIT / 3( "-" 1*DIGIT ) "-" DIGIT )`,
    description: "an ISBN, like 0-395-36341-1",
    normalize: (nss) => nss.replaceAll("-", "")
  },
  example: {}
});

isIri(value, { customSchemes: [urn] });
```

- NIDs match without case, as RFC 8141 compares them.
- A namespace is `{ pattern?, description?, normalize? }`, all on the
  NSS, like a component's rule and its normalization. `{}` is a namespace
  that's known and adds nothing. A namespace's `pattern` is a
  `ComponentPattern<"path">`, since the NSS ends where the path does, and
  is compiled with an ASCII context.
- `urnScheme` compiles the scheme, like `defineScheme`. The path's
  pattern is RFC 8141's `NID ":" NSS`, with a branch for each namespace:
  its NID, without case, and its pattern for the NSS. So a URN is checked
  in one test, its namespace included.
- `uuid` is included unless a namespace of that name replaces it. The
  built-in `urn` is `urnScheme({})`.
- RFC 8141's rules are checked first, then the namespace's `pattern`.
  `urn`'s normalization runs first, then the namespace's: `uuid`'s is
  `lowercaseComponent(nss)`.
- A key that isn't a NID, or a pattern whose flags aren't exactly `u`,
  is a `TypeError` from `urnScheme`.
- A NID it doesn't know throws `UnknownUrnNamespaceError`, with `value`
  and `nid` (see [Errors](errors.md)). A NID that isn't one of the
  branches fails the pattern, and the slow path finds which NID it is,
  which a component's pattern can't say. A
  custom `urn` is made with the same factory, so it's made the way the
  built-in is.
- Only the NSS has a namespace's rules. RFC 8141 says the f-component
  doesn't depend on the namespace. Keys for the r- and q-components can
  be added in a minor version if a namespace needs them.

`urn:example` (RFC 6963), which is for documentation, isn't built in.
Checking a documentation example is the only use for it, and the factory
covers that.

### Rejected

- **No built-in `urn`**, with every caller defining it. The RFC 8141
  layer would be written again by everyone, and `uuid`'s rules would have
  to be exported.
- **A rule that can answer "I don't know"**, like a `test` returning
  `undefined`.
  It would be generic, and `info:` (RFC 4452) and `did:` methods have
  namespaces too, but the library couldn't say what it doesn't know: the
  error would say a scheme is unknown when a namespace is. Only `urn` needs it
  now, and it can be added if a built-in needs it.
- **A `namespaces` field on the scheme**, extended by spreading the
  exported built-in. The library would read a field that only means
  something for `urn`, and every caller would write the spread.
- **A separate option for namespaces.** The factory is one way to extend
  `urn`, and replacing the built-in is already how a scheme is changed.

## Built-in schemes

`http`, `https`, `file`, `tag`, and `urn`, with the `uuid` namespace. Each
is a scheme JSON Schema's identifiers use.

Only MUST-level rules are built in. A SHOULD, like RFC 9110 saying a
recipient should treat `userinfo` in an `http` URI as an error, is a
policy that differs by caller.

What the specifications say, for the rules that took looking up:

- **`http` and `https` need a host.** "A sender MUST NOT generate an
  "http" URI with an empty host identifier. A recipient that processes
  such a URI reference MUST reject it as invalid." (RFC 9110 §4.2.1, and
  §4.2.2 for `https`.)
- **`file` allows a fragment but not a query.** RFC 8089's `file-URI` has
  neither, and doesn't mention them. A fragment is allowed anyway:
  fragment semantics "are independent of the URI scheme and thus cannot be
  redefined by scheme specifications" (RFC 3986 §3.5), so a scheme's ABNF
  leaves it out. RFC 9110 §4.2.5 says so of its own: "The fragment
  identifier component is not part of the scheme definition for a URI
  scheme". A query has no such exception, and `http-URI` lists
  `[ "?" query ]` where `file-URI` doesn't. RFC 9844 updates RFC 8089,
  but only to delete its reference to RFC 6874's zone identifiers.
- **`file` needs a path that starts with `/`.** `auth-path = [ file-auth ]
  path-absolute`, and `local-path = path-absolute`, so `file://` and
  `file:a` are invalid, and so is `file:////a`, since `path-absolute`
  can't start with `//`. Appendix E's UNC forms aren't normative.
- **`file` has no userinfo or port.** `file-auth = "localhost" / host`,
  and `host` is RFC 3986's, which doesn't include them. So
  `file://user@host/a` and `file://host:80/a` are invalid. This was found
  while building; the design only had the query and the path.
- **`tag` allows a query.** `specific = *( pchar / "/" / "?" )` (RFC 4151
  §2.1), so `tag:example.com,2004:a?b` is a valid tag, whose `?b` is the
  generic query. The design had `query: "forbidden"`, which was a guess
  from `tagURI` not naming a query. Reading the ABNF while building showed
  that `specific` takes its place. `tag`'s path test covers the part of
  `specific` before the `?`, and the generic syntax has already checked
  the query's characters, which are the same as `specific`'s, so the
  query needs no rule. `parseTag`'s `specific` includes it.
- **`urn` is ASCII in an IRI too.** RFC 8141 §2 "does not extend the URN
  syntax to allow direct use of characters outside the ASCII range", and
  the r-, q-, and f-components each say they "MUST be percent-encoded".
  So `urn:ex:é` is a valid IRI and an invalid URN. ABNF can't say this,
  so `urn`'s patterns, and its namespaces', are compiled with the ASCII
  contexts (see [Patterns come from ABNF](#patterns-come-from-abnf)).
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

`tag` and `urn` get parse functions, `parseTag` and `parseUrn`, because a
caller expects their parts: a tagging entity and a date, or a NID. The
others have nothing the generic components don't have. Parse functions
split like `parseIri` does, and trust what they're given.

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

// RFC 4151: "tag:" authorityName "," date ":" specific [ "#" fragment ]
type TagComponents = {
  readonly authorityName: string;
  readonly date: string;
  readonly specific: string;
  readonly fragment?: string;
};

parseUrn(value: Iri): UrnComponents
parseTag(value: Iri): TagComponents
```

- There's no `scheme`. It's always `urn` or `tag`.
- Values are as written, like `parseIri`'s: nothing is decoded or
  lowercased. A caller who wants them normalized normalizes first.
- A part that isn't there isn't a key. An r-component and a q-component
  have at least one character (RFC 8141), so only `fComponent` can be
  empty: `urn:a:b#` has `fComponent: ""`, like a generic fragment.
- `date` is a string, like `"2004"` or `"2004-01-15"`. A tag's date can be
  only a year or a month, which a `Date` can't say.
- They take an `Iri`, since a brand doesn't say which scheme a value has.
  For another scheme the result is undefined, like for a value that was
  cast.

### Rejected parse results

- **`taggingEntity` as one field**, like `example.com,2004`. The RFC names
  it, but a caller wants its two parts, and joining them is easy.
- **An `assignedName` field**, `urn:NID:NSS`, which RFC 8141 compares URNs
  by. It's a slice of the input a caller can rebuild in a line, so it's
  left out until something needs it.
- **A `Date` for `date`.** It can't say a date that's only a year or a
  month.
- **A template literal type for the input**, like `` `urn:${string}` ``.
  It rejects `URN:a:b`, which is valid, since schemes are case-insensitive.

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
| `#f` | ✓ | ✓ | ✓ | ✓ f-component, if it's ASCII |
| `?q` | ✓ | ✗ `file:///a?q`, no query in `file-URI` | ✓ `specific` allows `?` | ✗ `urn:ex:a?q`, needs `?=` or `?+` |
| `b` | ✓ | ✓ | ✗ `tag:b` | ✗ `urn:b` |
| `/b` | ✓ | ✓ | ✗ `tag:/b` | ✗ `urn:/b` |
| `//h/b` | ✓ | ✓, but ✗ `//u@h/b` and `//h:1/b` | ✗ | ✗ |
| `//` | ✗ `http://`, empty host | ✗ `file://`, no `path-absolute` | ✗ | ✗ |
| Its own scheme | ✓ unless dot segments | ✓ | ✗ `tag:x,2000:a/../b` is `tag:/b` | ✗ the same |

Hierarchical schemes break only on an empty host, and for `file`, an
empty path, a query, userinfo, or a port. `tag` and `urn` break
on nearly every relative reference, and even an absolute reference can
break, because removing its dot segments (§5.2.2) changes its path.

The check is skipped where it can't fail:

- `""` returns the base.
- `#f` checks only the scheme's fragment rule, which for the built-ins
  is the generic one, and for `urn` that it's ASCII. Most `$ref`s are
  this.
- `?q` checks only the query's and the fragment's rules, the only
  components it changes. Rules are per component, so the others, which
  are the base's, still hold.
- A reference with a scheme and no dot segments is returned as it is, and
  passed a validator when it got its brand.
- A reference without an authority, which is merged with the base,
  checks only the path's, the query's, and the fragment's rules. The
  result's authority is the base's. For `http` and `https`, which have
  rules only for the authority and the host, that's nothing, and
  `resolveIri` of `../other.json` went from 862 milliseconds to 805,
  where it took 814 with predicates, which checked every component.

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

### Defining it

A scheme's `normalize` has a function for
each component it normalizes (see [Custom schemes](#custom-schemes)):

- A function takes its component and returns the normalized component,
  or `undefined` to remove it, like a default port. `path` returns a
  string, since there's always a path.
- A function only runs when its component is there, so it can't add one.
- A function gets only its own component. None of the built-ins need
  more, and passing all the components could be added later without
  breaking anything.
- The components are `userinfo`, `host`, `port`, `path`, and `query`.
  Not `scheme`, which is always lowercased. Not `fragment`: "The fragment
  component is not subject to any scheme-based normalization" (RFC 3986
  §6.2.3). Not `authority`, which is rebuilt from its parts, so a function
  for it and one for `port` couldn't say which wins. `file`'s `localhost`
  is a `host` function that returns `""`.
- Functions aren't checked against the scheme's rules. The built-ins are
  tested so that they never break them, and a custom scheme's function
  that does is the scheme's own bug.

### Turning off the syntax-based normalization

A scheme, built in or custom, can turn off the syntax-based
normalization, which RFC 8141 and RFC 4151 forbid parts of, with
`syntaxNormalization: false`. It's `true` by default. Then every
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

### `lowercaseComponent`

Making a case-insensitive part of a component lowercase is the most common
normalization, for the NID of a URN, a `mailto` domain, or all of a `tel`
URI. The library exports a `lowercaseComponent` function that does it, so a custom
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

It's named for what it works on, like `normalizeIri`, because it's
imported by itself next to a caller's own code. `lowercase` alone reads
like a string utility, and a caller could swap it for `toLowerCase`,
which breaks both rules above. Rejected: `lowercase`; `asciiLowercase`,
whose WHATWG Infra definition doesn't skip percent-encoding; and
`lowercaseIri`, since it doesn't take a whole identifier.

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
- **A normalization function inside each component's rule**, like
  `path: { test, normalize }`. `"required"` and `"forbidden"` can't carry
  one, and `http`'s `port` has a normalization but no rule, so it would
  need a rule object without a `test`.
- **`syntaxNormalization` inside `normalize`.** It would mix a flag with
  the component keys again.
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
- **Not exporting `lowercaseComponent`.** Every custom scheme with a
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
| `component-mismatch` | `a tag URI's path must be a domain name or an email address, ",", a date, and ":", like example.com,2004:a` |

The scheme's name in a message is its `name`, and its article is "an" for
a name that's read letter by letter from one whose letter name starts
with a vowel sound, like `http`, and for a word that starts with a vowel
other than `u`: `an http URI`, `a tag URI`, `a urn URI`. A
`component-mismatch` spans the whole component, not a character in it.
A `missing-component` is an empty span where the component would go, like
`5` for `http:/a`'s authority. A `forbidden-component` spans the component
with its delimiter, like `?b` or `//a`, so a forbidden empty query isn't
an empty span, which would read as a missing one.

A namespace's `pattern` that fails is a `component-mismatch` of the path,
spanning only the NSS: `a uuid URN's NSS must be a UUID, like
f81d4fae-7dec-11d0-a765-00a0c91e6bf6`, or `the NSS doesn't match the uuid
namespace` without a description.

`resolveIri`'s errors are always `InvalidIriError`, since it's one
function for URIs and IRIs. A `Uri` result that breaks its rules is still
reported as an IRI. The generic syntax is
checked first, so a character that no component of that kind can have
has already been reported, at its position. What a scheme adds is
structure, like a date where the path starts, and a description of the
structure says more than a position in it would.

A scheme gives the description with its component's `pattern` (see
[Custom schemes](#custom-schemes)). Without one, the message names the
rule: `the path doesn't match tagURI`.

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

## Cost

Measured when it was built (see
[`defineScheme`](../benchmarks/define-scheme.md)). `isIri` of the four
benchmark identifiers takes 119 milliseconds, where it took 315 with
predicates and 81 with the generic syntax only, before schemes. It's 0.7
times v1's, where it was 1.7 times. A value that's invalid takes 1.2
times as long as with predicates, since it's tested against its scheme's
pattern first. The other functions take what they did with predicates,
or less.

The predicates this design had first were measured when they were built
(see [Schemes and trust](../benchmarks/schemes-and-trust.md)). The lookup
itself was cheap: `isIri` of a `did:` identifier with a custom scheme
that has no rules took 87 milliseconds, where the generic check alone
took 50, and three custom schemes in the list made no difference that
showed above the noise. The rules were what cost: they needed the
identifier split into its components, and `urn` and `file` ran patterns
of their own over characters the generic pattern had already checked.

### Rejected

- **Hand-written checks for the built-ins**, apart from their scheme
  objects. Built-ins are made the same way as custom schemes so that one
  path checks both.
