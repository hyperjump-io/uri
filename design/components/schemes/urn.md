# `urn`

RFC 8141. The rule name is `namestring`.

The syntax of a URN is two layers, like a URI's. RFC 8141 defines the
first: `urn:`, the NID, `:`, the NSS, and the r-, q-, and f-components.
The namespace the NID names defines the rest. So:

- Every URN is checked with RFC 8141's syntax.
- A URN of the `uuid` namespace (RFC 9562), the only one that's built
  in, is checked with its rules too.
- A URN of any other namespace is checked with RFC 8141's syntax only,
  like an unknown scheme is checked with the generic syntax.

Adding a namespace is a breaking change, like adding a scheme. No other
namespace is in a use case.

## Rules

- **No authority.**
- **The path is `NID ":" NSS`.** `uuid` is a branch of the path's
  pattern: its NID, without case, and RFC 9562's `UUID` for the NSS. So a
  URN is checked in one test, its namespace included.
- **The query is `"+" r-component [ "?=" q-component ] / "="
  q-component`.** RFC 8141's `rq-components = [ "?+" r-component ]
  [ "?=" q-component ]` starts with the query's delimiter, so it's
  written for what's after the `?`.
- **The fragment is the f-component**, `f-component = fragment`.
- **ASCII, in an IRI too.** RFC 8141 §2 "does not extend the URN syntax
  to allow direct use of characters outside the ASCII range", and the
  r-, q-, and f-components each say they "MUST be percent-encoded". So
  `urn:ex:é` is a valid IRI and an invalid URN.

RFC 8141 says its `alphanum` is RFC 3986's, but RFC 3986 Appendix D
removed it from RFC 2396. The rules define it as RFC 2396 did:
`alphanum = ALPHA / DIGIT`.

## Normalization

RFC 8141 §3.1 compares URNs "octet-by-octet" after case normalization,
so the syntax-based normalization is off:

- Only the scheme and the NID are lowercased.
- Hex digits are made uppercase, in the path and the query.
  Percent-encoded characters aren't decoded ("MUST NOT be decoded").
- Dot segments aren't removed.
- A `uuid` NSS is lowercased (RFC 9562 §4), after RFC 8141's steps.
- The fragment is normalized (see
  [Normalizing](../normalizing.md#fragments)). The f-component isn't
  part of URN-equivalence ("SHALL NOT be taken into account", §2.3.3).

So `normalizeIri("urn:example:%41")` is `urn:example:%41`, not
`urn:example:A`.

URN-equivalence ignores the r-, q-, and f-components. Normalizing keeps
them, because its result is an identifier for the same resource, not a
key for comparing (see
[Normalizing](../normalizing.md#what-isnt-normalized)).

## Resolving

RFC 8141 §4.3 says resolving a relative reference against a `urn` URI
"is problematic", and that applications "should generally avoid" it. It
also says resolving with the generic algorithm "should work predictably".
So resolving against a URN isn't an error: the result is checked like
any other. `c` against `urn:example:a/b` is `urn:example:a/c`, which is
valid. `b` against `urn:example:a` is `urn:b`, which isn't, and neither
is `?q`, which needs `?=` or `?+`.

A reference that's a URN keeps its dot segments (see
[Resolving](../resolving.md#dot-segments)).

## `parseUrn`

`urn` gets a parse function because a caller expects its parts, a NID
and an NSS. The other built-ins have nothing the generic components
don't have that a use case needs. It splits like `parseIri` does, and
trusts what it's given. It returns a field for each part of RFC 8141's
grammar, named after its rule:

```ts
// RFC 8141: "urn" ":" NID ":" NSS [ "?+" r-component ] [ "?=" q-component ] [ "#" f-component ]
type UrnComponents = {
  readonly nid: string;
  readonly nss: string;
  readonly rComponent?: string;
  readonly qComponent?: string;
  readonly fComponent?: string;
};

parseUrn(value: Iri): UrnComponents
```

- There's no `scheme`. It's always `urn`.
- Values are as written, like `parseIri`'s: nothing is decoded or
  lowercased. A caller who wants them normalized normalizes first.
- A part that isn't there isn't a key. An r-component and a q-component
  have at least one character, so only `fComponent` can be empty: `urn:a:b#`
  has `fComponent: ""`, like a generic fragment.
- It takes an `Iri`, since a brand doesn't say which scheme a value has.
  For another scheme the result is undefined, like for a value that was
  cast.

## Errors

A `uuid` NSS that fails is a `component-mismatch` of the path, spanning
only the NSS: `a UUID URN's NSS must be a UUID, like
f81d4fae-7dec-11d0-a765-00a0c91e6bf6`.

## Rejected

- **No built-in `urn`.** RFC 8141's syntax is in a use case, and every
  caller would otherwise get only the generic syntax.
- **More built-in namespaces**, like `ietf` (RFC 2648, RFC 3553), which
  OAuth uses for names like `urn:ietf:params:oauth:grant-type:…`, or
  `oid` and `isbn`. They're compared as strings there, and no use case
  validates them.
- **An `assignedName` field** from `parseUrn`, `urn:NID:NSS`, which RFC
  8141 compares URNs by. It's a slice of the input a caller can rebuild
  in a line, so it's left out until something needs it.
- **A template literal type for `parseUrn`'s input**, like
  `` `urn:${string}` ``. It rejects `URN:a:b`, which is valid, since
  schemes are case-insensitive.
- **`isUrn`**, a validator for one scheme. No use case needs one, and a
  function can be added in a minor version.
