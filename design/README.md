# Design

v2 of `@hyperjump/uri`, rewritten from v1 (the `main` branch before v2,
`../uri` at `v1.4.0`). The concepts are the same: validate, parse, resolve,
relativize, and normalize URIs and IRIs, with a URI and an IRI form of each
function. What changed is mostly what v1 got wrong about its own rules.

These documents record the decisions made so far, and why. The `.d.ts`
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
- [Parsing](components/parsing.md): validating without captures, then
  splitting at delimiters
- [Future IP versions](components/future-ip-versions.md): why validators
  throw for `[v7.future]`
- [Resolving](components/resolving.md): `resolve*`, `toRelative*`, and
  `toAbsolute*`
- [Normalizing](components/normalizing.md): `normalize*` and
  `encode*Fragment`
- [Schemes](components/schemes.md): validating by each scheme's own rules
  (designed, not implemented)
- [Errors](components/errors.md): error classes, and diagnosing what's wrong
  and where
- [Types](components/types.md): optional authority, readonly components
- [What changed from v1](components/v1.md)
