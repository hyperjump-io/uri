# Answer only what's known

When a question can't be answered from what the RFCs define, the answer is
"I don't know", which is an error, not `true` or `false`.

- A validator given a host that's an IP literal of a future version, like
  `[v7.future]`, throws. RFC 3986 defines that syntax but no addresses for
  it, so whether the identifier is valid can't be known (see
  [Future IP versions](../components/future-ip-versions.md)).
An identifier whose scheme isn't built in is the exception. It's checked
with the generic syntax only, which is the first layer of what's valid,
without the scheme's rules, which are the second. It used to throw
`UnknownSchemeError`, and a caller defined the scheme. That meant passing
the schemes to every call, through every layer of every dependent, and
calls given different schemes disagreed without saying so. So the
exception is a trade: answering "I don't know" put a burden on every
caller that was easy to get wrong (see
[Schemes](../components/schemes.md#unknown-schemes)). A URN whose
namespace isn't built in is checked with RFC 8141's syntax only, the same
way.

Functions that only need to know what something looks like, not whether
it's valid, aren't affected. Parsing, resolving, and normalizing accept a
future IP literal, because its syntax is known. *Designed, not
implemented:* they only take identifiers a validator has accepted, though
(see [Trust](../components/trust.md)), and a validator never accepts one,
so this only matters for a caller who casts.
