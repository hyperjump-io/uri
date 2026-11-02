import { describe, expect, test } from "vitest";
import { encodeIriFragment, encodeUriFragment, isIri, isUri, normalizeIri, normalizeUri } from "./index.js";


const iriFragmentTests = [
  ["", ""],
  ["/$defs/foo", "/$defs/foo"],
  ["/a:b@c?d!$&'()*+,;=", "/a:b@c?d!$&'()*+,;="],
  ["/rosé", "/rosé"],
  ["/patternProperties/^v", "/patternProperties/%5Ev"],
  ["/[0-9]{2,}", "/%5B0-9%5D%7B2,%7D"],
  ["/foo\tbar", "/foo%09bar"],
  ["/foo\"bar", "/foo%22bar"],
  ["/\\p{L}", "/%5Cp%7BL%7D"],
  ["/a b", "/a%20b"],
  ["/a#b", "/a%23b"],
  ["/100%", "/100%25"],
  ["/%25", "/%2525"],
  ["/a<b>c|d`e", "/a%3Cb%3Ec%7Cd%60e"],
  ["/\u{E000}", "/%EE%80%80"] // Private use characters aren't allowed in a fragment
];

const uriFragmentTests = [
  ["/$defs/foo", "/$defs/foo"],
  ["/rosé", "/ros%C3%A9"],
  ["/patternProperties/^v", "/patternProperties/%5Ev"],
  ["/a#b", "/a%23b"],
  ["/😀", "/%F0%9F%98%80"]
];

describe("encodeIriFragment", () => {
  iriFragmentTests.forEach(([fragment, expected]) => {
    test(`encodeIriFragment('${fragment}') === '${expected}'`, () => {
      const subject = encodeIriFragment(fragment);
      expect(subject).to.equal(expected);
    });

    test(`encodeIriFragment('${fragment}') is a normalized IRI fragment`, () => {
      const iri = `https://example.com#${encodeIriFragment(fragment)}`;
      expect(isIri(iri)).to.equal(true);
      expect(normalizeIri(iri)).to.equal(iri);
    });
  });
});

describe("encodeUriFragment", () => {
  uriFragmentTests.forEach(([fragment, expected]) => {
    test(`encodeUriFragment('${fragment}') === '${expected}'`, () => {
      const subject = encodeUriFragment(fragment);
      expect(subject).to.equal(expected);
    });

    test(`encodeUriFragment('${fragment}') is a normalized URI fragment`, () => {
      const uri = `https://example.com#${encodeUriFragment(fragment)}`;
      expect(isUri(uri)).to.equal(true);
      expect(normalizeUri(uri)).to.equal(uri);
    });
  });
});
