import { describe, expect, test } from "vitest";
import {
  InvalidIriError, InvalidUriError, UnsupportedIpVersionError,
  isIri, isUri, parseAbsoluteIri, parseUri, resolveUri, toRelativeIri
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

  test("has v1's message", () => {
    expect(error).to.include({ message: "Invalid URI: foo" });
  });

  test("names the rule for each argument", () => {
    expect(thrown(() => resolveUri("http://[", "http://example.com"))).to.include({ rule: "URI-reference" });
    expect(thrown(() => resolveUri("foo", "/bar"))).to.include({ rule: "absolute-URI" });
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
