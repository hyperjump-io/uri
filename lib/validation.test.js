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

  test("Rootless path", () => {
    expect(isUri("uri:foo?bar#baz")).to.equal(true);
  });

  test("Unicode is not allowed", () => {
    expect(isUri("http://examplé.org/rosé#")).to.equal(false);
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

  test("Unicode is not allowed", () => {
    expect(isUriReference("/rosé#")).to.equal(false);
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

  test("Rootless path", () => {
    expect(isIri("uri:rosé?fóo#bár")).to.equal(true);
  });

  test("Unicode is not allowed in scheme", () => {
    expect(isAbsoluteIri("examplé://examplé.org/rosé")).to.equal(false);
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
});
