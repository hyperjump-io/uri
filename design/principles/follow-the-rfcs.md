# Follow the RFCs

Validating and parsing follow the ABNF of RFC 3986 and RFC 3987, rule for
rule. The names in the code, like `pathAbEmpty` and `segmentNzNc`, are the
names of the rules they implement, so the grammar can be checked against
the RFC line by line. Resolving follows RFC 3986 §5.2, and normalizing
follows §6.2.2.

Where the RFC and what's convenient differ, the RFC wins. Someone who
knows the RFC can predict what happens without reading the docs, and
other implementations that follow it agree with this one.

- The kinds of identifier are the RFC's rules, `URI`, `URI-reference`, and
  `absolute-URI`, and errors name the rule a value doesn't match (see
  [Errors](../components/errors.md)).
- A base has to be an `absolute-URI` (§5.1), so a base with a fragment is
  an error, not silently stripped (see
  [Resolving](../components/resolving.md)).
- An empty authority is an authority. `file://` has one, so resolving
  `foo` against it is `file:///foo` (§5.2.3). v1 treated `""` as no
  authority and returned `file://foo`.

## Rejected

- **WHATWG URL semantics**, which is what `new URL` does. It's a different
  standard, made for browsers: it rewrites `\` to `/`, adds `/` as a
  default path, and percent-encodes Unicode, so an IRI doesn't stay an
  IRI. Identifiers in JSON Schema and JRef are RFC 3986 and RFC 3987
  identifiers.
