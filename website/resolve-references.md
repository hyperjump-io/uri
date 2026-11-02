# Resolve references

A reference, like `../address.json`, identifies something relative to a
base IRI. To find the IRI that it identifies, you resolve it against the
base.

## Resolve a reference

`resolveIri(reference, base)` resolves a reference against a base IRI:

```typescript
const base = "https://example.com/schemas/person.json";

resolveIri("address.json", base);
// "https://example.com/schemas/address.json"
resolveIri("../people/ada.json", base);
// "https://example.com/people/ada.json"
resolveIri("#/$defs/name", base);
// "https://example.com/schemas/person.json#/$defs/name"
resolveIri("urn:example:foo", base); // "urn:example:foo"
```

The base has to be absolute: it needs a scheme, and it can't have a
fragment. To use an IRI with a fragment as a base, remove the fragment
first with `toAbsoluteIri`. For more information, see
[Remove a fragment](#remove-a-fragment).

`resolveIri` checks the base even when the reference has a scheme and the
base isn't used. If you don't have a base, use `normalizeIri` instead. It
returns an IRI the same way `resolveIri` does, and throws for a relative
reference:

```typescript
normalizeIri("urn:example:foo"); // "urn:example:foo"
normalizeIri("address.json"); // throws InvalidIriError
```

`resolveIri` normalizes the result. For more information, see
[Normalize](normalize.md).

## Find a reference

`toRelativeIri(iri, base)` returns the shortest reference that resolves to
`iri` against `base`. It does the opposite of `resolveIri`:

```typescript
const base = "https://example.com/schemas/person.json";

toRelativeIri("https://example.com/schemas/address.json", base);
// "address.json"
toRelativeIri("https://example.com/people/ada.json", base);
// "../people/ada.json"
toRelativeIri("https://example.com/schemas/person.json#foo", base);
// "#foo"
```

`iri` comes first and `base` second, like in `resolveIri`. For any IRI and
base, the following is `true`:

```typescript
resolveIri(toRelativeIri(iri, base), base) === normalizeIri(iri);
```

If no relative reference reaches `iri`, like when it has a different
scheme or host from `base`, `toRelativeIri` returns `iri`, normalized.

## Remove a fragment

`toAbsoluteIri(iri)` removes the fragment from an IRI, and normalizes it:

```typescript
toAbsoluteIri("https://example.com/person.json#/$defs/name");
// "https://example.com/person.json"
```

## Errors

These functions throw an `InvalidIriError` when a string isn't the kind of
IRI that they need. Its `rule` property says which kind:

| Function | `rule` for the first argument | `rule` for `base` |
| --- | --- | --- |
| `resolveIri(reference, base)` | `"IRI-reference"` | `"absolute-IRI"` |
| `toRelativeIri(iri, base)` | `"IRI"` | `"absolute-IRI"` |
| `toAbsoluteIri(iri)` | `"IRI"` | |

The URI functions, `resolveUri`, `toRelativeUri`, and `toAbsoluteUri`,
throw an `InvalidUriError` with the URI rules instead.
