# Benchmarks

Measurements behind the performance decisions in
[the design docs](../README.md), one experiment per file, with the date it
was first recorded.

The benchmark code is in `benchmark/`, which isn't committed. It compares
`src/` here, uncommitted changes included, with the version that parsed
with capture groups (`benchmark/v2-groups.js`, from `e37b190`), and with
v1 as installed in the `json-schema` checkout next to this repo
(`../json-schema/node_modules/@hyperjump/uri`). Run it with
`node benchmark/compare.js`, and don't run anything else while it runs.

- [Comparison with v1](v1-comparison.md) (2026-11-01)
- [Parsing strategies](parsing-strategies.md) (2026-11-01)
- [Other implementations](other-implementations.md) (2026-11-01)
- [IPv6 canonical form](ipv6-canonical-form.md) (2026-11-02)
