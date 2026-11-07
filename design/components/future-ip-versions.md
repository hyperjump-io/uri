# Future IP versions

RFC 3986 §3.2.2 reserves `IPvFuture`, a syntax for IP literals of versions
after IPv6: `[v` + a hex version + `.` + an address, like `[v7.future]`.
It defines what one looks like, but no versions or addresses.

A future IP literal is a host like any other. The validators check its
syntax and accept it, so `isIri("http://[v7.future]/")` is `true`, and
parsing, resolving, and normalizing treat it as an ordinary host.
Normalizing makes it lowercase, like any host. A built-in scheme's rules
for a host, like `http`'s non-empty host, accept it too.

This was decided on 2026-11-06, reversing the design before it, where a
validator threw `UnsupportedIpVersionError`. Whether an address is valid
for a version that doesn't exist can't be known, so the answer was "I
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
  message, `Unsupported IP version in host: v7.future`, which this design
  had until 2026-11-06. See above.
- **Returning `false`.** It isn't known to be invalid. `false` would tell
  a caller to reject an identifier that might be fine, and the generic
  syntax allows it.
- **`allowUnknownIpLiteral`**, an option for validators to accept one. No
  function takes options, and accepting one is the default now.
