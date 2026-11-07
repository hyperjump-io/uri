# URLs

`urlToIri(url)` makes a WHATWG URL an IRI, for a caller whose identifiers
are IRIs and who gets URLs from the platform: `pathToFileURL`, `fetch`'s
`response.url`, or `document.location`. It's where a URL comes into code
that follows the RFCs. The library doesn't take WHATWG semantics for
identifiers (see
[Follow the RFCs](../principles/follow-the-rfcs.md#rejected)), and
converting at the edge is how a caller keeps them out.

```ts
urlToIri: (url: URL) => Uri;
```

## What it changes

A URL's serialization (`url.href`) is ASCII, and most of it is already a
URI. The rest is characters the URL Standard leaves as they are and RFC
3986 doesn't allow in their component:

| URL | Not allowed |
| --- | --- |
| `http://e.com/a\|b^c/[x]` | `\|`, `^`, `[`, and `]` in the path |
| `http://e.com/?q={x}[y]\|` | `{`, `}`, `[`, `]`, and `\|` in the query |
| `http://e.com/#a#b` | the second `#`, in the fragment |
| `http://e.com/a%zz/100%` | a `%` that doesn't start a percent-encoding |
| `foo://a{b}/` | `{` and `}` in an opaque host |
| `foo:a b c` | spaces in an opaque path |
| `foo:/a\b` | `\` in the path of a scheme that isn't special |

`urlToIri` splits the serialization at its delimiters, the first `#`, the
first `?` before it, and `//` and the authority's end after the scheme, and
percent-encodes each character its component doesn't allow, including a
`%` that isn't followed by two hex digits. Nothing else changes. A host in
brackets is an IPv6 address the URL Standard already serialized, and is
kept as it is.

A URL without a host whose path starts with `//`, like
`web+demo:/.//not-a-host/`, is serialized with `/.` in front of its path,
so the path doesn't read as an authority. That's the same `/.` that
resolving and normalizing put there (see
[Normalizing](normalizing.md)), so it's kept as it is too.

It doesn't decode anything. An IRI with characters that are
percent-encoded but don't need to be is still an IRI, and a caller that
wants them decoded calls `normalizeIri`.

The result is a `Uri`, since the serialization is ASCII. Every URI is an
IRI, so it's what an IRI is needed for, and the name says what it's for,
like `resolveIri` that returns a `Uri` for `Uri`s. It can have a fragment,
so a caller that needs an `AbsoluteIri` calls `toAbsoluteIri`.

It takes a `URL`, not a string. A `URL` is proof that its serialization
is the URL Standard's, which is what `urlToIri` relies on, so it trusts it
the way the other functions trust a brand (see [Trust](trust.md)). A
caller with a string, like `response.url`, makes a `URL` of it.

## Checking the result

A URL can be an invalid identifier for a built-in scheme. `urn:x` and
`did:Example:1` are URLs, but the first has no namespace and the second's
method isn't lowercase. So the result is checked with its scheme's rules,
like `resolveIri`'s (see [Resolving](resolving.md)), and `urlToIri` throws
an `InvalidUriError` for one. A brand has to be true (see
[Trust](trust.md#what-a-brand-says)).

## Rejected

- **Decoding percent-encoded Unicode**, like RFC 3987 §3.2's conversion
  from URIs to IRIs, or calling `normalizeIri`. It isn't needed for an
  IRI, and `normalizeIri` already does it for a caller that wants it.
- **Taking a string**, like `url.href` or `response.url`. A string doesn't
  say whose serialization it is, so `urlToIri` would trust what it can't
  know, or check what the URL Standard already did.
- **Repairing any string**, like percent-encoding the characters a
  component doesn't allow in a value that isn't a URL. That's the recovery
  rejected for `resolveIri` (see [Resolving](resolving.md#rejected)). A
  URL's serialization is a known grammar, and what it leaves that RFC 3986
  doesn't allow is a known list.
- **`iriToUrl`**, for going the other way. `new URL(iri)` already does it,
  and APIs that take a URL, like `fetch` and `fileURLToPath`, take an IRI
  as a string. It can be added when a caller needs more than that.

## Known limitations

- A domain is kept as the URL Standard serialized it, in its ASCII form,
  like `xn--rsum-bpad.example`. RFC 3987 makes converting it to Unicode
  optional.
