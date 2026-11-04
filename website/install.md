# Install

To install the package, run the following command:

```bash
npm install @hyperjump/uri
```

The package is an ES module with no dependencies, and it works the same in
Node.js and browsers. Import the functions that you use:

```typescript
import { isIri, parseIri, resolveIri } from "@hyperjump/uri";
```

## URIs or IRIs

A URI can have only ASCII characters. An IRI can also have Unicode
characters, like `é` and `😀`, so every URI is an IRI.

Some functions depend on which characters an identifier can have, so they
have a URI form and an IRI form: the validation functions, like `isUri`
and `isIri`, `normalizeUri` and `normalizeIri`, and `encodeUriFragment`
and `encodeIriFragment`. The other functions, like `parseIri` and
`resolveIri`, work the same for both, so they have only an IRI name. They
take URIs too.

Use the IRI functions unless you need the result to be a URI. For example,
JSON Schema identifiers and `$ref` values are IRIs.

## TypeScript

The package includes its type declarations.

The validation functions return a string type that says what they checked,
like `Iri` or `AbsoluteIri`. The other functions take these types, so
TypeScript reports a string that you haven't checked. For more
information, see [Check once](validate-and-parse.md#check-once).

The package exports the following types:

| Type | Description |
| --- | --- |
| `Uri`, `UriReference`, `AbsoluteUri` | A string that a URI validation function checked |
| `Iri`, `IriReference`, `AbsoluteIri` | A string that an IRI validation function checked |
| `NormalizedUri`, `NormalizedIri` | A string from `normalizeUri` or `normalizeIri` |
| `Options` | The options of the functions that know schemes, with `customSchemes` |
| `Scheme`, `ComponentRule` | A scheme's rules and normalization. For more information, see [Add a scheme](schemes.md#add-a-scheme). |
| `UrnNamespace` | A URN namespace's rules and normalization, for `urnScheme` |
| `IdentifierComponents` | The components of a URI or IRI, from `parseIri` |
| `RelativeIdentifierComponents` | The components of a reference, from `parseIri` |
| `AbsoluteIdentifierComponents` | The components of an absolute URI or IRI, from `parseIri` |
| `UrnComponents`, `TagComponents` | The parts of a URN or a tag, from `parseUrn` and `parseTag` |
| `UriRule` | An RFC 3986 `rule` of an `InvalidUriError`: `"URI"`, `"URI-reference"`, or `"absolute-URI"` |
| `IriRule` | An RFC 3987 `rule` of an `InvalidIriError`: `"IRI"`, `"IRI-reference"`, or `"absolute-IRI"` |
| `InvalidIdentifierReason` | The `reason` of an `InvalidUriError` or an `InvalidIriError` |

The components are readonly. For more information about them, see
[Components](validate-and-parse.md#components).
