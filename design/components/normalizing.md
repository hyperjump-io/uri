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

Then the scheme of the identifier can add normalizations, like removing
`:80` from an `http` URI, and turn off ones that its specification
forbids, like decoding for `urn` (see
[Schemes](schemes.md#normalizing)).

Each step is skipped when it can't change anything, because most
identifiers don't need it: decoding only runs with a `%`, and dot-segment
removal only with a dot segment.

- `normalize*` is the only function that normalizes. `resolveIri`,
  `toAbsoluteIri`, and `toRelativeIri` don't (see
  [Resolving](resolving.md)), so nobody pays for normalizing who doesn't
  ask for it (see
  [Pay only for what you ask for](../principles/pay-only-for-what-you-ask-for.md)).
- It takes a branded identifier and returns it with the `NormalizedIri`
  brand, or `NormalizedUri` from `normalizeUri`, which `toRelativeIri`
  requires (see [Trust](trust.md#normalized-brands)). It doesn't check
  its input.
- It applies only the syntax-based normalization for a scheme that isn't
  built in.
- It keeps its URI and IRI forms, because they decode different
  characters. `normalizeIri` also converts the A-labels of an `http` or
  `https` host to Unicode, and `normalizeUri` doesn't (see
  [Domain names](domain-names.md#converting)).

## Rejected

- **Returning the input when a scan finds nothing to change**: no `%`, no
  uppercase letter in the host, and no dot segment. Most registry keys are
  like that. It was measured, and it was slower: 208 to 211 milliseconds
  against 201 to 203, on `bench-schemes.js`'s four identifiers. Each step
  already skips itself when it can't change anything, so the scan only
  repeats those tests, and a scheme's normalization needs the components
  split out anyway.

## Components

`normalizeComponents` normalizes parsed components, and `recompose` joins
components into a string without changing them. `compose` is both. The
normalized components are the ones parsing the normalized identifier
would make: `authority` is rebuilt with the host in lowercase, and a path
that starts with `//` without an authority has `/.` in front of it.
`toRelative*` uses them now to compare normalized identifiers without
parsing them again. It takes normalized identifiers now, so only
`normalize*` needs them.

## Encoding fragments

`encodeUriFragment` percent-encodes every character a fragment doesn't
allow, including `%`, and nothing else. A character is encoded if and only
if normalizing wouldn't decode it, so the result is already normalized.
It's for putting something like a JSON Pointer in a fragment.

It returns a plain `string`, with no brand.
The brands are for identifiers, and a fragment isn't always a valid
reference by itself: `a:b` is a fragment, and as a reference it has the
scheme `a`. A caller puts it after a `#`, and that string is checked like
any other.
