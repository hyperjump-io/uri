import { describe, expect, test } from "vitest";
import {
  InvalidIriError, InvalidUriError, UnsupportedIpVersionError,
  assertIri, assertIriReference, assertUri, isAbsoluteIri, isIri, isIriReference, isUri,
  normalizeIri, normalizeUri, parseUrn, resolveIri
} from "./index.js";

/** @import { AbsoluteIri, Iri, IriReference, Uri } from "./index.d.ts" */

describe("Built-in schemes", () => {
  test.each([
    // RFC 9110 §4.2.1: an http URI needs a host
    ["http://example.com/a", true],
    ["https://example.com", true],
    ["HTTP://example.com/a", true],
    ["http:///a", false],
    ["https:///a", false],
    ["http:/a", false],
    ["http:a", false],
    ["http://user@example.com/", true], // A SHOULD NOT, so it's a policy
    ["http://my_host/", true], // Hosts aren't checked against DNS syntax

    // RFC 8089 §2: auth-path = [ file-auth ] path-absolute, and file-auth = "localhost" / host
    ["file:///a/b", true],
    ["file://localhost/a", true],
    ["file://host/a", true],
    ["file:/a", true],
    ["file:///a#b", true],
    ["file:///a?b", true], // An exception to RFC 8089's ABNF, which Node.js makes
    ["file:///a?", true],
    ["file://", false],
    ["file://host", false],
    ["file:a", false],
    ["file:////a", false],
    ["file://user@host/a", false],
    ["file://host:80/a", false],
    ["file://c:/a", false], // A host and an empty port

    // RFC 4151 §2.1 and §3: software "MUST NOT reject" tags outside the syntax
    ["tag:example.com,2004:a", true],
    ["tag:example.com,2004:a?b#c", true],
    ["tag:example.com:a", true],
    ["tag:x", true],
    ["tag://example.com/a", true],
    ["tag:exämple.com,2004:a", true],

    // RFC 8141 §2
    ["urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66", true],
    ["URN:UUID:6E8BC430-9C3A-11D9-9669-0800200C9A66", true],
    ["urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66?+r", true],
    ["urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66?=q", true],
    ["urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66?+r?=q#f", true],
    ["urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66#", true],
    ["urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66?", false],
    ["urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66?q", false],
    ["urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66?+", false],
    ["urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66#é", false],
    ["urn:uuid:6e8bc430-9c3a-11d9-9669", false],
    ["urn:uuid:", false],
    ["urn:a:b", false], // A NID has at least two characters
    ["urn:-a:b", false],
    ["urn://a/b", false],

    // A namespace that isn't built in has RFC 8141's rules only
    ["urn:example:a", true],
    ["urn:isbn:0-395-36341-1", true],
    ["urn:uuidx:a", true], // Not the uuid namespace
    ["urn:example:", false],
    ["urn:example:é", false],

    // DID 1.1 §3.2
    ["did:example:123456789abcdefghi", true],
    ["DID:example:123", true],
    ["did:example:a:b", true],
    ["did:example::b", true],
    ["did:example:a_b.c-d%20e", true],
    ["did:example:a/path/x", true],
    ["did:example:a?versionId=1", true],
    ["did:example:a#key-1", true],
    ["did:example:a/p?q#f", true],
    ["did:Example:a", false], // A method's name is lowercase
    ["did:example:", false],
    ["did:example:a:", false], // A method-specific ID can't end with ":"
    ["did:example", false],
    ["did:example:a~b", false],
    ["did:example:a!b", false],
    ["did:example:é", false],
    ["did:example:a#é", false],
    ["did:example:a?é", false],
    ["did://example/a", false]
  ])("isIri(%s) => %s", (value, expected) => {
    expect(isIri(value)).to.equal(expected);
  });

  test("a relative reference isn't checked against a scheme", () => {
    expect(isIriReference("//")).to.equal(true);
    expect(isIriReference("?q")).to.equal(true);
  });

  test("a reference with a scheme is", () => {
    expect(isIriReference("http:///a")).to.equal(false);
  });

  test("every validator checks the scheme", () => {
    expect(isUri("http:///a")).to.equal(false);
    expect(isAbsoluteIri("did:example:a/p?q")).to.equal(true);
    expect(isAbsoluteIri("did:Example:a")).to.equal(false);
  });

  test("a pattern can't accept what the generic syntax doesn't", () => {
    expect(isIri("did:example:a b")).to.equal(false);
    expect(isUri("tag:é")).to.equal(false);
  });

  test("an IP literal of a future version still throws", () => {
    expect(() => isIri("https://[v1.a]/")).to.throw(UnsupportedIpVersionError);
  });
});

describe("Unknown schemes", () => {
  test.each([
    ["foo:bar", true],
    ["Foo:bar", true],
    ["foo:", true],
    ["foo://h:1/p?q#f", true],
    ["foo:a b", false],
    ["foo:%", false],
    ["com.example.app:/callback", true] // A private-use OAuth scheme (RFC 8252)
  ])("isIri(%s) => %s, by the generic syntax only", (value, expected) => {
    expect(isIri(value)).to.equal(expected);
  });

  test("assert* checks the generic syntax only", () => {
    expect(() => assertIri("foo:bar")).not.to.throw();
    expect(thrown(() => assertIri("foo:a b"))).to.include({ rule: "IRI", reason: "invalid-character" });
  });

  test("a scheme whose name starts like a built-in's is unknown", () => {
    expect(isIri("httpx:///a")).to.equal(true);
    expect(isIri("urnx:a")).to.equal(true);
  });

  test("resolving checks nothing more", () => {
    expect(resolveIri(trustedReference("c"), trustedBase("foo:a/b"))).to.equal("foo:a/c");
    expect(resolveIri(trustedReference("//"), trustedBase("foo:a"))).to.equal("foo://");
  });

  test("normalizing applies the syntax-based normalization only", () => {
    expect(normalizeIri(trustedIri("FOO://H:80/a/./%62?%7e"))).to.equal("foo://h:80/a/b?~");
  });
});

describe("What's wrong with a scheme's rules, and where", () => {
  test.each([
    ["a missing authority, where it would go", () => assertIri("http:/a"), {
      rule: "http-URI", reason: "missing-component", component: "authority", start: 5, end: 5,
      message: "Invalid http-URI: http:/a — an http URI must have an authority"
    }],
    ["a component that doesn't match, without its delimiter", () => assertIri("http:///a"), {
      rule: "http-URI", reason: "component-mismatch", component: "host", start: 7, end: 7,
      message: "Invalid http-URI: http:///a — an http URI's host must be non-empty"
    }],
    ["a forbidden component, with its delimiter", () => assertIri("did://a/b"), {
      rule: "did-url", reason: "forbidden-component", component: "authority", start: 4, end: 7,
      message: "Invalid did-url: did://a/b — a did URI can't have an authority"
    }],
    ["forbidden userinfo, with its \"@\"", () => assertIri("file://u@h/a"), {
      reason: "forbidden-component", component: "userinfo", start: 7, end: 9,
      message: "Invalid file-URI: file://u@h/a — a file URI can't have userinfo"
    }],
    ["a forbidden port, with its \":\"", () => assertIri("file://h:1/a"), {
      reason: "forbidden-component", component: "port", start: 8, end: 10
    }],
    ["a forbidden empty port, with its \":\"", () => assertIri("file://c:/a"), {
      reason: "forbidden-component", component: "port", start: 8, end: 9
    }],
    ["a mismatched path", () => assertIri("did:Example:a"), {
      rule: "did-url", reason: "component-mismatch", component: "path", start: 4, end: 13,
      message: `Invalid did-url: did:Example:a — a did URI's path must be a method name, ":", and a method-specific ID, in ASCII, like example:123456`
    }],
    ["a DID's query that isn't ASCII", () => assertIri("did:example:a?é"), {
      reason: "component-mismatch", component: "query", start: 14, end: 15,
      message: "Invalid did-url: did:example:a?é — a did URI's query must be ASCII, with other characters percent-encoded"
    }],
    ["a URN's fragment that isn't ASCII", () => assertIri("urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66#é"), {
      rule: "namestring", reason: "component-mismatch", component: "fragment", start: 46, end: 47,
      message: "Invalid namestring: urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66#é — a urn URI's fragment must be ASCII, with other characters percent-encoded"
    }],
    ["a namespace's rule, spanning only the NSS", () => assertIri("urn:UUID:x"), {
      rule: "namestring", reason: "component-mismatch", component: "path", start: 9, end: 10,
      message: "Invalid namestring: urn:UUID:x — a UUID URN's NSS must be a UUID, like f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
    }],
    ["RFC 8141's rules before the namespace's", () => assertIri("urn:example:é"), {
      component: "path", start: 4, end: 13,
      message: `Invalid namestring: urn:example:é — a urn URI's path must be a NID, ":", and an NSS, in ASCII, like example:a`
    }],
    ["the scheme's rules, after the generic syntax", () => assertIri("http:///a b"), {
      rule: "IRI", reason: "invalid-character"
    }]
  ])("%s", (_description, fn, expected) => {
    const error = thrown(fn);
    expect(error).to.be.instanceOf(InvalidIriError);
    expect(error).to.include(expected);
  });

  test("assertUri throws InvalidUriError", () => {
    expect(thrown(() => assertUri("http:///a"))).to.be.instanceOf(InvalidUriError);
  });

  test("a relative reference isn't checked against a scheme", () => {
    expect(assertIriReference("//")).to.equal(undefined);
  });

  test("the first component that fails is the error, in the order the components are in", () => {
    expect(thrown(() => assertIri("did://h/?é"))).to.include({ component: "authority" });
  });
});

describe("parseUrn", () => {
  test.each([
    ["urn:example:a", { nid: "example", nss: "a" }],
    ["URN:Example:A:b/c", { nid: "Example", nss: "A:b/c" }],
    ["urn:example:a?+r", { nid: "example", nss: "a", rComponent: "r" }],
    ["urn:example:a?=q", { nid: "example", nss: "a", qComponent: "q" }],
    ["urn:example:a?+r?x?=q?y", { nid: "example", nss: "a", rComponent: "r?x", qComponent: "q?y" }],
    ["urn:example:a#f", { nid: "example", nss: "a", fComponent: "f" }],
    ["urn:example:a#", { nid: "example", nss: "a", fComponent: "" }],
    ["urn:example:%41", { nid: "example", nss: "%41" }]
  ])("parseUrn(%s)", (value, expected) => {
    expect(parseUrn(trustedIri(value))).to.eql(expected);
  });
});

describe("Scheme-based normalization", () => {
  test.each([
    ["http://example.com:80/a", "http://example.com/a"], // The default port
    ["http://example.com:/a", "http://example.com/a"], // An empty port
    ["http://example.com:8080/a", "http://example.com:8080/a"],
    ["http://example.com:443/a", "http://example.com:443/a"],
    ["https://example.com:443/a", "https://example.com/a"],
    ["http://example.com", "http://example.com/"], // An empty path
    ["HTTP://Example.COM:80?q", "http://example.com/?q"],
    ["http://u@example.com:80/", "http://u@example.com/"], // The authority is rebuilt
    ["file://localhost/a", "file:///a"],
    ["file://LocalHost/a", "file:///a"], // The host is lowercased first
    ["file://host/a/./b", "file://host/a/b"],
    ["file:///a?%7e", "file:///a?~"],
    ["urn:uuid:6E8BC430-9C3A-11D9-9669-0800200C9A66", "urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66"],
    ["URN:UUID:6e8bc430-9c3a-11d9-9669-0800200c9a66?=a%2fb#c%2fd", "urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66?=a%2Fb#c%2fd"],
    ["TAG:Example.com,2004:a/./%41", "tag:Example.com,2004:a/./%41"], // Only the scheme
    ["DID:example:a/./b/%7e", "did:example:a/b/~"] // The syntax-based normalization only
  ])("normalizeIri(%s) => %s", (value, expected) => {
    expect(normalizeIri(trustedIri(value))).to.equal(expected);
  });

  test("a URN isn't decoded, and only its scheme and NID are lowercased", () => {
    expect(normalizeIri(trustedIri("URN:EXAMPLE:%41/./B"))).to.equal("urn:example:%41/./B");
    expect(normalizeIri(trustedIri("urn:example:a%2fb"))).to.equal("urn:example:a%2Fb");
  });

  test("a NSS is lowercased only for uuid, with percent-encoding left alone", () => {
    expect(normalizeIri(trustedIri("urn:Uuid:6E8BC430-9C3A-11D9-9669-0800200C9A66"))).to.equal("urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66");
    expect(normalizeIri(trustedIri("urn:example:ABC"))).to.equal("urn:example:ABC");
  });

  test("normalizeUri applies a scheme's normalization too", () => {
    expect(normalizeUri(/** @type Uri */ ("http://example.com:80"))).to.equal("http://example.com/");
  });
});

describe("Resolving checks the result's scheme rules", () => {
  test.each([
    ["urn:example:a", "b", "namestring", "path", 0, 1],
    ["urn:example:a", "?q", "namestring", "query", 1, 2],
    ["http://a/b", "//", "http-URI", "host", 2, 2],
    ["file:///a", "//h", "file-URI", "path", 3, 3],
    ["did:example:a", "b", "did-url", "path", 0, 1],
    ["did:example:a", "/b", "did-url", "path", 0, 2],
    ["did:example:a/b/c", "../../../d", "did-url", "path", 0, 10], // A merged path spans the reference's path
    ["did:example:a", "?é", "did-url", "query", 1, 2],
    ["urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66", "#é", "namestring", "fragment", 1, 2]
  ])("%s against %s", (base, reference, rule, component, start, end) => {
    const error = thrown(() => resolveIri(trustedReference(reference), trustedBase(base)));
    expect(error).to.be.instanceOf(InvalidIriError);
    expect(error).to.include({ value: reference, rule, component, start, end });
  });

  test("an absolute reference with dot segments is checked too", () => {
    expect(() => resolveIri(trustedReference("urn:example:a/../b"), trustedBase("http://a/")))
      .to.throw(InvalidIriError, "Invalid namestring: urn:example:a/../b");
  });

  test.each([
    ["urn:example:a/b", "c", "urn:example:a/c"], // RFC 8141 §4.3 says it "should work predictably"
    ["tag:example.com,2004:a/b", "/c", "tag:/c"], // A tag has no rules
    ["tag:example.com,2004:a", "?q", "tag:example.com,2004:a?q"],
    ["file:///a/b", "//h/c", "file://h/c"],
    ["file:///a/b", "?q", "file:///a/b?q"],
    ["did:example:a/b", "c", "did:example:a/c"],
    ["did:example:a", "#key-1", "did:example:a#key-1"],
    ["did:example:a", "?versionId=1", "did:example:a?versionId=1"],
    ["urn:example:a?=q", "#f", "urn:example:a?=q#f"],
    ["http://a/b", "", "http://a/b"]
  ])("%s against %s => %s", (base, reference, expected) => {
    expect(resolveIri(trustedReference(reference), trustedBase(base))).to.equal(expected);
  });
});

// The functions that trust their input are given casts, like values a validator checked
/** @type (value: string) => Iri */
const trustedIri = (value) => /** @type Iri */ (value);
/** @type (value: string) => IriReference */
const trustedReference = (value) => /** @type IriReference */ (value);
/** @type (value: string) => AbsoluteIri */
const trustedBase = (value) => /** @type AbsoluteIri */ (value);

/** @type (fn: () => unknown) => unknown */
const thrown = (fn) => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw Error("Expected an error");
};
