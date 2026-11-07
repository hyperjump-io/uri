# Principles

The rules that decisions are made by. Each one says what it is, why, and
where it shows up.

- [Follow the RFCs](follow-the-rfcs.md)
- [Pay only for what you ask for](pay-only-for-what-you-ask-for.md)

## Rejected

- **Answer only what's known**, retired on 2026-11-06: when a question
  can't be answered from what the specifications define, the answer is
  "I don't know", which is an error, not `true` or `false`. It decided
  two things, and both were reversed:
  - An identifier with a scheme that isn't built in threw
    `UnknownSchemeError`, and a caller defined the scheme. It gets the
    generic syntax only now, because passing schemes to every call,
    through every layer of every dependent, was a burden that was easy
    to get wrong (see
    [Schemes](../components/schemes.md#unknown-schemes)).
  - An IP literal of a future version threw `UnsupportedIpVersionError`.
    It's a host like any other now, for consistency with unknown schemes
    (see [Future IP versions](../components/future-ip-versions.md)).

  What's left is what the library does: check the syntax it knows, which
  is the generic syntax and the rules of the built-in schemes, and
  nothing more.
