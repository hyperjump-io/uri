# Benchmarks

Measurements behind the performance decisions in
[the design docs](../README.md), one experiment per file, with the date it
was first recorded.

The benchmark code is in `benchmark/`, which isn't committed. It compares
`src/` here, uncommitted changes included, with v1 as installed in the
`json-schema` checkout next to this repo
(`../json-schema/node_modules/@hyperjump/uri`). Run it with
`node benchmark/compare.js`, and don't run anything else while it runs.

- [Comparison with v1](v1-comparison.md) (2026-11-01)
