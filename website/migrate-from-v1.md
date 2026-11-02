# Migrate from v1

v2 has the same functions as v1, with the same names. The following
sections list each change that can break code, and what to do about it.

## `toRelativeIri` takes the IRI first

`toRelativeIri` and `toRelativeUri` take their arguments in the opposite
order from v1. The IRI to make relative comes first, and the base second,
like in `resolveIri`:

```typescript
const base = "https://example.com/a/b";
const iri = "https://example.com/a/c";

// v1
toRelativeIri(base, iri); // "c"

// v2
toRelativeIri(iri, base); // "c"
```

Both arguments are strings, so TypeScript can't catch this change. Swap
the arguments in every call to `toRelativeIri` and `toRelativeUri`. With
the old order, v2 returns a reference to the base instead of to the IRI.
If the IRI has a fragment, v2 throws, because a base can't have one.

## `resolveIri` always checks the base

In v1, `resolveIri` and `resolveUri` didn't check the base when the
reference had a scheme, because the base isn't used then. In v2, a base
that isn't absolute throws, even if the reference has a scheme:

```typescript
// v1
resolveIri("https://example.com/a", "/b"); // "https://example.com/a"

// v2
resolveIri("https://example.com/a", "/b"); // throws InvalidIriError
```

That includes an empty string. If you passed `""` because you have no
base, call `normalizeIri` on the reference instead. For more information,
see [Resolve references](resolve-references.md).

## Missing components aren't properties

In v1, the parsing functions returned every component, with `undefined`
for the ones that weren't in the identifier. In v2, a component that isn't
there isn't a property of the result:

```typescript
// v1
parseIri("urn:example:foo");
// { scheme: "urn", authority: undefined, userinfo: undefined,
//   host: undefined, port: undefined, path: "example:foo",
//   query: undefined, fragment: undefined }

// v2
parseIri("urn:example:foo");
// { scheme: "urn", path: "example:foo" }
```

Code that reads a component, like `components.query === undefined`, keeps
working. Code that uses `in`, `Object.keys`, or `hasOwnProperty`, or that
compares the result with an object that has `undefined` properties,
changes. For more information, see
[Components](validate-and-parse.md#components).

## Errors are classes

The functions throw an `InvalidUriError`, an `InvalidIriError`, or an
`UnsupportedIpVersionError` instead of an `Error`. Each one extends
`Error`, so code that catches them keeps working. To tell them apart, use
`instanceof` instead of checking the message.

The messages of `InvalidUriError` and `InvalidIriError` start with v1's
message, then say what's wrong, like
`Invalid URI: /foo — a URI has to have a scheme`. Code that checks how a
message starts keeps working, but code that compares a whole message
doesn't. The errors also have properties that say what's wrong and
where. For more information, see
[Errors](validate-and-parse.md#errors).

## Types

The types changed in the following ways:

- In `IdentifierComponents` and `AbsoluteIdentifierComponents`,
  `authority` and `host` are optional. An identifier like
  `urn:example:foo` has neither. Check for them before you use them.
- The components are readonly. To change one, spread the components into
  a new object.
- `UriRule` and `IriRule` are new.
