# Pay only for what you ask for

Each function does one job, as fast as it can. Checking and normalizing
are calls of their own, so nobody pays for checking an identifier they
trust, or for normalizing one they don't need normalized. The cost is
that a caller sometimes makes two calls instead of one: `assertIri`, then
`parseIri`, or `resolveIri`, then `normalizeIri`.

The functions that check are the only ones that check: `is*` and
`assert*`. Every other function trusts that what it's given is what its
parameter's type says, and the types say it with brands (see
[Trust](../components/trust.md)). A string only gets a brand from a
function that checked it, so passing untrusted data to a function that
trusts it is a type error, not a silent mistake.

- `parseIri` splits at delimiters and doesn't validate (see
  [Parsing](../components/parsing.md)).
- `resolveIri` doesn't normalize, and doesn't check a base it doesn't use
  (see [Resolving](../components/resolving.md)).
- `toAbsoluteIri` is a slice at the first `#`.
- `toRelativeIri` takes normalized identifiers, instead of normalizing
  them itself.

A function still checks what it makes, when what it makes can be invalid
although its inputs aren't. `resolveIri` checks its result against its
scheme's rules, because a valid reference against a valid base can make
an invalid identifier (see
[Schemes](../components/schemes.md#resolving)). That isn't paying for a
check of trusted data: the result is new data.

## Rejected

- **Every function checks its input**, as v1 did and as v2 did before
  this principle. JSON Schema implementations call `toAbsoluteIri` and
  `resolveIri` on identifiers they've already checked, many times for
  each one, and every call paid for the pattern again.
- **An option to turn the checks off.** A check that's on by default is
  paid for by everyone who doesn't know about the option, and a flag that
  changes what a function does is two functions in one.
