import { isUri, isUriReference, isAbsoluteUri, isIri, isIriReference, isAbsoluteIri } from "./index.js";
import { expect } from "chai";


describe("isUri", () => {
  it("Full", () => {
    expect(isUri("https://jason@example.com:80/foo?bar#baz")).to.equal(true);
  });

  it("Scheme is required", () => {
    expect(isUri("//example.com/foo?bar#baz")).to.equal(false);
  });

  it("No authority", () => {
    expect(isUri("uri:/foo?bar#baz")).to.equal(true);
  });

  it("Rootless path", () => {
    expect(isUri("uri:foo?bar#baz")).to.equal(true);
  });

  it("Unicode is not allowed", () => {
    expect(isUri("http://examplé.org/rosé#")).to.equal(false);
  });
});

describe("isUriReference", () => {
  it("Full", () => {
    expect(isUriReference("https://jason@example.com:80/foo?bar#baz")).to.equal(true);
  });

  it("No scheme with authority", () => {
    expect(isUriReference("//example.com/foo?bar#baz")).to.equal(true);
  });

  it("No double slash", () => {
    expect(isUriReference("example.com/foo?bar#baz")).to.equal(true);
  });

  it("No authority", () => {
    expect(isUriReference("/foo?bar#baz")).to.equal(true);
  });

  it("No path", () => {
    expect(isUriReference("?bar#baz")).to.equal(true);
  });

  it("No query", () => {
    expect(isUriReference("#baz")).to.equal(true);
  });

  it("Empty", () => {
    expect(isUriReference("")).to.equal(true);
  });

  it("Unicode is not allowed", () => {
    expect(isUriReference("/rosé#")).to.equal(false);
  });
});

describe("isAbsoluteUri", () => {
  it("Full", () => {
    expect(isAbsoluteUri("https://jason@example.com:80/foo?bar")).to.equal(true);
  });

  it("Scheme is required", () => {
    expect(isAbsoluteUri("//example.com/foo?bar")).to.equal(false);
  });

  it("Fragment is not allowed", () => {
    expect(isAbsoluteUri("https://example.com/foo?bar#baz")).to.equal(false);
  });

  it("Unicode is not allowed", () => {
    expect(isAbsoluteUri("http://examplé.org/rosé")).to.equal(false);
  });
});

describe("isIri", () => {
  it("Full", () => {
    expect(isIri("http://jásón@examplé.org:80/rosé?fóo#bár")).to.equal(true);
  });

  it("Scheme is required", () => {
    expect(isIri("//examplé.com/rosé?fóo#bár")).to.equal(false);
  });

  it("No authority", () => {
    expect(isIri("uri:/rosé?fóo#bár")).to.equal(true);
  });

  it("Rootless path", () => {
    expect(isIri("uri:rosé?fóo#bár")).to.equal(true);
  });

  it("Unicode is not allowed in scheme", () => {
    expect(isAbsoluteIri("examplé://examplé.org/rosé")).to.equal(false);
  });
});

describe("isIriReference", () => {
  it("Full", () => {
    expect(isIriReference("http://jásón@examplé.org:80/rosé?fóo#bár")).to.equal(true);
  });

  it("No scheme with authority", () => {
    expect(isIriReference("//examplé.org/rosé?fóo#bár")).to.equal(true);
  });

  it("No double slash", () => {
    expect(isIriReference("examplé.org/rosé?fóo#bár")).to.equal(true);
  });

  it("No authority", () => {
    expect(isIriReference("/rosé?fóo#bár")).to.equal(true);
  });

  it("Rootless path", () => {
    expect(isIriReference("rosé?fóo#bár")).to.equal(true);
  });

  it("No path", () => {
    expect(isIriReference("?fóo#bár")).to.equal(true);
  });

  it("No query", () => {
    expect(isIriReference("#bár")).to.equal(true);
  });

  it("Empty", () => {
    expect(isIriReference("")).to.equal(true);
  });
});

describe("isAbsoluteIri", () => {
  it("Full", () => {
    expect(isAbsoluteIri("http://jásón@examplé.org:80/rosé?fóo")).to.equal(true);
  });

  it("Scheme is required", () => {
    expect(isAbsoluteIri("//examplé.org/rosé?fóo")).to.equal(false);
  });

  it("Fragment is not allowed", () => {
    expect(isAbsoluteIri("http://examplé.org/rosé?fóo#bár")).to.equal(false);
  });

  it("Unicode is not allowed in scheme", () => {
    expect(isAbsoluteIri("examplé://examplé.org/rosé")).to.equal(false);
  });
});
