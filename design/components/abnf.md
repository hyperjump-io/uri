# ABNF

Scheme patterns are written in ABNF and compiled by
[`@hyperjump/abnf`](https://github.com/hyperjump-io/abnf), a compiler from
ABNF to regular expressions. It was written here, for scheme patterns, and
moved to its own package, which `json-schema-formats` uses too. Nothing in
it knows about URIs. How it parses, compiles, and rewrites is in
[its design docs](https://github.com/hyperjump-io/abnf/tree/main/design).
This document is what `@hyperjump/uri` gives it, and how the built-ins use
it.

## Why

A scheme's pattern for a component is a lookahead in the scheme's pattern
(see [Schemes](schemes.md#patterns-only-add-structure)), so it runs
against the rest of the identifier, not its component alone. A caller
writing one had to know that:

- `.` and wide classes can match the delimiter that ends the component, so
  the pattern runs past it. `http`'s host was `/.+/u` at first, and it let
  `http:///a` through.
- `^` and `$` mean the start and end of the whole identifier. A path
  pattern `/^a.*$/u` rejects every path.
- A lookahead in a pattern sees the components after it.

The specifications a scheme comes from write its syntax in ABNF. Compiled
with a context for the component, a scheme's ABNF can't leave its
component, ABNF has no anchors and can't look ahead or behind, and the
rules can be copied from the RFC.

## Use cases

- **Custom schemes' patterns**, for `defineScheme` and `urnScheme`.
- **The built-in schemes**, whose patterns are generated from their RFCs'
  ABNF (see [Shipping](#shipping)).

## Contexts

`@hyperjump/uri/abnf` exports a context for each component: `authority`,
`userinfo`, `host`, `port`, `path`, `query`, and `fragment`, and an ASCII
one of each, like `asciiPath`. They're values, in `src/abnf.js`, and
nothing there imports the compiler:

```js
import { abnf } from "@hyperjump/abnf";
import { path } from "@hyperjump/uri/abnf";

const filePath = abnf(path)`path-absolute`;
```

- **`rules`** are RFC 3986's and RFC 3987's. In an IRI context, each of
  RFC 3986's rules that RFC 3987 renamed means the renamed one, like
  `pchar = ipchar`: an IRI is valid for a scheme when its URI is, and its
  URI percent-encodes what RFC 3987 adds (RFC 3987 §3.1). An ASCII
  context's rules are both RFCs' under their own names, for schemes that
  are ASCII in an IRI too, like `urn` (RFC 8141 "does not extend the URN
  syntax to allow direct use of characters outside the ASCII range").
- **`alphabet`** is what the generic grammar has already allowed in the
  component, so `*pchar` compiles to `[^/?#]*`.
- **`delimiters`** are what ends the component: `/`, `?`, and `#` for the
  authority and its parts, `@` for the userinfo, `?` and `#` for the path,
  and `#` for the query. A fragment is the last component, so nothing ends
  it.
- **`percentEncoded`** is `true`, since the generic grammar has checked
  each `%`, and **`anchored`** is `false`, since the pattern goes in a
  lookahead.

A context's phantom `[result]` type is `ComponentPattern<C>`, so a tag
made with `path` returns `ComponentPattern<"path">`, which is what a
scheme's `validate.path` takes (see
[Schemes](schemes.md#patterns-are-regexps)). Neither package imports the
other's code. `@hyperjump/uri` imports the `Context` type, as a
development dependency: a caller who uses the contexts has the compiler
installed.

## Shipping

- The built-in schemes' patterns are generated from their ABNF by
  `scripts/generate-patterns.js` into `src/patterns.js`, with
  `npm run generate`. The generated file is committed, and
  `src/patterns.test.js` fails if it isn't what the script generates.
  Nothing is compiled when the library loads.
- A caller who defines a scheme imports the compiler. One who cares about
  load time can compile at build time and keep the source:
  `new RegExp(source, "u") as ComponentPattern<"path">`.

So nobody pays for the compiler who doesn't use it (see
[Pay only for what you ask for](../principles/pay-only-for-what-you-ask-for.md)).

## Rejected

- **Rewriting a caller's `RegExp`**, by tokenizing its source and removing
  the delimiters from each atom, and rewriting `^` and `$`. It needs a
  tokenizer of regular expression syntax, what runs isn't what was
  written, and the host's `:` is still a problem. Writing ABNF removes the
  reason to rewrite.
- **The compiler in `@hyperjump/uri`**, with `defineScheme` taking
  `{ abnf }` and compiling it, which the prototype did. Everyone would
  load it: importing took 27 milliseconds instead of 5, and the library
  was 13.7 KB gzipped instead of 8.1.
- **A `@hyperjump/uri/abnf` that wraps the compiler**, with it as a peer
  dependency. Passing the contexts as values does the same with no
  dependency, and the compiler stays general.
- **Compiling the built-ins when the library loads.** It was most of the
  27 milliseconds: about 8 for `http`'s and `https`'s host, which inline
  RFC 3986's `IP-literal`, and about 6 for parsing RFC 3986 and RFC 3987.
- **Leaving `:` out of a host's characters only outside an IP literal**,
  which the prototype did by the name `IP-literal`. A general compiler
  can't know a rule by its name, and a context can't say "except inside
  this rule" without a notion of scope only hosts would use. So a host's
  delimiters are `/`, `?`, and `#`. A host rule that needs a `:` outside
  an IP literal can match into the port, and no `reg-name` has one (see
  [Schemes](schemes.md#patterns-come-from-abnf)).
- **A rule for the whole identifier**, like RFC 8089's `file-URI`, in
  place of one per component. The RFCs' rules leave out the fragment, which RFC
  3986 §3.5 leaves to the generic syntax, so `http-URI` would forbid one.
  And per-component rules are what errors and `#f` need (see
  [Schemes](schemes.md#patterns-are-regexps)).
