/** @import * as API from "./index.d.ts" */

// Compiles ABNF (RFC 5234, RFC 7405) into regular expressions. The text is parsed, its references resolved into one
// tree of character sets, sequences, alternatives, and repetitions, the tree rewritten into what's faster and matches
// the same, and the tree compiled.

/** @typedef {[number, number][]} CharSet sorted, merged, inclusive ranges of code points */

/**
 * @typedef {{ type: "set"; set: CharSet }
 *   | { type: "not"; set: CharSet }
 *   | { type: "seq"; items: Node[] }
 *   | { type: "alt"; items: Node[] }
 *   | { type: "rep"; min: number; max: number; item: Node }
 *   | { type: "ref"; name: string; display: string }
 *   | { type: "prose"; value: string }} Node
 */

/** @typedef {Map<string, Node>} Rules rules by lowercase name */

/**
 * @typedef {{
 *   rules: Rules;
 *   parent: Scope | undefined;
 * }} Scope
 */

/**
 * @typedef {{
 *   alphabet: CharSet;
 *   delimiters: CharSet;
 *   percentEncoded: boolean;
 *   firsts: Map<Node, { first: CharSet; nullable: boolean }>;
 *   sets: Map<string, string>;
 * }} Compilation
 */

const MAX = 0x10FFFF;

/** @type CharSet */
const everything = [[0, MAX]];

// RFC 5234 Appendix B.1
const coreRules = parseRules(`
  ALPHA = %x41-5A / %x61-7A
  BIT = "0" / "1"
  CHAR = %x01-7F
  CR = %x0D
  CRLF = CR LF
  CTL = %x00-1F / %x7F
  DIGIT = %x30-39
  DQUOTE = %x22
  HEXDIG = DIGIT / "A" / "B" / "C" / "D" / "E" / "F"
  HTAB = %x09
  LF = %x0A
  LWSP = *(WSP / CRLF WSP)
  OCTET = %x00-FF
  SP = %x20
  VCHAR = %x21-7E
  WSP = SP / HTAB
`);

/** @type Scope */
const coreScope = { rules: coreRules, parent: undefined };

const hexdig = charsOf("0123456789abcdefABCDEF");
const percent = charsOf("%");

/** @type typeof API.abnf */
export const abnf = (context = {}) => {
  /** @type Scope */
  const scope = context.rules === undefined ? coreScope : { rules: parseRules(context.rules), parent: coreScope };
  const alphabet = context.alphabet === undefined ? everything : charSetOf(context.alphabet, scope, "alphabet");
  const delimiters = context.delimiters === undefined ? [] : charSetOf(context.delimiters, scope, "delimiters");
  const percentEncoded = context.percentEncoded ?? false;
  const anchored = context.anchored ?? true;

  /** @type (strings: TemplateStringsArray, ...values: unknown[]) => any */
  const tag = (strings, ...values) => {
    let text = strings[0];
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      if (typeof value !== "string") {
        throw new TypeError(`A value spliced into ABNF must be a string: ${String(value)}`);
      }
      text += value + strings[index + 1];
    }

    /** @type Compilation */
    const compilation = { alphabet, delimiters, percentEncoded, firsts: new Map(), sets: new Map() };
    const parsed = parseText(text);
    const tree = simplify(resolve(parsed.node, { rules: parsed.rules, parent: scope }, []));
    const rewritten = optionalAsLookahead(starIdentities(simplify(rewrite(tree, delimiters, compilation))), delimiters, compilation);
    if (!canMatch(rewritten, compilation)) {
      throw new SyntaxError(`ABNF that can't match anything once its delimiters are removed: ${text.trim()}`);
    }

    const source = compileNode(rewritten, compilation).source;
    return new RegExp(anchored ? `^(?:${source})$` : source, "u");
  };

  return tag;
};

// ---------------------------------------------------------------------------------------------------------------------
// Parsing. A rule list is parsed as tokens without regard to lines: a rule starts where a name is followed by "=" or
// "=/", which can't happen inside a rule, so the text can be indented however it's written.

/**
 * @param {string} text
 * @returns {Rules}
 */
function parseRules(text) {
  const parser = createParser(text);
  const rules = parser.rules();
  parser.end();
  return rules;
}

/**
 * The first rule of a rule list, with the others in its scope, or an expression, with the rules after it in its scope
 *
 * @param {string} text
 * @returns {{ node: Node; rules: Rules }}
 */
function parseText(text) {
  const parser = createParser(text);
  if (parser.startsRule()) {
    const rules = parser.rules();
    parser.end();
    const [first] = rules.keys();
    return { node: { type: "ref", name: first, display: first }, rules };
  }

  // An expression ends where a rule starts
  const node = parser.alternation();
  const rules = parser.rules();
  parser.end();
  return { node, rules };
}

/**
 * @typedef {{
 *   type: "name" | "definedAs" | "digits" | "punct" | "charVal" | "numVal" | "prose";
 *   value: string;
 *   at: number;
 * }} Token
 */

/**
 * @param {string} text
 * @returns {Token[]}
 */
function tokenize(text) {
  const pattern = /(\s+|;[^\n]*)|([A-Za-z][A-Za-z0-9-]*)|(=\/|=)|([0-9]+)|([/()[\]*])|((?:%[siSI])?"[^"]*")|(%[bdxBDX][0-9A-Fa-f]+(?:(?:\.[0-9A-Fa-f]+)+|-[0-9A-Fa-f]+)?)|(<[^>]*>)/y;
  /** @type Token["type"][] */
  const types = ["name", "definedAs", "digits", "punct", "charVal", "numVal", "prose"];
  /** @type Token[] */
  const tokens = [];
  while (pattern.lastIndex < text.length) {
    const at = pattern.lastIndex;
    const match = pattern.exec(text);
    if (match === null) {
      throw new SyntaxError(`Not ABNF at ${at}, "${text.slice(at, at + 10)}": ${text.trim()}`);
    }
    if (match[1] === undefined) {
      const group = match.findIndex((value, index) => index > 1 && value !== undefined);
      tokens.push({ type: types[group - 2], value: match[group], at });
    }
  }
  return tokens;
}

/** @param {string} text */
function createParser(text) {
  const tokens = tokenize(text);
  let index = 0;

  /** @type (offset?: number) => Token | undefined */
  const peek = (offset = 0) => tokens[index + offset];
  /** @type (value: string) => boolean */
  const isPunct = (value) => peek()?.type === "punct" && peek()?.value === value;
  /** @type (what: string) => never */
  const fail = (what) => {
    const token = peek();
    const found = token === undefined ? "the end" : `"${token.value}" at ${token.at}`;
    throw new SyntaxError(`Expected ${what}, found ${found}, in ABNF: ${text.trim()}`);
  };
  const startsRule = () => peek()?.type === "name" && peek(1)?.type === "definedAs";

  /** @type () => Node */
  const alternation = () => {
    const items = [concatenation()];
    while (isPunct("/")) {
      index++;
      items.push(concatenation());
    }
    return items.length === 1 ? items[0] : { type: "alt", items };
  };

  /** @type () => Node */
  const concatenation = () => {
    const items = [];
    while (peek() !== undefined && !startsRule() && !isPunct("/") && !isPunct(")") && !isPunct("]")) {
      items.push(repetition());
    }
    if (items.length === 0) {
      fail("an element");
    }
    return items.length === 1 ? items[0] : { type: "seq", items };
  };

  /** @type () => Node */
  const repetition = () => {
    let min = 1;
    let max = 1;
    let counted = false;
    if (peek()?.type === "digits") {
      min = max = Number(peek()?.value);
      counted = true;
      index++;
    }
    if (isPunct("*")) {
      index++;
      if (!counted) {
        min = 0;
      }
      max = Infinity;
      if (peek()?.type === "digits") {
        max = Number(peek()?.value);
        index++;
      }
    }
    const item = element();
    return min === 1 && max === 1 ? item : { type: "rep", min, max, item };
  };

  /** @type () => Node */
  const element = () => {
    const token = peek() ?? fail("an element");
    index++;
    switch (token.type) {
      case "name":
        return { type: "ref", name: token.value.toLowerCase(), display: token.value };
      case "charVal":
        return charVal(token.value);
      case "numVal":
        return numVal(token.value);
      case "prose":
        return { type: "prose", value: token.value };
      case "punct":
        if (token.value === "(" || token.value === "[") {
          const item = alternation();
          const close = token.value === "(" ? ")" : "]";
          if (!isPunct(close)) {
            fail(`"${close}"`);
          }
          index++;
          return token.value === "(" ? item : { type: "rep", min: 0, max: 1, item };
        }
    }
    index--;
    return fail("an element");
  };

  return {
    startsRule,
    alternation,
    /** @type () => Rules */
    rules: () => {
      /** @type Rules */
      const rules = new Map();
      while (peek() !== undefined) {
        if (!startsRule()) {
          fail("a rule");
        }
        const display = /** @type Token */ (peek()).value;
        const name = display.toLowerCase();
        const incremental = peek(1)?.value === "=/";
        index += 2;
        const body = alternation();
        const existing = rules.get(name);
        if (incremental) {
          if (existing === undefined) {
            throw new SyntaxError(`"=/" for ${display}, which isn't defined, in ABNF: ${text.trim()}`);
          }
          rules.set(name, { type: "alt", items: [existing, body] });
        } else if (existing !== undefined) {
          throw new SyntaxError(`${display} is defined twice in ABNF: ${text.trim()}`);
        } else {
          rules.set(name, body);
        }
      }
      return rules;
    },
    end: () => {
      if (peek() !== undefined) {
        fail("the end");
      }
    }
  };
}

// A string matches without case, unless it's %s (RFC 7405). Only ASCII letters have case in ABNF.
/**
 * @param {string} token
 * @returns {Node}
 */
function charVal(token) {
  const sensitive = token.startsWith("%s") || token.startsWith("%S");
  const string = token.slice(token.indexOf("\"") + 1, -1);
  return {
    type: "seq",
    items: Array.from(string, (char) => ({ type: "set", set: sensitive ? charsOf(char) : charsOf(char.toLowerCase() + char.toUpperCase()) }))
  };
}

/**
 * @param {string} token
 * @returns {Node}
 */
function numVal(token) {
  const letter = token[1].toLowerCase();
  const base = letter === "b" ? 2 : letter === "d" ? 10 : 16;
  const body = token.slice(2);
  if (body.includes("-")) {
    const [low, high] = body.split("-").map((digits) => parseInt(digits, base));
    return { type: "set", set: [[low, high]] };
  }
  return { type: "seq", items: body.split(".").map((digits) => ({ type: "set", set: [[parseInt(digits, base), parseInt(digits, base)]] })) };
}

// ---------------------------------------------------------------------------------------------------------------------
// Resolving references into one tree. A rule is resolved in the scope it was defined in, so a rule in the text doesn't
// change the context's rules that use the same name. A cycle is a recursive rule, which a regular expression can't
// match.

/**
 * @param {Node} node
 * @param {Scope} scope
 * @param {{ rules: Rules; name: string }[]} stack the rules being resolved, to find a cycle
 * @returns {Node}
 */
function resolve(node, scope, stack) {
  switch (node.type) {
    case "ref": {
      let found = /** @type Scope | undefined */ (scope);
      while (found !== undefined && !found.rules.has(node.name)) {
        found = found.parent;
      }
      if (found === undefined) {
        throw new SyntaxError(`ABNF rule ${node.display} isn't defined`);
      }

      const { rules } = found;
      const cycle = stack.findIndex((entry) => entry.rules === rules && entry.name === node.name);
      if (cycle !== -1) {
        const names = [...stack.slice(cycle).map((entry) => entry.name), node.name];
        throw new SyntaxError(`ABNF rule ${node.display} is recursive: ${names.join(" -> ")}`);
      }
      return resolve(/** @type Node */ (rules.get(node.name)), found, [...stack, { rules, name: node.name }]);
    }
    case "seq":
    case "alt":
      return { type: node.type, items: node.items.map((item) => resolve(item, scope, stack)) };
    case "rep":
      // Zero repetitions of anything is empty, which RFC 3986's path-empty = 0<pchar> needs
      if (node.max === 0) {
        return { type: "seq", items: [] };
      }
      return { ...node, item: resolve(node.item, scope, stack) };
    case "prose":
      throw new SyntaxError(`An ABNF prose value can't be compiled: ${node.value}`);
    default:
      return node;
  }
}

/**
 * A context's alphabet or delimiters: ABNF that matches one character
 *
 * @param {string} text
 * @param {Scope} scope
 * @param {string} field
 * @returns {CharSet}
 */
function charSetOf(text, scope, field) {
  const node = simplify(resolve(parseExpression(text), scope, []));
  if (node.type !== "set") {
    throw new TypeError(`A context's ${field} must be ABNF that matches one character: ${text}`);
  }
  return node.set;
}

/** @type (text: string) => Node */
const parseExpression = (text) => {
  const parser = createParser(text);
  const node = parser.alternation();
  parser.end();
  return node;
};

// ---------------------------------------------------------------------------------------------------------------------
// Simplifying: sequences and alternatives are flattened, and the character sets among alternatives merged into one

/** @type (node: Node) => Node */
const simplify = (node) => {
  switch (node.type) {
    case "seq": {
      const items = node.items.map(simplify).flatMap((item) => item.type === "seq" ? item.items : [item]);
      return items.length === 1 ? items[0] : { type: "seq", items };
    }
    case "alt": {
      const items = node.items.map(simplify).flatMap((item) => item.type === "alt" ? item.items : [item]);
      const sets = items.filter((item) => item.type === "set");
      const others = items.filter((item) => item.type !== "set");
      /** @type Node[] */
      const merged = sets.length === 0 ? others : [{ type: "set", set: union(...sets.map((item) => item.set)) }, ...others];
      return merged.length === 1 ? merged[0] : { type: "alt", items: merged };
    }
    case "rep": {
      const item = simplify(node.item);
      // A repetition without a bound of a repetition that can be empty is any number of its item: 1*( *a ) and
      // 1*( [ a ] ) are *a. Nested, they'd backtrack through every way of splitting a string that doesn't match.
      if (node.max === Infinity && item.type === "rep" && item.min === 0) {
        return { type: "rep", min: 0, max: Infinity, item: item.item };
      }
      return { ...node, item };
    }
    default:
      return node;
  }
};

// What a node can start with, and whether it can be empty, from its sets before delimiters are removed, which is a
// superset of what they compile to
/** @type (node: Node, compilation: Compilation) => { first: CharSet; nullable: boolean } */
const firstOf = (node, compilation) => {
  let result = compilation.firsts.get(node);
  if (result === undefined) {
    result = computeFirst(node, compilation);
    compilation.firsts.set(node, result);
  }
  return result;
};

/** @type (node: Node, compilation: Compilation) => { first: CharSet; nullable: boolean } */
const computeFirst = (node, compilation) => {
  switch (node.type) {
    case "set":
      return { first: node.set, nullable: false };
    case "seq": {
      /** @type CharSet */
      let first = [];
      for (const item of node.items) {
        const result = firstOf(item, compilation);
        first = union(first, result.first);
        if (!result.nullable) {
          return { first, nullable: false };
        }
      }
      return { first, nullable: true };
    }
    case "alt": {
      const results = node.items.map((item) => firstOf(item, compilation));
      return { first: union(...results.map((result) => result.first)), nullable: results.some((result) => result.nullable) };
    }
    case "rep": {
      const result = firstOf(node.item, compilation);
      return { first: result.first, nullable: node.min === 0 || result.nullable };
    }
    default:
      return { first: [], nullable: true };
  }
};

// What can follow each of a sequence's items, from the end
/** @type (items: Node[], follow: CharSet, compilation: Compilation) => CharSet[] */
const followsOf = (items, follow, compilation) => {
  /** @type CharSet[] */
  const follows = new Array(items.length);
  let next = follow;
  for (let index = items.length - 1; index >= 0; index--) {
    follows[index] = next;
    const { first, nullable } = firstOf(items[index], compilation);
    next = nullable ? union(first, next) : first;
  }
  return follows;
};

// Whether a node can match anything once the delimiters are removed
/** @type (node: Node, compilation: Compilation) => boolean */
const canMatch = (node, compilation) => {
  switch (node.type) {
    case "set":
      return !isEmpty(subtract(node.set, compilation.delimiters));
    case "seq":
      return node.items.every((item) => canMatch(item, compilation));
    case "alt":
      return node.items.some((item) => canMatch(item, compilation));
    case "rep":
      return node.min === 0 || canMatch(node.item, compilation);
    default:
      return true;
  }
};

// ---------------------------------------------------------------------------------------------------------------------
// Rewriting what matches the same, on input the context describes, into what's faster. `follow` is the characters
// that can come after a node.

/** @type (node: Node, follow: CharSet, compilation: Compilation) => Node */
const rewrite = (node, follow, compilation) => {
  switch (node.type) {
    case "seq": {
      const before = followsOf(node.items, follow, compilation);
      const items = node.items.map((item, index) => rewrite(item, before[index], compilation));
      if (compilation.percentEncoded) {
        const follows = followsOf(items, follow, compilation);
        // ( set / pct-encoded ) *superset-of-hex is ( set / "%" ) *superset-of-hex, since the repetition takes the
        // digits, unless a hex digit can follow it
        for (let index = 0; index + 1 < items.length; index++) {
          const collapsed = withoutPctEncoded(items[index]);
          const next = items[index + 1];
          if (collapsed !== undefined && next.type === "rep" && next.max === Infinity && next.item.type === "set"
            && isEmpty(subtract(hexdig, next.item.set)) && isEmpty(intersect(follows[index + 1], hexdig))) {
            items[index] = collapsed;
          }
        }
      }
      return { type: "seq", items };
    }
    case "alt":
      return { type: "alt", items: node.items.map((item) => rewrite(item, follow, compilation)) };
    case "rep": {
      // Another repetition can follow one, unless there's at most one
      const again = node.max > 1 ? firstOf(node.item, compilation).first : [];
      let item = rewrite(node.item, union(again, follow), compilation);
      // *( set / pct-encoded ) is *( set / "%" ), unless a hex digit can follow, which could be a "%"'s digit
      if (compilation.percentEncoded && node.min <= 1 && node.max === Infinity && isEmpty(intersect(follow, hexdig))) {
        item = withoutPctEncoded(item) ?? item;
      }
      return { ...node, item };
    }
    default:
      return node;
  }
};

// A percent-encoded character among single characters that include the hex digits, with "%" among them instead
/** @type (node: Node) => Node | undefined */
const withoutPctEncoded = (node) => {
  if (node.type !== "alt") {
    return undefined;
  }
  const sets = node.items.filter((item) => item.type === "set");
  const pct = node.items.filter(isPctEncoded);
  if (sets.length !== 1 || pct.length !== 1 || !isEmpty(subtract(hexdig, sets[0].set))) {
    return undefined;
  }
  const others = node.items.filter((item) => item !== sets[0] && item !== pct[0]);
  /** @type Node */
  const set = { type: "set", set: union(sets[0].set, percent) };
  return others.length === 0 ? set : { type: "alt", items: [set, ...others] };
};

/** @type (node: Node) => boolean */
const isPctEncoded = (node) => node.type === "seq" && node.items.length === 3
  && node.items[0].type === "set" && sameSet(node.items[0].set, percent)
  && node.items.slice(1).every((item) => item.type === "set" && isEmpty(subtract(item.set, hexdig)));

// Star identities on sets: *( b *a ) is [ b *( a / b ) ], and n*a [ b *( a / b ) ] is n(a) *( a / b )
/** @type (node: Node) => Node */
const starIdentities = (node) => {
  switch (node.type) {
    case "seq": {
      const items = node.items.map(starIdentities).flatMap((item) => item.type === "seq" ? item.items : [item]);
      for (let index = 0; index + 1 < items.length; index++) {
        const [a, b] = [items[index], items[index + 1]];
        if (isSetRepetition(a) && a.max === Infinity && b.type === "rep" && b.min === 0 && b.max === 1
          && b.item.type === "seq" && b.item.items.length === 2 && b.item.items[0].type === "set"
          && isSetRepetition(b.item.items[1]) && b.item.items[1].min === 0 && b.item.items[1].max === Infinity
          && sameSet(b.item.items[1].item.set, union(a.item.set, b.item.items[0].set))) {
          /** @type Node[] */
          const head = a.min === 0 ? [] : [a.min === 1 ? a.item : { type: "rep", min: a.min, max: a.min, item: a.item }];
          items.splice(index, 2, ...head, b.item.items[1]);
        }
      }
      return items.length === 1 ? items[0] : { type: "seq", items };
    }
    case "alt":
      return { type: "alt", items: node.items.map(starIdentities) };
    case "rep": {
      const item = starIdentities(node.item);
      if (node.min === 0 && node.max === Infinity && item.type === "seq" && item.items.length === 2
        && item.items[0].type === "set" && isSetRepetition(item.items[1]) && item.items[1].min === 0 && item.items[1].max === Infinity) {
        const [b, aRepetition] = item.items;
        /** @type Node */
        const all = { type: "rep", min: 0, max: Infinity, item: { type: "set", set: union(aRepetition.item.set, b.set) } };
        return { type: "rep", min: 0, max: 1, item: { type: "seq", items: [b, all] } };
      }
      return { ...node, item };
    }
    default:
      return node;
  }
};

/** @typedef {{ type: "rep"; min: number; max: number; item: { type: "set"; set: CharSet } }} SetRepetition */

/**
 * @param {Node} node
 * @returns {node is SetRepetition}
 */
function isSetRepetition(node) {
  return node.type === "rep" && node.item.type === "set";
}

// [ a *b ], where b has every character of a, is *b not starting with what's only in b, if that can't follow it
/** @type (node: Node, follow: CharSet, compilation: Compilation) => Node */
const optionalAsLookahead = (node, follow, compilation) => {
  switch (node.type) {
    case "seq": {
      const follows = followsOf(node.items, follow, compilation);
      return { type: "seq", items: node.items.map((item, index) => optionalAsLookahead(item, follows[index], compilation)) };
    }
    case "alt":
      return { type: "alt", items: node.items.map((item) => optionalAsLookahead(item, follow, compilation)) };
    case "rep": {
      const again = node.max > 1 ? firstOf(node.item, compilation).first : [];
      const item = optionalAsLookahead(node.item, union(again, follow), compilation);
      if (node.min === 0 && node.max === 1 && item.type === "seq" && item.items.length === 2 && item.items[0].type === "set"
        && isSetRepetition(item.items[1]) && item.items[1].min === 0 && item.items[1].max === Infinity) {
        const [a, bRepetition] = item.items;
        const onlyB = subtract(bRepetition.item.set, a.set);
        if (isEmpty(subtract(a.set, bRepetition.item.set)) && isEmpty(intersect(onlyB, follow))) {
          return { type: "seq", items: [{ type: "not", set: onlyB }, bRepetition] };
        }
      }
      return { ...node, item };
    }
    default:
      return node;
  }
};

// ---------------------------------------------------------------------------------------------------------------------
// Compiling

/** @type (node: Node, compilation: Compilation) => { source: string; atom: boolean; alt?: boolean } */
const compileNode = (node, compilation) => {
  switch (node.type) {
    case "set":
      return { source: compileSet(node.set, compilation), atom: true };
    case "not":
      return { source: `(?!${compileSet(node.set, compilation)})`, atom: true };
    case "seq": {
      const sources = node.items.map((item) => {
        const compiled = compileNode(item, compilation);
        return compiled.alt ? `(?:${compiled.source})` : compiled.source;
      });
      return { source: sources.join(""), atom: node.items.length === 0 };
    }
    case "alt":
      return { source: node.items.map((item) => compileNode(item, compilation).source).join("|"), atom: false, alt: true };
    case "rep": {
      const compiled = compileNode(node.item, compilation);
      return { source: `${compiled.atom ? compiled.source : `(?:${compiled.source})`}${quantifier(node.min, node.max)}`, atom: false };
    }
    default:
      throw new TypeError(`Unresolved ABNF: ${node.type}`);
  }
};

/** @type (min: number, max: number) => string */
const quantifier = (min, max) => {
  if (min === 0 && max === Infinity) {
    return "*";
  }
  if (min === 1 && max === Infinity) {
    return "+";
  }
  if (min === 0 && max === 1) {
    return "?";
  }
  if (min === max) {
    return `{${min}}`;
  }
  return `{${min},${max === Infinity ? "" : max}}`;
};

// A set is compiled as a class or a negated class, whichever has fewer ranges, and a negated class when they have as
// many. Compiled sets are kept for the compilation, since the same ones, like HEXDIG, are in a rule many times.
/** @type (set: CharSet, compilation: Compilation) => string */
const compileSet = (set, compilation) => {
  const key = set.flat().join(",");
  let source = compilation.sets.get(key);
  if (source === undefined) {
    const { alphabet, delimiters } = compilation;
    const include = subtract(intersect(set, alphabet), delimiters);
    const exclude = union(subtract(alphabet, set), delimiters);
    if (isEmpty(include)) {
      source = "(?!)";
    } else if (isEmpty(exclude)) {
      source = "[^]";
    } else {
      const positive = cover(include, exclude);
      const negative = cover(exclude, include);
      if (positive.length < negative.length) {
        source = positive.length === 1 && positive[0][0] === positive[0][1] ? escape(positive[0][0]) : `[${positive.map(rangeSource).join("")}]`;
      } else {
        source = `[^${negative.map(rangeSource).join("")}]`;
      }
    }
    compilation.sets.set(key, source);
  }
  return source;
};

// The fewest ranges that cover `include` and none of `exclude`. What's in neither can't be in the input, so it's free
// to be covered or not. A range to the end of Unicode starts as low as it can: a class of all non-ASCII characters
// lets V8 check only whether a character is ASCII, which made urn:uuid's pattern take 254 milliseconds for 2 million
// tests, instead of 282 when its range started at U+A0. Widening the other ranges made single characters into
// classes, and was slower.
/** @type (include: CharSet, exclude: CharSet) => CharSet */
const cover = (include, exclude) => {
  /** @type CharSet */
  const ranges = [];
  /** @type (low: number, high: number) => boolean */
  const excluded = (low, high) => exclude.some(([a, b]) => a <= high && b >= low);
  for (const [low, high] of include) {
    const last = ranges.at(-1);
    if (last !== undefined && !excluded(last[1] + 1, low - 1)) {
      last[1] = high;
    } else {
      ranges.push([low, high]);
    }
  }

  const first = ranges[0];
  if (!excluded(0, first[0] - 1)) {
    first[0] = 0;
  }
  const last = /** @type [number, number] */ (ranges.at(-1));
  if (!excluded(last[1] + 1, MAX)) {
    last[1] = MAX;
  }
  if (last[1] === MAX) {
    const below = exclude.findLast(([, high]) => high < last[0]);
    last[0] = below === undefined ? 0 : below[1] + 1;
    const previous = ranges.at(-2);
    if (previous !== undefined && previous[1] >= last[0] - 1) {
      ranges.splice(-2, 2, [previous[0], MAX]);
    }
  }
  return ranges;
};

/** @type (codePoint: number) => string */
const escape = (codePoint) => {
  const char = String.fromCodePoint(codePoint);
  return /[a-zA-Z0-9]/.test(char) ? char : `\\u{${codePoint.toString(16).toUpperCase()}}`;
};

/** @type (range: [number, number]) => string */
const rangeSource = ([low, high]) => {
  if (low === high) {
    return escape(low);
  }
  return high === low + 1 ? `${escape(low)}${escape(high)}` : `${escape(low)}-${escape(high)}`;
};

// ---------------------------------------------------------------------------------------------------------------------
// Character sets

/**
 * @param {string} string
 * @returns {CharSet}
 */
function charsOf(string) {
  return normalizeSet(Array.from(string, (char) => {
    const codePoint = /** @type number */ (char.codePointAt(0));
    return [codePoint, codePoint];
  }));
}

/**
 * @param {CharSet} ranges
 * @returns {CharSet}
 */
function normalizeSet(ranges) {
  const sorted = ranges.map(([low, high]) => /** @type [number, number] */ ([low, high])).sort((a, b) => a[0] - b[0]);
  /** @type CharSet */
  const merged = [];
  for (const [low, high] of sorted) {
    const last = merged.at(-1);
    if (last !== undefined && low <= last[1] + 1) {
      last[1] = Math.max(last[1], high);
    } else {
      merged.push([low, high]);
    }
  }
  return merged;
}

/** @type (...sets: CharSet[]) => CharSet */
const union = (...sets) => normalizeSet(sets.flat());

/** @type (set: CharSet) => CharSet */
const complement = (set) => {
  /** @type CharSet */
  const result = [];
  let next = 0;
  for (const [low, high] of set) {
    if (low > next) {
      result.push([next, low - 1]);
    }
    next = high + 1;
  }
  if (next <= MAX) {
    result.push([next, MAX]);
  }
  return result;
};

/** @type (a: CharSet, b: CharSet) => CharSet */
const intersect = (a, b) => {
  /** @type CharSet */
  const result = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const low = Math.max(a[i][0], b[j][0]);
    const high = Math.min(a[i][1], b[j][1]);
    if (low <= high) {
      result.push([low, high]);
    }
    if (a[i][1] < b[j][1]) {
      i++;
    } else {
      j++;
    }
  }
  return result;
};

/** @type (a: CharSet, b: CharSet) => CharSet */
const subtract = (a, b) => intersect(a, complement(b));

/** @type (set: CharSet) => boolean */
const isEmpty = (set) => set.length === 0;

/** @type (a: CharSet, b: CharSet) => boolean */
const sameSet = (a, b) => a.length === b.length && a.every(([low, high], index) => b[index][0] === low && b[index][1] === high);
