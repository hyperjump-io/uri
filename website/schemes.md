# Schemes

A URI's scheme, like `https` or `urn`, can add rules to the generic
syntax. For example, RFC 9110 says that an `http` URI needs a host, so
`http:///a` follows the generic syntax but isn't a valid `http` URI.

The validation functions check the generic syntax, then the rules of the
scheme that the identifier has. `normalizeIri` and `normalizeUri` apply
the scheme's normalization, and `resolveIri` checks that its result
follows its scheme's rules.

## Built-in schemes

The package knows the following schemes:

| Scheme | Specification | Rules | Normalization |
| --- | --- | --- | --- |
| `http`, `https` | RFC 9110 | Has a host | Removes the default port, `80` or `443`, and an empty port. An empty path is `/`. |
| `file` | RFC 8089 | Has a path that starts with `/`, and no query, userinfo, or port | A host of `localhost` is empty, so `file://localhost/a` is `file:///a`. |
| `tag` | RFC 4151 | Has no authority, and its path is a domain name or an email address, `,`, a date, and `:` | Makes only the scheme lowercase. |
| `urn` | RFC 8141 | Has no authority, and its path is a namespace and a name, in ASCII. For more information, see [The `urn` scheme](#the-urn-scheme). | Makes only the scheme and the namespace lowercase, and doesn't decode percent-encoding. |

A relative reference doesn't have a scheme, so it's checked with the
generic syntax only.

## Unknown schemes

For a scheme that isn't built in, a validation function can't know
whether an identifier is valid, so it throws an `UnknownSchemeError`
instead of returning `true` or `false`:

```typescript
try {
  isIri("did:example:123");
} catch (error) {
  if (error instanceof UnknownSchemeError) {
    error.scheme; // "did"
  }
}
```

`normalizeIri`, `normalizeUri`, and `resolveIri` throw it too, because
they need the scheme's normalization or rules. To use a scheme that isn't
built in, add it. For more information, see [Add a scheme](#add-a-scheme).

## Add a scheme

Make a scheme with `defineScheme`, and pass it in the `customSchemes`
option. A scheme has its name and the name of the rule that its
specification defines it with, which errors include:

```typescript
const didScheme = defineScheme({ name: "did", rule: "did" });
const options = { customSchemes: [didScheme] };

isIri("did:example:123", options); // true
```

A scheme without rules checks the generic syntax only. Scheme names match
without case, so `DID:example:123` is a `did` identifier too.

`defineScheme` compiles the scheme's rules into patterns, so make each
scheme once, like when your module loads, and reuse it. It throws a
`TypeError` for a name that isn't a scheme name.

A scheme with the name of a built-in scheme replaces it. To turn off a
built-in scheme's rules, replace it with a scheme without rules.

The validation functions, `normalizeIri`, `normalizeUri`, and `resolveIri`
take the option. Pass the same options to each of them. The `Iri` type
doesn't say which schemes a function checked it with, so an identifier
that you checked with a custom scheme throws an `UnknownSchemeError` when
you resolve or normalize it without that scheme.

### Rules

`validate` has a rule for each component that has one:

```typescript
const exampleScheme = defineScheme({
  name: "example",
  rule: "example-URI",
  validate: {
    authority: "required",
    query: "forbidden",
    path: {
      pattern: /\/v1\/.*/u,
      description: "a path under /v1/"
    }
  }
});
```

A component's rule is one of the following:

| Rule | Description |
| --- | --- |
| `"required"` | The component has to be there. |
| `"forbidden"` | The component can't be there. |
| `{ pattern, description }` | When the component is there, it has to match `pattern`. `description` is optional, and finishes the error message, like `an example URI's path must be a path under /v1/`. |

The components are `authority`, `userinfo`, `host`, `port`, `path`,
`query`, and `fragment`.

A pattern is a `RegExp` with the `u` flag and no other flags. The
functions check the generic syntax too, so a pattern only needs to check
the component's structure, not its characters, and it can't make an
identifier valid that the generic syntax doesn't allow.

A pattern matches from where its component starts, and what comes after
its match has to be something that can follow the component, like `?`,
`#`, or the end of the identifier for a path. So a pattern that can match
those delimiters can run past the end of its component. For example,
`/.+/u` for a host matches `/a` in `example:///a`, whose host is empty. To
check that a host isn't empty, use a pattern that can't match the
delimiters after a host, like `/[^:/?#]+/u`.

### Normalization

`normalize` has a function for each component that the scheme normalizes.
A function gets the component after the syntax-based normalization, and
returns it normalized, or `undefined` to remove it:

```typescript
const exampleScheme = defineScheme({
  name: "example",
  rule: "example-URI",
  normalize: {
    port: (port) => port === "8080" ? undefined : port,
    path: (path) => path === "" ? "/" : path
  }
});
```

A function only runs when its component is there. The components are
`userinfo`, `host`, `port`, `path`, and `query`. A scheme can't normalize
its fragment, because RFC 3986 says a fragment isn't normalized by its
scheme.

To turn off the syntax-based normalization, set `syntaxNormalization` to
`false`. Then `normalizeIri` only makes the scheme lowercase before it
calls your functions.

### Lowercase part of a component

`lowercaseComponent(component)` makes a component lowercase, for a scheme
with a part that's case-insensitive. Unlike `toLowerCase`, it changes only
ASCII letters, and it leaves percent-encoded characters alone:

```typescript
lowercaseComponent("Ada%2FLovelace"); // "ada%2Flovelace"
```

## The `urn` scheme

A Uniform Resource Name (URN) has a namespace, like `uuid` in
`urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66`. RFC 8141 defines the
syntax of every URN, and each namespace adds its own rules.

The built-in `urn` scheme knows the `uuid` namespace (RFC 9562). For a
URN of another namespace, the validation functions throw an
`UnknownUrnNamespaceError`, whose `nid` property is the namespace.

To add namespaces, make a `urn` scheme with `urnScheme(namespaces)` and
pass it in `customSchemes`, where it replaces the built-in one.
`namespaces` has a namespace for each name:

```typescript
const urn = urnScheme({
  isbn: {
    pattern: /\d[\d-]*[\dX]/u,
    description: "an ISBN, like 0-395-36341-1",
    normalize: (nss) => nss.replaceAll("-", "")
  },
  example: {}
});
const options = { customSchemes: [urn] };

const value = "URN:ISBN:0-395-36341-1";
isIri(value, options); // true

assertIri(value, options);
normalizeIri(value, options); // "urn:isbn:0395363411"
```

A namespace's `pattern`, `description`, and `normalize` work on its
namespace-specific string, which is the part after the namespace, like
`0-395-36341-1`. A `pattern` works like a component's. They're all
optional, so `{}` is a namespace without rules. The scheme still knows
`uuid`, unless you replace it.
