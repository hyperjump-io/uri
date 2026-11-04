# Migrate from v1

v2 has most of the functions of v1, with the same names. The following
sections list each change that can break code, and what to do about it.
TypeScript reports many of them, but some don't change any types.

## Scheme rules apply

In v1, the validation functions checked only the generic syntax. In v2,
they check the rules of its scheme too, and throw an
`UnknownSchemeError` for a scheme that they don't know:

```typescript
// v1
isIri("http:///a"); // true
isIri("did:example:123"); // true

// v2
isIri("http:///a"); // false: an http URI needs a host
isIri("did:example:123"); // throws UnknownSchemeError
```

`normalizeIri`, `normalizeUri`, and `resolveIri` throw it too. If you use
identifiers with schemes other than `http`, `https`, `file`, `tag`, and
`urn`, make a scheme for each of them with `defineScheme`, and pass them
in the `customSchemes` option of each of these functions. A scheme
without rules checks only the generic syntax, like v1 did:

```typescript
const options = {
  customSchemes: [defineScheme({ name: "did", rule: "did" })]
};

isIri("did:example:123", options); // true
```

Make the options once, like when your module loads, and reuse them,
because `defineScheme` compiles the scheme's rules. For a URN, add its
namespace with `urnScheme`. For more information, see
[Schemes](schemes.md).

## Check identifiers before you use them

In v1, every function checked its arguments. In v2, only the validation
functions check, and the other functions trust what you give them. For
a string that isn't valid, they return a result that isn't defined,
instead of throwing.

Check each identifier that comes from outside your code, like one in a
JSON document, with an `is` or `assert` function before you pass it to
another function. The `assert` functions throw the errors that v1's
parsing functions threw:

```typescript
// v1
const components = parseIri(value);

// v2
assertIri(value);
const components = parseIri(value);
```

In TypeScript, the validation functions return a type like `Iri`, and the
other functions take it, so TypeScript reports a `string` that you didn't
check. For more information, see
[Check once](validate-and-parse.md#check-once).

## Results aren't normalized

In v1, `resolveIri`, `toAbsoluteIri`, and `toRelativeIri` normalized
their results. In v2, they don't. If you compare their results, like
identifiers that you use as keys, call `normalizeIri` on them:

```typescript
const base = "HTTPS://Example.com/a";
const reference = "B";

// v1
resolveIri(reference, base); // "https://example.com/B"

// v2
assertAbsoluteIri(base);
assertIriReference(reference);
resolveIri(reference, base); // "HTTPS://Example.com/B"
normalizeIri(resolveIri(reference, base)); // "https://example.com/B"
```

TypeScript can't catch this change.

## `toRelativeIri` takes normalized identifiers, target first

`toRelativeIri` takes its arguments in the opposite order from v1. The IRI
to make relative comes first, and the base second, like in `resolveIri`.
Both have to be normalized:

```typescript
const base = "https://example.com/a/b";
const target = "https://example.com/a/c";

// v1
toRelativeIri(base, target); // "c"

// v2
assertAbsoluteIri(base);
assertIri(target);
toRelativeIri(normalizeIri(target), normalizeIri(base)); // "c"
```

TypeScript reports an identifier that isn't normalized, but not the
order, because both are IRIs. Swap the arguments in every call. With the
old order, v2 returns a reference to the base instead of to the target.

v2 doesn't have `toRelativeUri`. Use `toRelativeIri` with identifiers
from `normalizeUri`.

## Fewer URI functions

The functions that work the same for URIs and IRIs have only their IRI
names. They take URIs too:

| v1 | v2 |
| --- | --- |
| `parseUri`, `parseUriReference`, `parseAbsoluteUri`, `parseIriReference`, `parseAbsoluteIri` | `parseIri` |
| `resolveUri` | `resolveIri` |
| `toRelativeUri` | `toRelativeIri` |
| `toAbsoluteUri` | `toAbsoluteIri` |

`parseIri` returns the components of the kind of identifier that it gets.
To check that a string is a URI, use `isUri` or `assertUri` before you
parse it.

## No empty base

In v1, `resolveIri` took `""` as a base when the reference had a scheme.
In v2, a base has to be an `AbsoluteIri`, so TypeScript reports `""`. If
you passed `""` because you have no base, you don't need to resolve:
check that the reference is an IRI with `isIri` instead.

## Missing components aren't properties

In v1, the parsing functions returned every component, with `undefined`
for the ones that weren't in the identifier. In v2, a component that isn't
there isn't a property of the result:

```typescript
const tag = "tag:example.com,2004:a";

// v1
parseIri(tag);
// { scheme: "tag", authority: undefined, userinfo: undefined,
//   host: undefined, port: undefined, path: "example.com,2004:a",
//   query: undefined, fragment: undefined }

// v2
assertIri(tag);
parseIri(tag);
// { scheme: "tag", path: "example.com,2004:a" }
```

Code that reads a component, like `components.query === undefined`, keeps
working. Code that uses `in`, `Object.keys`, or `hasOwnProperty`, or that
compares the result with an object that has `undefined` properties,
changes. For more information, see
[Components](validate-and-parse.md#components).

## Errors are classes

The `assert` functions throw an `InvalidUriError` or an `InvalidIriError`
instead of an `Error`, and the validation functions throw an
`UnknownSchemeError`, an `UnknownUrnNamespaceError`, or an
`UnsupportedIpVersionError`. Each one extends `Error`, so code that
catches them keeps working. To tell them apart, use `instanceof` instead
of checking the message.

The messages of `InvalidUriError` and `InvalidIriError` start with v1's
message, then say what's wrong, like
`Invalid URI: /foo — a URI has to have a scheme`. Code that checks how a
message starts keeps working, but code that compares a whole message
doesn't. The errors also have properties that say what's wrong and
where. For more information, see
[Errors](validate-and-parse.md#errors).

## Types

The types changed in the following ways:

- The functions that trust their arguments take types like `Iri` and
  `AbsoluteIri` instead of `string`.
- In `IdentifierComponents` and `AbsoluteIdentifierComponents`,
  `authority` and `host` are optional. An identifier like
  `urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66` has neither. Check for
  them before you use them.
- The components are readonly. To change one, spread the components into
  a new object.
