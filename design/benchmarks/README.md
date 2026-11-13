# Benchmarks

Measurements behind the performance decisions in
[the design docs](../README.md), one experiment per file, with the date it
was first recorded.

The benchmark code is in `benchmark/`, which isn't committed. It compares
`src/` here, uncommitted changes included, with the version that parsed
with capture groups (`benchmark/v2-groups.js`, from `e37b190`), and with
v1 (`benchmark/v1/`, from the `v1.4.0` tag). Run it with
`node benchmark/compare.js`, and don't run anything else while it runs.

- [Comparison with v1](v1-comparison.md) (2026-11-01)
- [Parsing strategies](parsing-strategies.md) (2026-11-01)
- [Other implementations](other-implementations.md) (2026-11-01)
- [Getters](getters.md) (2026-11-04)
- [Built-in schemes](built-in-schemes.md) (2026-11-06)
- [Future IP literals](future-ip-literals.md) (2026-11-06)
- [A-labels](a-labels.md) (2026-11-09)
- [IP-literal's shape](ip-literal-shape.md) (2026-11-10)
- [Fragment encoding](fragment-encoding.md) (2026-11-10)
- [The `data` scheme](data-scheme.md) (2026-11-13)

Measurements of designs that were replaced aren't kept: the predicates
that schemes had first, `defineScheme` and custom schemes, the prototype
of the compiler from ABNF, and RFC 5952's form for IPv6 literals. What
they found is with the decision it was for, in the components'
documents, and the documents are in git, as of `ba47aa6`.
