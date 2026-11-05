import { describe, expect, test } from "vitest";
import { getFragment, getPath, getQuery, getScheme, parseIri } from "./index.js";

/** @import { Iri, IriReference } from "./index.d.ts" */

describe("parseIri, a URI", () => {
  test("Full", () => {
    expect(parseIri(trusted("https://jason@example.com:80/foo?bar#baz"))).to.eql({
      scheme: "https",
      authority: "jason@example.com:80",
      userinfo: "jason",
      host: "example.com",
      port: "80",
      path: "/foo",
      query: "bar",
      fragment: "baz"
    });
  });

  test("No path with query", () => {
    expect(parseIri(trusted("https://example.org?bar"))).to.eql({
      scheme: "https",
      authority: "example.org",
      host: "example.org",
      path: "",
      query: "bar"
    });
  });

  test("No path with fragment", () => {
    expect(parseIri(trusted("https://example.org#baz"))).to.eql({
      scheme: "https",
      authority: "example.org",
      host: "example.org",
      path: "",
      fragment: "baz"
    });
  });

  test("No authority", () => {
    expect(parseIri(trusted("uri:/foo?bar#baz"))).to.eql({
      scheme: "uri",
      path: "/foo",
      query: "bar",
      fragment: "baz"
    });
  });

  test("Rootless path", () => {
    expect(parseIri(trusted("uri:foo?bar#baz"))).to.eql({
      scheme: "uri",
      path: "foo",
      query: "bar",
      fragment: "baz"
    });
  });
});

describe("parseIri, a URI-reference", () => {
  test("Full", () => {
    expect(parseIri(trusted("https://jason@example.com:80/foo?bar#baz"))).to.eql({
      scheme: "https",
      authority: "jason@example.com:80",
      userinfo: "jason",
      host: "example.com",
      port: "80",
      path: "/foo",
      query: "bar",
      fragment: "baz"
    });
  });

  test("No path with query", () => {
    expect(parseIri(trusted("https://example.org?bar"))).to.eql({
      scheme: "https",
      authority: "example.org",
      host: "example.org",
      path: "",
      query: "bar"
    });
  });

  test("No path with fragment", () => {
    expect(parseIri(trusted("https://example.org#baz"))).to.eql({
      scheme: "https",
      authority: "example.org",
      host: "example.org",
      path: "",
      fragment: "baz"
    });
  });

  test("No scheme with authority", () => {
    expect(parseIri(trusted("//example.com/foo?bar#baz"))).to.eql({
      authority: "example.com",
      host: "example.com",
      path: "/foo",
      query: "bar",
      fragment: "baz"
    });
  });

  test("No double slash", () => {
    expect(parseIri(trusted("example.com/foo?bar#baz"))).to.eql({
      path: "example.com/foo",
      query: "bar",
      fragment: "baz"
    });
  });

  test("No authority", () => {
    expect(parseIri(trusted("/foo?bar#baz"))).to.eql({
      path: "/foo",
      query: "bar",
      fragment: "baz"
    });
  });

  test("No path", () => {
    expect(parseIri(trusted("?bar#baz"))).to.eql({
      path: "",
      query: "bar",
      fragment: "baz"
    });
  });

  test("No query", () => {
    expect(parseIri(trusted("#baz"))).to.eql({
      path: "",
      fragment: "baz"
    });
  });

  test("Empty", () => {
    expect(parseIri(trusted(""))).to.eql({
      path: ""
    });
  });
});

describe("parseIri, an absolute-URI", () => {
  test("Full", () => {
    expect(parseIri(trusted("https://jason@example.com:80/foo?bar"))).to.eql({
      scheme: "https",
      authority: "jason@example.com:80",
      userinfo: "jason",
      host: "example.com",
      port: "80",
      path: "/foo",
      query: "bar"
    });
  });
});

describe("parseIri, an IRI", () => {
  test("Full", () => {
    expect(parseIri(trusted("http://jásón@examplé.org:80/rosé?fóo#bár"))).to.eql({
      scheme: "http",
      authority: "jásón@examplé.org:80",
      userinfo: "jásón",
      host: "examplé.org",
      port: "80",
      path: "/rosé",
      query: "fóo",
      fragment: "bár"
    });
  });

  test("No path with query", () => {
    expect(parseIri(trusted("http://examplé.org?fóo"))).to.eql({
      scheme: "http",
      authority: "examplé.org",
      host: "examplé.org",
      path: "",
      query: "fóo"
    });
  });

  test("No path with fragment", () => {
    expect(parseIri(trusted("http://examplé.org#bár"))).to.eql({
      scheme: "http",
      authority: "examplé.org",
      host: "examplé.org",
      path: "",
      fragment: "bár"
    });
  });

  test("No authority", () => {
    expect(parseIri(trusted("uri:/rosé?fóo#bár"))).to.eql({
      scheme: "uri",
      path: "/rosé",
      query: "fóo",
      fragment: "bár"
    });
  });

  test("Rootless path", () => {
    expect(parseIri(trusted("uri:rosé?fóo#bár"))).to.eql({
      scheme: "uri",
      path: "rosé",
      query: "fóo",
      fragment: "bár"
    });
  });
});

describe("parseIri, an IRI-reference", () => {
  test("Full", () => {
    expect(parseIri(trusted("http://jásón@examplé.org:80/rosé?fóo#bár"))).to.eql({
      scheme: "http",
      authority: "jásón@examplé.org:80",
      userinfo: "jásón",
      host: "examplé.org",
      port: "80",
      path: "/rosé",
      query: "fóo",
      fragment: "bár"
    });
  });

  test("No path with query", () => {
    expect(parseIri(trusted("http://examplé.org?fóo"))).to.eql({
      scheme: "http",
      authority: "examplé.org",
      host: "examplé.org",
      path: "",
      query: "fóo"
    });
  });

  test("No path with fragment", () => {
    expect(parseIri(trusted("http://examplé.org#bár"))).to.eql({
      scheme: "http",
      authority: "examplé.org",
      host: "examplé.org",
      path: "",
      fragment: "bár"
    });
  });

  test("No scheme with authority", () => {
    expect(parseIri(trusted("//examplé.org/rosé?fóo#bár"))).to.eql({
      authority: "examplé.org",
      host: "examplé.org",
      path: "/rosé",
      query: "fóo",
      fragment: "bár"
    });
  });

  test("No double slash", () => {
    expect(parseIri(trusted("examplé.org/rosé?fóo#bár"))).to.eql({
      path: "examplé.org/rosé",
      query: "fóo",
      fragment: "bár"
    });
  });

  test("No authority", () => {
    expect(parseIri(trusted("/rosé?fóo#bár"))).to.eql({
      path: "/rosé",
      query: "fóo",
      fragment: "bár"
    });
  });

  test("Rootless path", () => {
    expect(parseIri(trusted("rosé?fóo#bár"))).to.eql({
      path: "rosé",
      query: "fóo",
      fragment: "bár"
    });
  });

  test("Query and fragment", () => {
    expect(parseIri(trusted("?fóo#bár"))).to.eql({
      path: "",
      query: "fóo",
      fragment: "bár"
    });
  });

  test("Query only", () => {
    expect(parseIri(trusted("?fóo"))).to.eql({
      path: "",
      query: "fóo"
    });
  });

  test("Fragment only", () => {
    expect(parseIri(trusted("#bár"))).to.eql({
      path: "",
      fragment: "bár"
    });
  });

  test("Empty", () => {
    expect(parseIri(trusted(""))).to.eql({
      path: ""
    });
  });
});

describe("parseIri, an absolute-IRI", () => {
  test("Full", () => {
    expect(parseIri(trusted("http://jásón@examplé.org:80/rosé?fóo"))).to.eql({
      scheme: "http",
      authority: "jásón@examplé.org:80",
      userinfo: "jásón",
      host: "examplé.org",
      port: "80",
      path: "/rosé",
      query: "fóo"
    });
  });
});

describe("parsed components", () => {
  test("a component that isn't there isn't a property", () => {
    const components = parseIri(trusted("urn:example:foo"));
    expect(Object.keys(components)).to.eql(["scheme", "path"]);
    expect("authority" in components).to.equal(false);
  });

  test("an empty component is an empty string", () => {
    expect(parseIri(trusted("https://@example.com:?#"))).to.eql({
      scheme: "https",
      authority: "@example.com:",
      userinfo: "",
      host: "example.com",
      port: "",
      path: "",
      query: "",
      fragment: ""
    });
  });

  // The components are split at their delimiters, so these are where a delimiter could be mistaken for the end of a
  // component
  test.each([
    ["http://[::1]:8080/a", { scheme: "http", authority: "[::1]:8080", host: "[::1]", port: "8080", path: "/a" }],
    ["http://[::1]/a", { scheme: "http", authority: "[::1]", host: "[::1]", path: "/a" }],
    ["http://a:b@example.com/", { scheme: "http", authority: "a:b@example.com", userinfo: "a:b", host: "example.com", path: "/" }],
    ["http://example.com:/", { scheme: "http", authority: "example.com:", host: "example.com", port: "", path: "/" }],
    ["file:///a", { scheme: "file", authority: "", host: "", path: "/a" }],
    ["foo:/.//a", { scheme: "foo", path: "/.//a" }],
    ["foo:a/b:c", { scheme: "foo", path: "a/b:c" }],
    ["foo:?a?b:c", { scheme: "foo", path: "", query: "a?b:c" }],
    ["foo:#a?b:c/d", { scheme: "foo", path: "", fragment: "a?b:c/d" }],
    ["http://a?b/c", { scheme: "http", authority: "a", host: "a", path: "", query: "b/c" }],
    ["http://a#b/c", { scheme: "http", authority: "a", host: "a", path: "", fragment: "b/c" }]
  ])("parseIri(trusted(%s)", (value, expected) => {
    expect(parseIri(trusted(value))).to.eql(expected);
  });

  test.each([
    ["a/b:c", { path: "a/b:c" }],
    ["a?b:c", { path: "a", query: "b:c" }],
    ["a#b:c", { path: "a", fragment: "b:c" }],
    ["//a:1/b", { authority: "a:1", host: "a", port: "1", path: "/b" }],
    ["", { path: "" }]
  ])("parseIri(trusted(%s)", (value, expected) => {
    expect(parseIri(trusted(value))).to.eql(expected);
  });

  test("an IP literal of a future version is parsed", () => {
    expect(parseIri(trusted("http://[v7.future]/foo"))).to.eql({
      scheme: "http",
      authority: "[v7.future]",
      host: "[v7.future]",
      path: "/foo"
    });
  });
});

describe("getScheme, getPath, getQuery, and getFragment", () => {
  const iris = [
    "https://jason:pass@example.com:80/a:b?c:d#e:f",
    "https://[::1]:8080/a",
    "urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66",
    "file:///a/b#",
    "tag:example.com,2004:a?b#c?d#",
    "a+b-c.d:e",
    "x:?#"
  ];
  const references = [
    ...iris, "#a:b", "?a#b?c", "//h/a#b", "a/b:c", "", "#", "//h", "//h?q", "//[::1]:80", "///a", "a?", "./a:b?c:d", "/a//b"
  ];

  test.each(iris)("getScheme(%s) is parseIri's scheme", (value) => {
    expect(getScheme(trustedIri(value))).to.equal(parseIri(trustedIri(value)).scheme);
  });

  test.each(references)("getPath(%s) is parseIri's path", (value) => {
    expect(getPath(trusted(value))).to.equal(parseIri(trusted(value)).path);
  });

  test.each(references)("getQuery(%s) is parseIri's query", (value) => {
    expect(getQuery(trusted(value))).to.equal(parseIri(trusted(value)).query);
  });

  test.each(references)("getFragment(%s) is parseIri's fragment", (value) => {
    expect(getFragment(trusted(value))).to.equal(parseIri(trusted(value)).fragment);
  });

  test("a query or fragment that isn't there is undefined, and an empty one is \"\"", () => {
    expect(getQuery(trusted("a#?"))).to.equal(undefined);
    expect(getQuery(trusted("a?"))).to.equal("");
    expect(getFragment(trusted("a"))).to.equal(undefined);
    expect(getFragment(trusted("a#"))).to.equal("");
  });
});

// parseIri trusts what it's given, so these are cast, like a value a validator checked
/** @type (value: string) => IriReference */
const trusted = (value) => /** @type IriReference */ (value);

/** @type (value: string) => Iri */
const trustedIri = (value) => /** @type Iri */ (value);
