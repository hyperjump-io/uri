# Fragment encoding

First recorded 2026-11-10, on Node.js 22.22.1, when `encodeUriFragment`
and `encodeIriFragment` started encoding with one `replace` and a table
for ASCII (see
[Normalizing](../components/normalizing.md#encoding-fragments)). The
snapshot from before is `benchmark/v2-before-encoder/`, from `9a09275`.

`benchmark/bench-encoder.js` encodes every JSON Pointer in a schema with
`encodeIriFragment`, in a fresh process. The schema is
jsonschema-benchmark's `ui5-manifest`, which has 8,767 pointers, and 481
of them need encoding, all of them under `patternProperties`. The pattern
pointer is
`/definitions/component_pages_def/patternProperties/^[a-zA-Z0-9_\.\-]+[\|]?[a-zA-Z0-9_\.\-]+$`,
and the plain one is `/definitions/component_pages_def/properties/title`.
The median of 3 runs:

| | Before | One `replace` and the table | Each character and the table |
| --- | --- | --- | --- |
| First pass over every pointer, milliseconds | 6.6 | 1.9 | 2.9 |
| A pass after warming up, milliseconds | 3.6 | 1.5 | 2.2 |
| The pattern pointer, microseconds | 16.3 | 0.84 | 1.8 |
| The plain pointer, nanoseconds | 104 | 104 | 103 |

Most of the time before was `TextEncoder`: each regular expression test
took under 0.2 microseconds, and the pattern pointer has 14 characters to
encode. The first use of the new pattern took 0.1 milliseconds, the same
as before.

In jsonschema-benchmark's harness, compiling `ui5-manifest` was 4.8 and
11.2 milliseconds faster, in two A/B runs of 15 fresh processes each,
alternating, of about 90 milliseconds. Schemas with no pointers to encode
didn't change beyond noise.

`benchmark/differential-encoder.js` compares both functions with the
snapshot's on 200,000 random strings for each of three seeds, built from
every ASCII character, the edges of `ucschar`'s and `iprivate`'s ranges,
other non-ASCII characters, and lone surrogates. There were no
differences in 1.2 million checks.
