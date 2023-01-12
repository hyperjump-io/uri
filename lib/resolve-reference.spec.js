import { resolveReference } from "./index.js";
import { expect } from "chai";


const resolveTests = [
  ["http://a/b/c/d;p?q", "g:h", "g:h"],
  ["http://a/b/c/d;p?q", "g:h", "g:h"],
  ["http://a/b/c/d;p?q", "g", "http://a/b/c/g"],
  ["http://a/b/c/d;p?q", "./g", "http://a/b/c/g"],
  ["http://a/b/c/d;p?q", "g/", "http://a/b/c/g/"],
  ["http://a/b/c/d;p?q", "/g", "http://a/g"],
  ["http://a/b/c/d;p?q", "//g", "http://g"],
  ["http://a/b/c/d;p?q", "?y", "http://a/b/c/d;p?y"],
  ["http://a/b/c/d;p?q", "g?y", "http://a/b/c/g?y"],
  ["http://a/b/c/d;p?q", "#s", "http://a/b/c/d;p?q#s"],
  ["http://a/b/c/d;p?q", "g#s", "http://a/b/c/g#s"],
  ["http://a/b/c/d;p?q", "g?y#s", "http://a/b/c/g?y#s"],
  ["http://a/b/c/d;p?q", ";x", "http://a/b/c/;x"],
  ["http://a/b/c/d;p?q", "g;x", "http://a/b/c/g;x"],
  ["http://a/b/c/d;p?q", "g;x?y#s", "http://a/b/c/g;x?y#s"],
  ["http://a/b/c/d;p?q", "", "http://a/b/c/d;p?q"],
  ["http://a/b/c/d;p?q", ".", "http://a/b/c/"],
  ["http://a/b/c/d;p?q", "./", "http://a/b/c/"],
  ["http://a/b/c/d;p?q", "..", "http://a/b/"],
  ["http://a/b/c/d;p?q", "../", "http://a/b/"],
  ["http://a/b/c/d;p?q", "../g", "http://a/b/g"],
  ["http://a/b/c/d;p?q", "../..", "http://a/"],
  ["http://a/b/c/d;p?q", "../../", "http://a/"],
  ["http://a/b/c/d;p?q", "../../g", "http://a/g"],
  ["http://a/b/c/d;p?q", "../../../g", "http://a/g"],
  ["http://a/b/c/d;p?q", "../../../../g", "http://a/g"],
  ["http://a/b/c/d;p?q", "/./g", "http://a/g"],
  ["http://a/b/c/d;p?q", "/../g", "http://a/g"],
  ["http://a/b/c/d;p?q", "g.", "http://a/b/c/g."],
  ["http://a/b/c/d;p?q", ".g", "http://a/b/c/.g"],
  ["http://a/b/c/d;p?q", "g..", "http://a/b/c/g.."],
  ["http://a/b/c/d;p?q", "..g", "http://a/b/c/..g"],
  ["http://a/b/c/d;p?q", "./../g", "http://a/b/g"],
  ["http://a/b/c/d;p?q", "./g/.", "http://a/b/c/g/"],
  ["http://a/b/c/d;p?q", "g/./h", "http://a/b/c/g/h"],
  ["http://a/b/c/d;p?q", "g/../h", "http://a/b/c/h"],
  ["http://a/b/c/d;p?q", "g;x=1/./y", "http://a/b/c/g;x=1/y"],
  ["http://a/b/c/d;p?q", "g;x=1/../y", "http://a/b/c/y"],
  ["http://a/b/c/d;p?q", "g?y/./x", "http://a/b/c/g?y/./x"],
  ["http://a/b/c/d;p?q", "g?y/../x", "http://a/b/c/g?y/../x"],
  ["http://a/b/c/d;p?q", "g#s/./x", "http://a/b/c/g#s/./x"],
  ["http://a/b/c/d;p?q", "g#s/../x", "http://a/b/c/g#s/../x"],
  ["http://a/b/c/d;p?q", "http:g", "http:g"],
  ["", "urn:some:ip:prop", "urn:some:ip:prop"],
  ["#", "urn:some:ip:prop", "urn:some:ip:prop"],
  ["urn:some:ip:prop", "urn:some:ip:prop", "urn:some:ip:prop"],
  ["urn:some:other:prop", "urn:some:ip:prop", "urn:some:ip:prop"]
];

describe("resolveReference", () => {
  resolveTests.forEach(([baseIri, iriReference, expected]) => {
    it(`resolveReference('${iriReference}', '${baseIri}') === '${expected}'`, () => {
      const subject = resolveReference(iriReference, baseIri);
      expect(subject).to.equal(expected);
    });
  });
});
