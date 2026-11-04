# Resolving

The functions here trust what they're given (see [Trust](trust.md)).
Before they did, each had a URI and an IRI form, and they normalized.

## `resolveIri(reference, base)`

Resolves `reference` against `base` with the algorithm in RFC 3986 §5.2,
and nothing else. It removes dot segments, because the algorithm does,
but it doesn't normalize. A caller who wants a normalized result calls
`normalizeIri` on it. JSON-LD, RDF, and Atom compare identifiers as
strings, and resolving per §5.2 is what they specify.

`base` is an `AbsoluteIri` (§5.1): a scheme, and no fragment. A fragment
in a base is usually a mistake, like passing the reference and the base in
the wrong order, and the brand makes that a type error. `toAbsoluteIri`
removes one.

The base is trusted, so it isn't checked, and when `reference` has a
scheme, the base isn't read at all. The result is checked with its
scheme's rules, because a valid reference against a valid base can make an
invalid identifier, like `b` against `urn:example:a` (see
[Schemes](schemes.md#resolving)).

Resolving splits only what it uses, the scheme, authority, path, query,
and fragment. It never looks at `userinfo`, `host`, or `port`. Some
references need no splitting:

| Reference | Result |
| --- | --- |
| Has a scheme | The reference, with dot segments removed |
| `""` | The base |
| `#…` | The base, then the reference |
| `?…` | The base up to its `?`, if it has one, then the reference |

Most `$ref`s in JSON Schema are `#…`.

The URI and IRI forms are one function: resolving doesn't depend on which
characters are allowed (RFC 3987 §6.5). `resolveIri` of two `Uri`s returns
a `Uri`.

### Rejected

- **Normalizing the result**, as before. It's more than §5.2 says, and
  identifiers that are compared as strings can't use it. JSON Schema's
  registry, which relies on keys being normalized, normalizes when it
  stores and retrieves, which is where it belongs.
- **An option to normalize**, to save parsing the result again. It's a
  flag that makes the function two. It can be added if a measurement
  shows that the second parse matters.
- **Checking the base when `reference` has a scheme**, so a bad base is
  reported where it's passed. It made resolving such a reference 1.5
  times slower, for a base that's already checked.
- **Not checking the result**, with callers calling `is*` on it. A brand
  says that the scheme's rules hold, so `resolveIri` would give a brand
  that isn't true (see [Trust](trust.md#what-a-brand-says)).
- **`""` as a base meaning "no base"**, allowed when `reference` has a
  scheme. An empty base is often the result of a mistake, like a lookup
  that found nothing. RFC 3986 doesn't give `""` that meaning either: it's
  a reference, not an `absolute-URI`. `normalizeIri` already does what it
  would.
- **An optional `base`**, for the same reason.
- **Repairing invalid input**, like percent-encoding a space. The RFCs
  don't define recovery, so its rules would be a grammar of this
  library's own, which nobody could predict from the RFC. That's what
  WHATWG URL is. Callers who want to fix a value can use the error's
  span from `assert*` (see [Errors](errors.md)).

Resolving builds a new set of components with spreads instead of changing
the parsed reference, because parsed components are readonly (see
[Types](types.md)).

### Percent-encoded dot segments

§5.2.4 removes dot segments without decoding, so `%2E` isn't one, and a
`..` after it removes it like any segment: `a/%2E/..` against any base is
`a/`. Normalizing the reference first would decode it to `a/./..`, which
is `/`. So `normalizeIri(resolveIri(reference, base))` isn't always what
v1's `resolveIri` gave, which normalized as it resolved. It's the RFC's
answer, and it only differs for a reference with an encoded dot segment
followed by `..`. The differential test against the version before
schemes found 6 of 66,687 references like that, on one of three seeds.

### The base's authority

The test for whether the base has an authority is
`authority !== undefined`. v1 tested whether it was truthy, so the empty
authority of `file://` counted as none, and resolving `foo` against it
gave `file://foo`, which made `foo` the host. §5.2.3 says a base with an
authority and an empty path merges to `/` + the reference: `file:///foo`.

## `toRelativeIri(target, base)`

Returns a reference that resolves to `target` against `base`:
`resolveIri(toRelativeIri(target, base), base)` is `target`.

Both are `NormalizedIri`s, and `base` is absolute too. Normalized
identifiers have no dot segments, so it doesn't remove them, and
equivalent identifiers are equal strings, so a scheme or an authority
that's the same compares equal and the result is as short as it can be.
It doesn't normalize them itself: a caller who has normalized
identifiers, like a registry's keys, doesn't pay for it again.

The result is an `IriReference`, without checking, because it resolves to
`target`, which has its brand.

If the target's scheme and authority aren't the base's, it returns the
target before looking at the paths. That's also the result when no
relative reference reaches it: a rootless path that would have to go
above its first segment, or an empty target path. A target is always a
valid reference.

`target` comes first and `base` second, like `resolveIri(reference, base)`:
what's worked on, then what it's relative to. v1 had them the other way
around, `toRelativeUri(base, uri)`, while declaring the parameters
`(uri, relativeTo)`, which read as the opposite of what it did.

### Rejected

- **Normalizing both, as before.** Callers that already have normalized
  identifiers paid for it twice, and the type says what's needed.
- **Taking any `Iri`, and removing dot segments from both.** The result
  would be correct, but `HTTP://a/x` against `http://a/y` would be the
  whole target, and the type wouldn't warn about it.
- **Keeping v1's order and fixing the parameter names.** Nothing would
  break, but the two functions that are each other's opposite would take
  their arguments in opposite orders.
- **Naming it `relativize`.** It's a better verb, but the order was what
  was wrong, and renaming it too would hide the change in order behind a
  change in name, instead of documenting it.

## `toAbsoluteIri(iri)`

Removes the fragment: `iri` up to its first `#`, or `iri` itself when it
has none. In a trusted identifier, the first `#` starts the fragment, since
nothing before it can have one. It keeps every brand the value has, so a
normalized IRI stays normalized.

### Rejected

- **Parsing and normalizing**, as before. `@hyperjump/json-schema` calls
  it about 60 times, mostly on identifiers it has already checked, and
  has had to work around its cost.
