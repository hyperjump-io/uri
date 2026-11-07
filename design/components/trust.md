# Trust

Functions either check what they're given or trust it (see
[Pay only for what you ask for](../principles/pay-only-for-what-you-ask-for.md)).
The types say which: a function that trusts its input takes a branded
string, and only a function that checks gives one.

| Checks | Trusts |
| --- | --- |
| `isUri`, `isUriReference`, `isAbsoluteUri`, and their IRI forms | `parseIri`, `parseUrn` |
| `assertUri`, `assertUriReference`, `assertAbsoluteUri`, and their IRI forms | `resolveIri`, `toRelativeIri`, `toAbsoluteIri` |
| | `getScheme`, `getPath`, `getQuery`, `getFragment`, `hasScheme` |
| | `normalizeUri`, `normalizeIri` |

`is*` and `assert*` give the same answers. `is*` returns a boolean and is
a type guard. `assert*` throws an error that says what's wrong and where
(see [Errors](errors.md)), and is an assertion function. Both throw
`UnsupportedIpVersionError` for a future IP literal, because "I don't
know" isn't `true` or `false` (see
[Answer only what's known](../principles/answer-only-whats-known.md)).

Given input the types don't allow, like a string that was cast, a trusting
function's result is undefined. It doesn't throw for it.

## Brands

```ts
type IriReference = string & { [reference]: true };
type Iri = IriReference & { [full]: true };
type AbsoluteIri = Iri & { [absolute]: true };
type UriReference = IriReference & { [ascii]: true };
type Uri = Iri & UriReference;                 // every URI is an IRI
type AbsoluteUri = AbsoluteIri & Uri;
type NormalizedIri = Iri & { [normalized]: true };
type NormalizedUri = Uri & { [normalizedUri]: true };
```

The brands are intersections, so a value can have several, and each
subset is assignable to what it's a subset of: an `AbsoluteIri` is an
`Iri`, and so is a `Uri`. `NormalizedIri & AbsoluteIri` is a normalized
absolute IRI. Each rule has a URI form, like `AbsoluteUri`.

Brands are only in the types. At runtime they're strings, so they cost
nothing.

```ts
isIri(value: string, options?): value is Iri
assertAbsoluteIri(value: string, options?): asserts value is AbsoluteIri
parseIri(value: AbsoluteIri): AbsoluteIdentifierComponents  // and overloads for Iri and IriReference
resolveIri(reference: IriReference, base: AbsoluteIri, options?): Iri
toAbsoluteIri<T extends Iri>(value: T): T & AbsoluteIri
normalizeIri(value: AbsoluteIri, options?): AbsoluteIri & NormalizedIri  // and an overload for Iri
toRelativeIri(target: NormalizedIri, base: NormalizedIri & AbsoluteIri): IriReference
```

The URI and IRI forms of `parse`, `resolve`, `toRelative`, and
`toAbsolute` were one function each once they stopped validating and
normalizing, since they don't depend on which characters are allowed (RFC
3987 §6.5 says resolving is the same). Each keeps the `Uri` brands with
overloads, like `resolveIri(reference: UriReference, base: AbsoluteUri): Uri`.
They have only the IRI names (see
[Naming](naming.md#merged-functions)).

## Normalized brands

`normalizeUri` and `normalizeIri` give different brands, `NormalizedUri`
and `NormalizedIri`, because they normalize differently: `normalizeIri`
decodes percent-encoded Unicode, and `normalizeUri` leaves it encoded. A
URI normalized as a URI isn't normalized as an IRI, so `toRelativeIri`
takes two of the same kind, with an overload for each.

`normalizeIri` doesn't keep a `Uri` a `Uri`, since decoding can make it
one that isn't ASCII. It keeps an `AbsoluteIri` absolute, with an overload,
instead of the generic `<T extends Iri>(value: T): T & NormalizedIri` that
was designed, which would have said a decoded URI is still a `Uri`.
`toAbsoluteIri` is still generic, since removing a fragment keeps every
brand.

### Rejected

- **`normalizeUri` giving `NormalizedIri`**, as the generic signature
  did. `toRelativeIri` would take a URI normalized as a URI and an IRI
  normalized as an IRI together, which can be equivalent without being
  equal, so its result wouldn't be the shortest.

## What a brand says

A brand says everything `is*` checks: the generic syntax and, for a
built-in scheme, its rules. A value with any other scheme gets one for
the generic syntax alone (see
[Schemes](schemes.md#unknown-schemes)). So every value with a brand is
valid for every scheme the library knows.

That makes a function that makes an identifier responsible for its brand.
`resolveIri` checks its result's scheme rules, because a valid reference
against a valid base can make an invalid identifier (see
[Schemes](schemes.md#resolving)). `toRelativeIri`'s result doesn't need
checking: it resolves to the target, which has its brand.

A reference that was checked can become an `Iri` without being checked
again. `isIriReference` checks a reference with a scheme against the
scheme's rules, so a checked reference with a scheme is everything
`isIri` would say. `hasScheme` is that narrowing: it only looks for the
scheme, and it keeps the reference's other brands, so a `UriReference`
with a scheme is a `Uri`. It's how a reference is used where there's no
base to resolve it against, like a relative URL in a runtime without a
location. Re-checking it with `isIri` would give the same answer at the
cost of the whole check, and a caller's cast would put this reasoning
outside the package that makes the brands.

`toRelativeIri` takes normalized identifiers. A normalized identifier
has no dot segments, so it doesn't remove them, and identifiers that are
equivalent compare equal, so its result is as short as it can be. Its
callers in `@hyperjump/json-schema` already have normalized identifiers,
because a registry's keys are normalized.

## Rejected

- **A brand that only says the generic syntax.** It's all that the
  trusting functions need to work, and `resolveIri` could give one without
  checking. But a brand would then mean less than `is*` says, and a value
  could have one while it's invalid for its scheme.
- **A generic-only check that gives a brand**, like `isIriSyntax`, for
  values with schemes that aren't configured. Unknown schemes get the
  generic syntax only now, from `is*` itself (see
  [Schemes](schemes.md#unknown-schemes)).
- **Casts as the way to trust a value.** They're there for a caller who
  needs one, but a cast that's the documented way in would be used where
  a check belongs.
- **Brands that say which schemes they were checked under**, like
  `Iri<"did">`, so a missing configuration is a type error, when there
  were custom schemes. It was
  prototyped and works, with a scheme's name as a literal type and a
  conditional rest parameter on `resolveIri`. But a configuration typed
  as plain `Options`, like one passed through `@hyperjump/json-schema`'s
  configuration, widens the names to `string` and turns the check off. Keeping
  it would make every dependent's configuration generic over its scheme names,
  and a bare `Iri` in a dependent's signature would either refuse custom
  schemes or not be resolvable. The errors were `Expected 3 arguments`.
- **Three parse functions with no brands**, `parse`, `parseReference`,
  and `parseAbsolute`, sharing one splitter. The names say something is
  checked that isn't, and the return type is the caller's claim, which
  the compiler believes.
- **One parse function returning the reference shape**, with every
  component optional. It's honest for any string, but nothing warns a
  caller who passes data they haven't checked, which the brands do.
