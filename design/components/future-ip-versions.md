# Future IP versions

RFC 3986 §3.2.2 reserves `IPvFuture`, a syntax for IP literals of versions
after IPv6: `[v` + a hex version + `.` + an address, like `[v7.future]`.
It defines what one looks like, but no versions or addresses.

A validator given one throws an `UnsupportedIpVersionError`. Whether the
identifier is valid depends on whether the address is valid for its
version, and that can't be known, so the answer is "I don't know", not
`true` or `false` (see
[Answer only what's known](../principles/answer-only-whats-known.md)).

Parsing, resolving, and normalizing accept a future IP literal and treat
it as an ordinary host. *Designed, not implemented:* they take only
values a validator has accepted (see [Trust](trust.md)), and no validator
accepts one, so they only see one through a cast. They only need to know
what the host looks like, which the syntax says. Normalizing makes it lowercase, like any host.

A validator only looks for one when the string is valid and has a `[`,
since that's only allowed in an IP literal (see
[Parsing](parsing.md#splitting)).

The error has `value`, the identifier, and `host`, the literal with its
brackets. The message keeps v1's form, with the literal without its
brackets: `Unsupported IP version in host: v7.future`.

## Rejected

- **`allowUnknownIpLiteral` in 2.0.0**, an option for validators to
  accept one. It's the guess `allowUnknownScheme` was rejected for, as an
  option, and nothing needs it. It's an option, so it can be added in a
  minor version if a caller does.
- **Returning `true`.** The syntax matches, but saying it's valid is a
  guess about addresses that don't exist yet.
- **Returning `false`.** It isn't known to be invalid either. `false`
  would tell a caller to reject an identifier that might be fine.
- **Throwing from the parsers too.** Parsing says what the components are,
  not whether they're valid. The components of `http://[v7.future]/` are
  known.
