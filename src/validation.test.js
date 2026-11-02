import { describe, expect, test } from "vitest";
import { isUri, isUriReference, isAbsoluteUri, isIri, isIriReference, isAbsoluteIri } from "./index.js";


describe("isUri", () => {
  test("Full", () => {
    expect(isUri("https://jason@example.com:80/foo?bar#baz")).to.equal(true);
  });

  test("Scheme is required", () => {
    expect(isUri("//example.com/foo?bar#baz")).to.equal(false);
  });

  test("No authority", () => {
    expect(isUri("uri:/foo?bar#baz")).to.equal(true);
  });

  test("No authority starting with double slash", () => {
    expect(isUri("uri://12:34:56/foo?bar#baz")).to.equal(false);
  });

  test("Rootless path", () => {
    expect(isUri("uri:foo?bar#baz")).to.equal(true);
  });

  test("Unicode is not allowed", () => {
    expect(isUri("http://examplé.org/rosé#")).to.equal(false);
  });

  test("IPvFuture is not supported", () => {
    expect(() => isUri("http://[v7.future]/foo"))
      .to.throw(Error, "Unsupported IP version in host: v7.future");
  });
});

describe("isUriReference", () => {
  test("Full", () => {
    expect(isUriReference("https://jason@example.com:80/foo?bar#baz")).to.equal(true);
  });

  test("No scheme with authority", () => {
    expect(isUriReference("//example.com/foo?bar#baz")).to.equal(true);
  });

  test("No double slash", () => {
    expect(isUriReference("example.com/foo?bar#baz")).to.equal(true);
  });

  test("No authority", () => {
    expect(isUriReference("/foo?bar#baz")).to.equal(true);
  });

  test("No path", () => {
    expect(isUriReference("?bar#baz")).to.equal(true);
  });

  test("No query", () => {
    expect(isUriReference("#baz")).to.equal(true);
  });

  test("Empty", () => {
    expect(isUriReference("")).to.equal(true);
  });

  test("Colon in the first segment of a relative-path reference", () => {
    expect(isUriReference("1:b")).to.equal(false);
  });

  test("Colon in the first segment preceded by a dot-segment", () => {
    expect(isUriReference("./this:that")).to.equal(true);
  });

  test("Colon in the first segment of a path-absolute reference", () => {
    expect(isUriReference("/1:b")).to.equal(true);
  });

  test("Rootless path with colon after a scheme", () => {
    expect(isUriReference("uri:foo:bar")).to.equal(true);
  });

  test("Unicode is not allowed", () => {
    expect(isUriReference("/rosé#")).to.equal(false);
  });

  test("IPvFuture is not supported", () => {
    expect(() => isUriReference("//[V1.a]/foo"))
      .to.throw(Error, "Unsupported IP version in host: V1.a");
  });
});

describe("isAbsoluteUri", () => {
  test("Full", () => {
    expect(isAbsoluteUri("https://jason@example.com:80/foo?bar")).to.equal(true);
  });

  test("Scheme is required", () => {
    expect(isAbsoluteUri("//example.com/foo?bar")).to.equal(false);
  });

  test("Fragment is not allowed", () => {
    expect(isAbsoluteUri("https://example.com/foo?bar#baz")).to.equal(false);
  });

  test("Unicode is not allowed", () => {
    expect(isAbsoluteUri("http://examplé.org/rosé")).to.equal(false);
  });

  test("IPvFuture is not supported", () => {
    expect(() => isAbsoluteUri("http://[v7.future]/foo"))
      .to.throw(Error, "Unsupported IP version in host: v7.future");
  });
});

describe("isIri", () => {
  test("Full", () => {
    expect(isIri("http://jásón@examplé.org:80/rosé?fóo#bár")).to.equal(true);
  });

  test("Scheme is required", () => {
    expect(isIri("//examplé.com/rosé?fóo#bár")).to.equal(false);
  });

  test("No authority", () => {
    expect(isIri("uri:/rosé?fóo#bár")).to.equal(true);
  });

  test("No authority starting with double slash", () => {
    expect(isIri("uri://12:23:45/rosé?fóo#bár")).to.equal(false);
  });

  test("Rootless path", () => {
    expect(isIri("uri:rosé?fóo#bár")).to.equal(true);
  });

  test("Unicode is not allowed in scheme", () => {
    expect(isAbsoluteIri("examplé://examplé.org/rosé")).to.equal(false);
  });

  test("IPvFuture is not supported", () => {
    expect(() => isIri("http://[v7.future]/rosé"))
      .to.throw(Error, "Unsupported IP version in host: v7.future");
  });
});

describe("isIriReference", () => {
  test("Full", () => {
    expect(isIriReference("http://jásón@examplé.org:80/rosé?fóo#bár")).to.equal(true);
  });

  test("No scheme with authority", () => {
    expect(isIriReference("//examplé.org/rosé?fóo#bár")).to.equal(true);
  });

  test("No double slash", () => {
    expect(isIriReference("examplé.org/rosé?fóo#bár")).to.equal(true);
  });

  test("No authority", () => {
    expect(isIriReference("/rosé?fóo#bár")).to.equal(true);
  });

  test("Rootless path", () => {
    expect(isIriReference("rosé?fóo#bár")).to.equal(true);
  });

  test("No path", () => {
    expect(isIriReference("?fóo#bár")).to.equal(true);
  });

  test("No query", () => {
    expect(isIriReference("#bár")).to.equal(true);
  });

  test("Empty", () => {
    expect(isIriReference("")).to.equal(true);
  });

  test("Colon in the first segment of a relative-path reference", () => {
    expect(isIriReference("1:rosé")).to.equal(false);
  });

  test("IPvFuture is not supported", () => {
    expect(() => isIriReference("//[vF.a]/rosé"))
      .to.throw(Error, "Unsupported IP version in host: vF.a");
  });
});

describe("isAbsoluteIri", () => {
  test("Full", () => {
    expect(isAbsoluteIri("http://jásón@examplé.org:80/rosé?fóo")).to.equal(true);
  });

  test("Scheme is required", () => {
    expect(isAbsoluteIri("//examplé.org/rosé?fóo")).to.equal(false);
  });

  test("Fragment is not allowed", () => {
    expect(isAbsoluteIri("http://examplé.org/rosé?fóo#bár")).to.equal(false);
  });

  test("Unicode is not allowed in scheme", () => {
    expect(isAbsoluteIri("examplé://examplé.org/rosé")).to.equal(false);
  });

  test("IPvFuture is not supported", () => {
    expect(() => isAbsoluteIri("http://[v7.future]/rosé"))
      .to.throw(Error, "Unsupported IP version in host: v7.future");
  });
});
