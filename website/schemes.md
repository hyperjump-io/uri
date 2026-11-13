# Schemes

A URI's scheme, like `https` or `urn`, can add rules to the generic
syntax. For example, RFC 9110 says that an `http` URI needs a host, so
`http:///a` follows the generic syntax but isn't a valid `http` URI.

The validation functions check the generic syntax, then the rules of the
scheme that the identifier has, if the package knows it. `normalizeIri`
and `normalizeUri` apply the scheme's normalization, and `resolveIri`
checks that its result follows its scheme's rules.

## Built-in schemes

The package knows the following schemes:

| Scheme | Specification | Rules | Normalization |
| --- | --- | --- | --- |
| `http`, `https` | RFC 9110 | Has a host. A part of the host that starts with `xn--` is an internationalized domain name. For more information, see [Domain names](#domain-names). | Removes the default port, `80` or `443`, and an empty port. An empty path is `/`. `normalizeIri` converts an internationalized domain name to Unicode. |
| `file` | RFC 8089 | Has a path that starts with `/`, and no userinfo or port | A host of `localhost` is empty, so `file://localhost/a` is `file:///a`. |
| `urn` | RFC 8141 | Has no authority, and its path is a namespace and a name, in ASCII. For more information, see [The `urn` scheme](#the-urn-scheme). | Makes only the scheme and the namespace lowercase, and the hex digits of percent-encoded characters uppercase. Doesn't decode percent-encoding, except in the fragment. |
| `tag` | RFC 4151 | None. RFC 4151 says not to reject a tag that doesn't follow its syntax. | Makes only the scheme lowercase, and normalizes the fragment. |
| `data` | RFC 2397 | Has no authority, and its path is a media type, `,`, and the data, in ASCII. For more information, see [The `data` scheme](#the-data-scheme). | Makes only the scheme lowercase, and normalizes the fragment. |
| `did` | DID 1.1 | Has no authority, and its path is a method name, `:`, and a method-specific ID, in ASCII. The method's name is lowercase. | The same as a scheme that isn't built in, but `normalizeIri` leaves Unicode characters percent-encoded, because a DID is ASCII. |

RFC 8089 doesn't include a query in the syntax of a `file` URI, but the
package allows one. Node.js makes `file:` URLs with a query, like the
`import.meta.url` of a module imported as `./a.js?v=2`, and RFC 8089
doesn't forbid it.

A relative reference doesn't have a scheme, so it's checked with the
generic syntax only.

## Domain names

An internationalized domain name, like `café.example`, has an ASCII
form, like `xn--caf-dma.example`. Each part of the name that isn't ASCII
starts with `xn--` in the ASCII form.

In an `http` or `https` IRI, a part of the host that starts with `xn--`
has to be the ASCII form of a valid name. The package checks it with the
`URL` class, so it accepts the names that browsers and Node.js accept:

```typescript
isIri("https://xn--caf-dma.example/"); // true
isIri("https://xn--abc.example/"); // false
isIri("https://café.example/"); // true
```

Other hosts aren't checked, and a host like `my_host` is valid.

`normalizeIri` converts the ASCII form to Unicode, so a URL's host and the
same name in Unicode normalize to the same IRI. `normalizeUri` leaves it
in ASCII, because a URI can't have Unicode characters:

```typescript
const uri = "https://XN--CAF-DMA.example/";
assertUri(uri);

normalizeIri(uri); // "https://café.example/"
normalizeUri(uri); // "https://xn--caf-dma.example/"
```

## Other schemes

An identifier with a scheme that isn't built in is checked with the
generic syntax only:

```typescript
isIri("example:anything"); // true
isIri("example:a b"); // false
```

`normalizeIri` and `normalizeUri` apply only the normalization from RFC
3986 to it, and `resolveIri` has no scheme rules to check its result
against.

## The `urn` scheme

A Uniform Resource Name (URN) has a namespace, like `uuid` in
`urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66`. RFC 8141 defines the
syntax of every URN, and each namespace can add its own rules.

The `urn` scheme checks RFC 8141's syntax for every URN. It also checks
the rules of the `uuid` namespace (RFC 9562), and makes a UUID lowercase
when it normalizes one. A URN of any other namespace is checked with RFC
8141's syntax only:

```typescript
isIri("urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66"); // true
isIri("urn:uuid:x"); // false
isIri("urn:isbn:0-395-36341-1"); // true
```

## The `did` scheme

A decentralized identifier (DID) has a method, like `example` in
`did:example:123456789abcdefghi`. DID 1.1 defines the syntax of every
DID, and each method can add its own rules. The `did` scheme checks DID
1.1's syntax for every DID, and no method's rules:

```typescript
isIri("did:example:123456789abcdefghi#key-1"); // true
isIri("did:Example:123"); // false: a method's name is lowercase
```

## The `data` scheme

A `data` URL has its content in it, like `data:text/plain,hello`. RFC
2397 defines its syntax: an optional media type, `;base64` if the data
is base64, a `,`, and the data. The media type can have parameters, like
`;charset=utf-8`, and each parameter needs a value:

```typescript
isIri("data:text/plain,hello"); // true
isIri("data:application/json;base64,e30="); // true
isIri("data:,hello"); // true: the media type is optional
isIri("data:text/plain"); // false: no ","
isIri("data:image/svg+xml;utf8,x"); // false: utf8 has no value
```

The data is ASCII, in an IRI too. Percent-encode any other character,
and the characters that a URI doesn't allow, like `{` and a space.
`urlToIri` does that for a `URL`. For more information, see
[Convert URLs](urls.md).

RFC 2397 lets the data have a `?` that isn't percent-encoded. In a URI,
a `?` starts the query, so a `data` URL can have a query, which is more
of the data. If you write a `data` URL, percent-encode a `?` in the data
as `%3F`.

`normalizeIri` and `normalizeUri` don't change the media type or the
data. For example, they don't remove `.` and `..` segments, because the
data isn't a path:

```typescript
const uri = "DATA:text/plain,a/../b";
assertUri(uri);
normalizeIri(uri); // "data:text/plain,a/../b"
```
