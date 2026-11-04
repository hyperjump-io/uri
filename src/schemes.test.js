import { describe, expect, test } from "vitest";
import {
  InvalidIriError, InvalidUriError, UnknownSchemeError, UnknownUrnNamespaceError, UnsupportedIpVersionError,
  assertIri, assertIriReference, assertUri, isAbsoluteIri, isIri, isIriReference, isUri, lowercaseComponent,
  defineScheme, normalizeIri, normalizeUri, parseTag, parseUrn, resolveIri, urnScheme
} from "./index.js";
import { abnf } from "../abnf/index.js";
import { asciiPath, host, path, query } from "./abnf.js";

/** @import { AbsoluteIri, ComponentPattern, Iri, IriReference, Uri } from "./index.d.ts" */

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
    ["file://", false],
    ["file://host", false],
    ["file:a", false],
    ["file:////a", false],
    ["file:///a?b", false],
    ["file://user@host/a", false],
    ["file://host:80/a", false],

    // RFC 4151 §2.1
    ["tag:example.com,2004:a", true],
    ["tag:jason@example.com,2004-01-15:a/b", true],
    ["tag:example.com,2004-01:", true],
    ["tag:example.com,2004:a?b#c", true], // specific allows "?"
    ["tag:a-b.example,2004:x", true],
    ["tag:example.com,04:a", false],
    ["tag:example.com,2004-1:a", false],
    ["tag:example.com:a", false],
    ["tag:-a.example,2004:a", false],
    ["tag:example.com,2004", false],
    ["tag://example.com,2004:a", false],
    ["tag:exämple.com,2004:a", false],
    ["tag:example.com,2004:é", true], // specific has IRI characters in an IRI

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
    ["urn://a/b", false]
  ])("isIri(%s) => %s", (value, expected) => {
    expect(isIri(value)).to.equal(expected);
  });

  test("a URN is ASCII in an IRI too", () => {
    expect(isIri("urn:example:é", { customSchemes: [urnScheme({ example: {} })] })).to.equal(false);
    expect(isIri("urn:example:%C3%A9", { customSchemes: [urnScheme({ example: {} })] })).to.equal(true);
  });

  test("a relative reference isn't checked against a scheme", () => {
    expect(isIriReference("//")).to.equal(true);
    expect(isIriReference("?q")).to.equal(true);
  });

  test("a reference with a scheme is", () => {
    expect(isIriReference("http:///a")).to.equal(false);
    expect(() => isIriReference("foo:a")).to.throw(UnknownSchemeError);
  });

  test("every validator checks the scheme", () => {
    expect(isUri("http:///a")).to.equal(false);
    expect(isAbsoluteIri("file:///a?q")).to.equal(false);
  });
});

describe("Unknown schemes", () => {
  test.each([
    ["isIri", () => isIri("Foo:bar")],
    ["isUri", () => isUri("foo:bar")],
    ["isIriReference", () => isIriReference("foo:bar")],
    ["assertIri", () => assertIri("foo:bar")],
    ["normalizeIri", () => normalizeIri(trustedIri("foo:bar"))],
    ["resolveIri", () => resolveIri(trustedReference("a"), trustedBase("foo:bar"))]
  ])("%s throws UnknownSchemeError", (_name, fn) => {
    const error = thrown(fn);
    expect(error).to.be.instanceOf(UnknownSchemeError);
    expect(error).to.be.instanceOf(Error);
    expect(error).to.include({ name: "UnknownSchemeError", scheme: "foo", message: "Unknown scheme: foo" });
  });

  test("has the value as written", () => {
    expect(thrown(() => isIri("FOO:bar"))).to.include({ value: "FOO:bar", scheme: "foo" });
  });

  test("an invalid value is invalid before its scheme is looked up", () => {
    expect(isIri("foo:a b")).to.equal(false);
  });
});

describe("Custom schemes", () => {
  const did = defineScheme({ name: "did", rule: "did" });

  test("a scheme with no rules is known and adds nothing", () => {
    expect(isIri("did:example:123", { customSchemes: [did] })).to.equal(true);
    expect(isIri("DID:example:123", { customSchemes: [did] })).to.equal(true);
  });

  test("a name matches without case", () => {
    expect(isIri("did:a", { customSchemes: [defineScheme({ name: "DID", rule: "did" })] })).to.equal(true);
  });

  test("replaces a built-in with its name", () => {
    expect(isIri("http:///a", { customSchemes: [defineScheme({ name: "http", rule: "http-URI" })] })).to.equal(true);
  });

  const example = defineScheme({
    name: "ex",
    rule: "ex-URI",
    validate: {
      authority: "required",
      port: "forbidden",
      path: { pattern: abnf(path)`%s"/a" *( pchar / "/" )`, description: "under /a" },
      query: { pattern: abnf(query)`1*( pchar / "/" / "?" )` }
    }
  });
  const options = { customSchemes: [example] };

  test.each([
    ["ex://h/a", true],
    ["ex:/a", false],
    ["ex://h:1/a", false],
    ["ex://h/b", false],
    ["ex://h/a?", false],
    ["ex://h/a?q", true],
    ["ex://h/b?", false]
  ])("isIri(%s) => %s", (value, expected) => {
    expect(isIri(value, options)).to.equal(expected);
  });

  test("a pattern only runs when its component is there", () => {
    expect(isIri("ex://h/a", options)).to.equal(true);
  });

  test("the first component that fails is the error, in the order the components are in", () => {
    expect(thrown(() => assertIri("ex://h:1/b?", options))).to.include({ component: "port" });
  });
});

describe("defineScheme", () => {
  test("makes a frozen value", () => {
    expect(Object.isFrozen(defineScheme({ name: "x", rule: "x" }))).to.equal(true);
  });

  test.each([
    ["a pattern without the u flag", { path: { pattern: /a/ } }],
    ["a pattern with another flag", { path: { pattern: /a/iu } }],
    ["a string", { path: { pattern: "a" } }]
  ])("throws a TypeError for %s", (_name, validate) => {
    expect(() => defineScheme(/** @type any */ ({ name: "x", rule: "x", validate })))
      .to.throw(TypeError, "The path pattern of the x scheme must be a RegExp with the u flag and no other");
  });

  test("throws a TypeError for a name that isn't a scheme", () => {
    expect(() => defineScheme({ name: "1x", rule: "x" })).to.throw(TypeError, "Not a scheme name: 1x");
  });

  test("a custom scheme that isn't defined is a TypeError", () => {
    const options = /** @type any */ ({ customSchemes: [{ name: "x", rule: "x" }] });
    expect(() => isIri("x:a", options)).to.throw(TypeError, "A custom scheme is made by defineScheme: x");
  });

  test("a pattern can't accept what the generic syntax doesn't", () => {
    const options = { customSchemes: [defineScheme({ name: "x", rule: "x", validate: { path: { pattern: abnf(path)`*%x0-10FFFF` } } })] };
    expect(isIri("x:a", options)).to.equal(true);
    expect(isIri("x:a b", options)).to.equal(false);
    expect(isUri("x:é", options)).to.equal(false);
  });

  test("a pattern is matched where its component starts, and followed by what can follow it", () => {
    const options = { customSchemes: [defineScheme({ name: "x", rule: "x", validate: { query: { pattern: abnf(query)`%s"a"` } } })] };
    expect(isIri("x:p?a", options)).to.equal(true);
    expect(isIri("x:p?a#f", options)).to.equal(true);
    expect(isIri("x:p?ab", options)).to.equal(false);
    expect(isIri("x:p?ba", options)).to.equal(false);
  });

  test("a pattern compiled from ABNF can't match past its component", () => {
    const options = {
      customSchemes: [
        defineScheme({ name: "x", rule: "x", validate: { host: { pattern: abnf(host)`1*VCHAR` } } }),
        defineScheme({ name: "y", rule: "y", validate: { path: { pattern: abnf(path)`"a" *VCHAR "b"` } } })
      ]
    };
    expect(isIri("x://h/a", options)).to.equal(true);
    expect(isIri("x:///a", options)).to.equal(false);
    expect(isIri("y:a/b", options)).to.equal(true);
    expect(isIri("y:a?b", options)).to.equal(false);
    expect(isIri("y:a#b", options)).to.equal(false);
  });

  test("RFC 3986's rules mean RFC 3987's in an IRI, unless the context is ASCII", () => {
    const options = {
      customSchemes: [
        defineScheme({ name: "x", rule: "x", validate: { path: { pattern: abnf(path)`1*pchar` } } }),
        defineScheme({ name: "y", rule: "y", validate: { path: { pattern: abnf(asciiPath)`1*pchar` } } })
      ]
    };
    expect(isIri("x:é", options)).to.equal(true);
    expect(isIri("x:%C3%A9", options)).to.equal(true);
    expect(isIri("y:é", options)).to.equal(false);
    expect(isIri("y:%C3%A9", options)).to.equal(true);
  });

  test("a hand-written pattern that can match its component's delimiters runs past it, in is* and assert* alike", () => {
    const pattern = /** @type ComponentPattern<"host"> */ (/.+/u);
    const options = { customSchemes: [defineScheme({ name: "x", rule: "x", validate: { host: { pattern } } })] };
    expect(isIri("x:///a", options)).to.equal(true);
    expect(() => assertIri("x:///a", options)).not.to.throw();
  });

  test("an IP literal of a future version still throws", () => {
    expect(() => isIri("https://[v1.a]/")).to.throw(UnsupportedIpVersionError);
  });

  test("required and forbidden components shape the grammar", () => {
    const options = {
      customSchemes: [
        defineScheme({ name: "a", rule: "a", validate: { port: "required" } }),
        defineScheme({ name: "b", rule: "b", validate: { fragment: "required" } }),
        defineScheme({ name: "c", rule: "c", validate: { authority: "required", host: "forbidden" } })
      ]
    };
    expect(isIri("a://h:1/", options)).to.equal(true);
    expect(isIri("a://h/", options)).to.equal(false);
    expect(isIri("a:/p", options)).to.equal(false);
    expect(isIri("b:p#f", options)).to.equal(true);
    expect(isAbsoluteIri("b:p", options)).to.equal(false);
    expect(isIri("c://h/", options)).to.equal(false);
    expect(isIri("c:/p", options)).to.equal(false);
  });
});

describe("urnScheme's arguments", () => {
  test("throws a TypeError for a key that isn't a NID", () => {
    expect(() => urnScheme({ "a.b": {} })).to.throw(TypeError, "Not a NID: a.b");
  });

  test("throws a TypeError for a pattern without exactly the u flag", () => {
    expect(() => urnScheme({ isbn: { pattern: /** @type any */ (/a/) } }))
      .to.throw(TypeError, "The pattern of the isbn namespace must be a RegExp with the u flag and no other");
  });
});

describe("What's wrong with a scheme's rules, and where", () => {
  const options = {
    customSchemes: [
      defineScheme({
        name: "ex",
        rule: "ex-URI",
        validate: { userinfo: "required", port: "required", query: "required", fragment: "forbidden" }
      }),
      defineScheme({ name: "nd", rule: "nd-URI", validate: { path: { pattern: /** @type ComponentPattern<"path"> */ (/(?!)/u) } } })
    ]
  };

  test.each([
    ["a missing authority, where it would go", () => assertIri("http:/a"), {
      rule: "http-URI", reason: "missing-component", component: "authority", start: 5, end: 5,
      message: "Invalid http-URI: http:/a — an http URI must have an authority"
    }],
    ["a component that doesn't match, without its delimiter", () => assertIri("http:///a"), {
      rule: "http-URI", reason: "component-mismatch", component: "host", start: 7, end: 7,
      message: "Invalid http-URI: http:///a — an http URI's host must be non-empty"
    }],
    ["a forbidden component, with its delimiter", () => assertIri("tag://a/b"), {
      rule: "tagURI", reason: "forbidden-component", component: "authority", start: 4, end: 7,
      message: "Invalid tagURI: tag://a/b — a tag URI can't have an authority"
    }],
    ["a forbidden empty query, with its delimiter", () => assertIri("file:///a?"), {
      reason: "forbidden-component", component: "query", start: 9, end: 10,
      message: "Invalid file-URI: file:///a? — a file URI can't have a query"
    }],
    ["forbidden userinfo, with its \"@\"", () => assertIri("file://u@h/a"), {
      reason: "forbidden-component", component: "userinfo", start: 7, end: 9,
      message: "Invalid file-URI: file://u@h/a — a file URI can't have userinfo"
    }],
    ["a forbidden port, with its \":\"", () => assertIri("file://h:1/a"), {
      reason: "forbidden-component", component: "port", start: 8, end: 10
    }],
    ["a mismatched path", () => assertIri("tag:x"), {
      reason: "component-mismatch", component: "path", start: 4, end: 5,
      message: `Invalid tagURI: tag:x — a tag URI's path must be a domain name or an email address, ",", a date, and ":", like example.com,2004:a`
    }],
    ["the rule's name, without a description", () => assertIri("nd:x", options), {
      rule: "nd-URI", reason: "component-mismatch", component: "path", start: 3, end: 4,
      message: "Invalid nd-URI: nd:x — the path doesn't match nd-URI"
    }],
    ["missing userinfo, at the start of the authority", () => assertIri("ex://h:1/?q", options), {
      reason: "missing-component", component: "userinfo", start: 5, end: 5,
      message: "Invalid ex-URI: ex://h:1/?q — an ex URI must have userinfo"
    }],
    ["a missing port, after the host", () => assertIri("ex://u@h/?q", options), {
      reason: "missing-component", component: "port", start: 8, end: 8,
      message: "Invalid ex-URI: ex://u@h/?q — an ex URI must have a port"
    }],
    ["a missing query, after the path", () => assertIri("ex://u@h:1/a#f", options), {
      reason: "missing-component", component: "query", start: 12, end: 12
    }],
    ["a forbidden fragment, with its \"#\"", () => assertIri("ex://u@h:1/a?q#f", options), {
      reason: "forbidden-component", component: "fragment", start: 14, end: 16
    }],
    ["a URN's fragment that isn't ASCII", () => assertIri("urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66#é"), {
      rule: "namestring", reason: "component-mismatch", component: "fragment", start: 46, end: 47,
      message: "Invalid namestring: urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66#é — a urn URI's fragment must be ASCII, with other characters percent-encoded"
    }],
    ["a namespace's rule, spanning only the NSS", () => assertIri("urn:UUID:x"), {
      rule: "namestring", reason: "component-mismatch", component: "path", start: 9, end: 10,
      message: "Invalid namestring: urn:UUID:x — a UUID URN's NSS must be a UUID, like f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
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
});

describe("urnScheme", () => {
  const urn = urnScheme({
    ISBN: {
      pattern: abnf(asciiPath)`DIGIT 1*( DIGIT / "-" ) DIGIT`,
      description: "an ISBN, like 0-395-36341-1",
      normalize: (nss) => nss.replaceAll("-", "")
    },
    example: {}
  });
  const options = { customSchemes: [urn] };

  test("knows the namespaces it's given, without case", () => {
    expect(isIri("urn:isbn:0-395-36341-1", options)).to.equal(true);
    expect(isIri("urn:IsBn:0-395-36341-1", options)).to.equal(true);
    expect(isIri("urn:isbn:x", options)).to.equal(false);
    expect(isIri("urn:example:anything", options)).to.equal(true);
  });

  test("knows uuid unless it's replaced", () => {
    expect(isIri("urn:uuid:x", options)).to.equal(false);
    expect(isIri("urn:uuid:x", { customSchemes: [urnScheme({ uuid: {} })] })).to.equal(true);
  });

  test("checks RFC 8141's rules before the namespace's", () => {
    expect(thrown(() => assertIri("urn:isbn:é", options))).to.include({
      component: "path", start: 4, end: 10,
      message: `Invalid namestring: urn:isbn:é — a urn URI's path must be a NID, ":", and an NSS, in ASCII, like example:a`
    });
  });

  test("a namespace's description is in the error", () => {
    expect(thrown(() => assertIri("urn:isbn:x", options))).to.include({
      message: "Invalid namestring: urn:isbn:x — an isbn URN's NSS must be an ISBN, like 0-395-36341-1"
    });
  });

  test("normalizes the NSS after RFC 8141", () => {
    expect(normalizeIri(trustedIri("URN:ISBN:0-395-36341-1"), options)).to.equal("urn:isbn:0395363411");
  });

  test("throws UnknownUrnNamespaceError for a NID it doesn't know", () => {
    for (const fn of [
      () => isIri("urn:Other:a", options),
      () => assertIri("urn:Other:a", options),
      () => normalizeIri(trustedIri("urn:Other:a"), options),
      () => resolveIri(trustedReference("./Other:a"), trustedBase("urn:isbn:1-2"), options)
    ]) {
      const error = thrown(fn);
      expect(error).to.be.instanceOf(UnknownUrnNamespaceError);
      expect(error).to.include({ name: "UnknownUrnNamespaceError", nid: "other", message: "Unknown URN namespace: other" });
    }
  });

  test("UnknownUrnNamespaceError has the value as written", () => {
    expect(thrown(() => isIri("urn:Other:a"))).to.include({ value: "urn:Other:a", nid: "other" });
  });

  test("the built-in urn is urnScheme({})", () => {
    expect(() => isIri("urn:example:a")).to.throw(UnknownUrnNamespaceError);
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

describe("parseTag", () => {
  test.each([
    ["tag:example.com,2004:a", { authorityName: "example.com", date: "2004", specific: "a" }],
    ["tag:jason@example.com,2004-01-15:a/b:c", { authorityName: "jason@example.com", date: "2004-01-15", specific: "a/b:c" }],
    ["tag:example.com,2004-01:", { authorityName: "example.com", date: "2004-01", specific: "" }],
    ["tag:example.com,2004:a?b#c", { authorityName: "example.com", date: "2004", specific: "a?b", fragment: "c" }],
    ["TAG:Example.com,2004:a#", { authorityName: "Example.com", date: "2004", specific: "a", fragment: "" }]
  ])("parseTag(%s)", (value, expected) => {
    expect(parseTag(trustedIri(value))).to.eql(expected);
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
    ["urn:uuid:6E8BC430-9C3A-11D9-9669-0800200C9A66", "urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66"],
    ["URN:UUID:6e8bc430-9c3a-11d9-9669-0800200c9a66?=a%2fb#c%2fd", "urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66?=a%2Fb#c%2fd"],
    ["TAG:Example.com,2004:a/./%41", "tag:Example.com,2004:a/./%41"] // Only the scheme
  ])("normalizeIri(%s) => %s", (value, expected) => {
    expect(normalizeIri(trustedIri(value))).to.equal(expected);
  });

  test("a URN isn't decoded, and only its scheme and NID are lowercased", () => {
    const options = { customSchemes: [urnScheme({ example: {} })] };
    expect(normalizeIri(trustedIri("URN:EXAMPLE:%41/./B"), options)).to.equal("urn:example:%41/./B");
    expect(normalizeIri(trustedIri("urn:example:a%2fb"), options)).to.equal("urn:example:a%2Fb");
  });

  test("normalizeUri applies a scheme's normalization too", () => {
    expect(normalizeUri(/** @type Uri */ ("http://example.com:80"))).to.equal("http://example.com/");
  });

  test("a custom scheme's functions run after the syntax-based normalization, and only for its components", () => {
    const scheme = defineScheme({
      name: "ex",
      rule: "ex",
      normalize: {
        userinfo: () => undefined,
        host: (host) => host + ".example",
        port: (port) => port === "1" ? undefined : port,
        path: (path) => path.toUpperCase(),
        query: (query) => query === "" ? undefined : query
      }
    });
    const options = { customSchemes: [scheme] };
    expect(normalizeIri(trustedIri("EX://u@H:1/%61?"), options)).to.equal("ex://h.example/A");
    expect(normalizeIri(trustedIri("ex:/a?q"), options)).to.equal("ex:/A?q");
  });

  test("syntaxNormalization: false turns off everything but the scheme's case", () => {
    const options = { customSchemes: [defineScheme({ name: "ex", rule: "ex", syntaxNormalization: false })] };
    expect(normalizeIri(trustedIri("EX://H/%61/./b?%7e#%7e"), options)).to.equal("ex://H/%61/./b?%7e#%7e");
  });
});

describe("lowercaseComponent", () => {
  test.each([
    ["ABC", "abc"],
    ["a%2Fb", "a%2Fb"],
    ["A%2FB%c3%A9", "a%2Fb%c3%A9"],
    ["İ", "İ"],
    ["abc", "abc"]
  ])("lowercaseComponent(%s) => %s", (component, expected) => {
    expect(lowercaseComponent(component)).to.equal(expected);
  });
});

describe("Resolving checks the result's scheme rules", () => {
  test.each([
    ["urn:example:a", "b", "namestring", "path", 0, 1],
    ["urn:example:a", "?q", "namestring", "query", 1, 2],
    ["file:///a", "?q", "file-URI", "query", 0, 2],
    ["http://a/b", "//", "http-URI", "host", 2, 2],
    ["file:///a", "//h", "file-URI", "path", 3, 3],
    ["tag:example.com,2004:a/b", "/c", "tagURI", "path", 0, 2],
    ["tag:example.com,2004:a/b", "../../c", "tagURI", "path", 0, 7], // A merged path spans the reference's path
    ["urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66", "#é", "namestring", "fragment", 1, 2]
  ])("%s against %s", (base, reference, rule, component, start, end) => {
    const options = { customSchemes: [urnScheme({ example: {} })] };
    const error = thrown(() => resolveIri(trustedReference(reference), trustedBase(base), options));
    expect(error).to.be.instanceOf(InvalidIriError);
    expect(error).to.include({ value: reference, rule, component, start, end });
  });

  test("an absolute reference with dot segments is checked too", () => {
    expect(() => resolveIri(trustedReference("tag:example.com,2004:a/../b"), trustedBase("http://a/")))
      .to.throw(InvalidIriError, "Invalid tagURI: tag:example.com,2004:a/../b");
  });

  test.each([
    ["urn:example:a/b", "c", "urn:example:a/c"], // RFC 8141 §4.3 says it "should work predictably"
    ["tag:example.com,2004:a/b", "c", "tag:example.com,2004:a/c"],
    ["tag:example.com,2004:a", "?q", "tag:example.com,2004:a?q"],
    ["file:///a/b", "//h/c", "file://h/c"],
    ["urn:example:a?=q", "#f", "urn:example:a?=q#f"],
    ["http://a/b", "", "http://a/b"]
  ])("%s against %s => %s", (base, reference, expected) => {
    const options = { customSchemes: [urnScheme({ example: {} })] };
    expect(resolveIri(trustedReference(reference), trustedBase(base), options)).to.equal(expected);
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
