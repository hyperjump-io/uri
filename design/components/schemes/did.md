# `did`

DID 1.1, a W3C Candidate Recommendation (5 March 2026). Its syntax is
the same as DID Core 1.0's (a Recommendation, 2022), so it's stable. The
rule name is `did-url`.

## Rules

"All DID URLs MUST conform to the DID URL Syntax ABNF Rules" (§3.2):

```
did                = "did:" method-name ":" method-specific-id
method-name        = 1*method-char
method-char        = %x61-7A / DIGIT
method-specific-id = *( *idchar ":" ) 1*idchar
idchar             = ALPHA / DIGIT / "." / "-" / "_" / pct-encoded
did-url            = did path-abempty [ "?" query ] [ "#" fragment ]
```

- **No authority.**
- **The path is `method-name ":" method-specific-id path-abempty`.** A
  method's name is lowercase, so `did:Example:a` is invalid, and a
  method-specific ID can't end with `:`.
- **ASCII, in an IRI too.** Every rule is ASCII, so the query and the
  fragment are RFC 3986's, like a URN's.

A method can restrict the syntax further (§7.1). No method is built in,
so each is unknown, like a URN namespace that isn't built in. DID 1.1
dropped 1.0's DID parameters, like `versionTime`, which were about
values in a query, not syntax.

## Normalization

The syntax-based normalization only. DID leaves normalization to each
method (§7.1). Since a DID is ASCII, `normalizeIri` leaves
percent-encoded Unicode characters encoded (see
[Normalizing](../normalizing.md#ascii-schemes)).

## Resolving

DID 1.1 §3.2.1 says relative DID URLs "MUST" be resolved with RFC 3986
§5, so a relative reference against a DID isn't special. Nearly every
one that isn't a fragment or a query breaks the rules: `b` against
`did:example:a` is `did:b`. A reference with its own scheme can break
them too, because removing its dot segments changes its path:
`did:ex:a/../../b` is `did:b`.

## Rejected

- **Leaving `did` out, because it isn't an RFC.** The reason to follow
  the RFCs is that someone who knows the specification can predict what
  happens (see [Follow the RFCs](../../principles/follow-the-rfcs.md)),
  and that holds for a W3C specification with ABNF too. It's in a use
  case, and leaving it out would mean the generic syntax only until 3.0.
- **`parseDid`.** No use case needs one, and a function can be added in
  a minor version.
