# URI

`@hyperjump/uri` validates, parses, resolves, and normalizes URIs and
IRIs. It follows [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986) for
URIs and [RFC 3987](https://www.rfc-editor.org/rfc/rfc3987) for IRIs. An
IRI is a URI that can have Unicode characters, like
`https://example.com/café`.

The following example resolves a reference against a base URI, and then
finds the reference again:

```typescript
import { resolveIri, toRelativeIri } from "@hyperjump/uri";

const base = "https://example.com/schemas/person.json";

resolveIri("address.json#/$defs/city", base);
// "https://example.com/schemas/address.json#/$defs/city"

toRelativeIri("https://example.com/schemas/address.json", base);
// "address.json"
```

The package offers the following:

- **Every kind of identifier.** Each function has a URI form and an IRI
  form. Validate and parse URIs, references, and absolute URIs.
- **Resolve and relativize.** `resolveIri` resolves a reference against a
  base, and `toRelativeIri` finds the shortest reference from a base.
- **Normalized results.** Equivalent identifiers normalize to the same
  string, so you can compare them with `===`.
- **Small and fast.** No dependencies. It has TypeScript types and works
  in Node.js and browsers.

[`@hyperjump/json-schema`](https://github.com/hyperjump-io/json-schema/blob/v2/website/README.md)
and
[`@hyperjump/browser`](https://github.com/hyperjump-io/browser/blob/v2/website/README.md)
build on it.

If you use version 1.x, see the
[1.x README](https://github.com/hyperjump-io/uri/tree/v1#readme). For what
changed in v2, see [Migrate from v1](migrate-from-v1.md).

## Contents

- [Install](install.md): setup for Node.js, browsers, and TypeScript
- [Validate and parse](validate-and-parse.md): the kinds of identifier,
  and their components
- [Resolve references](resolve-references.md): `resolveIri`,
  `toRelativeIri`, and `toAbsoluteIri`
- [Normalize](normalize.md): comparing identifiers, and encoding
  fragments
- [Migrate from v1](migrate-from-v1.md): what changed, and what to do
  about it
