# Normalize

The same resource can have identifiers that are different strings. For
example, `HTTPS://Example.com/a/./b` and `https://example.com/a/b` are the
same IRI. `normalizeIri(iri)` turns equivalent IRIs into the same string,
so you can compare them with `===`:

```typescript
normalizeIri("HTTPS://Example.com/a/./b"); // "https://example.com/a/b"
normalizeIri("https://example.com/caf%C3%A9");
// "https://example.com/café"
normalizeUri("https://example.com/caf%C3%A9");
// "https://example.com/caf%C3%A9"
```

The functions apply the following rules from RFC 3986:

1. Decode percent-encoded characters that the component allows without
   encoding. `normalizeIri` decodes Unicode characters too, but `normalizeUri`
   doesn't, because a URI can't have them.
2. Uppercase the hex digits of percent-encoded characters, like `%2F`.
3. Remove `.` and `..` segments from the path.
4. Lowercase the scheme and the host.

`resolveIri`, `toRelativeIri`, and `toAbsoluteIri` normalize their results
too.

## Encode a fragment

`encodeIriFragment(fragment)` percent-encodes a string so that you can use
it as a fragment, like a JSON Pointer. It encodes every character that a
fragment doesn't allow, including `%`, and nothing else:

```typescript
const pointer = "/$defs/first name";
const fragment = encodeIriFragment(pointer); // "/$defs/first%20name"
`https://example.com/person.json#${fragment}`;
```

The result is already normalized, so you can compare an IRI that you build
with it to a normalized IRI.

`encodeUriFragment` does the same for URIs and encodes Unicode characters
too.
