# Errors

Each error is its own class, so it can be told apart with `instanceof`
instead of by its message.

| Class | Extends | Properties | Thrown when |
| --- | --- | --- | --- |
| `InvalidUriError` | `Error` | `value`, `rule` | A value isn't the kind of URI a function needs |
| `InvalidIriError` | `Error` | `value`, `rule` | A value isn't the kind of IRI a function needs |
| `UnsupportedIpVersionError` | `Error` | `value`, `host` | A validator is given a future IP literal (see [Future IP versions](future-ip-versions.md)) |

`value` is the string that was given. `rule` is the RFC rule it doesn't
match: `"URI"`, `"URI-reference"`, or `"absolute-URI"`, or their IRI
forms. When a function takes two identifiers, like `resolveUri`, the rule
says which one was wrong: the reference is a `URI-reference` and the base
is an `absolute-URI`.

The messages are v1's:

```text
InvalidUriError: Invalid absolute-URI: /foo
UnsupportedIpVersionError: Unsupported IP version in host: v7.future
```

The constructors are private in the declarations, so throwing them isn't
part of the API (see [Types](types.md)).

## Rejected

- **`Error` only**, as in v1. Callers could only tell errors apart by
  their messages.
- **One class per rule**, like `InvalidAbsoluteUriError`. Six classes for
  what `rule` says in one property.
- **One `InvalidIdentifierError` for URIs and IRIs.** A caller of the IRI
  functions would have to check `rule` to know an IRI was meant, and the
  type of `rule` couldn't be narrowed by `instanceof`.
- **Changing the messages**, like quoting the value as `json-pointer`
  v2 does. Nothing was wrong with them, and keeping them means code that
  matches them keeps working.
