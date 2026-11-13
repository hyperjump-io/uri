# Design

v2 of `@hyperjump/uri`, rewritten from v1 (the `main` branch before v2,
`../uri` at `v1.4.0`). The concepts are the same: validate, parse, resolve,
relativize, and normalize URIs and IRIs. What changed is which functions
check, the rules of schemes, and what v1 got wrong about its own rules
(see [What changed from v1](components/v1.md)).

These documents record the decisions that were made, and why. The `.d.ts`
files in `src/` are the source of truth for the API. They're written by
hand and have JSDoc explaining the details. Documentation for users is in
[`website/`](../website/README.md).

## Goals

- Follow RFC 3986 and RFC 3987 exactly (see
  [Follow the RFCs](principles/follow-the-rfcs.md)).
- Small and fast, with no dependencies, for Node.js and browsers.
- Dependent projects (`@hyperjump/json-schema`, `@hyperjump/browser`,
  `json-language-server`) don't need to keep working. They'll be updated
  for whatever v2 ends up being.

## How it's organized

- **[Principles](principles/README.md)**: the rules decisions are made by.
- **[Style](style/README.md)**: how code here is laid out and written.
- **Components**: how each part works, what was decided, and what was
  rejected. Open questions and known limitations are with the component
  they're about.
- **[Benchmarks](benchmarks/README.md)**: the measurements behind the
  performance decisions.

## Components

- [Naming](components/naming.md): why the names didn't change
- [Identifiers](components/identifiers.md): the kinds of identifier, and
  their components
- [Grammar](components/grammar.md): how the patterns are written from the
  ABNF
- [Trust](components/trust.md): which functions check, which trust, and
  the branded types between them
- [Parsing](components/parsing.md): splitting at delimiters, and
  validating without captures
- [Future IP literals](components/future-ip-literals.md): why
  `[v1.fe80::a+en1]` is a host like any other
- [Resolving](components/resolving.md): `resolveIri` and checking its
  result, `toRelativeIri`, and `toAbsoluteIri`
- [Normalizing](components/normalizing.md): `normalize*`, the schemes'
  normalization, and `encode*Fragment`
- [URLs](components/urls.md): `urlToIri`, for WHATWG URLs that come in
  from the platform
- [Schemes](components/schemes.md): which schemes are built in, and
  unknown schemes
  - [`http` and `https`](components/schemes/http.md),
    [`file`](components/schemes/file.md),
    [`urn`](components/schemes/urn.md),
    [`tag`](components/schemes/tag.md),
    [`did`](components/schemes/did.md), and
    [`data`](components/schemes/data.md)
- [Scheme rules](components/scheme-rules.md): how a built-in's rules are
  defined and checked
- [Domain names](components/domain-names.md): why hosts aren't checked,
  except for `http` A-labels, which `normalizeIri` converts to Unicode
- [ABNF](components/abnf.md): the contexts the built-in schemes'
  patterns are compiled with by `@hyperjump/abnf`
- [Errors](components/errors.md): error classes, and diagnosing what's wrong
  and where
- [Types](components/types.md): optional authority, readonly components
- [What changed from v1](components/v1.md)
