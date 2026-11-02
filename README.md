# Hyperjump - URI

A small and fast library for validating, parsing, resolving, and
normalizing URIs ([RFC 3986](https://www.rfc-editor.org/rfc/rfc3986)) and
IRIs ([RFC 3987](https://www.rfc-editor.org/rfc/rfc3987)).

**Status:** v2, in progress and unpublished. See
[the design docs](design/README.md) for the decisions made so far.

## Install

```bash
npm install @hyperjump/uri
```

## Documentation

The documentation is in [`website/`](website/README.md). Start with
[Validate and parse](website/validate-and-parse.md) and
[Resolve references](website/resolve-references.md).

## Contributing

### Tests

Run the tests

```bash
npm test
```

Run the tests with a continuous test runner

```bash
npm test -- --watch
```

Lint and type-check

```bash
npm run lint
npm run type-check
```

The design docs, principles, and style guide are in
[`design/`](design/README.md).
