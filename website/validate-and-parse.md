# Validate and parse

RFC 3986 defines three kinds of identifier. Each one has functions to
validate it:

| Kind | Example | Validate | Type |
| --- | --- | --- | --- |
| URI | `https://example.com/a?b#c` | `isUri`, `assertUri` | `Uri` |
| URI-reference | `../a#c` | `isUriReference`, `assertUriReference` | `UriReference` |
| absolute-URI | `https://example.com/a?b` | `isAbsoluteUri`, `assertAbsoluteUri` | `AbsoluteUri` |

A URI has a scheme, like `https`, and can have a fragment, like `#c`. A
URI-reference is a URI or a relative reference, which doesn't have a
scheme. An absolute-URI is a URI without a fragment, like a base URI.

IRIs have the same three kinds, with the same functions and types:
`isIri`, `isIriReference`, `isAbsoluteIri`, `assertIri`,
`assertIriReference`, `assertAbsoluteIri`, `Iri`, `IriReference`, and
`AbsoluteIri`.

## Validate

Each `is` function returns whether a string is that kind of identifier:

```typescript
isUri("https://example.com/café"); // false
isIri("https://example.com/café"); // true
isIri("../schema.json"); // false
isIriReference("../schema.json"); // true
isAbsoluteIri("https://example.com/schema.json#foo"); // false
```

An identifier has to follow the rules of its scheme too, if the package
knows the scheme. For example, an `https` URI needs a host, so
`https:///a` isn't valid. An identifier with another scheme is checked
with the generic syntax only. For which schemes the functions know, see
[Schemes](schemes.md):

```typescript
isIri("https:///a"); // false
isIri("example:a"); // true
```

A relative reference doesn't have a scheme, so it's checked with the
generic syntax only.

Each `assert` function gives the same answers, but throws an error that
says what's wrong and where, instead of returning `false`. For more
information, see [Errors](#errors).

```typescript
assertIri("https://exa mple.com/"); // throws InvalidIriError
```

## Check once

The functions other than the validation functions trust what you give
them. They don't check it again, so you only pay for checking an
identifier once. If you pass them a string that isn't valid, the result
isn't defined.

In TypeScript, the validation functions return a type that says what they
checked, like `Iri`. An `is` function narrows the string's type when it
returns `true`, and an `assert` function narrows it when it returns. The
other functions take these types, so TypeScript reports a string that you
haven't checked:

```typescript
const hostOf = (identifier: string) => {
  assertIri(identifier);
  return parseIri(identifier).host;
};
```

Without `assertIri`, TypeScript reports an error, because a `string` isn't
an `Iri`.

The types are only for TypeScript. At runtime, they're strings. Every
`Uri` is an `Iri`, and every `AbsoluteIri` is an `Iri`, so a function that
takes an `Iri` takes them too.

## Parse

`parseIri(value)` splits an identifier into its components:

```typescript
const iri = "https://ada@example.com:8080/a/b?c#d";
assertIri(iri);
parseIri(iri);
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

`parseIri` takes URIs, references, and absolute identifiers too. Its
return type depends on what it's given: an `IriReference` might not have a
scheme, and an `AbsoluteIri` doesn't have a fragment.

### Components

A component that isn't in the identifier isn't a property of the result.
A component that's there but empty is `""`:

```typescript
const tag = "tag:example.com,2004:a";
const empty = "https://example.com/?";
assertIri(tag);
assertIri(empty);

Object.keys(parseIri(tag)); // ["scheme", "path"]
parseIri(empty).query; // ""
```

An identifier always has a path, but the path can be empty. Only an
identifier with an authority, like `//example.com`, has a `host`, a
`userinfo`, or a `port`.

The components are as written. `parseIri` doesn't decode or lowercase
anything, so call `normalizeIri` first if you need that. For more
information, see [Normalize](normalize.md).

The components are readonly. To change one, spread the components into a
new object.

### Get one component

To get one component, use `getScheme`, `getPath`, `getQuery`, or
`getFragment`. They give what `parseIri` gives for that component,
without splitting out the others, which makes them faster:

```typescript
const uri = "https://example.com/schema?a#/$defs/b";
assertIri(uri);

getScheme(uri); // "https"
getPath(uri); // "/schema"
getQuery(uri); // "a"
getFragment(uri); // "/$defs/b"
```

`getScheme` takes an IRI, which always has a scheme. The others take
references too. `getQuery` and `getFragment` return `undefined` for a
component that isn't there.

`hasScheme` tells you whether a reference you've already checked is an
IRI, without checking it again. It's a type guard, so after it, the
reference has the `Iri` type, or `Uri` for a URI-reference:

```typescript
const reference = "https://example.com/schema";
assertIriReference(reference);

if (hasScheme(reference)) {
  getScheme(reference); // "https"
}
```

### Parse a URN

`parseUrn(value)` splits a Uniform Resource Name (URN) into the parts that
RFC 8141 defines:

```typescript
const urn = "urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66#a";
assertIri(urn);
parseUrn(urn);
```

```json
{
  "nid": "uuid",
  "nss": "6e8bc430-9c3a-11d9-9669-0800200c9a66",
  "fComponent": "a"
}
```

The parts are as written, like the components from `parseIri`.
`parseUrn` doesn't check that `value` is a URN.

## Errors

The functions throw the following errors:

| Error | When |
| --- | --- |
| `InvalidUriError` | A string passed to an `assert` function for URIs isn't that kind of URI, or `urlToIri`'s result breaks its scheme's rules |
| `InvalidIriError` | A string passed to an `assert` function for IRIs isn't that kind of IRI, or `resolveIri`'s result breaks its scheme's rules |

Each error has a `value` property with the string that caused it.

`InvalidUriError` and `InvalidIriError` have a `rule` property, with the
rule that the string doesn't match. It's the kind of identifier, like
`"absolute-IRI"`, or the scheme's rule, like `"http-URI"`, when the
string breaks its scheme's rules.

### What's wrong and where

`InvalidUriError` and `InvalidIriError` also say what's wrong with the
string, and where:

- `reason` is a code for what's wrong, like `"invalid-character"`.
- `component` is the component with the problem, like `"host"`.
- `start` and `end` are where the problem is in the string, so
  `value.slice(start, end)` is the part that's wrong.

The message says the same thing, after the rule and the string:

```typescript
try {
  assertIri("https://exa mple.com/");
} catch (error) {
  if (error instanceof InvalidIriError) {
    error.message;
    // 'Invalid IRI: https://exa mple.com/ — " " isn't allowed in a
    // host, at 11'
    error.reason; // "invalid-character"
    error.component; // "host"
    error.value.slice(error.start, error.end); // " "
  }
}
```

`reason` is one of the following codes:

| `reason` | What's wrong | Example |
| --- | --- | --- |
| `invalid-character` | A character that the component doesn't allow | `https://exa mple.com` |
| `invalid-percent-encoding` | A `%` that isn't followed by two hex digits | `https://example.com/%zz` |
| `invalid-ip-literal` | A host in brackets that isn't an IP address | `https://[::g]/` |
| `missing-scheme` | No scheme, for a function that needs one | `/foo` passed to `assertIri` |
| `fragment-not-allowed` | A fragment, for a function that needs an absolute identifier | `https://example.com#foo` passed to `assertAbsoluteIri` |
| `colon-in-first-segment` | A relative reference with `:` before its first `/`, which reads like a scheme | `1a:b`, which you can write as `./1a:b` |
| `missing-component` | A component that the scheme requires isn't there | `http:/a`, which needs an authority |
| `forbidden-component` | A component that the scheme doesn't allow is there | `file://h:1/a`, which can't have a port |
| `component-mismatch` | A component doesn't match the scheme's rule for it | `did:Example:a`, whose method's name has to be lowercase |

Something that's missing is an empty span where it would go. For example,
a missing scheme has `start` and `end` both `0`. The span of a component
that the scheme doesn't allow includes its delimiter, like `:1`.

The message for a scheme's rule says what the rule needs:

```text
Invalid http-URI: http:/a — an http URI must have an authority
Invalid file-URI: file://h:1/a — a file URI can't have a port
Invalid did-url: did:Example:a — a did URI's path must be a method name, ":", and a method-specific ID, in ASCII, like example:123456
```

`start` and `end` count UTF-16 code units, like every index of a
JavaScript string, and like positions in the Language Server Protocol. A
character outside the Basic Multilingual Plane, like an emoji, counts as
two.

## Future IP versions

RFC 3986 reserves a syntax for IP addresses of versions after IPv6, like
`[v7.future]`. It defines what they look like, but not which addresses are
valid. The validation functions check the syntax only, so an identifier
with one is valid:

```typescript
isIri("http://[v7.future]/"); // true
```
