import { describe, expect, test } from "vitest";
import {
  InvalidIriError, InvalidUriError, UnsupportedIpVersionError,
  isIri, isUri, parseAbsoluteIri, parseAbsoluteUri, parseIri, parseIriReference, parseUri, parseUriReference, resolveUri,
  toRelativeIri
} from "./index.js";

describe("InvalidUriError", () => {
  const error = thrown(() => parseUri("foo"));

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

  test("names the rule for each argument", () => {
    expect(thrown(() => resolveUri("http://[", "http://example.com"))).to.include({ rule: "URI-reference" });
    expect(thrown(() => resolveUri("foo", "/bar"))).to.include({ rule: "absolute-URI" });
  });

  test("checks the base even when the reference has a scheme", () => {
    expect(thrown(() => resolveUri("http://example.com", "/bar"))).to.include({ rule: "absolute-URI" });
    expect(thrown(() => resolveUri("http://example.com", "http://example.com#foo"))).to.include({ rule: "absolute-URI" });
  });

  test("doesn't allow an empty base", () => {
    expect(thrown(() => resolveUri("http://example.com", ""))).to.include({ rule: "absolute-URI" });
    expect(thrown(() => resolveUri("foo", ""))).to.include({ rule: "absolute-URI" });
  });
});

describe("InvalidIriError", () => {
  test("has the value and the rule it doesn't match", () => {
    const error = thrown(() => parseAbsoluteIri("https://example.com#foo"));
    expect(error).to.be.instanceOf(InvalidIriError);
    expect(error).to.include({ value: "https://example.com#foo", rule: "absolute-IRI" });
  });

  test("names the rule for each argument", () => {
    expect(thrown(() => toRelativeIri("foo", "https://example.com"))).to.include({ rule: "IRI" });
    expect(thrown(() => toRelativeIri("https://example.com", "#foo"))).to.include({ rule: "absolute-IRI" });
  });
});

describe("What's wrong and where", () => {
  test.each([
    ["a character a component doesn't allow", () => parseIri("http://exa mple.com"), {
      reason: "invalid-character", component: "host", start: 10, end: 11,
      message: `Invalid IRI: http://exa mple.com — " " isn't allowed in a host, at 10`
    }],
    ["a character in userinfo", () => parseUri("http://a b@example.com"), {
      reason: "invalid-character", component: "userinfo", start: 8, end: 9
    }],
    ["a second \"@\", which is in the host", () => parseUri("http://a@b@c/"), {
      reason: "invalid-character", component: "host", start: 10, end: 11
    }],
    ["a character in a port", () => parseUri("http://a:8x/"), {
      reason: "invalid-character", component: "port", start: 10, end: 11,
      message: `Invalid URI: http://a:8x/ — "x" isn't allowed in a port, at 10`
    }],
    ["a character in a query", () => parseUri("http://a?b c"), {
      reason: "invalid-character", component: "query", start: 10, end: 11
    }],
    ["a character in a fragment", () => parseUri("http://a#b#c"), {
      reason: "invalid-character", component: "fragment", start: 10, end: 11
    }],
    ["a character in a scheme", () => parseUri("a b:c"), {
      reason: "invalid-character", component: "scheme", start: 1, end: 2
    }],
    ["a scheme that doesn't start with a letter", () => parseUri("1a:b"), {
      reason: "invalid-character", component: "scheme", start: 0, end: 1,
      message: "Invalid URI: 1a:b — a scheme has to start with a letter, at 0"
    }],
    ["a character that can't be seen, as its code point", () => parseIri("http://a/\u0007"), {
      reason: "invalid-character", component: "path", start: 9, end: 10,
      message: "Invalid IRI: http://a/\u0007 — U+0007 isn't allowed in a path, at 9"
    }],
    ["a character outside the BMP, as both of its UTF-16 code units", () => parseIri("http://a/\u{F0000}"), {
      reason: "invalid-character", component: "path", start: 9, end: 11
    }],
    ["a character only an IRI allows, with a hint", () => parseUri("http://a/é"), {
      reason: "invalid-character", component: "path", start: 9, end: 10,
      message: `Invalid URI: http://a/é — "é" isn't allowed in a URI, at 9; percent-encode it or use the IRI functions`
    }],
    ["a private-use character in a query, with a hint", () => parseUri("http://a?\u{E000}"), {
      reason: "invalid-character", component: "query", start: 9, end: 10,
      message: "Invalid URI: http://a?\u{E000} — U+E000 isn't allowed in a URI, at 9; percent-encode it or use the IRI functions"
    }],
    ["a \"%\" without two hex digits", () => parseUri("http://a/%zz"), {
      reason: "invalid-percent-encoding", component: "path", start: 9, end: 12,
      message: `Invalid URI: http://a/%zz — "%" must be followed by two hex digits, at 9`
    }],
    ["a \"%\" at the end", () => parseUri("http://a/%4"), {
      reason: "invalid-percent-encoding", component: "path", start: 9, end: 11
    }],
    ["a \"%\" in a scheme, which can't be percent-encoded", () => parseUri("a%41:b"), {
      reason: "invalid-character", component: "scheme", start: 1, end: 2
    }],
    ["an IP literal, with its brackets", () => parseUri("http://[::g]/"), {
      reason: "invalid-ip-literal", component: "host", start: 7, end: 12,
      message: `Invalid URI: http://[::g]/ — "[::g]" isn't a valid IP literal, at 7`
    }],
    ["an IP literal without its \"]\"", () => parseUri("http://[::1"), {
      reason: "invalid-ip-literal", component: "host", start: 7, end: 11
    }],
    ["an IP literal followed by something other than a port", () => parseUri("http://[::1]x:80/"), {
      reason: "invalid-ip-literal", component: "host", start: 7, end: 13
    }],
    ["a missing scheme", () => parseUri("/a"), {
      reason: "missing-scheme", component: "scheme", start: 0, end: 0,
      message: "Invalid URI: /a — a URI has to have a scheme"
    }],
    ["an empty scheme", () => parseAbsoluteUri(":a"), {
      reason: "missing-scheme", component: "scheme", start: 0, end: 0,
      message: "Invalid absolute-URI: :a — an absolute-URI has to have a scheme"
    }],
    ["a fragment in an absolute-URI, before anything else", () => parseAbsoluteUri("http://a b/#c"), {
      reason: "fragment-not-allowed", component: "fragment", start: 11, end: 13,
      message: "Invalid absolute-URI: http://a b/#c — an absolute-URI can't have a fragment"
    }],
    ["both readings of a reference with a scheme that isn't one", () => parseUriReference("1a:b/c"), {
      reason: "colon-in-first-segment", component: "path", start: 0, end: 4,
      message: `Invalid URI-reference: 1a:b/c — "1a" isn't a scheme, which has to start with a letter, and a relative path can't have ":" in its first segment unless it starts with "./"`
    }],
    ["both readings, with the character the scheme can't have", () => parseIriReference("a_b:c"), {
      reason: "colon-in-first-segment", component: "path", start: 0, end: 5,
      message: `Invalid IRI-reference: a_b:c — "a_b" isn't a scheme, which can't have "_", and a relative path can't have ":" in its first segment unless it starts with "./"`
    }],
    ["only the path reading, when there's nothing before the \":\"", () => parseUriReference(":a/b"), {
      reason: "colon-in-first-segment", component: "path", start: 0, end: 2,
      message: `Invalid URI-reference: :a/b — a relative path can't have ":" in its first segment unless it starts with "./", at 0`
    }],
    ["the scheme reading, when the path reading is wrong too", () => parseUriReference("a b:c"), {
      reason: "invalid-character", component: "scheme", start: 1, end: 2
    }],
    ["the scheme reading, for a rule that needs a scheme", () => parseUri("a_b:c"), {
      reason: "invalid-character", component: "scheme", start: 1, end: 2
    }]
  ])("%s", (_description, fn, expected) => {
    expect(thrown(fn)).to.include(expected);
  });

  test("says which argument is wrong", () => {
    expect(thrown(() => resolveUri("foo", "http://a b/"))).to.include({ rule: "absolute-URI", component: "host", start: 8 });
  });
});

describe("UnsupportedIpVersionError", () => {
  const error = thrown(() => isUri("http://[v7.future]/foo"));

  test("is an Error", () => {
    expect(error).to.be.instanceOf(UnsupportedIpVersionError);
    expect(error).to.be.instanceOf(Error);
    expect(error).to.include({ name: "UnsupportedIpVersionError" });
  });

  test("has the value and the host", () => {
    expect(error).to.include({ value: "http://[v7.future]/foo", host: "[v7.future]" });
  });

  test("has v1's message", () => {
    expect(error).to.include({ message: "Unsupported IP version in host: v7.future" });
  });

  test("is thrown for IRIs too", () => {
    expect(thrown(() => isIri("http://[v7.future]/rosé"))).to.be.instanceOf(UnsupportedIpVersionError);
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
