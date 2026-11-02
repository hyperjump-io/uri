# Resolving

## `resolveUri(reference, base)`

Resolves `reference` against `base` with the algorithm in RFC 3986 §5.2,
and normalizes the result (see [Normalizing](normalizing.md)).

`base` has to be an `absolute-URI` (§5.1): a scheme, and no fragment. A
base with a fragment throws instead of having its fragment stripped,
because a fragment in a base is usually a mistake, like passing the
reference and the base in the wrong order. `toAbsoluteUri` strips one.

`base` is checked even when `reference` has a scheme and the base isn't
used, so a bad base is reported where it's passed, not later when a
different reference needs it. A caller with no base uses `normalizeUri`
instead. It returns what `resolveUri` would for a reference with a scheme,
and throws for one without, with `URI` as the rule, which blames the
reference.

When `reference` has a scheme, the base is only tested with the
`absolute-URI` pattern, without splitting it, and parsed only if the test
fails, to throw the error. Checking it makes resolving a reference with a
scheme 1.5 times slower than not checking it, on Node.js 22. Parsing the
base was 1.8 times slower. A relative reference costs the same as before,
because its base was always parsed. It's paid where resolving is called, like compiling a schema or
making a request, and not where validating is.

### Rejected

- **Not parsing the base when `reference` has a scheme**, as in v1 and
  before this decision. An invalid base was only reported once a
  reference without a scheme was resolved against it.
- **`""` as a base meaning "no base"**, allowed when `reference` has a
  scheme. An empty base is often the result of a mistake, like a lookup
  that found nothing, and it would get through until a relative reference
  came along. RFC 3986 doesn't give `""` that meaning either: it's a
  reference, not an `absolute-URI`. `normalizeUri` already does what it
  would.
- **An optional `base`**, for the same reason. Without a base, it would
  be `normalizeUri` under another name.
- **Checking only the base components the result uses.** A base with a
  character in its path that isn't allowed would resolve `/a`, since an
  absolute path replaces the base's path. The output would still be valid, but it
  hides bad data: the same base throws later, with a reference that uses
  its path. It would also be a second way to validate an `absolute-URI`
  that has to agree with the pattern.
- **Repairing invalid input**, like percent-encoding a space. The RFCs
  don't define recovery, so its rules would be a grammar of this
  library's own, which nobody could predict from the RFC. That's what
  WHATWG URL is. Callers who want to fix a value can use the error's
  span (see [Errors](errors.md)).

Resolving builds a new set of components with spreads instead of changing
the parsed reference, because parsed components are readonly (see
[Types](types.md)).

### Schemes

*Designed, not implemented.*

The base and the result are checked with their schemes' rules too, and
the reference with the generic syntax only. The result is checked
instead of the reference because resolving can merge paths into one that
neither input has. See
[Schemes](schemes.md#resolving-relativizing-and-normalizing).

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
