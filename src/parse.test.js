import { describe, expect, test } from "vitest";
import {
  parseUri, parseUriReference, parseAbsoluteUri,
  parseIri, parseIriReference, parseAbsoluteIri
} from "./index.js";

describe("parseUri", () => {
  test("Full", () => {
    expect(parseUri("https://jason@example.com:80/foo?bar#baz")).to.eql({
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
    expect(parseUri("https://example.org?bar")).to.eql({
      scheme: "https",
      authority: "example.org",
      host: "example.org",
      path: "",
      query: "bar"
    });
  });

  test("No path with fragment", () => {
    expect(parseUri("https://example.org#baz")).to.eql({
      scheme: "https",
      authority: "example.org",
      host: "example.org",
      path: "",
      fragment: "baz"
    });
  });

  test("Scheme is required", () => {
    expect(() => parseUri("//example.com/foo?bar#baz"))
      .to.throw(Error, "Invalid URI: //example.com/foo?bar#baz");
  });

  test("No authority", () => {
    expect(parseUri("uri:/foo?bar#baz")).to.eql({
      scheme: "uri",
      path: "/foo",
      query: "bar",
      fragment: "baz"
    });
  });

  test("Rootless path", () => {
    expect(parseUri("uri:foo?bar#baz")).to.eql({
      scheme: "uri",
      path: "foo",
      query: "bar",
      fragment: "baz"
    });
  });

  test("Unicode is not allowed", () => {
    expect(() => parseUri("http://examplé.org/rosé#"))
      .to.throw(Error, "Invalid URI: http://examplé.org/rosé#");
  });
});

describe("parseUriReference", () => {
  test("Full", () => {
    expect(parseUriReference("https://jason@example.com:80/foo?bar#baz")).to.eql({
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
    expect(parseUriReference("https://example.org?bar")).to.eql({
      scheme: "https",
      authority: "example.org",
      host: "example.org",
      path: "",
      query: "bar"
    });
  });

  test("No path with fragment", () => {
    expect(parseUriReference("https://example.org#baz")).to.eql({
      scheme: "https",
      authority: "example.org",
      host: "example.org",
      path: "",
      fragment: "baz"
    });
  });

  test("No scheme with authority", () => {
    expect(parseUriReference("//example.com/foo?bar#baz")).to.eql({
      authority: "example.com",
      host: "example.com",
      path: "/foo",
      query: "bar",
      fragment: "baz"
    });
  });

  test("No double slash", () => {
    expect(parseUriReference("example.com/foo?bar#baz")).to.eql({
      path: "example.com/foo",
      query: "bar",
      fragment: "baz"
    });
  });

  test("No authority", () => {
    expect(parseUriReference("/foo?bar#baz")).to.eql({
      path: "/foo",
      query: "bar",
      fragment: "baz"
    });
  });

  test("No path", () => {
    expect(parseUriReference("?bar#baz")).to.eql({
      path: "",
      query: "bar",
      fragment: "baz"
    });
  });

  test("No query", () => {
    expect(parseUriReference("#baz")).to.eql({
      path: "",
      fragment: "baz"
    });
  });

  test("Empty", () => {
    expect(parseUriReference("")).to.eql({
      path: ""
    });
  });

  test("Unicode is not allowed", () => {
    expect(() => parseUriReference("/rosé#"))
      .to.throw(Error, "Invalid URI-reference: /rosé#");
  });
});

describe("parseAbsoluteUri", () => {
  test("Full", () => {
    expect(parseAbsoluteUri("https://jason@example.com:80/foo?bar")).to.eql({
      scheme: "https",
      authority: "jason@example.com:80",
      userinfo: "jason",
      host: "example.com",
      port: "80",
      path: "/foo",
      query: "bar"
    });
  });

  test("Scheme is required", () => {
    expect(() => parseAbsoluteUri("//example.com/foo?bar"))
      .to.throw(Error, "Invalid absolute-URI: //example.com/foo?bar");
  });

  test("Fragment is not allowed", () => {
    expect(() => parseAbsoluteUri("https://example.com/foo?bar#baz"))
      .to.throw(Error, "Invalid absolute-URI: https://example.com/foo?bar#baz");
  });

  test("Unicode is not allowed", () => {
    expect(() => parseAbsoluteUri("http://examplé.org/rosé"))
      .to.throw(Error, "Invalid absolute-URI: http://examplé.org/rosé");
  });
});

describe("parseIri", () => {
  test("Full", () => {
    expect(parseIri("http://jásón@examplé.org:80/rosé?fóo#bár")).to.eql({
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
    expect(parseIri("http://examplé.org?fóo")).to.eql({
      scheme: "http",
      authority: "examplé.org",
      host: "examplé.org",
      path: "",
      query: "fóo"
    });
  });

  test("No path with fragment", () => {
    expect(parseIri("http://examplé.org#bár")).to.eql({
      scheme: "http",
      authority: "examplé.org",
      host: "examplé.org",
      path: "",
      fragment: "bár"
    });
  });

  test("Scheme is required", () => {
    expect(() => parseIri("//examplé.com/rosé?fóo#bár"))
      .to.throw(Error, "Invalid IRI: //examplé.com/rosé?fóo#bár");
  });

  test("No authority", () => {
    expect(parseIri("uri:/rosé?fóo#bár")).to.eql({
      scheme: "uri",
      path: "/rosé",
      query: "fóo",
      fragment: "bár"
    });
  });

  test("Rootless path", () => {
    expect(parseIri("uri:rosé?fóo#bár")).to.eql({
      scheme: "uri",
      path: "rosé",
      query: "fóo",
      fragment: "bár"
    });
  });

  test("Unicode is not allowed in scheme", () => {
    expect(() => parseIri("examplé://examplé.org/rosé"))
      .to.throw(Error, "Invalid IRI: examplé://examplé.org/rosé");
  });
});

describe("parseIriReference", () => {
  test("Full", () => {
    expect(parseIriReference("http://jásón@examplé.org:80/rosé?fóo#bár")).to.eql({
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
    expect(parseIriReference("http://examplé.org?fóo")).to.eql({
      scheme: "http",
      authority: "examplé.org",
      host: "examplé.org",
      path: "",
      query: "fóo"
    });
  });

  test("No path with fragment", () => {
    expect(parseIriReference("http://examplé.org#bár")).to.eql({
      scheme: "http",
      authority: "examplé.org",
      host: "examplé.org",
      path: "",
      fragment: "bár"
    });
  });

  test("No scheme with authority", () => {
    expect(parseIriReference("//examplé.org/rosé?fóo#bár")).to.eql({
      authority: "examplé.org",
      host: "examplé.org",
      path: "/rosé",
      query: "fóo",
      fragment: "bár"
    });
  });

  test("No double slash", () => {
    expect(parseIriReference("examplé.org/rosé?fóo#bár")).to.eql({
      path: "examplé.org/rosé",
      query: "fóo",
      fragment: "bár"
    });
  });

  test("No authority", () => {
    expect(parseIriReference("/rosé?fóo#bár")).to.eql({
      path: "/rosé",
      query: "fóo",
      fragment: "bár"
    });
  });

  test("Rootless path", () => {
    expect(parseIriReference("rosé?fóo#bár")).to.eql({
      path: "rosé",
      query: "fóo",
      fragment: "bár"
    });
  });

  test("Query and fragment", () => {
    expect(parseIriReference("?fóo#bár")).to.eql({
      path: "",
      query: "fóo",
      fragment: "bár"
    });
  });

  test("Query only", () => {
    expect(parseIriReference("?fóo")).to.eql({
      path: "",
      query: "fóo"
    });
  });

  test("Fragment only", () => {
    expect(parseIriReference("#bár")).to.eql({
      path: "",
      fragment: "bár"
    });
  });

  test("Empty", () => {
    expect(parseIriReference("")).to.eql({
      path: ""
    });
  });
});

describe("parseAbsoluteIri", () => {
  test("Full", () => {
    expect(parseAbsoluteIri("http://jásón@examplé.org:80/rosé?fóo")).to.eql({
      scheme: "http",
      authority: "jásón@examplé.org:80",
      userinfo: "jásón",
      host: "examplé.org",
      port: "80",
      path: "/rosé",
      query: "fóo"
    });
  });

  test("Scheme is required", () => {
    expect(() => parseAbsoluteIri("//examplé.org/rosé?fóo"))
      .to.throw(Error, "Invalid absolute-IRI: //examplé.org/rosé?fóo");
  });

  test("Fragment is not allowed", () => {
    expect(() => parseAbsoluteIri("http://examplé.org/rosé?fóo#bár"))
      .to.throw(Error, "Invalid absolute-IRI: http://examplé.org/rosé?fóo#bár");
  });

  test("Unicode is not allowed in scheme", () => {
    expect(() => parseAbsoluteIri("examplé://examplé.org/rosé"))
      .to.throw(Error, "Invalid absolute-IRI: examplé://examplé.org/rosé");
  });
});

describe("parsed components", () => {
  test("a component that isn't there isn't a property", () => {
    const components = parseUri("urn:example:foo");
    expect(Object.keys(components)).to.eql(["scheme", "path"]);
    expect("authority" in components).to.equal(false);
  });

  test("an empty component is an empty string", () => {
    expect(parseUri("https://@example.com:?#")).to.eql({
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

  test("an IP literal of a future version is parsed", () => {
    expect(parseUri("http://[v7.future]/foo")).to.eql({
      scheme: "http",
      authority: "[v7.future]",
      host: "[v7.future]",
      path: "/foo"
    });
  });
});
