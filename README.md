# Hyperjump - URI

Validate, parse, resolve, and normalize URIs
([RFC 3986](https://www.rfc-editor.org/rfc/rfc3986)) and IRIs
([RFC 3987](https://www.rfc-editor.org/rfc/rfc3987)). An IRI is a URI that
can have Unicode characters, like `https://example.com/café`.

**[Read the documentation at hyperjump.io](https://hyperjump.io/uri/)**

```bash
npm install @hyperjump/uri
```

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

- **Checked once.** The validation functions check an identifier and its
  scheme's rules. The other functions trust what they're given, so you
  don't pay for checking the same identifier again. TypeScript types mark
  the strings that a validation function checked.
- **Scheme rules.** It knows the rules of `http`, `https`, `file`, `urn`,
  `tag`, `did`, and `data`, and checks other schemes with the generic
  syntax.
- **Resolve and relativize.** `resolveIri` resolves a reference against a
  base, and `toRelativeIri` finds the shortest reference from a base.
- **Normalize.** Equivalent identifiers normalize to the same string, so
  you can compare them with `===`.
- **Small and fast.** No dependencies. TypeScript types included. Works in
  Node.js and browsers.

## Documentation

The documentation is at **[hyperjump.io/uri](https://hyperjump.io/uri/)**.

- [Install](https://hyperjump.io/uri/install/): setup for Node.js,
  browsers, and TypeScript
- [Validate and parse](https://hyperjump.io/uri/validate-and-parse/): the
  kinds of identifier, checking them, and their components
- [Schemes](https://hyperjump.io/uri/schemes/): the rules of each built-in
  scheme, and how the package checks other schemes
- [Resolve references](https://hyperjump.io/uri/resolve-references/):
  `resolveIri`, `toRelativeIri`, and `toAbsoluteIri`
- [Normalize](https://hyperjump.io/uri/normalize/): comparing identifiers,
  and encoding fragments
- [Convert URLs](https://hyperjump.io/uri/urls/): making a `URL` from
  Node.js or a browser an IRI
- [Performance](https://hyperjump.io/uri/performance/): getting the most
  from the package, and what costs more than usual
- [Migrate from v1](https://hyperjump.io/uri/migrate-from-v1/): what
  changed, and what to do about it

Using v1? See the
[v1 README](https://github.com/hyperjump-io/uri/tree/v1#readme).

## Contributing

See [`design/`](design/README.md) for how it works and why. The
documentation's source is in [`website/`](website/README.md).

```bash
npm install
npm test
npm run lint
npm run type-check
```

## License

MIT
