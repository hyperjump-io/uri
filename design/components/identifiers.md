# Identifiers

## Kinds

There are three kinds of identifier, each an RFC 3986 rule, and each with
an IRI form from RFC 3987:

| Rule | Has a scheme | Can have a fragment | Validate | Brand |
| --- | --- | --- | --- | --- |
| `URI` | Yes | Yes | `isUri`, `assertUri` | `Uri` |
| `URI-reference` | Maybe | Yes | `isUriReference`, `assertUriReference` | `UriReference` |
| `absolute-URI` | Yes | No | `isAbsoluteUri`, `assertAbsoluteUri` | `AbsoluteUri` |

There's one parse function, `parseIri`, overloaded on the brands, since
splitting is the same for every rule (see [Trust](trust.md)). v1 had one
for each rule, like `parseAbsoluteUri`.

Each is one regular expression built from the ABNF (see
[Grammar](grammar.md)). IRI patterns use the `u` flag for their Unicode
ranges. The patterns only validate. Parsing splits a valid string at its
delimiters (see [Parsing](parsing.md)).

## Strategies

The URI and IRI forms of each function differ only in which patterns and
which characters they allow, so each function is written once and given a
strategy: `uriStrategy` or `iriStrategy`. A strategy is a record of the
three normalizers for a form. The validators, `assert*`, and
`encode*Fragment` depend on the form too, and are made from its patterns
directly. The parsers left the strategy when they stopped validating.
It's a value, not an interface, so nothing implements it but the two
records.

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

### Rejected

- **Keeping `undefined` properties**, as v1 does. `"query" in components`
  was always `true`, `Object.keys` listed components that aren't there,
  and test assertions had to list every `undefined` component.
