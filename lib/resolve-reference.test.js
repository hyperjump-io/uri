import { describe, expect, test } from "vitest";
import { resolveIri } from "./index.js";


const resolveTests = [
  ["http://a/b/c/d;p?q", "g:h", "g:h"],
  ["http://a/b/c/d;p?q", "g:h", "g:h"],
  ["http://a/b/c/d;p?q", "g", "http://a/b/c/g"],
  ["http://a/b/c/d;p?q", "./g", "http://a/b/c/g"],
  ["http://a/b/c/d;p?q", "g/", "http://a/b/c/g/"],
  ["http://a/b/c/d;p?q", "/g", "http://a/g"],
  ["http://a/b/c/d;p?q", "//g", "http://g"],
  ["http://a/b/c/d;p?q", "?y", "http://a/b/c/d;p?y"],
  ["http://a/b/c/d;p?q", "g?y", "http://a/b/c/g?y"],
  ["http://a/b/c/d;p?q", "#s", "http://a/b/c/d;p?q#s"],
  ["http://a/b/c/d;p?q", "g#s", "http://a/b/c/g#s"],
  ["http://a/b/c/d;p?q", "g?y#s", "http://a/b/c/g?y#s"],
  ["http://a/b/c/d;p?q", ";x", "http://a/b/c/;x"],
  ["http://a/b/c/d;p?q", "g;x", "http://a/b/c/g;x"],
  ["http://a/b/c/d;p?q", "g;x?y#s", "http://a/b/c/g;x?y#s"],
  ["http://a/b/c/d;p?q", "", "http://a/b/c/d;p?q"],
  ["http://a/b/c/d;p?q", ".", "http://a/b/c/"],
  ["http://a/b/c/d;p?q", "./", "http://a/b/c/"],
  ["http://a/b/c/d;p?q", "..", "http://a/b/"],
  ["http://a/b/c/d;p?q", "../", "http://a/b/"],
  ["http://a/b/c/d;p?q", "../g", "http://a/b/g"],
  ["http://a/b/c/d;p?q", "../..", "http://a/"],
  ["http://a/b/c/d;p?q", "../../", "http://a/"],
  ["http://a/b/c/d;p?q", "../../g", "http://a/g"],
  ["http://a/b/c/d;p?q", "../../../g", "http://a/g"],
  ["http://a/b/c/d;p?q", "../../../../g", "http://a/g"],
  ["http://a/b/c/d;p?q", "/./g", "http://a/g"],
  ["http://a/b/c/d;p?q", "/../g", "http://a/g"],
  ["http://a/b/c/d;p?q", "g.", "http://a/b/c/g."],
  ["http://a/b/c/d;p?q", ".g", "http://a/b/c/.g"],
  ["http://a/b/c/d;p?q", "g..", "http://a/b/c/g.."],
  ["http://a/b/c/d;p?q", "..g", "http://a/b/c/..g"],
  ["http://a/b/c/d;p?q", "./../g", "http://a/b/g"],
  ["http://a/b/c/d;p?q", "./g/.", "http://a/b/c/g/"],
  ["http://a/b/c/d;p?q", "g/./h", "http://a/b/c/g/h"],
  ["http://a/b/c/d;p?q", "g/../h", "http://a/b/c/h"],
  ["http://a/b/c/d;p?q", "g;x=1/./y", "http://a/b/c/g;x=1/y"],
  ["http://a/b/c/d;p?q", "g;x=1/../y", "http://a/b/c/y"],
  ["http://a/b/c/d;p?q", "g?y/./x", "http://a/b/c/g?y/./x"],
  ["http://a/b/c/d;p?q", "g?y/../x", "http://a/b/c/g?y/../x"],
  ["http://a/b/c/d;p?q", "g#s/./x", "http://a/b/c/g#s/./x"],
  ["http://a/b/c/d;p?q", "g#s/../x", "http://a/b/c/g#s/../x"],
  ["http://a/b/c/d;p?q", "http:g", "http:g"],
  ["", "urn:some:ip:prop", "urn:some:ip:prop"],
  ["#", "urn:some:ip:prop", "urn:some:ip:prop"],
  ["urn:some:ip:prop", "urn:some:ip:prop", "urn:some:ip:prop"],
  ["urn:some:other:prop", "urn:some:ip:prop", "urn:some:ip:prop"],
  ["http://example.com/b%2Ec/d/e", "", "http://example.com/b.c/d/e"], // Unnecessary encoding segment
  ["http://example.com/a/%2E/b", "", "http://example.com/a/b"], // Encoded dot segment
  ["http://example.com/a/%2e%2E/b", "", "http://example.com/b"], // Encoded double dot segment
  ["http://example.com/a/b", "%2E%2E/c", "http://example.com/c"], // Encoded double dot segment in reference
  ["http://example.com/b%2Fc/d/e", "", "http://example.com/b%2Fc/d/e"], // Necessary encoding segment
  ["http://example.com/b%2fc/d/e", "", "http://example.com/b%2Fc/d/e"], // Case normalization of encoding segment
  ["http://example.com/b?c%2Fd%3Fe", "", "http://example.com/b?c/d?e"], // Unnecessary encoding query
  ["http://example.com/b", "#c%2Fd%3Fe", "http://example.com/b#c/d?e"], // Unnecessary encoding fragment
  ["http://example.com/caf%C3%A9", "", "http://example.com/café"], // Two octet UTF-8 encoding
  ["http://example.com/caf%c3%a9", "", "http://example.com/café"], // Lowercase UTF-8 encoding
  ["http://example.com/%E2%82%AC", "", "http://example.com/€"], // Three octet UTF-8 encoding
  ["http://example.com/%F0%9F%98%80", "", "http://example.com/😀"], // Four octet UTF-8 encoding
  ["http://example.com/%41%C3%A9%2F", "", "http://example.com/Aé%2F"], // Mixed encodings in one sequence
  ["http://example.com/b?caf%C3%A9", "", "http://example.com/b?café"], // UTF-8 encoding in query
  ["http://example.com/b", "#caf%C3%A9", "http://example.com/b#café"], // UTF-8 encoding in fragment
  ["http://example.com/caf%e9", "", "http://example.com/caf%E9"], // Not UTF-8 (Latin-1 é)
  ["http://example.com/%C3x", "", "http://example.com/%C3x"], // Truncated UTF-8 sequence
  ["http://example.com/%A9%C3%A9", "", "http://example.com/%A9é"], // Stray continuation octet
  ["http://example.com/%C0%AF", "", "http://example.com/%C0%AF"], // Overlong UTF-8 encoding
  ["http://example.com/%ED%A0%80", "", "http://example.com/%ED%A0%80"], // UTF-8 encoded surrogate
  ["http://example.com/%ef%bf%bf", "", "http://example.com/%EF%BF%BF"], // Noncharacter isn't allowed unencoded
  ["Https://JDesrosiers@Example.com", "", "https://JDesrosiers@example.com"] // Case normalization of authority
];

describe("resolveReference", () => {
  resolveTests.forEach(([baseIri, iriReference, expected]) => {
    test(`resolveReference('${iriReference}', '${baseIri}') === '${expected}'`, () => {
      const subject = resolveIri(iriReference, baseIri);
      expect(subject).to.equal(expected);
    });
  });
});
