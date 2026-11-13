# `tag`

RFC 4151. The rule name is `tagURI`.

## Rules

None. RFC 4151 §2.1 has `tagURI`'s ABNF, but says "To allow for such
developments, software that processes tags MUST NOT reject them on the
grounds that they are outside the syntax defined above", and §3 says it
again: "to allow for future expansion, software MUST NOT reject tags
which do not conform to the syntax specified in Section 2." So a tag is
checked with the generic syntax only, and resolving against one can't
break a rule.

It's built in for its normalization.

## Normalization

Only the scheme is lowercased, and the fragment is normalized (see
[Normalizing](../normalizing.md#fragments)). Tags are equal "if and only
if they are completely indistinguishable" (§2.4), so the syntax-based
normalization is off. A scheme's name is lowercased whatever the scheme
says: RFC 4151 governs what comes after it, and which specification
applies is decided by the name, which is case-insensitive for every URI
(RFC 3986 §3.1).

## Resolving

A reference that's a tag keeps its dot segments (see
[Resolving](../resolving.md#dot-segments)).

## Rejected

- **The rules of RFC 4151 §2.1**, which this design had until
  2026-11-06, with a query allowed because `specific` includes `?`. RFC
  4151 says not to reject a tag outside that syntax.
- **`parseTag`**, which split a tag into its `authorityName`, `date`, and
  `specific`. A tag outside §2.1's syntax is still a tag, so a parser of
  its parts can't take every tag, and no use case needs them.
