import { describe, expect, test } from "vitest";
import { defineScheme, resolveIri } from "./index.js";

// A scheme with no rules of its own, for the generic algorithm
const options = { customSchemes: [defineScheme({ name: "foo", rule: "foo" })] };

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
  ["urn:some:ip:prop", "urn:some:ip:prop", "urn:some:ip:prop"],
  ["http://[v7.future]/a", "urn:some:ip:prop", "urn:some:ip:prop"], // Base with a future IP literal isn't parsed
  ["urn:some:other:prop", "urn:some:ip:prop", "urn:some:ip:prop"],
  ["foo:a/b", "./x", "foo:a/x"], // Dot segment reference against a rootless path with segments
  ["foo:a/b", "../x", "foo:/x"], // Double dot segment reference against a rootless path
  ["foo:a/b/c", "../../x", "foo:/x"], // Double dot segments past the start of a rootless path
  ["foo:a/b", "..//x", "foo:/.//x"], // Double dot segment reference leaving a path starting with "//"
  ["foo:a", "foo:/b/..//c", "foo:/.//c"], // Reference with a scheme and dot segments leaving a path starting with "//"
  ["http://example.com/a/b", "%2E%2E/c", "http://example.com/a/%2E%2E/c"], // Encoded dot segments aren't decoded
  ["http://example.com/b", "#c%2fd", "http://example.com/b#c%2fd"], // Nothing is normalized
  ["HTTP://Example.com/a/b", "c", "HTTP://Example.com/a/c"], // Not even case
  ["http://a/b/c", "HTTP://A/./d", "HTTP://A/d"], // A reference with a scheme only has its dot segments removed
  ["http://a/b/c", "x:y", "x:y"], // A reference with a scheme isn't checked, even for a scheme that isn't known
  ["foo://", "x", "foo:///x"], // Empty authority and empty path
  ["http://a/b?q", "?r#s", "http://a/b?r#s"], // A query replaces the base's
  ["http://a/b", "?r", "http://a/b?r"] // A query when the base has none
];

describe("resolveIri", () => {
  resolveTests.forEach(([base, reference, expected]) => {
    test(`resolveIri('${reference}', '${base}') === '${expected}'`, () => {
      expect(resolveIri(trustedReference(reference), trustedBase(base), options)).to.equal(expected);
    });
  });
});

/** @import { AbsoluteIri, IriReference } from "./index.d.ts" */

// resolveIri trusts what it's given, so these are cast, like values a validator checked
/** @type (value: string) => IriReference */
const trustedReference = (value) => /** @type IriReference */ (value);
/** @type (value: string) => AbsoluteIri */
const trustedBase = (value) => /** @type AbsoluteIri */ (value);
