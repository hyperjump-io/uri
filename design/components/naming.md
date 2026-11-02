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
