# Install

To install the package, run the following command:

```bash
npm install @hyperjump/uri
```

The package is an ES module with no dependencies, and it works the same in
Node.js and browsers. Import the functions that you use:

```typescript
import { parseIri, resolveIri } from "@hyperjump/uri";
```

## URIs or IRIs

Each function has a URI form, like `resolveUri`, and an IRI form, like
`resolveIri`. A URI can have only ASCII characters. An IRI can also have
Unicode characters, like `é` and `😀`, so every URI is an IRI.

Use the IRI functions unless you need the result to be a URI. For example,
JSON Schema identifiers and `$ref` values are IRIs.

## TypeScript

The package includes its type declarations. It exports the following
types:

| Type | Description |
| --- | --- |
| `IdentifierComponents` | The components of a URI or IRI, from `parseUri` and `parseIri` |
| `RelativeIdentifierComponents` | The components of a reference, from `parseUriReference` and `parseIriReference` |
| `AbsoluteIdentifierComponents` | The components of an absolute URI or IRI, from `parseAbsoluteUri` and `parseAbsoluteIri` |
| `UriRule` | The `rule` of an `InvalidUriError`: `"URI"`, `"URI-reference"`, or `"absolute-URI"` |
| `IriRule` | The `rule` of an `InvalidIriError`: `"IRI"`, `"IRI-reference"`, or `"absolute-IRI"` |

The components are readonly. For more information about them, see
[Components](validate-and-parse.md#components).
