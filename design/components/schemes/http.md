# `http` and `https`

RFC 9110. The rule name is `http-URI`, or `https-URI`.

## Rules

- **A host that isn't empty.** A sender "MUST NOT generate" an `http` URI
  "with an empty host identifier. A recipient that processes such a URI
  reference MUST reject it as invalid." (RFC 9110 §4.2.1, and §4.2.2 for
  `https`.) So `http:///a` and `http:/a` are invalid.
- **A label of the host that starts with `xn--` is an A-label.** This
  isn't a MUST of RFC 9110. It's checked because `normalizeIri` converts
  A-labels to Unicode, and a label that isn't one has no Unicode form
  (see [Domain names](../domain-names.md)).

Nothing else about the host is checked, so `http://my_host/` is valid.

A SHOULD isn't a rule. RFC 9110 says a recipient should treat `userinfo`
in an `http` URI as an error, which is a policy that differs by caller.

## Normalization

After the syntax-based normalization (RFC 9110 §4.2.3, RFC 3986 §6.2.3):

- The default port, `80` or `443`, and an empty port are removed.
- An empty path is `/`.
- `normalizeIri` converts an A-label to Unicode, like `xn--caf-dma` to
  `café` (RFC 3987 §5.3.3, see
  [Domain names](../domain-names.md#converting)). `normalizeUri` doesn't.

## Resolving

A result breaks the rules only with an empty host, like `//` against any
`http` base, or a host with a label that starts with `xn--` and isn't an
A-label. The rules are only on the authority and the host, so a
reference without an authority, which has the base's, isn't checked (see
[Resolving](../resolving.md#checking-the-result)).

## Not built in

`ws` and `wss` aren't built in (see
[Schemes](../schemes.md#built-in-schemes)), so their hosts aren't checked
or converted.
