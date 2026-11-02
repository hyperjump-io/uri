# Validate and parse

RFC 3986 defines three kinds of identifier. Each one has functions to
validate it and to parse it:

| Kind | Example | Validate | Parse |
| --- | --- | --- | --- |
| URI | `https://example.com/a?b#c` | `isUri` | `parseUri` |
| URI-reference | `../a#c` | `isUriReference` | `parseUriReference` |
| absolute-URI | `https://example.com/a?b` | `isAbsoluteUri` | `parseAbsoluteUri` |

A URI has a scheme, like `https`, and can have a fragment, like `#c`. A
URI-reference is a URI or a relative reference, which doesn't have a
scheme. An absolute-URI is a URI without a fragment, like a base URI.

IRIs have the same three kinds, with the same functions: `isIri`,
`isIriReference`, `isAbsoluteIri`, `parseIri`, `parseIriReference`, and
`parseAbsoluteIri`.

## Validate

Each validation function returns whether a string is that kind of
identifier:

```typescript
isUri("https://example.com/café"); // false
isIri("https://example.com/café"); // true
isIri("../schema.json"); // false
isIriReference("../schema.json"); // true
isAbsoluteIri("https://example.com/schema.json#foo"); // false
```

## Parse

Each parsing function splits an identifier into its components:

```typescript
parseIri("https://ada@example.com:8080/a/b?c#d");
```

```json
{
  "scheme": "https",
  "authority": "ada@example.com:8080",
  "userinfo": "ada",
  "host": "example.com",
  "port": "8080",
  "path": "/a/b",
  "query": "c",
  "fragment": "d"
}
```

If the string isn't that kind of identifier, the function throws an
`InvalidUriError` or an `InvalidIriError`. For more information, see
[Errors](#errors).

## Components

A component that isn't in the identifier isn't a property of the result.
A component that's there but empty is `""`:

```typescript
const urn = parseIri("urn:example:foo");
Object.keys(urn); // ["scheme", "path"]

parseIri("https://example.com?").query; // ""
```

An identifier always has a path, but the path can be empty. Only an
identifier with an authority, like `//example.com`, has a `host`, a
`userinfo`, or a `port`.

The components are readonly. To change one, spread the components into a
new object.

## Errors

The functions throw the following errors:

| Error | When |
| --- | --- |
| `InvalidUriError` | A string passed to a URI function isn't the kind of URI that the function needs |
| `InvalidIriError` | A string passed to an IRI function isn't the kind of IRI that the function needs |
| `UnsupportedIpVersionError` | A validation function gets an identifier whose host is an IP address of a future version. For more information, see [Future IP versions](#future-ip-versions). |

Each error has a `value` property with the string that caused it.
`InvalidUriError` and `InvalidIriError` also have a `rule` property, with
the kind of identifier that the string should have been, like
`"absolute-IRI"`. When a function takes two strings, the `rule` shows
which one is wrong.

```typescript
try {
  resolveIri("foo", "/schemas/");
} catch (error) {
  if (error instanceof InvalidIriError) {
    error.rule; // "absolute-IRI": the base isn't absolute
  }
}
```

## Future IP versions

RFC 3986 reserves a syntax for IP addresses of versions after IPv6, like
`[v7.future]`. It defines what they look like, but not which addresses are
valid. A validation function can't say whether an identifier with one is
valid, so it throws an `UnsupportedIpVersionError` instead of returning
`true` or `false`. The error's `host` property is the host, like
`[v7.future]`.

The other functions only need to know what a host looks like, so they
accept one. For example, `parseIri("http://[v7.future]/")` returns
`[v7.future]` as the host.
