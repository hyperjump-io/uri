# Normalize

The same resource can have identifiers that are different strings. For
example, `HTTPS://Example.com:443/a/./b` and `https://example.com/a/b` are
the same IRI. `normalizeIri(iri)` turns equivalent IRIs into the
same string, so you can compare them with `===`:

```typescript
const normalize = (value: string) => {
  assertIri(value);
  return normalizeIri(value);
};

normalize("HTTPS://Example.com:443/a/./b"); // "https://example.com/a/b"
normalize("https://example.com/caf%C3%A9");
// "https://example.com/café"
```

`normalizeUri` does the same for URIs, but leaves percent-encoded Unicode
characters encoded, because a URI can't have them.

`normalizeIri` and `normalizeUri` are the only functions that normalize.
`resolveIri`, `toRelativeIri`, and `toAbsoluteIri` don't, so call
`normalizeIri` on their results when you need to compare them. For
example, use it on the keys of a map of identifiers, and on the
identifiers that you look up in it.

## What it changes

First, the functions apply the following rules from RFC 3986:

1. Decode percent-encoded characters that the component allows without
   encoding. `normalizeIri` decodes Unicode characters too, but
   `normalizeUri` doesn't.
2. Uppercase the hex digits of percent-encoded characters, like `%2F`.
3. Remove `.` and `..` segments from the path.
4. Make the scheme and the host lowercase.

Then they apply the normalization of the scheme, like removing the default
port of an `https` URI. `normalizeIri` also converts an internationalized
domain name in an `http` or `https` host to Unicode, like
`xn--caf-dma.example` to `café.example`.

A scheme can also turn off the rules from RFC 3986. For example, `urn`
and `tag` identifiers aren't decoded. A scheme can't turn them off for
the fragment, which the functions always normalize. For what each scheme
changes, see [Built-in schemes](schemes.md#built-in-schemes).

An identifier with a scheme that isn't built in gets only the
normalization from RFC 3986.

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
with it to a normalized IRI. It's a `string`, not an `Iri`, so check the
IRI that you build with it before you pass it to the other functions.

`encodeUriFragment` does the same for URIs and encodes Unicode characters
too.
