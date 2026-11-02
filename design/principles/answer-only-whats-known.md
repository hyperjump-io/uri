# Answer only what's known

When a question can't be answered from what the RFCs define, the answer is
"I don't know", which is an error, not `true` or `false`.

- A validator given a host that's an IP literal of a future version, like
  `[v7.future]`, throws. RFC 3986 defines that syntax but no addresses for
  it, so whether the identifier is valid can't be known (see
  [Future IP versions](../components/future-ip-versions.md)).

Functions that only need to know what something looks like, not whether
it's valid, aren't affected. Parsing, resolving, and normalizing accept a
future IP literal, because its syntax is known.
