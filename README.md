# Hyperjump - URI

A small and fast library for validating, parsing, resolving, and
normalizing URIs ([RFC 3986](https://www.rfc-editor.org/rfc/rfc3986)) and
IRIs ([RFC 3987](https://www.rfc-editor.org/rfc/rfc3987)).

**[Read the documentation at hyperjump.io](https://hyperjump.io/uri/)**

If you use version 1.x, see the
[1.x README](https://github.com/hyperjump-io/uri/tree/v1#readme). For what
changed in v2, see
[Migrate from v1](https://hyperjump.io/uri/migrate-from-v1/).

## Install

```bash
npm install @hyperjump/uri
```

## Documentation

- [Install](https://hyperjump.io/uri/install/)
- [Validate and parse](https://hyperjump.io/uri/validate-and-parse/)
- [Resolve references](https://hyperjump.io/uri/resolve-references/)
- [Normalize](https://hyperjump.io/uri/normalize/)
- [Schemes](https://hyperjump.io/uri/schemes/)
- [Convert URLs](https://hyperjump.io/uri/urls/)
- [Performance](https://hyperjump.io/uri/performance/)
- [Migrate from v1](https://hyperjump.io/uri/migrate-from-v1/)

The pages' source is in [`website/`](website/README.md).

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
