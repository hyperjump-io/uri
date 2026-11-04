# Answer only what's known

When a question can't be answered from what the RFCs define, the answer is
"I don't know", which is an error, not `true` or `false`.

- A validator given a host that's an IP literal of a future version, like
  `[v7.future]`, throws. RFC 3986 defines that syntax but no addresses for
  it, so whether the identifier is valid can't be known (see
  [Future IP versions](../components/future-ip-versions.md)).
- A validator given an identifier whose scheme it doesn't know throws
  `UnknownSchemeError`. The generic syntax is only the first layer of
  what's valid, and the scheme's rules are the second (see
  [Schemes](../components/schemes.md)). So do `resolveIri` and
  `normalizeIri`, which need the scheme's rules to check their result or
  to normalize, and would otherwise return something they can't vouch for.
  A URN whose namespace it doesn't know throws `UnknownUrnNamespaceError`
  the same way.

Functions that only need to know what something looks like, not whether
it's valid, aren't affected. Parsing, resolving, and normalizing accept a
future IP literal, because its syntax is known. *Designed, not
implemented:* they only take identifiers a validator has accepted, though
(see [Trust](../components/trust.md)), and a validator never accepts one,
so this only matters for a caller who casts.
