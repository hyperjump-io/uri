# URI

`@hyperjump/uri` validates, parses, resolves, and normalizes URIs and
IRIs. It follows [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986) for
URIs and [RFC 3987](https://www.rfc-editor.org/rfc/rfc3987) for IRIs, and
the rules that schemes like `https` and `urn` add. An IRI is a
URI that can have Unicode characters, like `https://example.com/café`.

The following example checks a base IRI, resolves a reference against it,
and then finds the reference again:

```typescript
import {
  assertAbsoluteIri, isIriReference, normalizeIri, resolveIri,
  toRelativeIri
} from "@hyperjump/uri";

const base = "https://example.com/schemas/person.json";
assertAbsoluteIri(base);

const reference = "address.json#/$defs/city";
if (!isIriReference(reference)) {
  throw Error(`Not a reference: ${reference}`);
}

const address = resolveIri(reference, base);
// "https://example.com/schemas/address.json#/$defs/city"

toRelativeIri(normalizeIri(address), normalizeIri(base));
// "address.json#/$defs/city"
```

The package offers the following:

- **Checked once.** The validation functions check an identifier and its
  scheme's rules. The other functions trust what they're given, so you
  don't pay for checking the same identifier again. TypeScript types mark
  the strings that a validation function checked.
- **Scheme rules.** It knows the rules of `http`, `https`, `file`, `urn`,
  `tag`, and `did`, and checks other schemes with the generic syntax.
- **Resolve and relativize.** `resolveIri` resolves a reference against a
  base, and `toRelativeIri` finds the shortest reference from a base.
- **Normalize.** Equivalent identifiers normalize to the same string, so
  you can compare them with `===`.
- **Small and fast.** No dependencies. It has TypeScript types and works
  in Node.js and browsers.

If you use version 1.x, see the
[1.x README](https://github.com/hyperjump-io/uri/tree/v1#readme). For what
changed in v2, see [Migrate from v1](migrate-from-v1.md).

## Contents

- [Install](install.md): setup for Node.js, browsers, and TypeScript
- [Validate and parse](validate-and-parse.md): the kinds of identifier,
  checking them, and their components
- [Schemes](schemes.md): the rules of each built-in scheme, and how
  the package checks other schemes
- [Resolve references](resolve-references.md): `resolveIri`,
  `toRelativeIri`, and `toAbsoluteIri`
- [Normalize](normalize.md): comparing identifiers, and encoding
  fragments
- [Convert URLs](urls.md): making a `URL` from Node.js or a browser an
  IRI
- [Migrate from v1](migrate-from-v1.md): what changed, and what to do
  about it
