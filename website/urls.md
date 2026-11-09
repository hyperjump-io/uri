# Convert URLs

Node.js and browsers give you URLs, like the ones from `pathToFileURL`,
`fetch`'s `response.url`, and `document.location`. These follow the
[URL Standard](https://url.spec.whatwg.org/), which differs from RFC 3986
and RFC 3987. A URL can have characters that a URI doesn't allow, like
`|` in its path, so the other functions can't trust it.

`urlToIri(url)` takes a `URL` and returns the same identifier as a URI.
Every URI is an IRI, so the functions that take an IRI take the result:

```typescript
import { resolveIri, toAbsoluteIri, urlToIri } from "@hyperjump/uri";

const url = new URL("https://example.com/a|b/person.json");
const base = toAbsoluteIri(urlToIri(url));
// "https://example.com/a%7Cb/person.json"

resolveIri("address.json", base);
// "https://example.com/a%7Cb/address.json"
```

Convert a URL where you get it, so the rest of your code only has IRIs.
To convert a string, like `response.url`, make a `URL` of it first:

```typescript
const response = await fetch("https://example.com/schema.json");
const iri = urlToIri(new URL(response.url));
```

## What it changes

`urlToIri` percent-encodes the characters that a URL can have and RFC 3986
doesn't allow in that part of a URI. It changes nothing else:

```typescript
urlToIri(new URL("https://example.com/a|b?q={x}#c#d"));
// "https://example.com/a%7Cb?q=%7Bx%7D#c%23d"

urlToIri(new URL("https://example.com/100%"));
// "https://example.com/100%25"
```

It doesn't decode anything, so a percent-encoded Unicode character stays
encoded. The result is still a valid IRI. To decode Unicode characters,
call `normalizeIri` on it. For more information, see
[Normalize](normalize.md).

A domain name stays the way the URL has it, like `xn--caf-dma.example`
for `café.example`. `normalizeIri` converts it to Unicode, and
`new URL` converts it back, without losing anything:

```typescript
const iri = normalizeIri(urlToIri(new URL("https://café.example/")));
// "https://café.example/"

new URL(iri).href; // "https://xn--caf-dma.example/"
```

The `URL` class accepts some hosts with `xn--` that aren't valid
internationalized domain names, like `xn--wq-.example`. `urlToIri` throws
an `InvalidUriError` for an `http` or `https` URL with one. For more
information, see [Domain names](schemes.md#domain-names).

## Scheme rules

A URL can break the rules of its scheme. For example, `urn:x` is a URL,
but a URN needs a namespace. `urlToIri` checks the result with the rules
of its scheme, and throws an `InvalidUriError` for one that breaks them.
For more information, see [Schemes](schemes.md).

## Go back to a URL

To get a `URL` from an IRI, use `new URL(iri)`. Functions that take a URL,
like `fetch` and `fileURLToPath`, take an IRI as a string too.
