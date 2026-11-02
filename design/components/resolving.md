# Resolving

## `resolveUri(reference, base)`

Resolves `reference` against `base` with the algorithm in RFC 3986 §5.2,
and normalizes the result (see [Normalizing](normalizing.md)).

`base` has to be an `absolute-URI` (§5.1): a scheme, and no fragment. A
base with a fragment throws instead of having its fragment stripped,
because a fragment in a base is usually a mistake, like passing the
reference and the base in the wrong order. `toAbsoluteUri` strips one.

`base` is only parsed when `reference` has no scheme, because it isn't
needed otherwise. An invalid base isn't reported then.

Resolving builds a new set of components with spreads instead of changing
the parsed reference, because parsed components are readonly (see
[Types](types.md)).

### The base's authority

The test for whether the base has an authority is
`authority !== undefined`. v1 tested whether it was truthy, so the empty
authority of `file://` counted as none, and resolving `foo` against it
gave `file://foo`, which made `foo` the host. §5.2.3 says a base with an
authority and an empty path merges to `/` + the reference: `file:///foo`.

## `toRelativeUri(uri, base)`

Returns the shortest reference that resolves to `uri` against `base`:
`resolveUri(toRelativeUri(uri, base), base)` is `normalizeUri(uri)`.

`uri` comes first and `base` second, like `resolveUri(reference, base)`:
what's worked on, then what it's relative to. v1 had them the other way
around, `toRelativeUri(base, uri)`, while declaring the parameters
`(uri, relativeTo)`, which read as the opposite of what it did.

Both are normalized first, so equivalent identifiers compare equal.
They're normalized as components, with `normalizeComponents`, which makes
the components that parsing the normalized identifier would. Composing
each into a string and parsing it again, as before, parsed each one twice,
and made `toRelative*` 1.8 times slower (see
[Comparison with v1](../benchmarks/v1-comparison.md)). If no
relative reference reaches `uri`, it returns `uri`, normalized, which is
always a valid reference. That's the case for a different scheme or
authority, a rootless path that would have to go above its first segment,
and an empty target path.

`base` has to be an `absolute-URI`, like in `resolveUri`. `uri` has to be
a `URI`: a reference has nothing to be relative from.

### Rejected

- **Keeping v1's order and fixing the parameter names.** Nothing would
  break, but the two functions that are each other's opposite would take
  their arguments in opposite orders.
- **Naming it `relativize`.** It's a better verb, but the order was what
  was wrong, and renaming it too would hide the change in order behind a
  change in name, instead of documenting it.

## `toAbsoluteUri(uri)`

Removes the fragment from a URI, and normalizes it.
