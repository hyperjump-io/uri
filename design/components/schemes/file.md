# `file`

RFC 8089. The rule name is `file-URI`.

## Rules

- **A path that starts with `/`.** `auth-path = [ file-auth ]
  path-absolute`, and `local-path = path-absolute` (§2), so `file://` and
  `file:a` are invalid, and so is `file:////a`, since `path-absolute`
  can't start with `//`.
- **No userinfo or port.** `file-auth = "localhost" / host`, and `host`
  is RFC 3986's, which doesn't include them. So `file://user@host/a` and
  `file://host:80/a` are invalid, and so is `file://c:/path`, whose `c:`
  is a host and an empty port.

A fragment is allowed. RFC 8089's `file-URI` doesn't name one, but
fragment semantics "are independent of the URI scheme and thus cannot be
redefined by scheme specifications" (RFC 3986 §3.5), so a scheme's ABNF
leaves it out. RFC 9110 §4.2.5 says so of its own: "The fragment
identifier component is not part of the scheme definition for a URI
scheme".

## A query is allowed

This is an exception to RFC 8089. Its `file-URI` doesn't have
`[ "?" query ]`, where `http-URI` does, and a query has no exception like
a fragment's. But RFC 8089 never says a query MUST NOT be there, and
Node.js makes `file:` URLs with queries: `import("./a.js?v=2")` gives the
module an `import.meta.url` with one, which is a common way to load a
module again. Nobody can loosen a built-in's rule (see
[Schemes](../schemes.md#what-it-costs)), and with the rule, `resolveIri`
would throw for any `?q` against a `file:` base.

The other rules are kept, because only RFC 8089's nonstandard forms
break them (Appendix E: `file:c:/path`, `file:////host/share`, and
userinfo).

## Normalization

After the syntax-based normalization, a host of `localhost` is empty, so
`file://localhost/a` is `file:///a`. "When a scheme defines a default for
authority […] the reference should be normalized to an empty authority"
(RFC 3986 §6.2.3), and RFC 8089 §2 reads `localhost` "exactly as if no
authority were present".

Windows drive letters aren't compared without case (RFC 8089 Appendix
E.2, which isn't normative).

## Resolving

A result breaks the rules with an empty path, like `//h` against a
`file` base, or with userinfo or a port, like `//u@h/b` and `//h:1/b`.

## Rejected

- **No query**, as RFC 8089's ABNF has it, which this design had until
  2026-11-06. See above.
