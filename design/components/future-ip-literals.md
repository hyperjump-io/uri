# Future IP literals

RFC 3986 §3.2.2 reserves `IPvFuture`, a syntax for IP literals in
formats that don't exist yet: `[v` + a version in hex + `.` + one or
more of `unreserved`, `sub-delims`, and `:`, like `[v1.fe80::a+en1]`.
The version is the literal format's: "The version flag does not indicate
the IP version; rather, it indicates future versions of the literal
format." No format is defined, so the rule is only the bounds any future
one has to stay within.

A future IP literal is a host like any other. The validators check that
it's within those bounds and accept it, so
`isIri("http://[v1.fe80::a+en1]/")` is `true`, and
parsing, resolving, and normalizing treat it as an ordinary host.
Normalizing makes it lowercase, like any host. A built-in scheme's rules
for a host, like `http`'s non-empty host, accept it too.

This was decided on 2026-11-06, reversing the design before it, where a
validator threw `UnsupportedIpVersionError`. Whether a literal is valid
in a format that doesn't exist can't be known, so the answer was "I
don't know". But an identifier with a scheme that isn't built in gets the
generic syntax only (see [Schemes](schemes.md#unknown-schemes)), which is
the same kind of answer: the syntax is checked, and what the syntax
can't say isn't. Throwing for one and not the other was inconsistent.

Without the error, `is*` for a value with a built-in scheme is only its
scheme's pattern, and isn't looked at again when it fails. `isIri` of an
invalid value takes a fifth of the time (see
[Future IP literals](../benchmarks/future-ip-literals.md)).

## Rejected

- **`UnsupportedIpVersionError`**, with `value` and `host`, and v1's
  message, `Unsupported IP version in host: v1.fe80::a+en1`, which this
  design had until 2026-11-06. See above. The name was wrong too: the
  version is the literal format's, not IP's.
- **Returning `false`.** It isn't known to be invalid. `false` would tell
  a caller to reject an identifier that might be fine, and the generic
  syntax allows it.
- **`allowUnknownIpLiteral`**, an option for validators to accept one. No
  function takes options, and accepting one is the default now.
