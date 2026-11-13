# Resolving

The functions here trust what they're given (see [Trust](trust.md)).

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
scheme's rules, when the scheme is built in (see
[Checking the result](#checking-the-result)).

Resolving splits only what it uses, the scheme, authority, path, query,
and fragment. It never looks at `userinfo`, `host`, or `port`. Some
references need no splitting:

| Reference | Result |
| --- | --- |
| Has a scheme | The reference, with dot segments removed, unless its scheme turns off the syntax-based normalization (see [Dot segments](#dot-segments)) |
| `""` | The base |
| `#…` | The base, then the reference |
| `?…` | The base up to its `?`, if it has one, then the reference |

Most `$ref`s in JSON Schema are `#…`.

The URI and IRI forms are one function: resolving doesn't depend on which
characters are allowed (RFC 3987 §6.5). `resolveIri` of two `Uri`s returns
a `Uri`.

### Rejected

- **Normalizing the result**, as v1 did. It's more than §5.2 says, and
  identifiers that are compared as strings can't use it. JSON Schema's
  registry, which relies on keys being normalized, normalizes when it
  stores and retrieves, which is where it belongs.
- **An option to normalize**, to save parsing the result again. It's a
  flag that makes the function two. It can be added if a measurement
  shows that the second parse matters.
- **Checking the base when `reference` has a scheme**, so a bad base is
  reported where it's passed. It made resolving such a reference 1.5
  times slower, for a base that's already checked.
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

## Checking the result

A valid reference against a valid base can make an invalid identifier,
like `b` against `urn:example:a`, which is `urn:b`. So `resolveIri`
checks its result against its scheme's rules, when the scheme is built
in. The result is new data, so checking it isn't paying for a check of
trusted data (see
[Pay only for what you ask for](../principles/pay-only-for-what-you-ask-for.md)).
A result with an unknown scheme has no rules to check.

Where results can break their scheme's rules, with ✓ for a result that's
always valid and ✗ for one that can't be. `tag` has no rules, so its
results are always valid, and `data` is like `urn` (see
[`data`](schemes/data.md#resolving)):

| Reference | `http`, `https` | `file` | `urn` | `did` |
| --- | --- | --- | --- | --- |
| `""` | ✓ the base | ✓ | ✓ | ✓ |
| `#f` | ✓ | ✓ | ✓ f-component, if it's ASCII | ✓ if it's ASCII |
| `?q` | ✓ | ✓ | ✗ `urn:ex:a?q`, needs `?=` or `?+` | ✓ if it's ASCII |
| `b` | ✓ | ✓ | ✗ `urn:b` | ✗ `did:b`, but ✓ against `did:ex:a/c` |
| `/b` | ✓ | ✓ | ✗ `urn:/b` | ✗ `did:/b` |
| `//h/b` | ✓ | ✓, but ✗ `//u@h/b` and `//h:1/b` | ✗ | ✗ |
| `//` | ✗ `http://`, empty host | ✗ `file://`, no `path-absolute` | ✗ | ✗ |
| Its own scheme | ✓ unless dot segments | ✓ | ✓ | ✗ `did:ex:a/../../b` is `did:b` |

The check is skipped where it can't fail:

- `""` returns the base.
- `#f` checks only the scheme's fragment rule, which for `urn`, `did`,
  and `data` is that it's ASCII. Most `$ref`s are this.
- `?q` checks only the query's and the fragment's rules, the only
  components it changes. Rules are per component, so the others, which
  are the base's, still hold.
- A reference with a scheme and no dot segments is returned as it is,
  since it passed a validator when it got its brand. So is one whose
  scheme turns off the syntax-based normalization, dot segments or not.
- A reference without an authority, which is merged with the base,
  checks only the path's, the query's, and the fragment's rules. The
  result's authority is the base's. For `http` and `https`, which have
  rules only for the authority and the host, that's nothing.

A `#f` or `?q` reference's rules are tested on the reference, not on the
result. The result ends with the reference, and it's the base and the
reference put together, which a regular expression would have to copy
into one string (see
[The `data` scheme](../benchmarks/data-scheme.md#a-fragment-against-a-base-with-rules)).

A result that fails can only be the reference's fault, since the base has
a brand, so the error is about the reference. Its `value` is the
reference, and its `rule` is the scheme's rule. A component the result has
from the reference is spanned in the reference. A merged path spans the
reference's path, because no one place in the reference made it. The
error is always an `InvalidIriError`, because one function resolves URIs
and IRIs.

### Dot segments

A reference with a scheme that turns off the syntax-based normalization,
which is `urn`, `tag`, or `data`, is returned as it is, with its dot
segments. Its path isn't segments: `data:text/plain,x/a/../b` is the text
`x/a/../b`, and RFC 8141 compares a URN's `/` and `.` as octets. So a `.`
in it isn't a dot segment, and removing it changes what the identifier
says. The URL Standard leaves these paths alone too.

It's an exception to RFC 3986 §5.2.2, which removes dot segments from a
reference with a scheme, whatever the scheme. Decided 2026-11-13, when
`data` was built in.

A relative reference against a base with one of these schemes is still
merged and has its dot segments removed, since that's what a relative
path means, and the result is checked. `#f` and `?q` never touch the
base's path.

### Rejected

- **Removing dot segments from every reference with a scheme, as §5.2.2
  says**, which this design had until 2026-11-13.
  `resolveIri("data:text/plain,x/a/../b", base)` was
  `data:text/plain,x/b`, which is different data, and `tag:a,2000:x/../y`
  was `tag:/y`. `data:text/plain,a/../b` and `urn:example:a/../b` threw,
  because the result broke its scheme's rules.
- **Not checking the result**, with callers who don't trust it calling
  `is*` on it. A brand says the rules of a built-in scheme too (see
  [Trust](trust.md#what-a-brand-says)), and `resolveIri` would give one
  that isn't true.
- **Checking the reference against the base's scheme, instead of the
  result.** It misses the merged path, which only the result has.
- **A rule that a scheme doesn't allow relative references.** RFC 8141's
  "should generally avoid" is advice to whoever writes the identifiers,
  not a syntax rule, and only MUST-level rules are built in. DID 1.1
  allows them. Checking the result already rejects references that make
  an invalid identifier.

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

- **Normalizing both, as v1 did.** Callers that already have normalized
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

- **Parsing and normalizing**, as v1 did. `@hyperjump/json-schema` calls
  it about 60 times, mostly on identifiers it has already checked, and
  has had to work around its cost.
