# Types

The API is declared in `src/index.d.ts`, with type tests in
`src/index.test-d.ts`.

## Optional authority

In `IdentifierComponents` and `AbsoluteIdentifierComponents`,
`authority` and `host` are optional. v1 declared them required, but a URI
like `urn:example:foo` has neither, and v1's parsers returned `undefined`
for them.

### Rejected

- **A union of with-authority and without-authority types**, so that
  checking `authority` narrows `host` to `string`. It's exact, but three
  component types become six, for a check that's rarely needed: code that
  reads `host` usually reads it from an identifier it knows has one.

## Readonly components

The components are readonly. They're values that describe an identifier,
and none of the functions need them changed. Changing them would only make
something that isn't the identifier that was parsed. To make a different
one, spread them into a new object, which the types allow, since a spread
isn't readonly.

## Error constructors

The error classes have private constructors in the declarations. Only this
package throws them, and a public constructor would make its arguments part
of the API (see [Errors](errors.md)).

## Brands

*Designed, not implemented.* Identifiers that have been checked are
branded strings, like `Iri` and `AbsoluteIri`, and the functions that
trust their input take them (see [Trust](trust.md)). `parseIri` is
overloaded on them, so a full IRI's components have a `scheme: string`
and an absolute one's have no `fragment`.
