# Performance

`@hyperjump/uri` is faster than other JavaScript libraries for RFC 3986
and RFC 3987. Measured against three of them, it validates about twice
as fast as the fastest one, and it parses, normalizes, and resolves 5 to
9 times as fast.

It's fast because each function does one job. The validation functions
check an identifier, and the other functions trust what you give them,
so the package never checks an identifier twice. Trusting its input also
lets a function skip work that a library that checks every argument
can't. This page shows how to get the most from that, and what costs
more than usual.

## Check once

Checking an identifier costs more than anything you do with it
afterward. Validating an IRI takes about three times as long as parsing
it.

Check each identifier one time, where it comes into your code, like when
you read a JSON document. After that, pass it to as many functions as
you need. TypeScript keeps track of which strings you checked. For more
information, see [Check once](validate-and-parse.md#check-once).

```typescript
const load = (id: string, references: string[]) => {
  assertAbsoluteIri(id);

  return references.map((reference) => {
    assertIriReference(reference);
    return resolveIri(reference, id);
  });
};
```

The example checks `id` one time, and then resolves every reference
against it without checking it again.

## Get one component

If you need one component, use `getScheme`, `getPath`, `getQuery`, or
`getFragment` instead of `parseIri`. They find that component without
building the others:

| Function | Time, compared with `parseIri` |
| --- | --- |
| `getScheme` | 15% |
| `getFragment` | 18% |
| `getQuery` | 27% |
| `getPath` | 61% |

`toAbsoluteIri` takes about as long as `getFragment`. For more
information, see
[Get one component](validate-and-parse.md#get-one-component).

## Normalize what you compare

`resolveIri`, `toRelativeIri`, and `toAbsoluteIri` don't normalize, so
you only pay for normalizing when you need it. Normalize the identifiers
that you compare or use as keys, and leave the others unchanged.

`toRelativeIri` takes a normalized base. If you find many references
from the same base, normalize the base one time:

```typescript
const relativeTo = (base: AbsoluteIri) => {
  const normalizedBase = normalizeIri(base);
  return (target: Iri) => {
    return toRelativeIri(normalizeIri(target), normalizedBase);
  };
};
```

## What costs more

Two kinds of identifier take longer than others:

- **Internationalized domain names in ASCII.** In an `http` or `https`
  identifier, the package checks each part of the host that starts with
  `xn--` with the `URL` class. Validating one of these takes about nine
  times as long as validating another `https` identifier, and longer
  than a library that doesn't check these hosts. A host in Unicode, like
  `café.example`, doesn't cost more. For more information,
  see [Domain names](schemes.md#domain-names).
- **Long `data` URLs.** Validating a `data` URL reads all the data, so
  the time grows with its length. 100 KB takes about 160 microseconds.
  Normalizing one doesn't read the data.
