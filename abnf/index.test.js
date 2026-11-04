import { describe, expect, test } from "vitest";
import { abnf } from "./index.js";

describe("Parsing", () => {
  test("the first rule of a rule list is the one matched", () => {
    const pattern = abnf()`
      full-date     = date-fullyear "-" date-month "-" date-mday
      date-fullyear = 4DIGIT
      date-month    = 2DIGIT
      date-mday     = 2DIGIT
    `;
    expect(pattern.test("2004-01-15")).to.equal(true);
    expect(pattern.test("2004-1-15")).to.equal(false);
  });

  test("text with no rule is an expression", () => {
    expect(abnf()`1*DIGIT`.test("123")).to.equal(true);
  });

  test("lines don't matter, and comments are ignored", () => {
    const pattern = abnf()`a = "x" ; a comment
  / "y" b
      b = "z"`;
    expect(pattern.test("x")).to.equal(true);
    expect(pattern.test("yz")).to.equal(true);
  });

  test("=/ adds alternatives to a rule", () => {
    const pattern = abnf()`
      a = "x"
      a =/ "y"
    `;
    expect(pattern.test("y")).to.equal(true);
  });

  test("rule names match without case", () => {
    expect(abnf()`a = B
      b = "x"`.test("x")).to.equal(true);
  });

  test.each([
    ["*\"a\"", ["", "aaa"], ["b"]],
    ["1*\"a\"", ["a", "aa"], [""]],
    ["*2\"a\"", ["", "aa"], ["aaa"]],
    ["2*3\"a\"", ["aa", "aaa"], ["a", "aaaa"]],
    ["3\"a\"", ["aaa"], ["aa", "aaaa"]],
    ["[ \"a\" ] \"b\"", ["b", "ab"], ["aab"]],
    ["( \"a\" / \"b\" ) \"c\"", ["ac", "bc"], ["c"]],
    ["\"a\" / \"b\" \"c\"", ["a", "bc"], ["b", "ac"]]
  ])("%s", (expression, matches, doesnt) => {
    const pattern = compile(expression);
    for (const value of matches) {
      expect(pattern.test(value), value).to.equal(true);
    }
    for (const value of doesnt) {
      expect(pattern.test(value), value).to.equal(false);
    }
  });

  test.each([
    ["%x41", "A", "B"],
    ["%d65", "A", "B"],
    ["%b1000001", "A", "B"],
    ["%x41-43", "C", "D"],
    ["%x41.42", "AB", "A"],
    ["%x1F600", "😀", "a"]
  ])("%s", (expression, matches, doesnt) => {
    const pattern = compile(expression);
    expect(pattern.test(matches)).to.equal(true);
    expect(pattern.test(doesnt)).to.equal(false);
  });

  test("a string matches without case, unless it's %s (RFC 7405)", () => {
    expect(abnf()`"aB"`.test("Ab")).to.equal(true);
    expect(abnf()`%i"aB"`.test("Ab")).to.equal(true);
    expect(abnf()`%s"aB"`.test("Ab")).to.equal(false);
    expect(abnf()`%s"aB"`.test("aB")).to.equal(true);
  });

  test("RFC 5234's core rules are defined", () => {
    expect(abnf()`ALPHA DIGIT HEXDIG VCHAR`.test("a1f~")).to.equal(true);
  });
});

describe("Splicing", () => {
  test("splices text in", () => {
    const rules = `b = "x"`;
    expect(abnf()`a = b ${rules}`.test("x")).to.equal(true);
  });

  test("throws a TypeError for a value that isn't a string", () => {
    expect(() => abnf()(templateStrings(["a = ", ""]), /** @type any */ (1)))
      .to.throw(TypeError, "A value spliced into ABNF must be a string: 1");
  });
});

describe("Scopes", () => {
  test("a rule in the text replaces a core rule", () => {
    expect(abnf()`a = DIGIT
      DIGIT = "x"`.test("x")).to.equal(true);
  });

  test("a context's rules are resolved among themselves, so the text doesn't change them", () => {
    const tag = abnf({ rules: `b = c
      c = "x"` });
    expect(tag`a = b
      c = "y"`.test("x")).to.equal(true);
  });

  test("a context's rules are resolved among themselves, not the text's", () => {
    expect(() => abnf({ rules: `b = c` })`a = b
      c = "y"`).to.throw(SyntaxError, "ABNF rule c isn't defined");
  });
});

describe("Errors", () => {
  test.each([
    ["text that isn't ABNF", "a = \"x\" &", "Not ABNF at 8"],
    ["a group that isn't closed", "a = ( \"x\"", "Expected \")\", found the end"],
    ["a rule list after an expression", "\"x\" a = \"y\"", "Expected the end"],
    ["a rule that's defined twice", "a = \"x\"\na = \"y\"", "a is defined twice"],
    ["=/ for a rule that isn't defined", "a =/ \"x\"", "\"=/\" for a, which isn't defined"],
    ["a rule that isn't defined", "a = b", "ABNF rule b isn't defined"],
    ["a recursive rule", "a = \"x\" b\nb = [ a ]", "ABNF rule a is recursive: a -> b -> a"],
    ["a prose value", "a = <anything>", "An ABNF prose value can't be compiled: <anything>"]
  ])("throws a SyntaxError for %s", (_name, text, message) => {
    expect(() => compile(text)).to.throw(SyntaxError, message);
  });

  test("a prose value repeated zero times is empty, as in RFC 3986's path-empty", () => {
    expect(abnf()`0<pchar>`.test("")).to.equal(true);
  });

  test("throws a SyntaxError for what can't match anything once the delimiters are removed", () => {
    expect(() => abnf({ delimiters: `"?"` })`"?"`).to.throw(SyntaxError, "can't match anything");
  });

  test("an alternative that can't match anything is left out", () => {
    expect(abnf({ delimiters: `"?"` })`*( ALPHA / "?" )`.test("a")).to.equal(true);
  });

  test.each(["alphabet", "delimiters"])("throws a TypeError for a context's %s that isn't one character", (field) => {
    expect(() => abnf({ [field]: `"ab"` })).to.throw(TypeError, `A context's ${field} must be ABNF that matches one character`);
  });
});

describe("Contexts", () => {
  test("a pattern is anchored unless the context says it isn't", () => {
    expect(abnf()`"a"`.test("ba")).to.equal(false);
    expect(abnf({ anchored: false })`"a"`.test("ba")).to.equal(true);
  });

  test("delimiters are removed from every character set", () => {
    const pattern = abnf({ delimiters: `"?" / "#"`, anchored: false })`*VCHAR`;
    expect(new RegExp(`^(?:${pattern.source})(?=[?#]|$)`, "u").exec("a/b?c")?.[0]).to.equal("a/b");
  });

  test("a character the alphabet doesn't have can be in a class or not", () => {
    const context = { alphabet: `ALPHA / DIGIT / "/"`, delimiters: `"/"` };
    expect(abnf(context)`*( ALPHA / DIGIT )`.source).to.equal("^(?:[^\\u{0}-\\u{2F}]*)$");
  });

  test("with percentEncoded, a percent-encoded character among single characters is \"%\"", () => {
    const pattern = abnf({ percentEncoded: true })`*( ALPHA / DIGIT / "%" HEXDIG HEXDIG )`;
    expect(pattern.source).to.equal("^(?:[\\u{25}0-9A-Za-z]*)$");
    expect(pattern.test("a%41")).to.equal(true);
  });

  test("with percentEncoded, not when a hex digit can follow, which could be a \"%\"'s digit", () => {
    const pattern = abnf({ percentEncoded: true })`*( ALPHA / DIGIT / "%" HEXDIG HEXDIG ) "1"`;
    expect(pattern.test("%41")).to.equal(false);
    expect(pattern.test("%411")).to.equal(true);
  });

  test("without percentEncoded, a percent-encoded character is checked", () => {
    expect(abnf()`*( ALPHA / "%" HEXDIG HEXDIG )`.test("%4")).to.equal(false);
  });
});

describe("Rewrites", () => {
  const context = { alphabet: `unreserved / sub-delims / "%" / ":" / "@" / "/"`, delimiters: `"?" / "#"`, percentEncoded: true };
  const rules = `
    path-absolute = "/" [ segment-nz *( "/" segment ) ]
    segment       = *pchar
    segment-nz    = 1*pchar
    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
    pct-encoded   = "%" HEXDIG HEXDIG
    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")" / "*" / "+" / "," / ";" / "="
  `;

  test("path-absolute compiles to what's written by hand", () => {
    expect(abnf({ ...context, rules })`path-absolute`.source).to.equal("^(?:\\u{2F}(?!\\u{2F})[^\\u{23}\\u{3F}]*)$");
  });

  test("1*( *a ) is *a, which doesn't backtrack through every split", () => {
    expect(abnf()`1*( *"a" )`.source).to.equal("^(?:[Aa]*)$");
    expect(abnf()`1*( [ "a" ] )`.source).to.equal("^(?:[Aa]*)$");
  });

  test("they match what the ABNF does, on input the context describes", () => {
    const pattern = abnf({ ...context, rules })`path-absolute`;
    const pchar = String.raw`(?:[a-zA-Z0-9\-._~!$&'()*+,;=:@]|%[0-9a-fA-F]{2})`;
    const byHand = new RegExp(String.raw`^\/(?:${pchar}+(?:\/${pchar}*)*)?$`, "u");
    const alphabet = ["/", "a", "-", ":", "%41", "%4a", "Z", "9", "!"];
    let seed = 1;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 2000; i++) {
      let value = "";
      for (let length = Math.floor(random() * 8); length > 0; length--) {
        value += alphabet[Math.floor(random() * alphabet.length)];
      }
      expect(pattern.test(value), value).to.equal(byHand.test(value));
    }
  });
});

// What a tag is given for text that isn't a template literal
/** @type (strings: string[]) => TemplateStringsArray */
const templateStrings = (strings) => Object.assign([...strings], { raw: [...strings] });

/** @type (text: string) => RegExp */
const compile = (text) => abnf()(templateStrings([text]));
