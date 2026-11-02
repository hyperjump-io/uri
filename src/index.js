/** @import * as API from "./index.d.ts" */

/**
 * @typedef {{
 *   -readonly [Key in keyof API.IdentifierComponents]: API.IdentifierComponents[Key]
 * }} Components
 */

/**
 * @typedef {{
 *   parse: typeof API.parseUri;
 *   parseReference: typeof API.parseUriReference;
 *   parseAbsolute: typeof API.parseAbsoluteUri;
 *   normalizePath: (path: string) => string;
 *   normalizeQuery: (query: string) => string;
 *   normalizeFragment: (fragment: string) => string;
 * }} Strategy
 */

// The grammar, rule for rule from RFC 3986 Appendix A and RFC 3987 §2.2. Each constant is the rule it's named after.

const alpha = `[a-zA-Z]`;
const digit = `[0-9]`;
const hexdig = `[0-9a-fA-F]`;

// RFC 3986
const unreserved = `[a-zA-Z0-9\\-._~]`;
const subDelims = `[!$&'()*+,;=]`;
const pctEncoded = `%${hexdig}${hexdig}`;

const scheme = `${alpha}[a-zA-Z0-9+\\-.]*`;
const port = `${digit}*`;

const decOctet = `(?:${digit}|[1-9]${digit}|1${digit}{2}|2[0-4]${digit}|25[0-5])`;
const ipV4Address = `${decOctet}\\.${decOctet}\\.${decOctet}\\.${decOctet}`;
const h16 = `${hexdig}{1,4}`;
const ls32 = `(?:${h16}:${h16}|${ipV4Address})`;
// Aligned like the RFC. The spaces are only for reading, and are removed.
const ipV6Address = `(?:${[
  `                                (?:${h16}:){6}${ls32}`,
  `                            ::(?:${h16}:){5}${ls32}`,
  `(?:                ${h16})?::(?:${h16}:){4}${ls32}`,
  `(?:(?:${h16}:){0,1}${h16})?::(?:${h16}:){3}${ls32}`,
  `(?:(?:${h16}:){0,2}${h16})?::(?:${h16}:){2}${ls32}`,
  `(?:(?:${h16}:){0,3}${h16})?::    ${h16}:   ${ls32}`,
  `(?:(?:${h16}:){0,4}${h16})?::              ${ls32}`,
  `(?:(?:${h16}:){0,5}${h16})?::              ${h16}`,
  `(?:(?:${h16}:){0,6}${h16})?::`
].map((alternative) => alternative.replaceAll(" ", "")).join("|")})`;
const ipVFuture = `[vV]${hexdig}+\\.(?:${unreserved}|${subDelims}|:)+`;
const ipLiteral = `\\[(?:${ipV6Address}|${ipVFuture})\\]`;

// RFC 3987
const ucschar = `\\u{A0}-\\u{D7FF}\\u{F900}-\\u{FDCF}\\u{FDF0}-\\u{FFEF}\\u{10000}-\\u{1FFFD}\\u{20000}-\\u{2FFFD}\\u{30000}-\\u{3FFFD}\\u{40000}-\\u{4FFFD}\\u{50000}-\\u{5FFFD}\\u{60000}-\\u{6FFFD}\\u{70000}-\\u{7FFFD}\\u{80000}-\\u{8FFFD}\\u{90000}-\\u{9FFFD}\\u{A0000}-\\u{AFFFD}\\u{B0000}-\\u{BFFFD}\\u{C0000}-\\u{CFFFD}\\u{D0000}-\\u{DFFFD}\\u{E1000}-\\u{EFFFD}`;
const iunreserved = `[a-zA-Z0-9\\-._~${ucschar}]`;
const iprivate = `[\\u{E000}-\\u{F8FF}\\u{F0000}-\\u{FFFFD}\\u{100000}-\\u{10FFFD}]`;

// The rules that RFC 3987 defines again for IRIs are RFC 3986's, with iunreserved in place of unreserved, and iprivate
// allowed in the query. So they're written once, for either.
/** @type (unreserved: string, iprivate?: string) => { identifier: string; reference: string; absolute: string } */
const rules = (unreserved, iprivate) => {
  const regName = `(?:${unreserved}|${pctEncoded}|${subDelims})*`;
  const host = `(?:${ipLiteral}|${ipV4Address}|${regName})`;
  const userinfo = `(?:${unreserved}|${pctEncoded}|${subDelims}|:)*`;
  const authority = `(?:${userinfo}@)?${host}(?::${port})?`;

  const pchar = `(?:${unreserved}|${pctEncoded}|${subDelims}|:|@)`;
  const segment = `${pchar}*`;
  const segmentNz = `${pchar}+`;
  const segmentNzNc = `(?:${unreserved}|${pctEncoded}|${subDelims}|@)+`;

  const pathAbEmpty = `(?:/${segment})*`;
  const pathAbsolute = `/(?:${segmentNz}(?:/${segment})*)?`;
  const pathNoScheme = `${segmentNzNc}(?:/${segment})*`;
  const pathRootless = `${segmentNz}(?:/${segment})*`;
  const pathEmpty = ``;

  const query = iprivate === undefined ? `(?:${pchar}|/|\\?)*` : `(?:${pchar}|${iprivate}|/|\\?)*`;
  const fragment = `(?:${pchar}|/|\\?)*`;

  const hierPart = `(?://${authority}${pathAbEmpty}|${pathAbsolute}|${pathRootless}|${pathEmpty})`;
  const relativePart = `(?://${authority}${pathAbEmpty}|${pathAbsolute}|${pathNoScheme}|${pathEmpty})`;

  const uri = `${scheme}:${hierPart}(?:\\?${query})?(?:#${fragment})?`;
  const relativeRef = `${relativePart}(?:\\?${query})?(?:#${fragment})?`;
  const absoluteUri = `${scheme}:${hierPart}(?:\\?${query})?`;

  return {
    identifier: `^${uri}$`,
    reference: `^(?:${uri}|${relativeRef})$`,
    absolute: `^${absoluteUri}$`
  };
};

const uriRules = rules(unreserved);
const uriPattern = new RegExp(uriRules.identifier);
const uriReferencePattern = new RegExp(uriRules.reference);
const absoluteUriPattern = new RegExp(uriRules.absolute);

const iriRules = rules(iunreserved, iprivate);
const iriPattern = new RegExp(iriRules.identifier, "u");
const iriReferencePattern = new RegExp(iriRules.reference, "u");
const absoluteIriPattern = new RegExp(iriRules.absolute, "u");

// Characters each component allows without percent-encoding
const isAllowedInPath = RegExp.prototype.test.bind(new RegExp(`${unreserved}|${subDelims}|[:@]`));
const isAllowedInIPath = RegExp.prototype.test.bind(new RegExp(`${iunreserved}|${subDelims}|[:@]`, "u"));
const isAllowedInQuery = RegExp.prototype.test.bind(new RegExp(`${unreserved}|${subDelims}|[:@/?]`));
const isAllowedInIQuery = RegExp.prototype.test.bind(new RegExp(`${iunreserved}|${subDelims}|[:@/?]`, "u"));

const isAllAllowedInFragment = new RegExp(`^(?:${unreserved}|${subDelims}|[:@/?])*$`);
const isAllAllowedInIFragment = new RegExp(`^(?:${iunreserved}|${subDelims}|[:@/?])*$`, "u");

// The errors are made in functions because the classes aren't defined until after these are
/** @type Strategy */
const uriStrategy = {
  parse: createParser(uriPattern, (value) => new InvalidUriError(value, "URI")),
  parseReference: createParser(uriReferencePattern, (value) => new InvalidUriError(value, "URI-reference")),
  parseAbsolute: createParser(absoluteUriPattern, (value) => new InvalidUriError(value, "absolute-URI")),
  normalizePath: createPathNormalizer(isAllowedInPath),
  normalizeQuery: createQueryNormalizer(isAllowedInQuery),
  normalizeFragment: createQueryNormalizer(isAllowedInQuery)
};

/** @type Strategy */
const iriStrategy = {
  parse: createParser(iriPattern, (value) => new InvalidIriError(value, "IRI")),
  parseReference: createParser(iriReferencePattern, (value) => new InvalidIriError(value, "IRI-reference")),
  parseAbsolute: createParser(absoluteIriPattern, (value) => new InvalidIriError(value, "absolute-IRI")),
  normalizePath: createPathNormalizer(isAllowedInIPath),
  normalizeQuery: createQueryNormalizer(isAllowedInIQuery),
  normalizeFragment: createQueryNormalizer(isAllowedInIQuery)
};

/** @type typeof API.isUri */
export const isUri = createValidator(uriPattern);
/** @type typeof API.isUriReference */
export const isUriReference = createValidator(uriReferencePattern);
/** @type typeof API.isAbsoluteUri */
export const isAbsoluteUri = createValidator(absoluteUriPattern);

/** @type typeof API.isIri */
export const isIri = createValidator(iriPattern);
/** @type typeof API.isIriReference */
export const isIriReference = createValidator(iriReferencePattern);
/** @type typeof API.isAbsoluteIri */
export const isAbsoluteIri = createValidator(absoluteIriPattern);

/** @type typeof API.parseUri */
export const parseUri = uriStrategy.parse;
/** @type typeof API.parseUriReference */
export const parseUriReference = uriStrategy.parseReference;
/** @type typeof API.parseAbsoluteUri */
export const parseAbsoluteUri = uriStrategy.parseAbsolute;

/** @type typeof API.parseIri */
export const parseIri = iriStrategy.parse;
/** @type typeof API.parseIriReference */
export const parseIriReference = iriStrategy.parseReference;
/** @type typeof API.parseAbsoluteIri */
export const parseAbsoluteIri = iriStrategy.parseAbsolute;

/** @type typeof API.toAbsoluteUri */
export const toAbsoluteUri = (uri) => toAbsolute(uriStrategy, uri);
/** @type typeof API.toAbsoluteIri */
export const toAbsoluteIri = (iri) => toAbsolute(iriStrategy, iri);

/** @type typeof API.normalizeUri */
export const normalizeUri = (uri) => compose(uriStrategy, uriStrategy.parse(uri));
/** @type typeof API.normalizeIri */
export const normalizeIri = (iri) => compose(iriStrategy, iriStrategy.parse(iri));

/** @type typeof API.encodeUriFragment */
export const encodeUriFragment = createEncoder(isAllowedInQuery, isAllAllowedInFragment);
/** @type typeof API.encodeIriFragment */
export const encodeIriFragment = createEncoder(isAllowedInIQuery, isAllAllowedInIFragment);

/** @type typeof API.resolveUri */
export const resolveUri = (reference, base) => resolve(uriStrategy, reference, base);
/** @type typeof API.resolveIri */
export const resolveIri = (reference, base) => resolve(iriStrategy, reference, base);

/** @type typeof API.toRelativeUri */
export const toRelativeUri = (uri, base) => toRelative(uriStrategy, uri, base);
/** @type typeof API.toRelativeIri */
export const toRelativeIri = (iri, base) => toRelative(iriStrategy, iri, base);

export class InvalidUriError extends Error {
  /**
   * @param {string} value
   * @param {API.UriRule} rule
   */
  constructor(value, rule) {
    super(`Invalid ${rule}: ${value}`);
    this.name = "InvalidUriError";

    /** @readonly */
    this.value = value;

    /** @readonly */
    this.rule = rule;
  }
}

export class InvalidIriError extends Error {
  /**
   * @param {string} value
   * @param {API.IriRule} rule
   */
  constructor(value, rule) {
    super(`Invalid ${rule}: ${value}`);
    this.name = "InvalidIriError";

    /** @readonly */
    this.value = value;

    /** @readonly */
    this.rule = rule;
  }
}

export class UnsupportedIpVersionError extends Error {
  /**
   * @param {string} value
   * @param {string} host
   */
  constructor(value, host) {
    super(`Unsupported IP version in host: ${host.slice(1, -1)}`);
    this.name = "UnsupportedIpVersionError";

    /** @readonly */
    this.value = value;

    /** @readonly */
    this.host = host;
  }
}

// These are called while the module loads, so they're function declarations, which are hoisted

/**
 * @param {RegExp} pattern
 * @returns {(value: string) => boolean}
 */
function createValidator(pattern) {
  return (value) => {
    if (!pattern.test(value)) {
      return false;
    }

    // An IP literal of a future version has a known syntax, but whether its address is valid can't be known. "[" is
    // only allowed in an IP literal, so the host is only split out for an identifier that has one.
    if (value.includes("[")) {
      const host = /** @type string */ (split(value).host);
      if (host[1] === "v" || host[1] === "V") {
        throw new UnsupportedIpVersionError(value, host);
      }
    }

    return true;
  };
}

/**
 * @param {RegExp} pattern
 * @param {(value: string) => Error} invalid
 * @returns {(value: string) => any}
 */
function createParser(pattern, invalid) {
  return (value) => {
    if (!pattern.test(value)) {
      throw invalid(value);
    }

    return split(value);
  };
}

// Normalization is skipped when it can't change anything because most identifiers don't need it

// Percent-encoding is normalized before removing dot segments (RFC 3986 §6.2.2) because decoding can produce new dot
// segments. For example, "/a/%2E%2E/b" becomes "/a/../b", which needs to be normalized to "/b".

/**
 * @param {(value: string) => boolean} isAllowed
 * @returns {(path: string) => string}
 */
function createPathNormalizer(isAllowed) {
  const replacer = percentEncodedToChar(isAllowed);
  return (path) => {
    if (path.includes("%")) {
      path = path.replaceAll(percentEncoded, replacer);
    }
    return hasDotSegment.test(path) ? removeDotSegments(path) : path;
  };
}

/**
 * @param {(value: string) => boolean} isAllowed
 * @returns {(query: string) => string}
 */
function createQueryNormalizer(isAllowed) {
  const replacer = percentEncodedToChar(isAllowed);
  return (query) => query.includes("%") ? query.replaceAll(percentEncoded, replacer) : query;
}

// Encoding produces the same percent-encoding normalization does. A character is encoded if and only if it isn't
// allowed unescaped, so an encoded fragment is already normalized.

/**
 * @param {(value: string) => boolean} isAllowed
 * @param {RegExp} isAllAllowed
 * @returns {(value: string) => string}
 */
function createEncoder(isAllowed, isAllAllowed) {
  return (value) => {
    if (isAllAllowed.test(value)) {
      return value;
    }

    let encoded = "";
    for (const char of value) {
      encoded += isAllowed(char) ? char : encodeOctets([...textEncoder.encode(char)]);
    }

    return encoded;
  };
}

// Splits an identifier that's already known to be valid into its components, by its delimiters (RFC 3986
// Appendix B). Each delimiter is only allowed where it ends a component: a scheme can't have ":", an authority can't
// have "/", a path can't have "?", and a query can't have "#". So the first of each is where its component ends. A
// component that isn't there isn't a property, so the result can be spread and checked with `in`.
/** @type (value: string) => Record<string, string> */
const split = (value) => {
  /** @type Record<string, string> */
  const components = {};

  const fragmentStart = value.indexOf("#");
  const queryEnd = fragmentStart === -1 ? value.length : fragmentStart;
  const queryStart = value.indexOf("?");
  const pathEnd = queryStart === -1 || queryStart > queryEnd ? queryEnd : queryStart;

  // A relative reference's first segment can't have ":", so a ":" before the first "/" ends a scheme
  let position = 0;
  const colon = value.indexOf(":");
  if (colon !== -1 && colon < pathEnd) {
    const slash = value.indexOf("/");
    if (slash === -1 || colon < slash) {
      components.scheme = value.slice(0, colon);
      position = colon + 1;
    }
  }

  if (value.startsWith("//", position)) {
    const authorityStart = position + 2;
    const slash = value.indexOf("/", authorityStart);
    const authorityEnd = slash === -1 || slash > pathEnd ? pathEnd : slash;
    const authority = value.slice(authorityStart, authorityEnd);
    components.authority = authority;

    // Neither userinfo nor host can have "@"
    const at = authority.indexOf("@");
    if (at !== -1) {
      components.userinfo = authority.slice(0, at);
    }

    // An IP literal has ":"s in it, so the port's ":" is the first one after its "]"
    const hostStart = at + 1;
    const portSearchStart = authority.startsWith("[", hostStart) ? authority.indexOf("]", hostStart) : hostStart;
    const portColon = authority.indexOf(":", portSearchStart);
    components.host = authority.slice(hostStart, portColon === -1 ? authority.length : portColon);
    if (portColon !== -1) {
      components.port = authority.slice(portColon + 1);
    }

    position = authorityEnd;
  }

  components.path = value.slice(position, pathEnd);

  if (pathEnd < queryEnd) {
    components.query = value.slice(pathEnd + 1, queryEnd);
  }

  if (fragmentStart !== -1) {
    components.fragment = value.slice(fragmentStart + 1);
  }

  return components;
};

/** @type (strategy: Strategy, identifier: string) => string */
const toAbsolute = (strategy, identifier) => compose(strategy, {
  ...strategy.parse(identifier),
  fragment: undefined
});

/** @type (strategy: Strategy, reference: string, base: string) => string */
const resolve = (strategy, reference, base) => {
  const components = strategy.parseReference(reference);

  if (components.scheme !== undefined) {
    return compose(strategy, /** @type API.IdentifierComponents */ (components));
  }

  const baseComponents = strategy.parseAbsolute(base);

  if (components.authority !== undefined) {
    return compose(strategy, { ...components, scheme: baseComponents.scheme });
  }

  if (components.path === "") {
    return compose(strategy, {
      ...baseComponents,
      query: components.query ?? baseComponents.query,
      fragment: components.fragment
    });
  }

  return compose(strategy, {
    ...baseComponents,
    path: components.path.startsWith("/") ? components.path : mergePaths(components.path, baseComponents),
    query: components.query,
    fragment: components.fragment
  });
};

/** @type (path: string, base: API.AbsoluteIdentifierComponents) => string */
const mergePaths = (path, base) => {
  if (base.authority !== undefined && base.path === "") {
    return "/" + path;
  } else {
    const position = base.path.lastIndexOf("/");
    return position === -1 ? path : base.path.slice(0, position + 1) + path;
  }
};

// The input buffer patterns from RFC 3986 §5.2.4
const noOpSegment = /^\.\.?(?:\/|$)/; // Rules A and D: "../", "./", "..", or "."
const slashDotSegment = /^\/\.(?:\/|$)/; // Rule B: "/./" or "/."
const upSegment = /^\/\.\.(?:\/|$)/; // Rule C: "/../" or "/.."
const firstSegment = /^\/?[^/]*/; // Rule E: the first segment including its leading "/", if any

/** @type (path: string) => string */
const removeDotSegments = (path) => {
  let output = "";

  while (path.length > 0) {
    if (noOpSegment.test(path)) {
      path = path.replace(noOpSegment, "");
    } else if (slashDotSegment.test(path)) {
      path = path.replace(slashDotSegment, "/");
    } else if (upSegment.test(path)) {
      path = path.replace(upSegment, "/");
      output = output.slice(0, Math.max(output.lastIndexOf("/"), 0));
    } else {
      const segment = /** @type RegExpMatchArray */ (firstSegment.exec(path))[0];
      path = path.slice(segment.length);
      output += segment;
    }
  }

  return output;
};

/** @type (strategy: Strategy, components: Components) => string */
const compose = (strategy, components) => {
  let composed = components.scheme.toLowerCase() + ":";
  if (components.authority !== undefined) {
    composed += "//";
    composed += components.userinfo === undefined ? "" : components.userinfo + "@";
    composed += /** @type string */ (components.host).toLowerCase();
    composed += components.port === undefined ? "" : ":" + components.port;
  }
  const path = strategy.normalizePath(components.path);
  // Without an authority, a path starting with "//" would be parsed as an authority. Prefixing "/." keeps it a path.
  composed += components.authority === undefined && path.startsWith("//") ? "/." + path : path;
  composed += components.query === undefined ? "" : "?" + strategy.normalizeQuery(components.query);
  composed += components.fragment === undefined ? "" : "#" + strategy.normalizeFragment(components.fragment);

  return composed;
};

const hasDotSegment = /(?:^|\/)\.\.?(?:\/|$)/;

// Consecutive percent-encoded octets are matched together because a non-ASCII character is encoded as a multi-octet
// UTF-8 sequence. For example, "é" is encoded as "%C3%A9".
const percentEncoded = new RegExp(`(?:${pctEncoded})+`, "g");

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
const textEncoder = new TextEncoder();

/** @type (octet: number) => number */
const utf8SequenceLength = (octet) => {
  if (octet < 0x80) {
    return 1;
  } else if (octet >= 0xC2 && octet <= 0xDF) {
    return 2;
  } else if (octet >= 0xE0 && octet <= 0xEF) {
    return 3;
  } else if (octet >= 0xF0 && octet <= 0xF4) {
    return 4;
  } else {
    return 0; // A continuation octet or an octet that never appears in UTF-8
  }
};

/** @type (octets: number[]) => string | undefined */
const decodeUtf8 = (octets) => {
  try {
    return utf8Decoder.decode(new Uint8Array(octets));
  } catch {
    // Overlong encodings, surrogates, and truncated sequences aren't valid UTF-8
    return undefined;
  }
};

/** @type (octets: number[]) => string */
const encodeOctets = (octets) => octets
  .map((octet) => "%" + octet.toString(16)
    .toUpperCase()
    .padStart(2, "0"))
  .join("");

/**
 * @param {(value: string) => boolean} isAllowed
 * @returns {(match: string) => string}
 */
function percentEncodedToChar(isAllowed) {
  return (match) => {
    const octets = match.slice(1)
      .split("%")
      .map((hex) => parseInt(hex, 16));

    let result = "";
    let position = 0;
    while (position < octets.length) {
      const length = utf8SequenceLength(octets[position]);
      const sequence = octets.slice(position, position + length);
      const char = length > 0 && sequence.length === length ? decodeUtf8(sequence) : undefined;

      if (char === undefined) {
        // Octets that aren't valid UTF-8 can't be decoded, so they stay encoded
        result += encodeOctets([octets[position]]);
        position += 1;
      } else {
        result += isAllowed(char) ? char : encodeOctets(sequence);
        position += length;
      }
    }

    return result;
  };
}

/** @type (strategy: Strategy, uri: string, base: string) => string */
const toRelative = (strategy, uri, base) => {
  // Both identifiers are normalized so that equivalent identifiers compare equal and the result resolves to the
  // normalized target
  const fromUri = strategy.parseAbsolute(compose(strategy, strategy.parseAbsolute(base)));
  const to = compose(strategy, strategy.parse(uri));
  const toUri = strategy.parse(to);

  if (toUri.scheme !== fromUri.scheme) {
    return to;
  }

  if (toUri.authority !== fromUri.authority) {
    return to;
  }

  // An empty reference keeps the base's query, so it only works if the target has a query or the base doesn't
  const canUseEmptyReference = fromUri.path === toUri.path && (toUri.query !== undefined || fromUri.query === undefined);
  let result = canUseEmptyReference ? "" : relativePath(fromUri.path, toUri.path);

  // Some targets can't be reached with a relative reference, but the target itself is always a valid reference
  if (result === undefined) {
    return to;
  }

  if (toUri.query !== undefined) {
    result += `?${toUri.query}`;
  }

  if (toUri.fragment !== undefined) {
    result += `#${toUri.fragment}`;
  }

  return result;
};

const hasSchemeLikeSegment = /^[^/]*:/;

/** @type (from: string, to: string) => string | undefined */
const relativePath = (from, to) => {
  if (to === "") {
    return undefined;
  }

  // A relative-path reference can't change whether a path is absolute or rootless
  if (from.startsWith("/") !== to.startsWith("/")) {
    return to.startsWith("/") && !to.startsWith("//") ? to : undefined;
  }

  const fromSegments = from.split("/");
  const toSegments = to.split("/");

  let position = 0;
  while (fromSegments[position] === toSegments[position] && position < fromSegments.length - 1 && position < toSegments.length - 1) {
    position++;
  }

  // Going above the first segment of a rootless path makes the path absolute (RFC 3986 §5.2.4)
  if (position === 0 && fromSegments.length > 1) {
    return undefined;
  }

  const segments = [];
  for (let index = position + 1; index < fromSegments.length; index++) {
    segments.push("..");
  }

  for (let index = position; index < toSegments.length; index++) {
    segments.push(toSegments[index]);
  }

  const result = segments.join("/");

  // Prefix "./" when the reference would otherwise be empty, start with an empty segment, or look like a scheme
  return result === "" || result.startsWith("/") || hasSchemeLikeSegment.test(result) ? "./" + result : result;
};
