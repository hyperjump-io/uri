import { describe, expect, test } from "vitest";
import {
  InvalidIriError, InvalidUriError,
  assertAbsoluteIri, assertAbsoluteUri, assertIri, assertIriReference, assertUri, assertUriReference
} from "./index.js";

describe("InvalidUriError", () => {
  const error = thrown(() => assertUri("foo"));

  test("is an Error", () => {
    expect(error).to.be.instanceOf(InvalidUriError);
    expect(error).to.be.instanceOf(Error);
    expect(error).to.include({ name: "InvalidUriError" });
  });

  test("has the value and the rule it doesn't match", () => {
    expect(error).to.include({ value: "foo", rule: "URI" });
  });

  test("has v1's message, then what's wrong", () => {
    expect(error).to.include({ message: "Invalid URI: foo — a URI has to have a scheme" });
  });

  test("is thrown with the same answers as the validator", () => {
    expect(thrown(() => assertUri("http://examplé.org/rosé#"))).to.include({ rule: "URI" });
    expect(thrown(() => assertUriReference("/rosé#"))).to.include({ rule: "URI-reference" });
    expect(thrown(() => assertAbsoluteUri("https://example.com/foo?bar#baz"))).to.include({ rule: "absolute-URI" });
  });

  test("isn't thrown for a valid value", () => {
    expect(assertUri("https://example.com/a#b")).to.equal(undefined);
    expect(assertUriReference("../a")).to.equal(undefined);
    expect(assertAbsoluteUri("https://example.com/a")).to.equal(undefined);
  });
});

describe("InvalidIriError", () => {
  test("has the value and the rule it doesn't match", () => {
    const error = thrown(() => assertAbsoluteIri("https://example.com#foo"));
    expect(error).to.be.instanceOf(InvalidIriError);
    expect(error).to.include({ value: "https://example.com#foo", rule: "absolute-IRI" });
  });

  test("is thrown with the same answers as the validator", () => {
    expect(thrown(() => assertIri("//examplé.com/rosé?fóo#bár"))).to.include({ rule: "IRI" });
    expect(thrown(() => assertIriReference("1:rosé"))).to.include({ rule: "IRI-reference" });
    expect(thrown(() => assertAbsoluteIri("examplé://examplé.org/rosé"))).to.include({ rule: "absolute-IRI" });
  });
});

describe("What's wrong and where", () => {
  test.each([
    ["a character a component doesn't allow", () => assertIri("http://exa mple.com"), {
      reason: "invalid-character", component: "host", start: 10, end: 11,
      message: `Invalid IRI: http://exa mple.com — " " isn't allowed in a host, at 10`
    }],
    ["a character in userinfo", () => assertUri("http://a b@example.com"), {
      reason: "invalid-character", component: "userinfo", start: 8, end: 9
    }],
    ["a second \"@\", which is in the host", () => assertUri("http://a@b@c/"), {
      reason: "invalid-character", component: "host", start: 10, end: 11
    }],
    ["a character in a port", () => assertUri("http://a:8x/"), {
      reason: "invalid-character", component: "port", start: 10, end: 11,
      message: `Invalid URI: http://a:8x/ — "x" isn't allowed in a port, at 10`
    }],
    ["a character in a query", () => assertUri("http://a?b c"), {
      reason: "invalid-character", component: "query", start: 10, end: 11
    }],
    ["a character in a fragment", () => assertUri("http://a#b#c"), {
      reason: "invalid-character", component: "fragment", start: 10, end: 11
    }],
    ["a character in a scheme", () => assertUri("a b:c"), {
      reason: "invalid-character", component: "scheme", start: 1, end: 2
    }],
    ["a scheme that doesn't start with a letter", () => assertUri("1a:b"), {
      reason: "invalid-character", component: "scheme", start: 0, end: 1,
      message: "Invalid URI: 1a:b — a scheme has to start with a letter, at 0"
    }],
    ["a character that can't be seen, as its code point", () => assertIri("http://a/\u0007"), {
      reason: "invalid-character", component: "path", start: 9, end: 10,
      message: "Invalid IRI: http://a/\u0007 — U+0007 isn't allowed in a path, at 9"
    }],
    ["a character outside the BMP, as both of its UTF-16 code units", () => assertIri("http://a/\u{F0000}"), {
      reason: "invalid-character", component: "path", start: 9, end: 11
    }],
    ["a character only an IRI allows, with a hint", () => assertUri("http://a/é"), {
      reason: "invalid-character", component: "path", start: 9, end: 10,
      message: `Invalid URI: http://a/é — "é" isn't allowed in a URI, at 9; percent-encode it or use the IRI functions`
    }],
    ["a private-use character in a query, with a hint", () => assertUri("http://a?\u{E000}"), {
      reason: "invalid-character", component: "query", start: 9, end: 10,
      message: "Invalid URI: http://a?\u{E000} — U+E000 isn't allowed in a URI, at 9; percent-encode it or use the IRI functions"
    }],
    ["a \"%\" without two hex digits", () => assertUri("http://a/%zz"), {
      reason: "invalid-percent-encoding", component: "path", start: 9, end: 12,
      message: `Invalid URI: http://a/%zz — "%" must be followed by two hex digits, at 9`
    }],
    ["a \"%\" at the end", () => assertUri("http://a/%4"), {
      reason: "invalid-percent-encoding", component: "path", start: 9, end: 11
    }],
    ["a \"%\" in a scheme, which can't be percent-encoded", () => assertUri("a%41:b"), {
      reason: "invalid-character", component: "scheme", start: 1, end: 2
    }],
    ["an IP literal, with its brackets", () => assertUri("http://[::g]/"), {
      reason: "invalid-ip-literal", component: "host", start: 7, end: 12,
      message: `Invalid URI: http://[::g]/ — "[::g]" isn't a valid IP literal, at 7`
    }],
    ["an IP literal without its \"]\"", () => assertUri("http://[::1"), {
      reason: "invalid-ip-literal", component: "host", start: 7, end: 11
    }],
    ["an IP literal followed by something other than a port", () => assertUri("http://[::1]x:80/"), {
      reason: "invalid-ip-literal", component: "host", start: 7, end: 13
    }],
    ["a missing scheme", () => assertUri("/a"), {
      reason: "missing-scheme", component: "scheme", start: 0, end: 0,
      message: "Invalid URI: /a — a URI has to have a scheme"
    }],
    ["a missing scheme in an IRI", () => assertIri("/a"), {
      reason: "missing-scheme", component: "scheme", start: 0, end: 0,
      message: "Invalid IRI: /a — an IRI has to have a scheme"
    }],
    ["an empty scheme", () => assertAbsoluteUri(":a"), {
      reason: "missing-scheme", component: "scheme", start: 0, end: 0,
      message: "Invalid absolute-URI: :a — an absolute-URI has to have a scheme"
    }],
    ["a fragment in an absolute-URI, before anything else", () => assertAbsoluteUri("http://a b/#c"), {
      reason: "fragment-not-allowed", component: "fragment", start: 11, end: 13,
      message: "Invalid absolute-URI: http://a b/#c — an absolute-URI can't have a fragment"
    }],
    ["both readings of a reference with a scheme that isn't one", () => assertUriReference("1a:b/c"), {
      reason: "colon-in-first-segment", component: "path", start: 0, end: 4,
      message: `Invalid URI-reference: 1a:b/c — "1a" isn't a scheme, which has to start with a letter, and a relative path can't have ":" in its first segment unless it starts with "./"`
    }],
    ["both readings, with the character the scheme can't have", () => assertIriReference("a_b:c"), {
      reason: "colon-in-first-segment", component: "path", start: 0, end: 5,
      message: `Invalid IRI-reference: a_b:c — "a_b" isn't a scheme, which can't have "_", and a relative path can't have ":" in its first segment unless it starts with "./"`
    }],
    ["only the path reading, when there's nothing before the \":\"", () => assertUriReference(":a/b"), {
      reason: "colon-in-first-segment", component: "path", start: 0, end: 2,
      message: `Invalid URI-reference: :a/b — a relative path can't have ":" in its first segment unless it starts with "./", at 0`
    }],
    ["the scheme reading, when the path reading is wrong too", () => assertUriReference("a b:c"), {
      reason: "invalid-character", component: "scheme", start: 1, end: 2
    }],
    ["the scheme reading, for a rule that needs a scheme", () => assertUri("a_b:c"), {
      reason: "invalid-character", component: "scheme", start: 1, end: 2
    }]
  ])("%s", (_description, fn, expected) => {
    expect(thrown(fn)).to.include(expected);
  });
});

/** @type (fn: () => unknown) => unknown */
const thrown = (fn) => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw Error("Expected an error");
};
