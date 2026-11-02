# Normalizing

`normalizeUri` applies the syntax-based normalization of RFC 3986 §6.2.2,
so equivalent identifiers are equal strings:

1. Percent-encoded characters that the component allows without
   encoding are decoded. Consecutive octets are decoded together as UTF-8, so `%C3%A9`
   is `é` in an IRI. Octets that aren't valid UTF-8 stay encoded.
2. The hex digits of the rest are made uppercase.
3. Dot segments are removed from the path, after decoding, because
   decoding can make new ones (`%2E%2E` is `..`).
4. The scheme and the host are lowercased.

`normalizeIri` is the same, but it decodes the Unicode characters an IRI
allows, and `normalizeUri` doesn't.

Each step is skipped when it can't change anything, because most
identifiers don't need it: decoding only runs with a `%`, and dot-segment
removal only with a dot segment.

Every function that returns an identifier normalizes it, so its results
can be compared with each other and with `normalize*`'s.

## Components

`normalizeComponents` normalizes parsed components, and `recompose` joins
components into a string without changing them. `compose` is both. The
normalized components are the ones parsing the normalized identifier
would make: `authority` is rebuilt with the host in lowercase, and a path
that starts with `//` without an authority has `/.` in front of it. So
`toRelative*` can compare normalized identifiers without parsing them
again (see [Resolving](resolving.md#torelativeuriuri-base)).

## Encoding fragments

`encodeUriFragment` percent-encodes every character a fragment doesn't
allow, including `%`, and nothing else. A character is encoded if and only
if normalizing wouldn't decode it, so the result is already normalized.
It's for putting something like a JSON Pointer in a fragment.
