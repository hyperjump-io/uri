import { describe, expect, test } from "vitest";
import { normalizeIri, normalizeUri } from "./index.js";


const rootlessPathTests = [
  ["foo:a/b", "foo:a/b"], // No dot segments
  ["foo:./a", "foo:a"], // Leading dot segment
  ["foo:../a", "foo:a"], // Leading double dot segment
  ["foo:.", "foo:"], // Only a dot segment
  ["foo:..", "foo:"], // Only a double dot segment
  ["foo:a/./b", "foo:a/b"], // Dot segment
  ["foo:a/.", "foo:a/"], // Trailing dot segment
  ["foo:a/b/../c", "foo:a/c"], // Double dot segment
  ["foo:a/b/..", "foo:a/"], // Trailing double dot segment
  ["foo:a/../b", "foo:/b"], // Double dot segment above the first segment makes the path absolute
  ["foo:a/b/../../c", "foo:/c"], // Double dot segments above the first segment make the path absolute
  ["foo:a/..", "foo:/"], // Trailing double dot segment above the first segment
  ["foo:a/..//b", "foo:/.//b"], // Path starting with "//" isn't parsed as an authority
  ["foo:%2E/a", "foo:a"], // Encoded dot segment
  ["foo:a/%2E%2E/b", "foo:/b"], // Encoded double dot segment
  ["FOO:a/./b", "foo:a/b"], // Case normalization of scheme
  ["tag:example.com,2026:a/./b", "tag:example.com,2026:a/b"], // Colon in the first segment
  ["foo:a/./b?c/./d#e/../f", "foo:a/b?c/./d#e/../f"] // Dot segments in query and fragment are left alone
];

describe("normalizeUri", () => {
  test.each(rootlessPathTests)("normalizeUri(%s) => %s", (uri, expected) => {
    expect(normalizeUri(uri)).to.equal(expected);
  });
});

describe("normalizeIri", () => {
  test.each(rootlessPathTests)("normalizeIri(%s) => %s", (iri, expected) => {
    expect(normalizeIri(iri)).to.equal(expected);
  });
});
