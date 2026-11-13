/** @import * as API from "./index.d.ts" */
import { hasValidALabels, hostToUnicode } from "./punycode.js";
import {
  dataFragment, dataPath, dataQuery, didFragment, didPath, didQuery, filePath, httpHost, urnFragment, urnPath, urnQuery,
  uuidNss
} from "./patterns.js";

/**
 * @typedef {{
 *   -readonly [Key in keyof API.IdentifierComponents]: API.IdentifierComponents[Key]
 * }} Components
 */

/** @typedef {Exclude<keyof API.IdentifierComponents, "scheme">} SchemeComponent */

/**
 * @typedef {{
 *   reason: API.InvalidIdentifierReason;
 *   component: keyof API.IdentifierComponents;
 *   start: number;
 *   end: number;
 *   scheme?: { start: number; end: number };
 *   iriOnly?: boolean;
 *   name?: string;
 *   description?: string;
 *   nid?: string;
 * }} Problem
 */

/**
 * @typedef {{
 *   reason: "missing-component" | "forbidden-component" | "component-mismatch";
 *   component: SchemeComponent;
 *   name: string;
 *   rule: string;
 *   description?: string;
 *   nid?: string;
 * }} SchemeProblem
 */

// What a built-in scheme requires of a component: to be there, not to be there, or to match a pattern when it's there.
// A description finishes "a urn URI's path must be …" in the error. A check is for what a pattern can't say, and only
// runs on a value that its hint matches, so most values aren't split to find the component.
/**
 * @typedef {{
 *   readonly hint: (value: string) => boolean;
 *   readonly test: (text: string) => boolean;
 *   readonly description: string;
 * }} ComponentCheck
 */
/**
 * @typedef {"required" | "forbidden" | {
 *   readonly pattern: RegExp;
 *   readonly description: string;
 *   readonly check?: ComponentCheck;
 * }} ComponentRule
 */

/**
 * @typedef {{
 *   readonly name: string;
 *   readonly rule: string;
 *   readonly syntaxNormalization?: boolean;
 *   readonly ascii?: boolean;
 *   readonly validate?: { readonly [Component in SchemeComponent]?: ComponentRule };
 *   readonly normalize?: {
 *     readonly userinfo?: (userinfo: string) => string | undefined;
 *     readonly host?: (host: string, form: "uri" | "iri") => string;
 *     readonly port?: (port: string) => string | undefined;
 *     readonly path?: (path: string) => string;
 *     readonly query?: (query: string) => string | undefined;
 *   };
 * }} SchemeDefinition
 */

// A URN namespace's rules, on its NSS
/**
 * @typedef {{
 *   readonly nid: string;
 *   readonly pattern: RegExp;
 *   readonly description: string;
 *   readonly normalize: (nss: string) => string;
 * }} NamespaceDefinition
 */

/**
 * @typedef {SchemeDefinition & {
 *   readonly uri: { readonly identifier: RegExp; readonly absolute: RegExp };
 *   readonly iri: { readonly identifier: RegExp; readonly absolute: RegExp };
 *   readonly ruled: readonly SchemeComponent[];
 *   readonly checks: readonly (ComponentCheck & { readonly component: SchemeComponent })[];
 *   readonly patterns: Partial<Record<SchemeComponent, RegExp>>;
 *   readonly namespace: (NamespaceDefinition & { readonly nss: RegExp }) | undefined;
 * }} Scheme
 */

/**
 * @typedef {{
 *   userinfo: string;
 *   host: string;
 *   port: string;
 *   pathAbEmpty: string;
 *   pathAbsolute: string;
 *   pathRootless: string;
 *   query: string;
 *   fragment: string;
 * }} GrammarParts
 */

/**
 * @typedef {{
 *   scheme: RegExp;
 *   userinfo: RegExp;
 *   regName: RegExp;
 *   port: RegExp;
 *   pathAbEmpty: RegExp;
 *   pathAbsolute: RegExp;
 *   pathNoScheme: RegExp;
 *   pathRootless: RegExp;
 *   query: RegExp;
 *   fragment: RegExp;
 * }} ComponentMatchers
 */

/**
 * @typedef {{
 *   form: "uri" | "iri";
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
// The characters IP-literal allows between its brackets. The patterns have this in place of IP-literal, and a value with
// a "[", which only an IP literal can have, is checked with ipLiteralPattern too (see hasValidIpLiteral). IPv6address is
// most of a pattern, and V8 takes about 10 ms to compile one that has it, the first time it's used.
const ipLiteralShape = `\\[(?:${unreserved}|${subDelims}|:)*\\]`;

// RFC 3987
const ucschar = `\\u{A0}-\\u{D7FF}\\u{F900}-\\u{FDCF}\\u{FDF0}-\\u{FFEF}\\u{10000}-\\u{1FFFD}\\u{20000}-\\u{2FFFD}\\u{30000}-\\u{3FFFD}\\u{40000}-\\u{4FFFD}\\u{50000}-\\u{5FFFD}\\u{60000}-\\u{6FFFD}\\u{70000}-\\u{7FFFD}\\u{80000}-\\u{8FFFD}\\u{90000}-\\u{9FFFD}\\u{A0000}-\\u{AFFFD}\\u{B0000}-\\u{BFFFD}\\u{C0000}-\\u{CFFFD}\\u{D0000}-\\u{DFFFD}\\u{E1000}-\\u{EFFFD}`;
const iunreserved = `[a-zA-Z0-9\\-._~${ucschar}]`;
const iprivate = `[\\u{E000}-\\u{F8FF}\\u{F0000}-\\u{FFFFD}\\u{100000}-\\u{10FFFD}]`;

// The rules that RFC 3987 defines again for IRIs are RFC 3986's, with iunreserved in place of unreserved, and iprivate
// allowed in the query. So they're written once, for either. The component rules are for diagnosing why a value
// doesn't match, and the parts are what schemes' patterns are built from.
/**
 * @type (unreserved: string, iprivate?: string) => {
 *   identifier: string;
 *   reference: string;
 *   absolute: string;
 *   components: Record<keyof ComponentMatchers, string>;
 *   parts: GrammarParts;
 * }
 */
const rules = (unreserved, iprivate) => {
  const regName = `(?:${unreserved}|${pctEncoded}|${subDelims})*`;
  const host = `(?:${ipLiteralShape}|${ipV4Address}|${regName})`;
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
    absolute: `^${absoluteUri}$`,
    components: { scheme, userinfo, regName, port, pathAbEmpty, pathAbsolute, pathNoScheme, pathRootless, query, fragment },
    parts: { userinfo, host, port, pathAbEmpty, pathAbsolute, pathRootless, query, fragment }
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

// Each component's rule, matching the longest prefix of a component that it allows
const uriMatchers = prefixMatchers(uriRules.components, "");
const iriMatchers = prefixMatchers(iriRules.components, "u");
const ipLiteralPattern = new RegExp(`^${ipLiteral}$`);

// Characters an IRI allows that a URI doesn't, for the hint to percent-encode them or use the IRI functions
const isUcschar = new RegExp(`^[${ucschar}]$`, "u");
const isIprivate = new RegExp(`^${iprivate}$`, "u");

// Characters each component allows without percent-encoding
const isAllowedInPath = RegExp.prototype.test.bind(new RegExp(`${unreserved}|${subDelims}|[:@]`));
const isAllowedInIPath = RegExp.prototype.test.bind(new RegExp(`${iunreserved}|${subDelims}|[:@]`, "u"));
const isAllowedInQuery = RegExp.prototype.test.bind(new RegExp(`${unreserved}|${subDelims}|[:@/?]`));
const isAllowedInIQuery = RegExp.prototype.test.bind(new RegExp(`${iunreserved}|${subDelims}|[:@/?]`, "u"));

const isAllAllowedInFragment = new RegExp(`^(?:${unreserved}|${subDelims}|[:@/?])*$`);
const isAllAllowedInIFragment = new RegExp(`^(?:${iunreserved}|${subDelims}|[:@/?])*$`, "u");

// Each character a fragment doesn't allow, the classes above without their brackets. With the "u" flag, a character
// outside the BMP is one match, so it's encoded whole, in a URI too.
/** @type (unreserved: string) => RegExp */
const notAllowedInFragment = (unreserved) => new RegExp(`[^${unreserved.slice(1, -1)}${subDelims.slice(1, -1)}:@/?]`, "gu");

// Characters a URL's authority and path allow, in one piece, for urlToIri. "[" and "]" are only in a URL's authority
// around an IPv6 address. Its query and fragment allow what isAllowedInQuery does.
const isAllowedInUrlAuthority = RegExp.prototype.test.bind(new RegExp(`${unreserved}|${subDelims}|[:@\\[\\]]`));
const isAllowedInUrlPath = RegExp.prototype.test.bind(new RegExp(`${unreserved}|${subDelims}|[:@/]`));
const hexPair = /^[0-9a-fA-F]{2}$/;

// The built-in schemes are compiled by compileScheme. A scheme's pattern for a component is a lookahead where the
// component starts, next to the generic component, which is what's matched, so a scheme can only reject more than the
// generic syntax. The lookahead ends with what can follow the component.
/** @type Readonly<Record<SchemeComponent, string>> */
const componentEnds = {
  authority: "(?=[/?#]|$)",
  userinfo: "(?=@)",
  host: "(?=[:/?#]|$)",
  port: "(?=[/?#]|$)",
  path: "(?=[?#]|$)",
  query: "(?=#|$)",
  fragment: "$"
};

/** @type readonly SchemeComponent[] */
const allComponents = ["authority", "userinfo", "host", "port", "path", "query", "fragment"];

// A pattern that never matches, for a scheme whose rules rule out a form
const never = "(?!)";

// The built-in schemes. Their patterns are generated from their RFCs' ABNF by scripts/generate-patterns.js, which has
// the ABNF, with a context for each component that removes its delimiters (see src/abnf.js).

// Whether "xn--" is anywhere in a value, in any case. "--" is rare, so it's found first.
/** @type (value: string) => boolean */
const hasXnPrefix = (value) => {
  for (let index = value.indexOf("--", 2); index !== -1; index = value.indexOf("--", index + 1)) {
    if ((value.charCodeAt(index - 2) | 0x20) === 0x78 && (value.charCodeAt(index - 1) | 0x20) === 0x6E) {
      return true;
    }
  }
  return false;
};

// RFC 9110 §4.2.1: http-URI = "http" "://" authority path-abempty [ "?" query ], and its host can't be empty. The
// default port and an empty path are normalized (§4.2.3). A label that starts with "xn--" is reserved for an
// internationalized domain name's ASCII form (RFC 5890 §2.3.1), so it has to be one, and normalizeIri converts it to
// Unicode (RFC 3987 §5.3.3).
/** @type (name: string, rule: string, defaultPort: string) => Scheme */
const httpScheme = (name, rule, defaultPort) => compileScheme({
  name,
  rule,
  validate: {
    authority: "required",
    host: {
      pattern: httpHost,
      description: "non-empty",
      check: {
        hint: hasXnPrefix,
        test: hasValidALabels,
        description: "an internationalized domain name in a label that starts with xn--, like xn--caf-dma"
      }
    }
  },
  normalize: {
    host: (host, form) => form === "iri" ? hostToUnicode(host) : host,
    port: (port) => port === "" || port === defaultPort ? undefined : port,
    path: (path) => path === "" ? "/" : path
  }
});

// RFC 8089 §2: file-URI = file-scheme ":" file-hier-part, where file-hier-part = ( "//" auth-path ) / local-path,
// auth-path = [ file-auth ] path-absolute, local-path = path-absolute, and file-auth = "localhost" / host. So there's
// no userinfo or port, and the path is path-absolute. A host of "localhost" is the same as none. A query is allowed,
// which RFC 8089's ABNF leaves out but never forbids, because Node.js makes file URLs with queries.
const fileScheme = compileScheme({
  name: "file",
  rule: "file-URI",
  validate: {
    userinfo: "forbidden",
    port: "forbidden",
    path: { pattern: filePath, description: "an absolute path, like /a/b" }
  },
  normalize: {
    host: (host) => host === "localhost" ? "" : host
  }
});

// RFC 4151 says software "MUST NOT reject" tags outside its syntax (§2.1, §3), so a tag has no rules. Tags are equal
// "if and only if they are completely indistinguishable" (§2.4), so nothing but the scheme is normalized.
const tagScheme = compileScheme({
  name: "tag",
  rule: "tagURI",
  syntaxNormalization: false
});

// DID 1.1 §3.2: did-url = did path-abempty [ "?" query ] [ "#" fragment ], where did = "did:" method-name ":"
// method-specific-id. So there's no authority, and the path is the rest of the DID and path-abempty. Every rule is
// ASCII. A method defines its own normalization (§7.1), so only the syntax-based normalization applies.
const didScheme = compileScheme({
  name: "did",
  rule: "did-url",
  ascii: true,
  validate: {
    authority: "forbidden",
    path: { pattern: didPath, description: `a method name, ":", and a method-specific ID, in ASCII, like example:123456` },
    query: { pattern: didQuery, description: "ASCII, with other characters percent-encoded" },
    fragment: { pattern: didFragment, description: "ASCII, with other characters percent-encoded" }
  }
});

// RFC 2397 §3: dataurl := "data:" [ mediatype ] [ ";base64" ] "," data. So there's no authority, and the path is the
// media type and the data. Every rule is ASCII. The data isn't a path, so nothing is normalized: removing dot segments
// would change what the data is.
const dataScheme = compileScheme({
  name: "data",
  rule: "dataurl",
  syntaxNormalization: false,
  ascii: true,
  validate: {
    authority: "forbidden",
    path: {
      pattern: dataPath,
      description: `a media type, ";base64" if the data is base64, ",", and the data, in ASCII, like text/plain,hello`
    },
    query: { pattern: dataQuery, description: "ASCII, with other characters percent-encoded" },
    fragment: { pattern: dataFragment, description: "ASCII, with other characters percent-encoded" }
  }
});

// RFC 8141 §2: namestring = assigned-name [ rq-components ] [ "#" f-component ], where assigned-name = "urn" ":" NID
// ":" NSS, so the path is NID ":" NSS, and the query is what's after the "?" of rq-components
/** @type SchemeDefinition["validate"] */
const urnValidate = {
  authority: "forbidden",
  path: { pattern: urnPath, description: `a NID, ":", and an NSS, in ASCII, like example:a` },
  query: {
    pattern: urnQuery,
    description: `"+" and an r-component, "=" and a q-component, or both, like +r?=q`
  },
  fragment: { pattern: urnFragment, description: "ASCII, with other characters percent-encoded" }
};

// RFC 8141 §3.1: only the scheme and the NID are case-insensitive, and percent-encoded characters "MUST NOT be
// decoded", but their hex digits are case-insensitive
/** @type SchemeDefinition["normalize"] */
const urnNormalize = {
  path: (path) => {
    const colon = path.indexOf(":");
    return path.slice(0, colon).toLowerCase() + ":" + uppercaseHex(path.slice(colon + 1));
  },
  query: (query) => uppercaseHex(query)
};

// RFC 9562 §4: a UUID is lowercase when it's output. It's the only namespace that's built in, and a URN of another
// namespace has RFC 8141's rules only.
/** @type NamespaceDefinition */
const uuidNamespace = {
  nid: "uuid",
  pattern: uuidNss,
  description: "a UUID, like f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
  normalize: (nss) => lowercaseComponent(nss)
};

/** @type readonly Scheme[] */
const builtInSchemes = [
  httpScheme("http", "http-URI", "80"),
  httpScheme("https", "https-URI", "443"),
  fileScheme,
  createUrnScheme(uuidNamespace),
  tagScheme,
  didScheme,
  dataScheme
];

/** @type Strategy */
const uriStrategy = {
  form: "uri",
  normalizePath: createPathNormalizer(isAllowedInPath),
  normalizeQuery: createQueryNormalizer(isAllowedInQuery),
  normalizeFragment: createQueryNormalizer(isAllowedInQuery)
};

/** @type Strategy */
const iriStrategy = {
  form: "iri",
  normalizePath: createPathNormalizer(isAllowedInIPath),
  normalizeQuery: createQueryNormalizer(isAllowedInIQuery),
  normalizeFragment: createQueryNormalizer(isAllowedInIQuery)
};

// The errors are made in functions because the classes aren't defined until after these are
/** @type (value: string, rule: string, problem: Problem | undefined) => Error */
const invalidUri = (value, rule, problem) => new InvalidUriError(value, rule, problem);
/** @type (value: string, rule: string, problem: Problem | undefined) => Error */
const invalidIri = (value, rule, problem) => new InvalidIriError(value, rule, problem);

/** @type typeof API.isUri */
export const isUri = createValidator(uriPattern, "uri", "identifier");
/** @type typeof API.isUriReference */
export const isUriReference = createValidator(uriReferencePattern, "uri", "identifier");
/** @type typeof API.isAbsoluteUri */
export const isAbsoluteUri = createValidator(absoluteUriPattern, "uri", "absolute");

/** @type typeof API.isIri */
export const isIri = createValidator(iriPattern, "iri", "identifier");
/** @type typeof API.isIriReference */
export const isIriReference = createValidator(iriReferencePattern, "iri", "identifier");
/** @type typeof API.isAbsoluteIri */
export const isAbsoluteIri = createValidator(absoluteIriPattern, "iri", "absolute");

/** @type typeof API.assertUri */
export const assertUri = createAssertion(uriPattern, "uri", "identifier", "URI", invalidUri);
/** @type typeof API.assertUriReference */
export const assertUriReference = createAssertion(uriReferencePattern, "uri", "identifier", "URI-reference", invalidUri);
/** @type typeof API.assertAbsoluteUri */
export const assertAbsoluteUri = createAssertion(absoluteUriPattern, "uri", "absolute", "absolute-URI", invalidUri);

/** @type typeof API.assertIri */
export const assertIri = createAssertion(iriPattern, "iri", "identifier", "IRI", invalidIri);
/** @type typeof API.assertIriReference */
export const assertIriReference = createAssertion(iriReferencePattern, "iri", "identifier", "IRI-reference", invalidIri);
/** @type typeof API.assertAbsoluteIri */
export const assertAbsoluteIri = createAssertion(absoluteIriPattern, "iri", "absolute", "absolute-IRI", invalidIri);

/** @type typeof API.parseIri */
export const parseIri = (/** @type string */ value) => /** @type any */ (split(value));

/** @type typeof API.parseUrn */
export const parseUrn = (value) => {
  const { path, query, fragment } = split(value);
  const colon = path.indexOf(":");

  /** @type {{ -readonly [Key in keyof API.UrnComponents]: API.UrnComponents[Key] }} */
  const components = { nid: path.slice(0, colon), nss: path.slice(colon + 1) };

  // rq-components = [ "?+" r-component ] [ "?=" q-component ], and the query is what's after the first "?"
  if (query?.startsWith("+")) {
    const qStart = query.indexOf("?=");
    components.rComponent = qStart === -1 ? query.slice(1) : query.slice(1, qStart);
    if (qStart !== -1) {
      components.qComponent = query.slice(qStart + 2);
    }
  } else if (query?.startsWith("=")) {
    components.qComponent = query.slice(1);
  }

  if (fragment !== undefined) {
    components.fComponent = fragment;
  }

  return components;
};

/** @type typeof API.toAbsoluteIri */
export const toAbsoluteIri = (value) => {
  // In a trusted identifier, nothing before the fragment can have "#"
  const fragmentStart = value.indexOf("#");
  return /** @type any */ (fragmentStart === -1 ? value : value.slice(0, fragmentStart));
};

// In a trusted identifier, the first ":" ends the scheme, which can't have one
/** @type typeof API.getScheme */
export const getScheme = (value) => value.slice(0, value.indexOf(":"));

// In a trusted reference, a ":" before the first "/", "?", or "#" ends a scheme, since a relative reference's first
// segment can't have one. A type guard can't be given with `typeof API.hasScheme`, so it's declared here.
/**
 * @template {API.IriReference} T
 * @param {T} value
 * @returns {value is T & API.Iri}
 */
export const hasScheme = (value) => {
  const colon = value.indexOf(":");
  if (colon === -1) {
    return false;
  }

  for (let index = 0; index < colon; index++) {
    const character = value[index];
    if (character === "/" || character === "?" || character === "#") {
      return false;
    }
  }

  return true;
};

// In a trusted reference, nothing before the fragment can have "#"
/** @type typeof API.getFragment */
export const getFragment = (value) => {
  const fragmentStart = value.indexOf("#");
  return fragmentStart === -1 ? undefined : value.slice(fragmentStart + 1);
};

// The path starts after the scheme and the authority, and ends at the query or the fragment, found the way split finds
// them
/** @type typeof API.getPath */
export const getPath = (value) => {
  const pathEnd = queryStartOf(value);
  let start = 0;
  const colon = value.indexOf(":");
  if (colon !== -1 && colon < pathEnd) {
    const slash = value.indexOf("/");
    if (slash === -1 || colon < slash) {
      start = colon + 1;
    }
  }

  if (value.startsWith("//", start)) {
    const slash = value.indexOf("/", start + 2);
    start = slash === -1 || slash > pathEnd ? pathEnd : slash;
  }

  return value.slice(start, pathEnd);
};

// In a trusted reference, the first "?" starts the query, unless it's in the fragment
/** @type typeof API.getQuery */
export const getQuery = (value) => {
  const fragmentStart = value.indexOf("#");
  const queryEnd = fragmentStart === -1 ? value.length : fragmentStart;
  const queryStart = value.indexOf("?");
  return queryStart === -1 || queryStart > queryEnd ? undefined : value.slice(queryStart + 1, queryEnd);
};

/** @type typeof API.normalizeUri */
export const normalizeUri = (/** @type string */ uri) => /** @type any */ (normalize(uriStrategy, uri));
/** @type typeof API.normalizeIri */
export const normalizeIri = (/** @type string */ iri) => /** @type any */ (normalize(iriStrategy, iri));

/** @type typeof API.encodeUriFragment */
export const encodeUriFragment = createEncoder(isAllAllowedInFragment, notAllowedInFragment(unreserved));
/** @type typeof API.encodeIriFragment */
export const encodeIriFragment = createEncoder(isAllAllowedInIFragment, notAllowedInFragment(iunreserved));

/** @type typeof API.resolveIri */
export const resolveIri = (/** @type string */ reference, /** @type string */ base) => /** @type any */ (resolve(reference, base));

/** @type typeof API.toRelativeIri */
export const toRelativeIri = (/** @type string */ target, /** @type string */ base) => /** @type any */ (toRelative(target, base));

// Most URLs are already URIs, so they're only encoded if they aren't. One that's still not a URI breaks its scheme's
// rules, which the URL Standard doesn't know.
/** @type typeof API.urlToIri */
export const urlToIri = (url) => {
  const { href } = url;
  if (isUri(href)) {
    return href;
  }

  const uri = encodeUrl(href);
  assertUri(uri);
  return uri;
};

export class InvalidUriError extends Error {
  /**
   * @param {string} value
   * @param {string} rule
   * @param {Problem | undefined} problem
   */
  constructor(value, rule, problem) {
    // A value that a pattern rejects always has a problem, which is checked by differential testing
    const { reason, component, start, end } = /** @type Problem */ (problem);
    super(`Invalid ${rule}: ${value} — ${describe(rule, value, /** @type Problem */ (problem))}`);
    this.name = "InvalidUriError";

    /** @readonly */
    this.value = value;

    /** @readonly */
    this.rule = rule;

    /** @readonly */
    this.reason = reason;

    /** @readonly */
    this.component = component;

    /** @readonly */
    this.start = start;

    /** @readonly */
    this.end = end;
  }
}

export class InvalidIriError extends Error {
  /**
   * @param {string} value
   * @param {string} rule
   * @param {Problem | undefined} problem
   */
  constructor(value, rule, problem) {
    // A value that a pattern rejects always has a problem, which is checked by differential testing
    const { reason, component, start, end } = /** @type Problem */ (problem);
    super(`Invalid ${rule}: ${value} — ${describe(rule, value, /** @type Problem */ (problem))}`);
    this.name = "InvalidIriError";

    /** @readonly */
    this.value = value;

    /** @readonly */
    this.rule = rule;

    /** @readonly */
    this.reason = reason;

    /** @readonly */
    this.component = component;

    /** @readonly */
    this.start = start;

    /** @readonly */
    this.end = end;
  }
}

// These are called while the module loads, so they're function declarations, which are hoisted

// A validator tests an identifier with a built-in scheme against its scheme's pattern, which is the generic syntax with
// the scheme's rules, and any other value against the generic pattern
/**
 * @param {RegExp} pattern
 * @param {"uri" | "iri"} form
 * @param {"identifier" | "absolute"} kind
 * @returns {any} A type guard, which a function expression can't be declared as
 */
function createValidator(pattern, form, kind) {
  return (/** @type string */ value) => {
    const scheme = builtInSchemeOf(value);
    return (scheme === undefined ? pattern.test(value) : scheme[form][kind].test(value) && passesChecks(scheme, value))
      && hasValidIpLiteral(value);
  };
}

// A value a pattern accepts has at most one "[", where its IP literal starts, and the literal ends at the first "]"
/** @type (value: string) => boolean */
const hasValidIpLiteral = (value) => {
  const start = value.indexOf("[");
  return start === -1 || ipLiteralPattern.test(value.slice(start, value.indexOf("]", start) + 1));
};

// An assertion tests what a validator does, and only a value that fails is looked at again: the generic pattern says
// whether it's an identifier at all, and the scheme's rules say which one it breaks
/**
 * @param {RegExp} pattern
 * @param {"uri" | "iri"} form
 * @param {"identifier" | "absolute"} kind
 * @param {API.UriRule | API.IriRule} rule
 * @param {(value: string, rule: string, problem: Problem | undefined) => Error} invalid
 * @returns {(value: string) => any}
 */
function createAssertion(pattern, form, kind, rule, invalid) {
  return (value) => {
    const scheme = builtInSchemeOf(value);
    if (scheme !== undefined && scheme[form][kind].test(value) && passesChecks(scheme, value) && hasValidIpLiteral(value)) {
      return;
    }

    if (!pattern.test(value) || !hasValidIpLiteral(value)) {
      throw invalid(value, rule, diagnose(rule, value));
    }

    // A relative reference isn't checked against a scheme
    const problem = scheme === undefined ? undefined : checkComponents(scheme, split(value), allComponents, value);
    if (problem !== undefined) {
      throw invalid(value, problem.rule, locate(value, problem));
    }
  };
}

// Builds a scheme's patterns from the generic grammar: each component's pattern as a lookahead where it starts, and
// only the parts of the grammar its rules allow. A urn's namespace is another lookahead on its path.
/**
 * @param {SchemeDefinition} definition
 * @param {NamespaceDefinition} [namespace]
 * @returns {Scheme}
 */
function compileScheme(definition, namespace) {
  const name = definition.name;
  const validate = definition.validate ?? {};
  /** @type Partial<Record<SchemeComponent, string>> */
  const lookaheads = {};
  /** @type Partial<Record<SchemeComponent, RegExp>> */
  const patterns = {};
  for (const component of allComponents) {
    const rule = validate[component];
    if (typeof rule === "object") {
      const source = rule.pattern.source;
      lookaheads[component] = `(?=(?:${source})${componentEnds[component]})`;
      patterns[component] = new RegExp(`(?:${source})${componentEnds[component]}`, "uy");
    }
  }

  // A URN of the namespace has its NSS's pattern, and one of another namespace has none
  if (namespace !== undefined) {
    const nid = caseless(namespace.nid);
    lookaheads.path = (lookaheads.path ?? "") + `(?=${nid}:(?:${namespace.pattern.source})${componentEnds.path}|(?!${nid}:))`;
  }

  /** @type (parts: GrammarParts, withFragment: boolean) => RegExp */
  const build = (parts, withFragment) => new RegExp(schemePattern(name, validate, lookaheads, parts, withFragment), "u");

  return {
    ...definition,
    uri: { identifier: build(uriRules.parts, true), absolute: build(uriRules.parts, false) },
    iri: { identifier: build(iriRules.parts, true), absolute: build(iriRules.parts, false) },
    ruled: allComponents.filter((component) => validate[component] !== undefined),
    checks: allComponents.flatMap((component) => {
      const rule = validate[component];
      return typeof rule === "object" && rule.check !== undefined ? [{ component, ...rule.check }] : [];
    }),
    patterns,
    namespace: namespace === undefined
      ? undefined
      : { ...namespace, nss: new RegExp(`(?:${namespace.pattern.source})${componentEnds.path}`, "uy") }
  };
}

/**
 * @param {string} name
 * @param {NonNullable<SchemeDefinition["validate"]>} validate
 * @param {Partial<Record<SchemeComponent, string>>} lookaheads
 * @param {GrammarParts} parts
 * @param {boolean} withFragment
 * @returns {string}
 */
function schemePattern(name, validate, lookaheads, parts, withFragment) {
  /** @type (component: SchemeComponent) => string */
  const lookahead = (component) => lookaheads[component] ?? "";
  /** @type (component: SchemeComponent, text: string) => string */
  const optional = (component, text) => {
    if (validate[component] === "required") {
      return text;
    }
    return validate[component] === "forbidden" ? "" : `(?:${text})?`;
  };

  // An authority's parts are there only if it is, and its host always is when it is
  const authorityRequired = ["authority", "userinfo", "host", "port"]
    .some((component) => validate[/** @type SchemeComponent */ (component)] === "required");
  const authorityForbidden = validate.authority === "forbidden" || validate.host === "forbidden";

  const userinfo = optional("userinfo", `${lookahead("userinfo")}${parts.userinfo}@`);
  const port = optional("port", `:${lookahead("port")}${parts.port}`);
  const withAuthority = `//${lookahead("authority")}${userinfo}${lookahead("host")}${parts.host}${port}`
    + `${lookahead("path")}${parts.pathAbEmpty}`;
  const withoutAuthority = `${lookahead("path")}(?:${parts.pathAbsolute}|${parts.pathRootless})?`;

  let hierPart = `(?:${withAuthority}|${withoutAuthority})`;
  if (authorityRequired) {
    hierPart = authorityForbidden ? never : withAuthority;
  } else if (authorityForbidden) {
    hierPart = withoutAuthority;
  }

  // There's always a path, and an absolute form never has a fragment
  const path = validate.path === "forbidden" ? never : "";
  const query = optional("query", `\\?${lookahead("query")}${parts.query}`);
  let fragment = optional("fragment", `#${lookahead("fragment")}${parts.fragment}`);
  if (!withFragment) {
    fragment = validate.fragment === "required" ? never : "";
  }

  return `^${caseless(name)}:${path}${hierPart}${query}${fragment}$`;
}

// A pattern for a lowercase name, or NID, that matches it without case
/** @type (name: string) => string */
function caseless(name) {
  let pattern = "";
  for (const char of name) {
    pattern += char >= "a" && char <= "z" ? `[${char}${char.toUpperCase()}]` : char === "+" || char === "." ? `\\${char}` : char;
  }
  return pattern;
}

// RFC 8141's rules for every URN, and a namespace's for a URN of that namespace
/** @type (namespace: NamespaceDefinition) => Scheme */
function createUrnScheme(namespace) {
  return compileScheme({
    name: "urn",
    rule: "namestring",
    syntaxNormalization: false,
    ascii: true,
    validate: urnValidate,
    normalize: urnNormalize
  }, namespace);
}

/**
 * @param {Record<keyof ComponentMatchers, string>} components
 * @param {string} flags
 * @returns {ComponentMatchers}
 */
function prefixMatchers(components, flags) {
  const entries = Object.entries(components).map(([name, rule]) => [name, new RegExp(`^(?:${rule})`, flags)]);
  return /** @type ComponentMatchers */ (Object.fromEntries(entries));
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
 * @param {RegExp} isAllAllowed
 * @param {RegExp} notAllowed - A global pattern for one character that isn't allowed
 * @returns {(value: string) => string}
 */
function createEncoder(isAllAllowed, notAllowed) {
  return (value) => isAllAllowed.test(value) ? value : value.replace(notAllowed, encodeCharacter);
}

// Splits an identifier that's already known to be valid into its components, by its delimiters (RFC 3986
// Appendix B). Each delimiter is only allowed where it ends a component: a scheme can't have ":", an authority can't
// have "/", a path can't have "?", and a query can't have "#". So the first of each is where its component ends. A
// component that isn't there isn't a property, so the result can be spread and checked with `in`.
// Where the path ends: the first "?", unless it's in the fragment, or the fragment
/** @type (value: string) => number */
const queryStartOf = (value) => {
  const fragmentStart = value.indexOf("#");
  const queryEnd = fragmentStart === -1 ? value.length : fragmentStart;
  const queryStart = value.indexOf("?");
  return queryStart === -1 || queryStart > queryEnd ? queryEnd : queryStart;
};

/** @type (value: string) => Components */
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

  return /** @type Components */ (components);
};

// Schemes

// In a valid identifier, a ":" before any "/", "?", or "#" ends a scheme
const firstDelimiter = /[:/?#]/;

/** @type (value: string) => string | undefined */
const schemeOf = (value) => {
  const end = value.search(firstDelimiter);
  return value[end] === ":" ? value.slice(0, end).toLowerCase() : undefined;
};

// A scan of a few entries
/** @type (name: string) => Scheme | undefined */
const findScheme = (name) => {
  for (const scheme of builtInSchemes) {
    if (scheme.name === name) {
      return scheme;
    }
  }
  return undefined;
};

// The built-in scheme a value starts with, found without slicing its name out of the value. A scheme that's found for a
// value that isn't valid is harmless, since its pattern checks its name.
/** @type (value: string) => Scheme | undefined */
const builtInSchemeOf = (value) => {
  for (const scheme of builtInSchemes) {
    if (startsWithScheme(value, scheme.name)) {
      return scheme;
    }
  }
  return undefined;
};

// Whether `value` starts with a lowercase scheme name and ":". Setting a character's 0x20 bit lowercases a letter, and
// doesn't change a digit, "+", "-", or ".".
/** @type (value: string, name: string) => boolean */
const startsWithScheme = (value, name) => {
  if (value.charCodeAt(name.length) !== 0x3A) {
    return false;
  }

  for (let index = 0; index < name.length; index++) {
    if ((value.charCodeAt(index) | 0x20) !== name.charCodeAt(index)) {
      return false;
    }
  }

  return true;
};

// The first of `names` that breaks the scheme's rules, in the order the components are in. A pattern is tested where
// its component starts in `value`, the way the scheme's pattern tests it, so the two always agree.
/** @type (scheme: Scheme, components: Components, names: readonly SchemeComponent[], value: string) => SchemeProblem | undefined */
const checkComponents = (scheme, components, names, value) => {
  const { ruled, patterns, namespace } = scheme;
  for (const component of ruled) {
    if (names !== allComponents && !names.includes(component)) {
      continue;
    }

    const rule = /** @type ComponentRule */ (scheme.validate?.[component]);
    const text = components[component];
    if (rule === "required") {
      if (text === undefined) {
        return { reason: "missing-component", component, name: scheme.name, rule: scheme.rule };
      }
    } else if (rule === "forbidden") {
      if (text !== undefined) {
        return { reason: "forbidden-component", component, name: scheme.name, rule: scheme.rule };
      }
    } else if (text !== undefined && !testAt(/** @type RegExp */ (patterns[component]), value, startOf(component, components, value))) {
      return { reason: "component-mismatch", component, name: scheme.name, rule: scheme.rule, description: rule.description };
    } else if (text !== undefined && rule.check !== undefined && !rule.check.test(text)) {
      return { reason: "component-mismatch", component, name: scheme.name, rule: scheme.rule, description: rule.check.description };
    }
  }

  // Only the NSS has a namespace's rules, and its path has already passed RFC 8141's
  if (namespace !== undefined && names.includes("path")) {
    const [nid] = splitUrnPath(components.path);
    if (nid.toLowerCase() === namespace.nid && !testAt(namespace.nss, value, startOf("path", components, value) + nid.length + 1)) {
      return { reason: "component-mismatch", component: "path", name: scheme.name, rule: scheme.rule, description: namespace.description, nid };
    }
  }

  return undefined;
};

// Whether a value that matches its scheme's pattern passes the scheme's checks. It's only split when a hint matches.
/** @type (scheme: Scheme, value: string) => boolean */
const passesChecks = (scheme, value) => {
  for (const check of scheme.checks) {
    if (check.hint(value)) {
      const text = split(value)[check.component];
      if (text !== undefined && !check.test(text)) {
        return false;
      }
    }
  }
  return true;
};

// Whether a sticky pattern matches where a component starts, without slicing the component out
/** @type (pattern: RegExp, value: string, start: number) => boolean */
const testAt = (pattern, value, start) => {
  pattern.lastIndex = start;
  return pattern.test(value);
};

// Where a component that's there starts in `value`, which ends with it and the components after it. Counted from the
// end, so `value` can be a resolved result whose components were never split from it.
/** @type (component: SchemeComponent, components: Components, value: string) => number */
const startOf = (component, components, value) => {
  const fragmentStart = components.fragment === undefined ? value.length + 1 : value.length - components.fragment.length;
  if (component === "fragment") {
    return fragmentStart;
  }

  const queryStart = components.query === undefined ? fragmentStart : fragmentStart - 1 - components.query.length;
  if (component === "query") {
    return queryStart;
  }

  const pathStart = queryStart - 1 - components.path.length;
  if (component === "path") {
    return pathStart;
  }

  const authorityStart = pathStart - /** @type string */ (components.authority).length;
  if (component === "port") {
    return pathStart - /** @type string */ (components.port).length;
  }
  if (component === "host") {
    return authorityStart + (components.userinfo === undefined ? 0 : components.userinfo.length + 1);
  }
  return authorityStart;
};

/** @type (path: string) => [string, string] */
const splitUrnPath = (path) => {
  const colon = path.indexOf(":");
  return [path.slice(0, colon), path.slice(colon + 1)];
};

// Where a scheme's problem is in `value`. A component that's missing is empty where it would go. One that's forbidden
// is spanned with its delimiter, so an empty one isn't an empty span. One that doesn't match is spanned without it.
/** @type (value: string, problem: SchemeProblem) => Problem */
const locate = (value, problem) => {
  const match = /** @type RegExpExecArray & { indices: Array<[number, number] | undefined> } */ (appendixB.exec(value));
  const [, , authorityAt, pathAt, queryAt, fragmentAt] = match.indices;
  const [pathStart, pathEnd] = /** @type [number, number] */ (pathAt);

  // Each is its start and end, then its start and end with its delimiter
  /** @type Partial<Record<SchemeComponent, [number, number, number, number]>> */
  const spans = { path: [pathStart, pathEnd, pathStart, pathEnd] };
  /** @type Record<SchemeComponent, number> */
  const missingAt = {
    authority: pathStart,
    userinfo: pathStart,
    host: pathStart,
    port: pathStart,
    path: pathStart,
    query: pathEnd,
    fragment: queryAt === undefined ? pathEnd : queryAt[1]
  };

  if (authorityAt !== undefined) {
    const [authorityStart, authorityEnd] = authorityAt;
    spans.authority = [authorityStart, authorityEnd, authorityStart - 2, authorityEnd];

    const authority = value.slice(authorityStart, authorityEnd);
    const at = authority.indexOf("@");
    if (at !== -1) {
      spans.userinfo = [authorityStart, authorityStart + at, authorityStart, authorityStart + at + 1];
    }

    const hostStart = at + 1;
    const portSearchStart = authority.startsWith("[", hostStart) ? authority.indexOf("]", hostStart) : hostStart;
    const portColon = authority.indexOf(":", portSearchStart);
    const hostEnd = portColon === -1 ? authority.length : portColon;
    spans.host = [authorityStart + hostStart, authorityStart + hostEnd, authorityStart + hostStart, authorityStart + hostEnd];
    if (portColon !== -1) {
      spans.port = [authorityStart + portColon + 1, authorityEnd, authorityStart + portColon, authorityEnd];
    }

    missingAt.userinfo = authorityStart;
    missingAt.host = authorityStart;
    missingAt.port = authorityStart + hostEnd;
  }

  if (queryAt !== undefined) {
    spans.query = [queryAt[0], queryAt[1], queryAt[0] - 1, queryAt[1]];
  }

  if (fragmentAt !== undefined) {
    spans.fragment = [fragmentAt[0], fragmentAt[1], fragmentAt[0] - 1, fragmentAt[1]];
  }

  const { reason, component, name, description, nid } = problem;
  const span = spans[component];
  /** @type Problem */
  const located = { reason, component, name, description, start: missingAt[component], end: missingAt[component] };

  if (span !== undefined && reason === "forbidden-component") {
    located.start = span[2];
    located.end = span[3];
  } else if (span !== undefined) {
    located.start = span[0];
    located.end = span[1];
  }

  // A namespace's rules are only on the NSS, so its span is only the NSS
  if (nid !== undefined) {
    located.nid = nid;
    if (value.startsWith(nid + ":", located.start)) {
      located.start += nid.length + 1;
    }
  }

  return located;
};

// Normalizing

// A scheme that isn't built in gets the syntax-based normalization only
/** @type (strategy: Strategy, value: string) => string */
const normalize = (strategy, value) => {
  const parsed = split(value);
  const name = /** @type string */ (parsed.scheme).toLowerCase();
  const scheme = findScheme(name);

  // The syntax-based normalization comes first, then the scheme's, which is the order of RFC 3986's comparison
  // ladder (§6.2)
  // A scheme that's ASCII in an IRI too keeps Unicode characters percent-encoded, like a URI does
  const syntax = scheme?.ascii === true ? uriStrategy : strategy;

  /** @type Components */
  let components;
  if (scheme?.syntaxNormalization === false) {
    // A scheme can't turn off the fragment's normalization, because a fragment's semantics "are independent of the
    // URI scheme and thus cannot be redefined by scheme specifications" (RFC 3986 §3.5)
    components = { ...parsed, scheme: name };
    if (parsed.fragment !== undefined) {
      components.fragment = syntax.normalizeFragment(parsed.fragment);
    }
  } else {
    components = normalizeComponents(syntax, parsed);
  }

  if (scheme !== undefined) {
    normalizeScheme(scheme, components, strategy.form);
  }

  return recompose(components);
};

// A scheme's normalization changes the components it has a function for. A function only runs when its component is
// there, and returns undefined to remove it.
/** @type (scheme: Scheme, components: Components, form: "uri" | "iri") => void */
const normalizeScheme = (scheme, components, form) => {
  const functions = scheme.normalize;
  if (functions !== undefined) {
    if (components.authority !== undefined) {
      if (functions.userinfo !== undefined && components.userinfo !== undefined) {
        setOrDelete(components, "userinfo", functions.userinfo(components.userinfo));
      }
      if (functions.host !== undefined) {
        components.host = functions.host(/** @type string */ (components.host), form);
      }
      if (functions.port !== undefined && components.port !== undefined) {
        setOrDelete(components, "port", functions.port(components.port));
      }

      // The authority is rebuilt from its parts, so a function for a part is all it needs
      components.authority = (components.userinfo === undefined ? "" : components.userinfo + "@")
        + components.host
        + (components.port === undefined ? "" : ":" + components.port);
    }

    if (functions.path !== undefined) {
      components.path = functions.path(components.path);
    }

    if (functions.query !== undefined && components.query !== undefined) {
      setOrDelete(components, "query", functions.query(components.query));
    }
  }

  // A namespace's normalization runs after RFC 8141's, which has lowercased the NID
  const namespace = scheme.namespace;
  if (namespace !== undefined) {
    const [nid, nss] = splitUrnPath(components.path);
    if (nid === namespace.nid) {
      components.path = nid + ":" + namespace.normalize(nss);
    }
  }
};

/** @type (components: Components, component: "userinfo" | "port" | "query", text: string | undefined) => void */
const setOrDelete = (components, component, text) => {
  if (text === undefined) {
    delete components[component];
  } else {
    components[component] = text;
  }
};

const pctHex = new RegExp(pctEncoded, "g");

/** @type (text: string) => string */
const uppercaseHex = (text) => text.includes("%") ? text.replace(pctHex, (match) => match.toUpperCase()) : text;

// Makes the case-insensitive part of a component lowercase: ASCII letters only, and not percent-encoded characters, so
// "%2F" stays "%2F"
/** @type (component: string) => string */
const lowercaseComponent = (component) => hasUppercase.test(component)
  ? component.replace(uppercaseOrPercentEncoded, (match) => match.startsWith("%") ? match : match.toLowerCase())
  : component;

const hasUppercase = /[A-Z]/;
const uppercaseOrPercentEncoded = new RegExp(`${pctEncoded}|[A-Z]+`, "g");

// Resolving

// The algorithm of RFC 3986 §5.2, without normalizing. The base is trusted, and isn't read when the reference has a
// scheme. The result is checked with its scheme's rules, if it's built in, except where they can't fail.
/** @type (reference: string, base: string) => string */
const resolve = (reference, base) => {
  if (reference === "") {
    return base;
  }

  // Only the fragment changes, so only its rule is checked
  if (reference.startsWith("#")) {
    checkResolved(base, { scheme: "", path: "", fragment: reference.slice(1) }, fragmentOnly, reference, base + reference);
    return base + reference;
  }

  // Only the query and the fragment change
  if (reference.startsWith("?")) {
    const queryStart = base.indexOf("?");
    const result = (queryStart === -1 ? base : base.slice(0, queryStart)) + reference;
    checkResolved(base, split(reference), queryAndFragment, reference, result);
    return result;
  }

  const ref = split(reference);

  // A result that has the base's authority only needs its path, query, and fragment checked, since rules are per
  // component and the base's are trusted
  /** @type Components */
  let target;
  let names = allComponents;
  if (ref.scheme !== undefined) {
    // It passed a validator with its scheme when it got its brand, so without dot segments it's already the result
    if (!hasDotSegment.test(ref.path)) {
      return reference;
    }

    // A scheme that turns off the syntax-based normalization has a path that isn't segments, like a data URL's data,
    // so a "." in it isn't a dot segment
    if (findScheme(ref.scheme.toLowerCase())?.syntaxNormalization === false) {
      return reference;
    }
    target = { ...ref, path: removeDotSegments(ref.path) };
  } else {
    const baseComponents = split(base);
    const baseScheme = /** @type string */ (baseComponents.scheme);

    if (ref.authority !== undefined) {
      target = { ...ref, scheme: baseScheme, path: withoutDotSegments(ref.path) };
    } else if (ref.path === "") {
      target = { ...baseComponents, query: ref.query ?? baseComponents.query, fragment: ref.fragment };
      names = pathQueryAndFragment;
    } else {
      const path = ref.path.startsWith("/") ? ref.path : mergePaths(ref.path, baseComponents);
      target = { ...baseComponents, path: withoutDotSegments(path), query: ref.query, fragment: ref.fragment };
      names = pathQueryAndFragment;
    }
  }

  // Without an authority, a path starting with "//" would be parsed as an authority. Prefixing "/." keeps it a path.
  if (target.authority === undefined && target.path.startsWith("//")) {
    target.path = "/." + target.path;
  }

  const result = recompose(target);
  checkResolved(result, target, names, reference, result);
  return result;
};

/** @type readonly SchemeComponent[] */
const fragmentOnly = ["fragment"];
/** @type readonly SchemeComponent[] */
const queryAndFragment = ["query", "fragment"];
/** @type readonly SchemeComponent[] */
const pathQueryAndFragment = ["path", "query", "fragment"];

// A result that breaks its scheme's rules can only be the reference's fault, because the base has a brand, so the
// error is about the reference, spanned in it
/** @type (identifier: string, components: Components, names: readonly SchemeComponent[], reference: string, result: string) => void */
const checkResolved = (identifier, components, names, reference, result) => {
  const scheme = findScheme(/** @type string */ (schemeOf(identifier)));
  if (scheme === undefined) {
    return;
  }

  const problem = checkComponents(scheme, components, names, result);
  if (problem !== undefined) {
    // A merged path spans the reference's path, since no one place in the reference made it
    throw new InvalidIriError(reference, scheme.rule, locate(reference, { ...problem, nid: undefined }));
  }
};

/** @type (path: string) => string */
const withoutDotSegments = (path) => hasDotSegment.test(path) ? removeDotSegments(path) : path;

/** @type (path: string, base: Components) => string */
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

// Normalizing makes components that are the same as parsing the normalized identifier would
/** @type (strategy: Strategy, components: Components) => Components */
const normalizeComponents = (strategy, components) => {
  /** @type Components */
  const normalized = { scheme: components.scheme.toLowerCase(), path: "" };

  if (components.authority !== undefined) {
    const host = /** @type string */ (components.host).toLowerCase();
    normalized.authority = (components.userinfo === undefined ? "" : components.userinfo + "@")
      + host
      + (components.port === undefined ? "" : ":" + components.port);
    if (components.userinfo !== undefined) {
      normalized.userinfo = components.userinfo;
    }
    normalized.host = host;
    if (components.port !== undefined) {
      normalized.port = components.port;
    }
  }

  const path = strategy.normalizePath(components.path);
  // Without an authority, a path starting with "//" would be parsed as an authority. Prefixing "/." keeps it a path.
  normalized.path = components.authority === undefined && path.startsWith("//") ? "/." + path : path;

  if (components.query !== undefined) {
    normalized.query = strategy.normalizeQuery(components.query);
  }

  if (components.fragment !== undefined) {
    normalized.fragment = strategy.normalizeFragment(components.fragment);
  }

  return normalized;
};

/** @type (components: Components) => string */
const recompose = (components) => components.scheme + ":"
  + (components.authority === undefined ? "" : "//" + components.authority)
  + components.path
  + (components.query === undefined ? "" : "?" + components.query)
  + (components.fragment === undefined ? "" : "#" + components.fragment);

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

// An ASCII character is one octet, so it's encoded without TextEncoder, which makes an array for each character
const asciiEncoded = Array.from({ length: 0x80 }, (_, octet) => encodeOctets([octet]));

/** @type (char: string) => string */
const encodeCharacter = (char) => {
  const code = char.charCodeAt(0);
  return code < 0x80 ? asciiEncoded[code] : encodeOctets([...textEncoder.encode(char)]);
};

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

// Relativizing

// Both identifiers are normalized, so equivalent identifiers compare equal, and neither has dot segments
/** @type (target: string, base: string) => string */
const toRelative = (target, base) => {
  const fromUri = split(base);
  const toUri = split(target);

  if (toUri.scheme !== fromUri.scheme) {
    return target;
  }

  if (toUri.authority !== fromUri.authority) {
    return target;
  }

  // An empty reference keeps the base's query, so it only works if the target has a query or the base doesn't
  const canUseEmptyReference = fromUri.path === toUri.path && (toUri.query !== undefined || fromUri.query === undefined);
  let result = canUseEmptyReference ? "" : relativePath(fromUri.path, toUri.path);

  // Some targets can't be reached with a relative reference, but the target itself is always a valid reference
  if (result === undefined) {
    return target;
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

// URLs

// Splits a URL's serialization at its delimiters, the way split does, and encodes each component. The URL Standard
// encodes each delimiter where it doesn't end a component, so the first of each is where its component ends, like in
// a URI.
/** @type (href: string) => string */
const encodeUrl = (href) => {
  const fragmentStart = href.indexOf("#");
  const queryEnd = fragmentStart === -1 ? href.length : fragmentStart;
  const queryStart = href.indexOf("?");
  const pathEnd = queryStart === -1 || queryStart > queryEnd ? queryEnd : queryStart;

  // A URL always has a scheme
  const colon = href.indexOf(":");
  let encoded = href.slice(0, colon + 1);
  let pathStart = colon + 1;

  if (href.startsWith("//", pathStart)) {
    const slash = href.indexOf("/", pathStart + 2);
    const authorityEnd = slash === -1 || slash > pathEnd ? pathEnd : slash;
    encoded += "//" + encodeUrlComponent(href.slice(pathStart + 2, authorityEnd), isAllowedInUrlAuthority);
    pathStart = authorityEnd;
  }

  encoded += encodeUrlComponent(href.slice(pathStart, pathEnd), isAllowedInUrlPath);
  if (pathEnd < queryEnd) {
    encoded += "?" + encodeUrlComponent(href.slice(pathEnd + 1, queryEnd), isAllowedInQuery);
  }
  if (fragmentStart !== -1) {
    encoded += "#" + encodeUrlComponent(href.slice(fragmentStart + 1), isAllowedInQuery);
  }

  return encoded;
};

// A URL's serialization is ASCII, so each character is one octet. A "%" that starts a percent-encoding is kept, and
// any other is encoded.
/** @type (text: string, isAllowed: (char: string) => boolean) => string */
const encodeUrlComponent = (text, isAllowed) => {
  let encoded = "";
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const isKept = char === "%" ? hexPair.test(text.slice(index + 1, index + 3)) : isAllowed(char);
    encoded += isKept ? char : encodeOctets([char.charCodeAt(0)]);
  }

  return encoded;
};

// Diagnosing why a value doesn't match a rule. The patterns only say whether it matches, so this finds what's wrong,
// from the same component rules. It's only called for a value that a pattern rejected.

// RFC 3986 Appendix B, which matches any string, so a value that isn't valid still has components. "d" gives each
// component's indexes, and "s" lets "." match line breaks.
const appendixB = /^(?:([^:/?#]+):)?(?:\/\/([^/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/ds;

const firstSegmentEnd = /[/?#]|$/;

/** @type (rule: API.UriRule | API.IriRule, value: string) => Problem | undefined */
const diagnose = (rule, value) => {
  const isIri = rule.includes("IRI");
  const matchers = isIri ? iriMatchers : uriMatchers;
  const isAbsoluteRule = rule.startsWith("absolute-");
  const isReferenceRule = rule.endsWith("-reference");

  const match = /** @type RegExpExecArray & { indices: Array<[number, number] | undefined> } */ (appendixB.exec(value));
  const [, scheme, authority, path, query, fragment] = match;
  const [, , authorityAt, pathAt, queryAt, fragmentAt] = match.indices;

  // The rule's shape comes first
  if (isAbsoluteRule && fragmentAt !== undefined) {
    return { reason: "fragment-not-allowed", component: "fragment", start: fragmentAt[0] - 1, end: value.length };
  }

  if (scheme === undefined && !isReferenceRule) {
    return { reason: "missing-scheme", component: "scheme", start: 0, end: 0 };
  }

  if (scheme !== undefined) {
    const problem = checkComponent(matchers.scheme, "scheme", scheme, 0, isIri);
    if (problem !== undefined) {
      // A reference like "1a:b" can also be read as a relative path with ":" in its first segment. When the ":" is
      // the only thing wrong with that reading, both are said.
      if (isReferenceRule) {
        const segmentEnd = value.search(firstSegmentEnd);
        const pathProblem = checkComponent(matchers.pathNoScheme, "path", value.slice(0, segmentEnd), 0, isIri);
        if (pathProblem?.start === scheme.length) {
          return {
            reason: "colon-in-first-segment",
            component: "path",
            start: 0,
            end: segmentEnd,
            scheme: { start: problem.start, end: problem.end }
          };
        }
      }

      return problem;
    }
  }

  if (authority !== undefined && authorityAt !== undefined) {
    const problem = diagnoseAuthority(matchers, authority, authorityAt[0], isIri);
    if (problem !== undefined) {
      return problem;
    }
  }

  const pathStart = /** @type [number, number] */ (pathAt)[0];
  const pathMatcher = pathRule(matchers, scheme, authority, path);
  const pathProblem = checkComponent(pathMatcher, "path", path, pathStart, isIri);
  if (pathProblem !== undefined) {
    // Only a ":" can stop path-noscheme's first segment where path-rootless's wouldn't
    const slash = path.indexOf("/");
    if (pathMatcher === matchers.pathNoScheme && value[pathProblem.start] === ":" && (slash === -1 || pathStart + slash > pathProblem.start)) {
      return {
        reason: "colon-in-first-segment",
        component: "path",
        start: pathStart,
        end: slash === -1 ? pathStart + path.length : pathStart + slash
      };
    }

    return pathProblem;
  }

  if (query !== undefined && queryAt !== undefined) {
    const problem = checkComponent(matchers.query, "query", query, queryAt[0], isIri);
    if (problem !== undefined) {
      return problem;
    }
  }

  if (fragment !== undefined && fragmentAt !== undefined) {
    const problem = checkComponent(matchers.fragment, "fragment", fragment, fragmentAt[0], isIri);
    if (problem !== undefined) {
      return problem;
    }
  }

  return undefined;
};

// Which path rule applies depends on whether there is a scheme or an authority, like in hier-part and relative-part
/** @type (matchers: ComponentMatchers, scheme: string | undefined, authority: string | undefined, path: string) => RegExp */
const pathRule = (matchers, scheme, authority, path) => {
  if (authority !== undefined) {
    return matchers.pathAbEmpty;
  } else if (path.startsWith("/")) {
    return matchers.pathAbsolute;
  } else if (scheme !== undefined) {
    return matchers.pathRootless;
  } else {
    return matchers.pathNoScheme;
  }
};

/** @type (matchers: ComponentMatchers, authority: string, authorityStart: number, isIri: boolean) => Problem | undefined */
const diagnoseAuthority = (matchers, authority, authorityStart, isIri) => {
  // Neither userinfo nor host can have "@", so the first one ends the userinfo, like when splitting
  const at = authority.indexOf("@");
  if (at !== -1) {
    const problem = checkComponent(matchers.userinfo, "userinfo", authority.slice(0, at), authorityStart, isIri);
    if (problem !== undefined) {
      return problem;
    }
  }

  const hostStart = at + 1;
  let hostEnd;
  if (authority.startsWith("[", hostStart)) {
    // An IP literal ends at its "]". Without one, the rest of the authority is the literal that's wrong.
    const close = authority.indexOf("]", hostStart);
    const colon = close === -1 ? -1 : authority.indexOf(":", close);
    hostEnd = colon === -1 ? authority.length : colon;
    if (!ipLiteralPattern.test(authority.slice(hostStart, hostEnd))) {
      return {
        reason: "invalid-ip-literal",
        component: "host",
        start: authorityStart + hostStart,
        end: authorityStart + hostEnd
      };
    }
  } else {
    // A host that isn't an IP literal matches host exactly when it matches reg-name, which allows any IPv4address
    const colon = authority.indexOf(":", hostStart);
    hostEnd = colon === -1 ? authority.length : colon;
    const host = authority.slice(hostStart, hostEnd);
    const problem = checkComponent(matchers.regName, "host", host, authorityStart + hostStart, isIri);
    if (problem !== undefined) {
      return problem;
    }
  }

  if (hostEnd < authority.length) {
    return checkComponent(matchers.port, "port", authority.slice(hostEnd + 1), authorityStart + hostEnd + 1, isIri);
  }

  return undefined;
};

// Every component rule is a repetition of characters and pct-encoded, so the longest prefix it matches ends at the
// character that's wrong
/** @type (matcher: RegExp, component: keyof API.IdentifierComponents, text: string, textStart: number, isIri: boolean) => Problem | undefined */
const checkComponent = (matcher, component, text, textStart, isIri) => {
  const length = matcher.exec(text)?.[0].length ?? 0;
  if (length === text.length) {
    return undefined;
  }

  const start = textStart + length;
  if (text[length] === "%" && component !== "scheme" && component !== "port") {
    // The "%" and up to two characters after it, without splitting a surrogate pair
    let end = length + 1;
    for (let count = 0; count < 2 && end < text.length; count++) {
      end += /** @type number */ (text.codePointAt(end)) > 0xFFFF ? 2 : 1;
    }
    return { reason: "invalid-percent-encoding", component, start, end: textStart + end };
  }

  const char = String.fromCodePoint(/** @type number */ (text.codePointAt(length)));
  /** @type Problem */
  const problem = { reason: "invalid-character", component, start, end: start + char.length };
  if (!isIri && (isUcschar.test(char) || (component === "query" && isIprivate.test(char)))) {
    problem.iriOnly = true;
  }

  return problem;
};

/** @type Record<keyof API.IdentifierComponents, string> */
const inComponent = {
  scheme: "in a scheme",
  authority: "in an authority",
  userinfo: "in userinfo",
  host: "in a host",
  port: "in a port",
  path: "in a path",
  query: "in a query",
  fragment: "in a fragment"
};

/** @type Record<keyof API.IdentifierComponents, string> */
const aComponent = {
  scheme: "a scheme",
  authority: "an authority",
  userinfo: "userinfo",
  host: "a host",
  port: "a port",
  path: "a path",
  query: "a query",
  fragment: "a fragment"
};

// A character that can't be seen, like a control character or a space other than U+0020, is written as its code point
const isVisible = /^(?: |[\p{L}\p{M}\p{N}\p{P}\p{S}])$/u;

/** @type (char: string) => string */
const show = (char) => isVisible.test(char)
  ? JSON.stringify(char)
  : "U+" + /** @type number */ (char.codePointAt(0)).toString(16)
    .toUpperCase()
    .padStart(4, "0");

// "an http URI" and "a tag URI": a scheme's name without a vowel is read letter by letter, like "http", and letters
// whose names start with a vowel sound take "an". A name that starts with "u" is read "you", like "a urn URI".
const spelledAn = /^[aefhilmnorsx]/i;
const wordAn = /^[aeio]/i;
const hasVowel = /[aeiouy]/i;

/** @type (name: string) => string */
const article = (name) => (hasVowel.test(name) ? wordAn : spelledAn).test(name) ? "an" : "a";

/** @type (rule: string, value: string, problem: Problem) => string */
const describe = (rule, value, problem) => {
  const span = value.slice(problem.start, problem.end);
  const name = /** @type string */ (problem.name);

  switch (problem.reason) {
    case "invalid-character":
      if (problem.iriOnly) {
        return `${show(span)} isn't allowed in a URI, at ${problem.start}; percent-encode it or use the IRI functions`;
      } else if (problem.component === "scheme" && problem.start === 0) {
        return "a scheme has to start with a letter, at 0";
      } else {
        return `${show(span)} isn't allowed ${inComponent[problem.component]}, at ${problem.start}`;
      }
    case "invalid-percent-encoding":
      return `"%" must be followed by two hex digits, at ${problem.start}`;
    case "invalid-ip-literal":
      return `${JSON.stringify(span)} isn't a valid IP literal, at ${problem.start}`;
    case "missing-scheme":
      return `${rule.startsWith("URI") ? "a" : "an"} ${rule} has to have a scheme`;
    case "fragment-not-allowed":
      return `an ${rule} can't have a fragment`;
    case "colon-in-first-segment": {
      const relative = `a relative path can't have ":" in its first segment unless it starts with "./"`;
      if (problem.scheme === undefined) {
        return `${relative}, at ${problem.start}`;
      }

      const scheme = value.slice(0, value.indexOf(":"));
      const why = problem.scheme.start === 0
        ? "which has to start with a letter"
        : `which can't have ${show(value.slice(problem.scheme.start, problem.scheme.end))}`;
      return `${JSON.stringify(scheme)} isn't a scheme, ${why}, and ${relative}`;
    }
    case "missing-component":
      return `${article(name)} ${name} URI must have ${aComponent[problem.component]}`;
    case "forbidden-component":
      return `${article(name)} ${name} URI can't have ${aComponent[problem.component]}`;
    case "component-mismatch":
      if (problem.nid !== undefined) {
        return problem.description === undefined
          ? `the NSS doesn't match the ${problem.nid} namespace`
          : `${article(problem.nid)} ${problem.nid} URN's NSS must be ${problem.description}`;
      }
      return problem.description === undefined
        ? `the ${problem.component} doesn't match ${rule}`
        : `${article(name)} ${name} URI's ${problem.component} must be ${problem.description}`;
  }
};
