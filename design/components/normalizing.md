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
[Scheme-based normalization](#scheme-based-normalization)).

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
- It keeps its URI and IRI forms, because they decode different
  characters.

## Rejected

- **Returning the input when a scan finds nothing to change**: no `%`, no
  uppercase letter in the host, and no dot segment. Most registry keys are
  like that. It was measured, and it was slower: 208 to 211 milliseconds
  against 201 to 203, on `bench-schemes.js`'s four identifiers. Each step
  already skips itself when it can't change anything, so the scan only
  repeats those tests, and a scheme's normalization needs the components
  split out anyway.

## Scheme-based normalization

A built-in scheme's normalization runs after the syntax-based
normalization (RFC 3986 §6.2.3). A scheme's specification can add
normalizations and take away syntax-based ones, because the scheme is the
second layer of the syntax (RFC 3986 §1.1.1). An unknown scheme gets the
syntax-based normalization only (see
[Schemes](schemes.md#unknown-schemes)).

| Scheme | Syntax-based normalization | What the scheme adds |
| --- | --- | --- |
| [`http`, `https`](schemes/http.md#normalization) | On | No default or empty port, `/` for an empty path, and A-labels in Unicode from `normalizeIri` |
| [`file`](schemes/file.md#normalization) | On | A host of `localhost` is empty |
| [`urn`](schemes/urn.md#normalization) | Off | The NID in lowercase, hex digits in uppercase, and a `uuid` NSS in lowercase |
| [`tag`](schemes/tag.md#normalization) | Off | Nothing |
| [`did`](schemes/did.md#normalization) | On | Nothing |
| [`data`](schemes/data.md#normalization) | Off | Nothing |

A scheme's name is lowercased whatever the scheme says.

### Order

The syntax-based normalization runs first, then the scheme's. That's the
order of RFC 3986's comparison ladder (§6.2), which climbs from
syntax-based to scheme-based. So a scheme's normalization sees the host
lowercased, hex digits uppercase, and unreserved characters decoded.

### How it's defined

A built-in's normalization is a function for each component it
normalizes, which returns the normalized component, or `undefined` to
remove it, like a default port. A function only runs when its component
is there. A scheme's host normalization is told whether it's normalizing
a URI or an IRI, since `normalizeUri`'s result has to stay ASCII.

### Fragments

A fragment always gets the syntax-based normalization, for `urn`, `tag`,
and `data` too. A scheme can't turn it off, and has no function for it,
because a fragment's semantics "are independent of the URI scheme and
thus cannot be redefined by scheme specifications" (RFC 3986 §3.5). RFC
8141's "MUST NOT be decoded" is about URN-equivalence, which doesn't take
the f-component into account (§2.3.3), and RFC 4151 has nothing to say
about a fragment. So `normalizeIri("urn:example:a#%7e")` is
`urn:example:a#~`.

### ASCII schemes

`urn`, `did`, and `data` are ASCII in an IRI too, so `normalizeIri`
normalizes them like `normalizeUri` does: a percent-encoded Unicode
character stays encoded. Decoding it would make an identifier that
breaks its scheme's rules, like `did:example:é` from
`did:example:%C3%A9`.

### Changes aren't breaking

Normalization can be partial: it must never make identifiers equal that
are different, but it doesn't have to catch every equivalent pair (RFC
3986 §6.1). So a new step for a built-in can only make identifiers equal
that should have been. That's a fix, and it isn't a breaking change, even
though `normalize*` returns something different. A registry normalizes
when it stores and when it looks up, so both use the new step and find
the same entry. A key kept from an older version, like one in a cache on
disk, misses once.

A new built-in is a breaking change anyway, for its rules, so its
normalization comes with it.

### What isn't normalized

- **Empty ports of schemes without a default port.** RFC 3986 §6.2.3 says
  not to remove a delimiter whose component is empty "unless licensed to
  do so by the scheme specification". An empty port means the default
  port, so it's removed only by a scheme that has one.
- **Equivalence without a normal form**, like ignoring the r-, q-, and
  f-components of a URN (RFC 8141 §3.1), or comparing Windows drive
  letters without case (RFC 8089 Appendix E.2, which isn't normative).
  The result of `normalize*` is an identifier for the same resource, not
  a key for comparing, so it can't drop or change what the identifier
  says. An `equals*` function could do it.
- **Unicode labels of a host, beyond making them lowercase.** UTS #46
  maps them with NFC and case folding, which needs IDNA tables (see
  [Domain names](domain-names.md#known-limitations)).

### Rejected

- **Only adding to the syntax-based normalization.** RFC 8141 forbids
  decoding, and RFC 4151 forbids any change. The scheme's specification
  is the one that applies, so it wins (see
  [Follow the RFCs](../principles/follow-the-rfcs.md)).
- **The scheme's normalization first.** It isn't the order of the
  comparison ladder, and decoding after the scheme's functions could
  undo what they did, like `%41` becoming `A` in a part they lowercased.
- **Removing an empty port for every scheme.** What an empty port means
  is up to the scheme.
- **Leaving the fragment of `urn` and `tag` alone**, which turning off
  the syntax-based normalization did at first. Two URNs that differ only
  in how a fragment is encoded stayed different.
- **A function for the fragment in a scheme's normalization**, which
  `urn` used to make hex digits uppercase. It gave the scheme a say over
  the fragment, and it did less than the syntax-based normalization.

## Components

`normalizeComponents` normalizes parsed components, and `recompose` joins
components into a string without changing them. The normalized
components are the ones parsing the normalized identifier would make:
`authority` is rebuilt with the host in lowercase, and a path that starts
with `//` without an authority has `/.` in front of it. Only `normalize*`
normalizes components. `resolveIri` uses `recompose` for its result.

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

A value with nothing to encode is returned after one test of the whole
value. Otherwise, one `replace` with a global pattern for a character the
fragment doesn't allow encodes each of them. An ASCII character's escape,
like `%5B` for `[`, is from a table. Other characters are encoded with
`TextEncoder`, which makes an array for each one. A JSON Pointer to a
`patternProperties` schema has a regular expression in it, often with
`[`, `]`, `\`, `^`, and `|`, and `json-schema` encodes a pointer for every node
it resolves. Encoding one of them took about 16 microseconds, and now takes
under 1 (see [Fragment encoding](../benchmarks/fragment-encoding.md)).

### Rejected

- **Testing each character**, as before, with the table for ASCII. It was
  twice as slow as one `replace`.
