import { describe, expect, test } from "vitest";
import { InvalidUriError, isUri, urlToIri } from "./index.js";

describe("urlToIri", () => {
  test.each([
    ["https://example.com/a?b#c"],
    ["file:///home/a%20b/c.json"],
    ["urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66"],
    ["http://[::1]:8080/a"]
  ])("%s is already a URI, so it's kept as it is", (url) => {
    expect(urlToIri(new URL(url))).toBe(url);
  });

  test.each([
    ["http://e.com/a|b^c/[x]", "http://e.com/a%7Cb%5Ec/%5Bx%5D"],
    ["http://e.com/?q={x}[y]|", "http://e.com/?q=%7Bx%7D%5By%5D%7C"],
    ["http://e.com/#a#b", "http://e.com/#a%23b"],
    ["http://e.com/#{x}", "http://e.com/#%7Bx%7D"],
    ["http://e.com/a%zz/100%", "http://e.com/a%25zz/100%25"],
    ["http://u%:p@e.com/", "http://u%25:p@e.com/"],
    ["foo://a{b}/", "foo://a%7Bb%7D/"],
    ["foo:a b c", "foo:a%20b%20c"],
    ["foo:/a\\b", "foo:/a%5Cb"],
    ["http://[::1]/a|b", "http://[::1]/a%7Cb"]
  ])("%s is encoded where it isn't a URI", (url, expected) => {
    expect(urlToIri(new URL(url))).toBe(expected);
  });

  test("a percent-encoding is kept", () => {
    expect(urlToIri(new URL("http://e.com/a%7Cb|c"))).toBe("http://e.com/a%7Cb%7Cc");
  });

  test("nothing is decoded", () => {
    expect(urlToIri(new URL("file:///home/josé/a"))).toBe("file:///home/jos%C3%A9/a");
  });

  test("a data URL's data is percent-encoded, which doesn't change what it decodes to", () => {
    expect(urlToIri(new URL(`data:application/json,{"a": [1]}`))).toBe("data:application/json,%7B%22a%22:%20%5B1%5D%7D");
  });

  test("a path that starts with '//' without a host keeps its '/.'", () => {
    expect(urlToIri(new URL("web+demo:/.//not-a-host/a|b"))).toBe("web+demo:/.//not-a-host/a%7Cb");
  });

  test.each([
    ["urn:x"],
    ["did:Example:1"],
    ["data:text/plain"]
  ])("%s breaks its scheme's rules", (url) => {
    expect(() => urlToIri(new URL(url))).toThrow(InvalidUriError);
  });

  // Every printable ASCII character in each component, for a special scheme and one that isn't. Each component is in
  // a URL of its own, so a character the URL Standard doesn't allow in one doesn't skip the others.
  const printable = Array.from({ length: 0x7F - 0x20 }, (_, index) => String.fromCharCode(0x20 + index));
  /** @type (char: string) => string[] */
  const urlsWith = (char) => [
    `http://u${char}v@e.com/`,
    `http://e${char}f/`,
    `http://e.com/a${char}b`,
    `http://e.com/?${char}`,
    `http://e.com/#${char}`,
    `foo://u${char}v@e.com/`,
    `foo://e${char}f/`,
    `foo://e.com/a${char}b`,
    `foo:a${char}b`,
    `foo:a?${char}`,
    `foo:a#${char}`
  ];

  test("every character in each component makes a URI", () => {
    for (const char of printable) {
      for (const text of urlsWith(char)) {
        let url;
        try {
          url = new URL(text);
        } catch {
          // The URL Standard doesn't allow every character everywhere, like "/" in a host
          continue;
        }

        expect(isUri(urlToIri(url)), `${text} as ${url.href}`).toBe(true);
      }
    }
  });
});
