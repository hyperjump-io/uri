# Identifiers

## Kinds

There are three kinds of identifier, each an RFC 3986 rule, and each with
an IRI form from RFC 3987:

| Rule | Has a scheme | Can have a fragment | Validate | Parse |
| --- | --- | --- | --- | --- |
| `URI` | Yes | Yes | `isUri` | `parseUri` |
| `URI-reference` | Maybe | Yes | `isUriReference` | `parseUriReference` |
| `absolute-URI` | Yes | No | `isAbsoluteUri` | `parseAbsoluteUri` |

Each is one regular expression built from the ABNF (see
[Follow the RFCs](../principles/follow-the-rfcs.md)). IRI patterns use the
`u` flag for their Unicode ranges.

A `URI-reference` with a scheme is a `URI`, so the reference pattern makes
the scheme optional and is otherwise the same.

## Strategies

The URI and IRI forms of each function differ only in which patterns and
which characters they allow, so each function is written once and given a
strategy: `uriStrategy` or `iriStrategy`. A strategy is a record of the
three parsers and the three normalizers for a form. It's a value, not an
interface, so nothing implements it but the two records.

## Components

A parser returns the components that are in the identifier. A component
that isn't there isn't a property. An empty one is `""`, so `https://x?`
has `query: ""` and `https://x` has no `query`.

`userinfo`, `host`, and `port` are only there with an `authority`.
`host` is always there with one, because a host can be empty, like
`file://`. `path` is always there, because every identifier has one,
even if it's empty.

The result is an ordinary object, so it can be spread, compared with
`toEqual`, and checked with `in`. v1 returned the regular expression's
`groups` object: a null-prototype object with every group as a property,
`undefined` for the ones that didn't match, and the internal `path2` and
`ipVFuture` groups deleted from it.

Building a new object makes `parseIri` about 1.17 times slower than v1
(see [Comparison with v1](../benchmarks/v1-comparison.md)). Resolving and
normalizing, which parse internally, are at parity.

### Rejected

- **Keeping `undefined` properties**, as v1 does. `"query" in components`
  was always `true`, `Object.keys` listed components that aren't there,
  and test assertions had to list every `undefined` component.
- **Deleting the `undefined` groups from `match.groups`.** It was about
  twice as slow as building an object, measured on its own, and the
  result is still a null-prototype object.
