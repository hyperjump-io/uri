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
| `http`, `https` | RFC 9110 | Has a host | Removes the default port, `80` or `443`, and an empty port. An empty path is `/`. |
| `file` | RFC 8089 | Has a path that starts with `/`, and no userinfo or port | A host of `localhost` is empty, so `file://localhost/a` is `file:///a`. |
| `urn` | RFC 8141 | Has no authority, and its path is a namespace and a name, in ASCII. For more information, see [The `urn` scheme](#the-urn-scheme). | Makes only the scheme and the namespace lowercase, and doesn't decode percent-encoding. |
| `tag` | RFC 4151 | None. RFC 4151 says not to reject a tag that doesn't follow its syntax. | Makes only the scheme lowercase. |
| `did` | DID 1.1 | Has no authority, and its path is a method name, `:`, and a method-specific ID, in ASCII. The method's name is lowercase. | The same as a scheme that isn't built in. |

RFC 8089 doesn't include a query in the syntax of a `file` URI, but the
package allows one. Node.js makes `file:` URLs with a query, like the
`import.meta.url` of a module imported as `./a.js?v=2`, and RFC 8089
doesn't forbid it.

A relative reference doesn't have a scheme, so it's checked with the
generic syntax only.

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
