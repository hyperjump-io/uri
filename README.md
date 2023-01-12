# URI
A small and fast library for validating, parsing, and resolving URIs
([RFC 3986](https://www.rfc-editor.org/rfc/rfc3986)) and IRIs
([RFC 3987](https://www.rfc-editor.org/rfc/rfc3987)).

## Install
Designed for node.js (ES Modules, TypeScript) and browsers.

```
npm install @hyperjump/uri
```

## Usage
```javascript
import { resolveReference, parseUri, isUri, isIri } from "@hyperjump/uri"

const resolved = resolveReference("foo/bar", "http://example.com/aaa/bbb"); // https://example.com/aaa/foo/bar

const components = parseUri("https://jason@example.com:80/foo?bar#baz"); // {
//   scheme: "https",
//   authority: "jason@example.com:80",
//   userinfo: "jason",
//   host: "example.com",
//   port: "80",
//   path: "/foo",
//   query: "bar",
//   fragment: "baz"
// }

const a = isUri("http://examplé.org/rosé#"); // false
const a = isIri("http://examplé.org/rosé#"); // true
```

## API
### Resolution
* **resolveReference**: (uriReference: string, baseUri: string, type?: "uri" | "iri" = "uri") => string;

    Resolve a URI-reference against a base URI. Or, resolve an IRI-reference
    against a base IRI. Use the `type` parameter with "iri" to resolve IRIs. The
    `baseUri` must be an
    [absolute-URI](https://www.rfc-editor.org/rfc/rfc3986#section-4.3).

### URI
A [URI](https://www.rfc-editor.org/rfc/rfc3986#section-3) is not relative and
may include a fragment.

* **isUri**: (value: string) => boolean;
* **parseUri**: (value: string) => IdentifierComponents;

### URI-Reference
A [URI-reference](https://www.rfc-editor.org/rfc/rfc3986#section-4.1) may be
relative.

* **isUriReference**: (value: string) => boolean;
* **parseUriReference**: (value: string) => IdentifierComponents;

### absolute-URI
An [absolute-URI](https://www.rfc-editor.org/rfc/rfc3986#section-4.3) is not
relative an does not include a fragment.

* **isAbsoluteUri**: (value: string) => boolean;
* **parseAbsoluteUri**: (value: string) => IdentifierComponents;

### IRI
An IRI is not relative and may include a fragment.

* **isIri**: (value: string) => boolean;
* **parseIri**: (value: string) => IdentifierComponents;

### IRI-reference
A IRI-reference may be relative.

* **isIriReference**: (value: string) => boolean;
* **parseIriReference**: (value: string) => IdentifierComponents;

### absolute-IRI
An absolute-IRI is not relative an does not include a fragment.

* **isAbsoluteIri**: (value: string) => boolean;
* **parseAbsoluteIri**: (value: string) => IdentifierComponents;

### Types
* **IdentifierComponents**
  * **scheme**: string
  * **authority**: string
  * **userinfo**: string
  * **host**: string
  * **port**: string
  * **path**: string
  * **query**: string
  * **fragment**: string

## Contributing
### Tests
Run the tests
```
npm test
```

Run the tests with a continuous test runner
```
npm test -- --watch
```
