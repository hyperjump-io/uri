import {
  parseUri, parseUriReference, parseAbsoluteUri,
  parseIri, parseIriReference, parseAbsoluteIri
} from "./index.js";
import { expect } from "chai";


describe("parseUri", () => {
  it("Full", () => {
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

  it("No path with query", () => {
    expect(parseUri("https://example.org?bar")).to.eql({
      scheme: "https",
      authority: "example.org",
      userinfo: undefined,
      host: "example.org",
      port: undefined,
      path: "",
      query: "bar",
      fragment: undefined
    });
  });

  it("No path with fragment", () => {
    expect(parseUri("https://example.org#baz")).to.eql({
      scheme: "https",
      authority: "example.org",
      userinfo: undefined,
      host: "example.org",
      port: undefined,
      path: "",
      query: undefined,
      fragment: "baz"
    });
  });

  it("Scheme is required", () => {
    expect(() => parseUri("//example.com/foo?bar#baz"))
      .to.throw(Error, "Invalid URI: //example.com/foo?bar#baz");
  });

  it("No authority", () => {
    expect(parseUri("uri:/foo?bar#baz")).to.eql({
      scheme: "uri",
      authority: undefined,
      userinfo: undefined,
      host: undefined,
      port: undefined,
      path: "/foo",
      query: "bar",
      fragment: "baz"
    });
  });

  it("Rootless path", () => {
    expect(parseUri("uri:foo?bar#baz")).to.eql({
      scheme: "uri",
      authority: undefined,
      userinfo: undefined,
      host: undefined,
      port: undefined,
      path: "foo",
      query: "bar",
      fragment: "baz"
    });
  });

  it("Unicode is not allowed", () => {
    expect(() => parseUri("http://examplé.org/rosé#"))
      .to.throw(Error, "Invalid URI: http://examplé.org/rosé#");
  });
});

describe("isUriReference", () => {
  it("Full", () => {
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

  it("No path with query", () => {
    expect(parseUriReference("https://example.org?bar")).to.eql({
      scheme: "https",
      authority: "example.org",
      userinfo: undefined,
      host: "example.org",
      port: undefined,
      path: "",
      query: "bar",
      fragment: undefined
    });
  });

  it("No path with fragment", () => {
    expect(parseUriReference("https://example.org#baz")).to.eql({
      scheme: "https",
      authority: "example.org",
      userinfo: undefined,
      host: "example.org",
      port: undefined,
      path: "",
      query: undefined,
      fragment: "baz"
    });
  });

  it("No scheme with authority", () => {
    expect(parseUriReference("//example.com/foo?bar#baz")).to.eql({
      scheme: undefined,
      authority: "example.com",
      userinfo: undefined,
      host: "example.com",
      port: undefined,
      path: "/foo",
      query: "bar",
      fragment: "baz"
    });
  });

  it("No double slash", () => {
    expect(parseUriReference("example.com/foo?bar#baz")).to.eql({
      scheme: undefined,
      authority: undefined,
      userinfo: undefined,
      host: undefined,
      port: undefined,
      path: "example.com/foo",
      query: "bar",
      fragment: "baz"
    });
  });

  it("No authority", () => {
    expect(parseUriReference("/foo?bar#baz")).to.eql({
      scheme: undefined,
      authority: undefined,
      userinfo: undefined,
      host: undefined,
      port: undefined,
      path: "/foo",
      query: "bar",
      fragment: "baz"
    });
  });

  it("No path", () => {
    expect(parseUriReference("?bar#baz")).to.eql({
      scheme: undefined,
      authority: undefined,
      userinfo: undefined,
      host: undefined,
      port: undefined,
      path: "",
      query: "bar",
      fragment: "baz"
    });
  });

  it("No query", () => {
    expect(parseUriReference("#baz")).to.eql({
      scheme: undefined,
      authority: undefined,
      userinfo: undefined,
      host: undefined,
      port: undefined,
      path: "",
      query: undefined,
      fragment: "baz"
    });
  });

  it("Empty", () => {
    expect(parseUriReference("")).to.eql({
      scheme: undefined,
      authority: undefined,
      userinfo: undefined,
      host: undefined,
      port: undefined,
      path: "",
      query: undefined,
      fragment: undefined
    });
  });

  it("Unicode is not allowed", () => {
    expect(() => parseUriReference("/rosé#"))
      .to.throw(Error, "Invalid URI-reference: /rosé#");
  });
});

describe("isAbsoluteUri", () => {
  it("Full", () => {
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

  it("Scheme is required", () => {
    expect(() => parseAbsoluteUri("//example.com/foo?bar"))
      .to.throw(Error, "Invalid absolute-URI: //example.com/foo?bar");
  });

  it("Fragment is not allowed", () => {
    expect(() => parseAbsoluteUri("https://example.com/foo?bar#baz"))
      .to.throw(Error, "Invalid absolute-URI: https://example.com/foo?bar#baz");
  });

  it("Unicode is not allowed", () => {
    expect(() => parseAbsoluteUri("http://examplé.org/rosé"))
      .to.throw(Error, "Invalid absolute-URI: http://examplé.org/rosé");
  });
});

describe("parseIri", () => {
  it("Full", () => {
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

  it("No path with query", () => {
    expect(parseIri("http://examplé.org?fóo")).to.eql({
      scheme: "http",
      authority: "examplé.org",
      userinfo: undefined,
      host: "examplé.org",
      port: undefined,
      path: "",
      query: "fóo",
      fragment: undefined
    });
  });

  it("No path with fragment", () => {
    expect(parseIri("http://examplé.org#bár")).to.eql({
      scheme: "http",
      authority: "examplé.org",
      userinfo: undefined,
      host: "examplé.org",
      port: undefined,
      path: "",
      query: undefined,
      fragment: "bár"
    });
  });

  it("Scheme is required", () => {
    expect(() => parseIri("//examplé.com/rosé?fóo#bár"))
      .to.throw(Error, "Invalid IRI: //examplé.com/rosé?fóo#bár");
  });

  it("No authority", () => {
    expect(parseIri("uri:/rosé?fóo#bár")).to.eql({
      scheme: "uri",
      authority: undefined,
      userinfo: undefined,
      host: undefined,
      port: undefined,
      path: "/rosé",
      query: "fóo",
      fragment: "bár"
    });
  });

  it("Rootless path", () => {
    expect(parseIri("uri:rosé?fóo#bár")).to.eql({
      scheme: "uri",
      authority: undefined,
      userinfo: undefined,
      host: undefined,
      port: undefined,
      path: "rosé",
      query: "fóo",
      fragment: "bár"
    });
  });

  it("Unicode is not allowed in scheme", () => {
    expect(() => parseIri("examplé://examplé.org/rosé"))
      .to.throw(Error, "Invalid IRI: examplé://examplé.org/rosé");
  });
});

describe("parseIriReference", () => {
  it("Full", () => {
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

  it("No path with query", () => {
    expect(parseIriReference("http://examplé.org?fóo")).to.eql({
      scheme: "http",
      authority: "examplé.org",
      userinfo: undefined,
      host: "examplé.org",
      port: undefined,
      path: "",
      query: "fóo",
      fragment: undefined
    });
  });

  it("No path with fragment", () => {
    expect(parseIriReference("http://examplé.org#bár")).to.eql({
      scheme: "http",
      authority: "examplé.org",
      userinfo: undefined,
      host: "examplé.org",
      port: undefined,
      path: "",
      query: undefined,
      fragment: "bár"
    });
  });

  it("No scheme with authority", () => {
    expect(parseIriReference("//examplé.org/rosé?fóo#bár")).to.eql({
      scheme: undefined,
      authority: "examplé.org",
      userinfo: undefined,
      host: "examplé.org",
      port: undefined,
      path: "/rosé",
      query: "fóo",
      fragment: "bár"
    });
  });

  it("No double slash", () => {
    expect(parseIriReference("examplé.org/rosé?fóo#bár")).to.eql({
      scheme: undefined,
      authority: undefined,
      userinfo: undefined,
      host: undefined,
      port: undefined,
      path: "examplé.org/rosé",
      query: "fóo",
      fragment: "bár"
    });
  });

  it("No authority", () => {
    expect(parseIriReference("/rosé?fóo#bár")).to.eql({
      scheme: undefined,
      authority: undefined,
      userinfo: undefined,
      host: undefined,
      port: undefined,
      path: "/rosé",
      query: "fóo",
      fragment: "bár"
    });
  });

  it("Rootless path", () => {
    expect(parseIriReference("rosé?fóo#bár")).to.eql({
      scheme: undefined,
      authority: undefined,
      userinfo: undefined,
      host: undefined,
      port: undefined,
      path: "rosé",
      query: "fóo",
      fragment: "bár"
    });
  });

  it("Query and fragment", () => {
    expect(parseIriReference("?fóo#bár")).to.eql({
      scheme: undefined,
      authority: undefined,
      userinfo: undefined,
      host: undefined,
      port: undefined,
      path: "",
      query: "fóo",
      fragment: "bár"
    });
  });

  it("Query only", () => {
    expect(parseIriReference("?fóo")).to.eql({
      scheme: undefined,
      authority: undefined,
      userinfo: undefined,
      host: undefined,
      port: undefined,
      path: "",
      query: "fóo",
      fragment: undefined
    });
  });

  it("Fragment only", () => {
    expect(parseIriReference("#bár")).to.eql({
      scheme: undefined,
      authority: undefined,
      userinfo: undefined,
      host: undefined,
      port: undefined,
      path: "",
      query: undefined,
      fragment: "bár"
    });
  });

  it("Empty", () => {
    expect(parseIriReference("")).to.eql({
      scheme: undefined,
      authority: undefined,
      userinfo: undefined,
      host: undefined,
      port: undefined,
      path: "",
      query: undefined,
      fragment: undefined
    });
  });
});

describe("parseAbsoluteIri", () => {
  it("Full", () => {
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

  it("Scheme is required", () => {
    expect(() => parseAbsoluteIri("//examplé.org/rosé?fóo"))
      .to.throw(Error, "Invalid absolute-IRI: //examplé.org/rosé?fóo");
  });

  it("Fragment is not allowed", () => {
    expect(() => parseAbsoluteIri("http://examplé.org/rosé?fóo#bár"))
      .to.throw(Error, "Invalid absolute-IRI: http://examplé.org/rosé?fóo#bár");
  });

  it("Unicode is not allowed in scheme", () => {
    expect(() => parseAbsoluteIri("examplé://examplé.org/rosé"))
      .to.throw(Error, "Invalid absolute-IRI: examplé://examplé.org/rosé");
  });
});
