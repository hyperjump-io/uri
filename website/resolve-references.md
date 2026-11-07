# Resolve references

A reference, like `../address.json`, identifies something relative to a
base IRI. To find the IRI that it identifies, you resolve it against the
base.

These functions trust what you give them, so check the identifiers first.
For more information, see [Check once](validate-and-parse.md#check-once).
They take URIs too, and return a `Uri` for URIs.

## Resolve a reference

`resolveIri(reference, base)` resolves a reference against a
base IRI, with the algorithm in RFC 3986:

```typescript
const base = "https://example.com/schemas/person.json";
assertAbsoluteIri(base);

const resolve = (reference: string) => {
  assertIriReference(reference);
  return resolveIri(reference, base);
};

resolve("address.json");
// "https://example.com/schemas/address.json"
resolve("../people/ada.json"); // "https://example.com/people/ada.json"
resolve("#/$defs/name");
// "https://example.com/schemas/person.json#/$defs/name"
resolve("urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66");
// "urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66"
```

The base has to be absolute: it needs a scheme, and it can't have a
fragment. To use an IRI with a fragment as a base, remove the fragment
first with `toAbsoluteIri`. For more information, see
[Remove a fragment](#remove-a-fragment). If you don't have a base, you
don't need to resolve: check that the reference is an IRI with `isIri`.

`resolveIri` removes `.` and `..` segments, because resolving does, but it
doesn't normalize the result. For example, it doesn't lowercase the host
or decode percent-encoded characters. Specifications like JSON-LD compare
identifiers as strings, without normalizing them. To compare identifiers
that are equivalent, call `normalizeIri` on the result. For more
information, see [Normalize](normalize.md).

### Scheme rules

A valid reference against a valid base can make an identifier that
breaks its scheme's rules. For example, `b` against `urn:example:a` is
`urn:b`, which isn't a URN. So `resolveIri` checks the result with its
scheme's rules, and throws an `InvalidIriError` if it breaks them. The
error is about the reference: its `value` is the reference, and its span
is in the reference.

A result with a scheme that isn't built in has no scheme rules to check.

## Find a reference

`toRelativeIri(target, base)` returns the shortest reference that
resolves to `target` against `base`. It does the opposite of
`resolveIri`. Both have to be normalized, so that identifiers that are
equivalent compare equal:

```typescript
const base = "https://example.com/schemas/person.json";
assertAbsoluteIri(base);
const normalizedBase = normalizeIri(base);

const relative = (target: string) => {
  assertIri(target);
  return toRelativeIri(normalizeIri(target), normalizedBase);
};

relative("https://example.com/schemas/address.json"); // "address.json"
relative("https://example.com/people/ada.json"); // "../people/ada.json"
relative("https://example.com/schemas/person.json#foo"); // "#foo"
```

`target` comes first and `base` second, like in `resolveIri`. For a
normalized `target` and `base`, resolving the result gives `target` again:

```typescript
const roundTrips = (
  target: NormalizedIri,
  base: NormalizedIri & AbsoluteIri
) => resolveIri(toRelativeIri(target, base), base) === target; // true
```

If no relative reference reaches `target`, like when it has a different
scheme or host from `base`, `toRelativeIri` returns `target`.

## Remove a fragment

`toAbsoluteIri(iri)` removes the fragment from an IRI:

```typescript
const iri = "https://example.com/person.json#/$defs/name";
assertIri(iri);
toAbsoluteIri(iri); // "https://example.com/person.json"
```

It keeps the IRI's type, so removing the fragment from a normalized IRI
gives a normalized `AbsoluteIri`.
