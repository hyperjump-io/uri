import { describe, expect, test } from "vitest";
import {
  InvalidIriError, InvalidUriError,
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

    // RFC 5890 §2.3.1: a label that starts with "xn--" is an internationalized domain name's ASCII form
    ["http://xn--caf-dma.example/", true],
    ["https://XN--CAF-DMA.example/", true],
    ["http://www.xn--caf-dma.xn--rsum-bpad.example/", true],
    ["http://café.xn--rsum-bpad.example/", true],
    ["http://café.example/", true], // A Unicode label isn't checked
    ["http://xn--t9d.example/", true], // Ꮇ, which UTS #46 maps lowercase Cherokee to
    ["http://xn--abc.example/", false], // Decodes to a character IDNA doesn't allow
    ["http://xn--caf-.example/", false], // Decodes to ASCII
    ["http://xn---stnnm.example/", false], // Another A-label for xn--stnnm
    ["http://xn--9ca.xn--abc.example/", false], // Any invalid label
    ["http://xn--.example/", false],
    ["http://[v7.xn--abc]/", true], // An IP literal isn't a domain name
    ["foo://xn--abc.example/", true], // Only http and https hosts are domain names
    ["http://example.com/xn--abc", true], // Only the host

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
    ["did://example/a", false],

    // RFC 2397 §3
    ["data:,", true],
    ["data:text/plain,hi", true],
    ["DATA:text/plain,hi", true],
    ["data:text/plain,", true],
    ["data:text/plain;base64,aGk=", true],
    ["data:text/plain;BASE64,aGk=", true],
    ["data:;base64,aGk=", true],
    ["data:;charset=utf-8,hi", true], // A media type without a type and a subtype
    ["data:text/plain;charset=utf-8;base64,aGk=", true],
    ["data:application/vnd.api+json,x", true],
    ["data:text/plain;name=%22a%20b%22,x", true], // A quoted-string is percent-encoded
    ["data:application/json,%7B%22a%22:1%7D", true],
    ["data:text/plain,a/../b", true],
    ["data:text/plain,a?b,c", true], // A query is more data
    ["data:text/plain,a#b", true],
    ["data:text/plain", false], // No ","
    ["data:text/plain?a,b", false], // The "," has to be in the path
    ["data:text,hi", false], // A type without a subtype
    ["data:/plain,hi", false],
    ["data:base64,aGk=", false],
    ["data:text/plain;charset,hi", false], // A parameter without a value
    ["data:text/plain;=x,hi", false],
    ["data:image/svg+xml;utf8,x", false],
    ["data:te(xt/plain,hi", false], // "(" isn't in a token
    ["data:text/plain,é", false],
    ["data:text/plain,a?é", false],
    ["data:text/plain,a#é", false],
    ["data://h/a,b", false]
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

  test("an IP literal of a future version is a host", () => {
    expect(isIri("https://[v1.a]/")).to.equal(true);
    expect(isIri("file://[v1.a]/a")).to.equal(true);
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
    ["a data URL without a comma", () => assertIri("data:text/plain"), {
      rule: "dataurl", reason: "component-mismatch", component: "path", start: 5, end: 15,
      message: `Invalid dataurl: data:text/plain — a data URI's path must be a media type, ";base64" if the data is base64, ",", and the data, in ASCII, like text/plain,hello`
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
    ["a label that starts with xn-- and isn't an A-label", () => assertIri("http://a.xn--abc.example/"), {
      rule: "http-URI", reason: "component-mismatch", component: "host", start: 7, end: 24,
      message: "Invalid http-URI: http://a.xn--abc.example/ — an http URI's host must be an internationalized domain name in a label that starts with xn--, like xn--caf-dma"
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
    ["http://xn--caf-dma.example/", "http://café.example/"], // RFC 3987 §5.3.3
    ["HTTPS://WWW.XN--CAF-DMA.XN--RSUM-BPAD.example/", "https://www.café.résumé.example/"],
    ["http://xn--t9d.example/", "http://ꮇ.example/"], // Lowercase, like the rest of the host
    ["http://[v7.xn--abc]/", "http://[v7.xn--abc]/"],
    ["foo://xn--caf-dma.example/", "foo://xn--caf-dma.example/"], // Not a scheme that's known to have domain names
    ["file://xn--caf-dma.example/a", "file://xn--caf-dma.example/a"],
    ["file://localhost/a", "file:///a"],
    ["file://LocalHost/a", "file:///a"], // The host is lowercased first
    ["file://host/a/./b", "file://host/a/b"],
    ["file:///a?%7e", "file:///a?~"],
    ["urn:uuid:6E8BC430-9C3A-11D9-9669-0800200C9A66", "urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66"],
    ["URN:UUID:6e8bc430-9c3a-11d9-9669-0800200c9a66?=a%2fb#c%2fd", "urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66?=a%2Fb#c/d"],
    // A fragment gets the syntax-based normalization whatever the scheme turns off
    ["urn:example:a%7e?+r%7e#f%7e%2f", "urn:example:a%7E?+r%7E#f~/"],
    ["urn:example:a#%c3%a9", "urn:example:a#%C3%A9"], // A URN is ASCII in an IRI too
    ["TAG:Example.com,2004:a/./%41", "tag:Example.com,2004:a/./%41"], // Only the scheme
    ["tag:example.com,2004:a%7e#%7e%c3%a9", "tag:example.com,2004:a%7e#~é"],
    ["DID:example:a/./b/%7e", "did:example:a/b/~"], // The syntax-based normalization only
    ["did:example:a%c3%a9?%c3%a9#%c3%a9", "did:example:a%C3%A9?%C3%A9#%C3%A9"], // A DID is ASCII in an IRI too
    // The data isn't a path, so only the scheme and the fragment are normalized
    ["DATA:Text/Plain,a/../b/./c%7e?%7e#%7e%c3%a9", "data:Text/Plain,a/../b/./c%7e?%7e#~%C3%A9"]
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

  test("normalizeUri leaves an A-label in ASCII", () => {
    expect(normalizeUri(/** @type Uri */ ("http://XN--CAF-DMA.example/"))).to.equal("http://xn--caf-dma.example/");
  });
});

describe("Resolving checks the result's scheme rules", () => {
  test.each([
    ["urn:example:a", "b", "namestring", "path", 0, 1],
    ["urn:example:a", "?q", "namestring", "query", 1, 2],
    ["http://a/b", "//", "http-URI", "host", 2, 2],
    ["http://a/b", "//xn--abc/c", "http-URI", "host", 2, 9],
    ["file:///a", "//h", "file-URI", "path", 3, 3],
    ["did:example:a", "b", "did-url", "path", 0, 1],
    ["did:example:a", "/b", "did-url", "path", 0, 2],
    ["did:example:a/b/c", "../../../d", "did-url", "path", 0, 10], // A merged path spans the reference's path
    ["did:example:a", "?é", "did-url", "query", 1, 2],
    ["data:text/plain,a", "b", "dataurl", "path", 0, 1], // "text/b" has no ","
    ["data:text/plain,a", "#é", "dataurl", "fragment", 1, 2],
    ["urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66", "#é", "namestring", "fragment", 1, 2]
  ])("%s against %s", (base, reference, rule, component, start, end) => {
    const error = thrown(() => resolveIri(trustedReference(reference), trustedBase(base)));
    expect(error).to.be.instanceOf(InvalidIriError);
    expect(error).to.include({ value: reference, rule, component, start, end });
  });

  test("an absolute reference with dot segments is checked too", () => {
    expect(() => resolveIri(trustedReference("did:example:a/../../b"), trustedBase("http://a/")))
      .to.throw(InvalidIriError, "Invalid did-url: did:example:a/../../b");
  });

  test.each([
    ["data:text/plain,x/a/../b"],
    ["data:text/plain,a/../b"],
    ["DATA:text/plain,a/./b"],
    ["urn:example:a/../b"],
    ["tag:example.com,2004:a/../b"]
  ])("%s keeps its dot segments, because its path isn't segments", (reference) => {
    expect(resolveIri(trustedReference(reference), trustedBase("http://a/"))).to.equal(reference);
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
    ["data:application/json,%7B%7D", "#/a", "data:application/json,%7B%7D#/a"],
    ["data:text/plain,a/../b", "#f", "data:text/plain,a/../b#f"], // The base's path isn't touched
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
