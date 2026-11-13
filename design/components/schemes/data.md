# `data`

RFC 2397. The rule name is `dataurl`. It was built in on 2026-11-13, for
`@hyperjump/browser`, which fetches `data` URLs. Until then it was an
unknown scheme, and the syntax-based normalization changed its data:
`normalizeIri("data:text/plain,a/../b")` was `data:text/b`.

## Rules

```
dataurl    := "data:" [ mediatype ] [ ";base64" ] "," data
mediatype  := [ type "/" subtype ] *( ";" parameter )
data       := *urlchar
parameter  := attribute "=" value
```

- **No authority.**
- **The path is the media type, `,`, and the data.** `type`, `subtype`,
  `attribute`, and `value` are RFC 2045's tokens, "represented using URL
  escaped encoding of [RFC2396] as necessary". So a token here is the
  characters of RFC 2045's `token` that a path allows, with the rest
  percent-encoded, and a `quoted-string` is all percent-encoded.
- **ASCII, in an IRI too.** RFC 2396 has no `urlchar`. It's `uric`
  (erratum 2045, verified), which is `reserved | unreserved | escaped`.

Strict is the default, so `data:image/svg+xml;utf8,x`, which is common
and which `fetch` takes, isn't valid: `utf8` is a parameter without a
value.

## The query is more data

A `?` is `reserved`, so it's a `uric`, and RFC 2397's `data` can have
one that isn't percent-encoded. RFC 2397 was written for RFC 2396, where
a URI like this was opaque (`opaque_part = uric_no_slash *uric`) and had
no query. RFC 3986 has no opaque URIs: the first `?` starts the query,
whatever the scheme. So `data` is RFC 3986's path, and if there's a `?`,
its query too.

That isn't an exception to RFC 2397, like [`file`](file.md)'s query is to
RFC 8089. It's RFC 2397's `data`, in RFC 3986's components. `fetch`
reads the query as data too. A token can't have a `?`, so the `,` is
always in the path.

RFC 2397 §2 says octets outside "the range of safe URL characters" are
percent-encoded, without saying what's safe. Someone who writes a data
URL should encode a `?` as `%3F`, which reads the same under RFC 2396
and RFC 3986. One that isn't encoded is still valid.

## Normalization

Only the scheme is lowercased, and the fragment is normalized (see
[Normalizing](../normalizing.md#fragments)). The data isn't a path:
`data:text/plain,a/../b` is the text `a/../b`, so removing dot segments
would change it. RFC 2397 defines no equivalence.

## Resolving

A reference that's a data URL keeps its dot segments (see
[Resolving](../resolving.md#dot-segments)). `#f` against a data URL is
valid if it's ASCII, and so is `?q`, since a query is more data. A
relative path is valid only if the merged path still has its `,`, so `b`
against `data:text/plain,a` is `data:text/b`, which isn't.

## Cost

A data URL takes 1.35 times as long to check as it did as an unknown
scheme, and twice as long for 100 KB of data, which is matched by RFC
2397's pattern and by the generic path (see
[The `data` scheme](../../benchmarks/data-scheme.md)).

## Rejected

- **Only "no authority, and a `,`"**, which is all `fetch` needs. It
  reads a media type it can't parse as `text/plain`.
- **Unicode characters in an IRI.** `fetch` takes them, but RFC 2397's
  `uric` is ASCII.
- **No query**, so that a `?` in the data has to be percent-encoded. It
  reads RFC 2397's `data` as RFC 3986's path only, and rejects
  `data:,a?b`, which RFC 2397's ABNF makes.
