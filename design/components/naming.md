# Naming

Every name has to make sense on its own, imported by name, without a
namespace in front of it. That's the rule `@hyperjump/json-pointer` v2
renamed its functions for: `get` only made sense as `JsonPointer.get`.

v1's names already follow it. Each is a verb and the kind of identifier it
works on: `parseUri`, `resolveIri`, `isAbsoluteUri`, `toRelativeIri`. So
they didn't change.

The error classes name what went wrong: `InvalidUriError`,
`InvalidIriError`, and `UnsupportedIpVersionError`.

## Rejected

- **Noun first, like `json-pointer`'s `pointerGet`**: `uriParse`,
  `iriResolve`. They'd sort together in an editor's completions, but every
  call in every dependent project would change for a rule the names
  already follow. `json-pointer` rejected verb first because `getPointer`
  reads as getting a pointer. `parseUri` does parse a URI, so the reason
  doesn't apply here.

## Getters

`getScheme`, `getPath`, `getQuery`, and `getFragment` don't name the kind
of identifier. A component's name only means something for an
identifier, so they make sense imported by themselves, and they take
URIs, IRIs, and references alike, like the merged functions. With the
kind, `getIriScheme` would read as an IRI scheme, which RFC 3987 says
there's no such thing as.

`getScheme` could be read as getting a `Scheme`, which is what
`defineScheme` makes. Its signature, `(value: Iri) => string`, says
which, in an editor. If that turns out to confuse callers,
`schemeOf(iri)` and `fragmentOf(reference)` read well imported by
themselves too, and renaming before 2.0.0 is free.

## Merged functions

`parse`, `resolve`, `toRelative`, and
`toAbsolute` are one function each for URIs and IRIs (see
[Trust](trust.md)). They have only the IRI names: `parseIri`,
`resolveIri`, `toRelativeIri`, and `toAbsoluteIri`. Every URI is an IRI,
and the overloads keep a `Uri` a `Uri`, like
`resolveIri(reference: UriReference, base: AbsoluteUri): Uri`, so a caller
with URIs loses nothing in the types. The dependents already call only the
IRI forms.

That leaves `isUri`, `assertUri`, and `normalizeUri` without a matching
`parseUri`, since those functions do differ for URIs. A caller may wonder
whether `parseIri` takes a URI. The overloads answer it in an editor's
completions, and the docs say it at the top of each page that uses the
merged functions. v1's `parseUri` and `resolveUri` are a rename in
Migrate from v1.

### Rejected

- **The URI names too, as aliases**, like `parseUri = parseIri`. They cost
  nothing at runtime and remove the asymmetry, but two names for one
  function make a reader ask how they differ, and the answer is that they
  don't.
- **Generic names, `*Identifier` or `*Id`**, like `parseIdentifier`. They
  have the same asymmetry with `isUri` and `isIri`, and they bring a term
  the RFCs don't use, so "what's an identifier?" replaces "does it take a
  URI?"
- **Names without the kind of identifier**, like `parse`. They don't make
  sense imported by themselves, which breaks the rule above.
