import { describe, expect, test } from "vitest";
import { normalizeIri, normalizeUri } from "./index.js";

/** @import { Uri } from "./index.d.ts" */

// A scheme with no normalization of its own, for the syntax-based normalization
const options = { customSchemes: [{ name: "foo", rule: "foo" }] };

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
  ["foo:example.com,2026:a/./b", "foo:example.com,2026:a/b"], // Colon in the first segment
  ["foo:a/./b?c/./d#e/../f", "foo:a/b?c/./d#e/../f"] // Dot segments in query and fragment are left alone
];

// Percent-encoding and case, which are the same for any scheme, so these use http
const syntaxTests = [
  ["http://example.com/a/..//b", "http://example.com//b"], // Path starting with "//" is fine with an authority
  ["http://example.com/b%2Ec/d/e", "http://example.com/b.c/d/e"], // Unnecessary encoding segment
  ["http://example.com/a/%2E/b", "http://example.com/a/b"], // Encoded dot segment
  ["http://example.com/a/%2e%2E/b", "http://example.com/b"], // Encoded double dot segment
  ["http://example.com/a/%2E%2E/c", "http://example.com/c"], // Encoded double dot segment after resolving
  ["http://example.com/b%2Fc/d/e", "http://example.com/b%2Fc/d/e"], // Necessary encoding segment
  ["http://example.com/b%2fc/d/e", "http://example.com/b%2Fc/d/e"], // Case normalization of encoding segment
  ["http://example.com/b?c%2Fd%3Fe", "http://example.com/b?c/d?e"], // Unnecessary encoding query
  ["http://example.com/b#c%2Fd%3Fe", "http://example.com/b#c/d?e"], // Unnecessary encoding fragment
  ["http://example.com/caf%e9", "http://example.com/caf%E9"], // Not UTF-8 (Latin-1 é)
  ["http://example.com/%C3x", "http://example.com/%C3x"], // Truncated UTF-8 sequence
  ["http://example.com/%C0%AF", "http://example.com/%C0%AF"], // Overlong UTF-8 encoding
  ["http://example.com/%ED%A0%80", "http://example.com/%ED%A0%80"], // UTF-8 encoded surrogate
  ["http://example.com/%ef%bf%bf", "http://example.com/%EF%BF%BF"], // Noncharacter isn't allowed unencoded
  ["Https://JDesrosiers@Example.com/", "https://JDesrosiers@example.com/"] // Case normalization of authority
];

// Decoding percent-encoded Unicode, which only an IRI allows
const iriSyntaxTests = [
  ["http://example.com/caf%C3%A9", "http://example.com/café"], // Two octet UTF-8 encoding
  ["http://example.com/caf%c3%a9", "http://example.com/café"], // Lowercase UTF-8 encoding
  ["http://example.com/%E2%82%AC", "http://example.com/€"], // Three octet UTF-8 encoding
  ["http://example.com/%F0%9F%98%80", "http://example.com/😀"], // Four octet UTF-8 encoding
  ["http://example.com/%41%C3%A9%2F", "http://example.com/Aé%2F"], // Mixed encodings in one sequence
  ["http://example.com/b?caf%C3%A9", "http://example.com/b?café"], // UTF-8 encoding in query
  ["http://example.com/b#caf%C3%A9", "http://example.com/b#café"], // UTF-8 encoding in fragment
  ["http://example.com/%A9%C3%A9", "http://example.com/%A9é"] // Stray continuation octet
];

describe("normalizeUri", () => {
  test.each(syntaxTests)("normalizeUri(%s) => %s", (uri, expected) => {
    expect(normalizeUri(trusted(uri))).to.equal(expected);
  });

  test.each([
    ["http://example.com/caf%c3%a9", "http://example.com/caf%C3%A9"],
    ["http://example.com/%41%C3%A9%2F", "http://example.com/A%C3%A9%2F"],
    ["http://example.com/b?caf%C3%A9", "http://example.com/b?caf%C3%A9"]
  ])("normalizeUri(%s) leaves Unicode encoded", (uri, expected) => {
    expect(normalizeUri(trusted(uri))).to.equal(expected);
  });
});

describe("normalizeIri", () => {
  test.each([...syntaxTests, ...iriSyntaxTests])("normalizeIri(%s) => %s", (iri, expected) => {
    expect(normalizeIri(trusted(iri))).to.equal(expected);
  });
});

describe("normalizeUri", () => {
  test.each(rootlessPathTests)("normalizeUri(%s) => %s", (uri, expected) => {
    expect(normalizeUri(trusted(uri), options)).to.equal(expected);
  });
});

describe("normalizeIri", () => {
  test.each(rootlessPathTests)("normalizeIri(%s) => %s", (iri, expected) => {
    expect(normalizeIri(trusted(iri), options)).to.equal(expected);
  });
});

// normalize* trusts what it's given, so these are cast, like a value a validator checked
/** @type (value: string) => Uri */
const trusted = (value) => /** @type Uri */ (value);
