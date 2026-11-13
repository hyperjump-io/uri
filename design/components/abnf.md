# ABNF

The built-in schemes' patterns are written in ABNF and compiled by
[`@hyperjump/abnf`](https://github.com/hyperjump-io/abnf), a compiler from
ABNF to regular expressions. It was written here, for scheme patterns, and
moved to its own package, which `json-schema-formats` uses too. Nothing in
it knows about URIs. How it parses, compiles, and rewrites is in
[its design docs](https://github.com/hyperjump-io/abnf/tree/main/design).
This document is what `@hyperjump/uri` gives it. Why the patterns are
written in ABNF is in
[Scheme rules](scheme-rules.md#patterns-come-from-abnf).

## Contexts

`src/abnf.js` has a context for each component: `authority`,
`userinfo`, `host`, `port`, `path`, `query`, and `fragment`, and an ASCII
one of each, like `asciiPath`. They're values, and nothing there imports
the compiler. `scripts/generate-patterns.js` uses them:

```js
import { abnf } from "@hyperjump/abnf";
import { path } from "../src/abnf.js";

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

Neither package imports the other's code. `@hyperjump/abnf` is a
development dependency.

## Shipping

The built-in schemes' patterns are generated from their ABNF by
`scripts/generate-patterns.js` into `src/patterns.js`, with
`npm run generate`. The generated file is committed, and
`src/patterns.test.js` fails if it isn't what the script generates.
Nothing is compiled when the library loads, so nobody pays for the
compiler (see
[Pay only for what you ask for](../principles/pay-only-for-what-you-ask-for.md)).

## Rejected

- **Rewriting a caller's `RegExp`**, by tokenizing its source and removing
  the delimiters from each atom, and rewriting `^` and `$`. It needs a
  tokenizer of regular expression syntax, what runs isn't what was
  written, and the host's `:` is still a problem. Writing ABNF removes the
  reason to rewrite.
- **The compiler in `@hyperjump/uri`**, compiling patterns when the
  library loads, which the prototype did. Everyone would load it: importing took 27 milliseconds instead of 5, and the library
  was 13.7 KB gzipped instead of 8.1.
- **Compiling the built-ins when the library loads.** It was most of the
  27 milliseconds: about 8 for `http`'s and `https`'s host, which inline
  RFC 3986's `IP-literal`, and about 6 for parsing RFC 3986 and RFC 3987.
- **Leaving `:` out of a host's characters only outside an IP literal**,
  which the prototype did by the name `IP-literal`. A general compiler
  can't know a rule by its name, and a context can't say "except inside
  this rule" without a notion of scope only hosts would use. So a host's
  delimiters are `/`, `?`, and `#`. A host rule that needs a `:` outside
  an IP literal can match into the port, and no `reg-name` has one.
- **A rule for the whole identifier**, like RFC 8089's `file-URI`, in
  place of one per component (see
  [Scheme rules](scheme-rules.md#checking)).
