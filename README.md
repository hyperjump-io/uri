# Hyperjump - URI

A small and fast library for validating, parsing, resolving, and
normalizing URIs ([RFC 3986](https://www.rfc-editor.org/rfc/rfc3986)) and
IRIs ([RFC 3987](https://www.rfc-editor.org/rfc/rfc3987)).

If you use version 1.x, see the
[1.x README](https://github.com/hyperjump-io/uri/tree/v1#readme). For what
changed in v2, see [Migrate from v1](website/migrate-from-v1.md).

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
