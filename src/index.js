/** @import * as API from "./index.d.ts" */

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

/**
 * @typedef {API.Scheme & { [urnNamespaces]?: Map<string, API.UrnNamespace> }} InternalScheme
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
// allowed in the query. So they're written once, for either. The component rules are for diagnosing why a value
// doesn't match, and pchar is for the built-in schemes.
/**
 * @type (unreserved: string, iprivate?: string) => {
 *   identifier: string;
 *   reference: string;
 *   absolute: string;
 *   pchar: string;
 *   components: Record<keyof ComponentMatchers, string>;
 * }
 */
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
    absolute: `^${absoluteUri}$`,
    pchar,
    components: { scheme, userinfo, regName, port, pathAbEmpty, pathAbsolute, pathNoScheme, pathRootless, query, fragment }
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

// The built-in schemes, written from their RFCs' ABNF with the same rule strings as the generic grammar. A component's
// test only checks structure, because the generic syntax has already checked its characters, so the IRI rule strings
// are right for either form. A urn is ASCII even in an IRI, so its rules use the URI rule strings.

// The namespaces of the urn scheme, which only urnScheme sets, keyed by lowercased NID
const urnNamespaces = Symbol("urnNamespaces");

// RFC 9110 §4.2.1: http-URI = "http" "://" authority path-abempty [ "?" query ]. "A sender MUST NOT generate an "http"
// URI with an empty host identifier." The default port and an empty path are normalized (§4.2.3).
/** @type (name: string, rule: string, defaultPort: string) => API.Scheme */
const httpScheme = (name, rule, defaultPort) => ({
  name,
  rule,
  validate: {
    authority: "required",
    host: { test: (host) => host !== "", description: "non-empty" }
  },
  normalize: {
    port: (port) => port === "" || port === defaultPort ? undefined : port,
    path: (path) => path === "" ? "/" : path
  }
});

// RFC 8089 §2: file-URI = file-scheme ":" file-hier-part, where file-hier-part = ( "//" auth-path ) / local-path,
// auth-path = [ file-auth ] path-absolute, local-path = path-absolute, and file-auth = "localhost" / host. So there's
// no userinfo, port, or query, and the path is path-absolute. A host of "localhost" is the same as none.
const filePath = new RegExp(`^${iriRules.components.pathAbsolute}$`, "u");

/** @type API.Scheme */
const fileScheme = {
  name: "file",
  rule: "file-URI",
  validate: {
    userinfo: "forbidden",
    port: "forbidden",
    path: { test: (path) => filePath.test(path), description: "an absolute path, like /a/b" },
    query: "forbidden"
  },
  normalize: {
    host: (host) => host === "localhost" ? "" : host
  }
};

// RFC 4151 §2.1: tagURI = "tag:" taggingEntity ":" specific [ "#" fragment ]. The "?" that specific allows starts the
// generic query, which has the same characters, so only the path is tested. Tags are equal "if and only if they are
// completely indistinguishable" (§2.4), so nothing but the scheme is normalized.
const alphaNum = `[a-zA-Z0-9]`;
const dnsComp = `${alphaNum}(?:(?:${alphaNum}|-)*${alphaNum})?`;
const dnsName = `${dnsComp}(?:\\.${dnsComp})*`;
const emailAddress = `(?:${alphaNum}|[-._])+@${dnsName}`;
const authorityName = `(?:${dnsName}|${emailAddress})`;
const date = `${digit}{4}(?:-${digit}{2}(?:-${digit}{2})?)?`;
const taggingEntity = `${authorityName},${date}`;
const tagPath = new RegExp(`^${taggingEntity}:(?:${iriRules.pchar}|/)*$`, "u");

/** @type API.Scheme */
const tagScheme = {
  name: "tag",
  rule: "tagURI",
  syntaxNormalization: false,
  validate: {
    authority: "forbidden",
    path: {
      test: (path) => tagPath.test(path),
      description: `a domain name or an email address, ",", a date, and ":", like example.com,2004:a`
    }
  }
};

// RFC 8141 §2: namestring = assigned-name [ rq-components ] [ "#" f-component ], where assigned-name = "urn" ":" NID
// ":" NSS, so the path is NID ":" NSS, and the query is what's after the "?" of rq-components.
const alphanum = `[a-zA-Z0-9]`;
const ldh = `[a-zA-Z0-9-]`;
const nid = `${alphanum}${ldh}{0,30}${alphanum}`;
const nss = `${uriRules.pchar}(?:${uriRules.pchar}|/)*`;
const rComponent = `${uriRules.pchar}(?:${uriRules.pchar}|/|\\?)*`;
const qComponent = `${uriRules.pchar}(?:${uriRules.pchar}|/|\\?)*`;
const urnPath = new RegExp(`^${nid}:${nss}$`);
const urnQuery = new RegExp(`^(?:\\+${rComponent}(?:\\?=${qComponent})?|=${qComponent})$`);
const urnFragment = new RegExp(`^${uriRules.components.fragment}$`);

/** @type API.Scheme["validate"] */
const urnValidate = {
  authority: "forbidden",
  path: { test: (path) => urnPath.test(path), description: `a NID, ":", and an NSS, in ASCII, like example:a` },
  query: { test: (query) => urnQuery.test(query), description: `"+" and an r-component, "=" and a q-component, or both, like +r?=q` },
  fragment: { test: (fragment) => urnFragment.test(fragment), description: "ASCII, with other characters percent-encoded" }
};

// RFC 8141 §3.1: only the scheme and the NID are case-insensitive, and percent-encoded characters "MUST NOT be
// decoded", but their hex digits are case-insensitive
/** @type API.Scheme["normalize"] */
const urnNormalize = {
  path: (path) => {
    const colon = path.indexOf(":");
    return path.slice(0, colon).toLowerCase() + ":" + uppercaseHex(path.slice(colon + 1));
  },
  query: (query) => uppercaseHex(query)
};

// RFC 9562 §4: UUID = 4hexOctet "-" 2hexOctet "-" 2hexOctet "-" 2hexOctet "-" 6hexOctet, and it's lowercase when it's
// output
const hexOctet = `${hexdig}${hexdig}`;
const uuid = new RegExp(`^(?:${hexOctet}){4}-(?:${hexOctet}){2}-(?:${hexOctet}){2}-(?:${hexOctet}){2}-(?:${hexOctet}){6}$`);

/** @type API.UrnNamespace */
const uuidNamespace = {
  test: (nss) => uuid.test(nss),
  description: "a UUID, like f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
  normalize: (nss) => lowercaseComponent(nss)
};

/** @type readonly InternalScheme[] */
const builtInSchemes = [
  httpScheme("http", "http-URI", "80"),
  httpScheme("https", "https-URI", "443"),
  fileScheme,
  tagScheme,
  createUrnScheme({})
];

/** @type Strategy */
const uriStrategy = {
  normalizePath: createPathNormalizer(isAllowedInPath),
  normalizeQuery: createQueryNormalizer(isAllowedInQuery),
  normalizeFragment: createQueryNormalizer(isAllowedInQuery)
};

/** @type Strategy */
const iriStrategy = {
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

/** @type typeof API.assertUri */
export const assertUri = createAssertion(uriPattern, "URI", invalidUri);
/** @type typeof API.assertUriReference */
export const assertUriReference = createAssertion(uriReferencePattern, "URI-reference", invalidUri);
/** @type typeof API.assertAbsoluteUri */
export const assertAbsoluteUri = createAssertion(absoluteUriPattern, "absolute-URI", invalidUri);

/** @type typeof API.assertIri */
export const assertIri = createAssertion(iriPattern, "IRI", invalidIri);
/** @type typeof API.assertIriReference */
export const assertIriReference = createAssertion(iriReferencePattern, "IRI-reference", invalidIri);
/** @type typeof API.assertAbsoluteIri */
export const assertAbsoluteIri = createAssertion(absoluteIriPattern, "absolute-IRI", invalidIri);

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

/** @type typeof API.parseTag */
export const parseTag = (value) => {
  const { path, query, fragment } = split(value);

  // Neither an authorityName nor a date can have "," or ":", so the first of each ends them. The "?" of specific
  // starts the generic query.
  const comma = path.indexOf(",");
  const colon = path.indexOf(":", comma);

  /** @type {{ -readonly [Key in keyof API.TagComponents]: API.TagComponents[Key] }} */
  const components = {
    authorityName: path.slice(0, comma),
    date: path.slice(comma + 1, colon),
    specific: path.slice(colon + 1) + (query === undefined ? "" : "?" + query)
  };

  if (fragment !== undefined) {
    components.fragment = fragment;
  }

  return components;
};

/** @type typeof API.toAbsoluteIri */
export const toAbsoluteIri = (value) => {
  // In a trusted identifier, nothing before the fragment can have "#"
  const fragmentStart = value.indexOf("#");
  return /** @type any */ (fragmentStart === -1 ? value : value.slice(0, fragmentStart));
};

/** @type typeof API.normalizeUri */
export const normalizeUri = (/** @type string */ uri, /** @type API.Options | undefined */ options) => /** @type any */ (normalize(uriStrategy, uri, options));
/** @type typeof API.normalizeIri */
export const normalizeIri = (/** @type string */ iri, /** @type API.Options | undefined */ options) => /** @type any */ (normalize(iriStrategy, iri, options));

/** @type typeof API.lowercaseComponent */
export const lowercaseComponent = (component) => hasUppercase.test(component)
  ? component.replace(uppercaseOrPercentEncoded, (match) => match.startsWith("%") ? match : match.toLowerCase())
  : component;

/** @type typeof API.encodeUriFragment */
export const encodeUriFragment = createEncoder(isAllowedInQuery, isAllAllowedInFragment);
/** @type typeof API.encodeIriFragment */
export const encodeIriFragment = createEncoder(isAllowedInIQuery, isAllAllowedInIFragment);

/** @type typeof API.resolveIri */
export const resolveIri = (/** @type string */ reference, /** @type string */ base, /** @type API.Options | undefined */ options) => /** @type any */ (resolve(reference, base, options));

/** @type typeof API.toRelativeIri */
export const toRelativeIri = (/** @type string */ target, /** @type string */ base) => /** @type any */ (toRelative(target, base));

/** @type typeof API.urnScheme */
export const urnScheme = createUrnScheme;

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

export class UnknownSchemeError extends Error {
  /**
   * @param {string} value
   * @param {string} scheme
   */
  constructor(value, scheme) {
    super(`Unknown scheme: ${scheme}`);
    this.name = "UnknownSchemeError";

    /** @readonly */
    this.value = value;

    /** @readonly */
    this.scheme = scheme;
  }
}

export class UnknownUrnNamespaceError extends Error {
  /**
   * @param {string} value
   * @param {string} nid
   */
  constructor(value, nid) {
    super(`Unknown URN namespace: ${nid}`);
    this.name = "UnknownUrnNamespaceError";

    /** @readonly */
    this.value = value;

    /** @readonly */
    this.nid = nid;
  }
}

// These are called while the module loads, so they're function declarations, which are hoisted

/**
 * @param {RegExp} pattern
 * @returns {any} A type guard, which a function expression can't be declared as
 */
function createValidator(pattern) {
  return (/** @type string */ value, /** @type API.Options | undefined */ options) => pattern.test(value)
    && checkScheme(value, options) === undefined;
}

/**
 * @param {RegExp} pattern
 * @param {API.UriRule | API.IriRule} rule
 * @param {(value: string, rule: string, problem: Problem | undefined) => Error} invalid
 * @returns {(value: string, options?: API.Options) => any}
 */
function createAssertion(pattern, rule, invalid) {
  return (value, options) => {
    if (!pattern.test(value)) {
      throw invalid(value, rule, diagnose(rule, value));
    }

    const problem = checkScheme(value, options);
    if (problem !== undefined) {
      throw invalid(value, problem.rule, locate(value, problem));
    }
  };
}

/**
 * @param {Readonly<Record<string, API.UrnNamespace>>} namespaces
 * @returns {InternalScheme}
 */
function createUrnScheme(namespaces) {
  const known = new Map([["uuid", uuidNamespace]]);
  for (const [nid, namespace] of Object.entries(namespaces)) {
    known.set(nid.toLowerCase(), namespace);
  }

  return {
    name: "urn",
    rule: "namestring",
    syntaxNormalization: false,
    validate: urnValidate,
    normalize: urnNormalize,
    [urnNamespaces]: known
  };
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

// A scan of a few entries. A cache keyed by the options would be a hidden channel.
/** @type (name: string, options: API.Options | undefined) => InternalScheme | undefined */
const findScheme = (name, options) => {
  if (options?.customSchemes !== undefined) {
    for (const scheme of options.customSchemes) {
      if (scheme.name.length === name.length && scheme.name.toLowerCase() === name) {
        return scheme;
      }
    }
  }

  for (const scheme of builtInSchemes) {
    if (scheme.name === name) {
      return scheme;
    }
  }

  return undefined;
};

/** @type (value: string, name: string, options: API.Options | undefined) => InternalScheme */
const knownScheme = (value, name, options) => {
  const scheme = findScheme(name, options);
  if (scheme === undefined) {
    throw new UnknownSchemeError(value, name);
  }
  return scheme;
};

// Checks what a validator checks after its pattern: whether an IP literal is of a future version, and the rules of
// the scheme. A relative reference isn't checked against a scheme.
/** @type (value: string, options: API.Options | undefined) => SchemeProblem | undefined */
const checkScheme = (value, options) => {
  /** @type Components | undefined */
  let components;

  // An IP literal of a future version has a known syntax, but whether its address is valid can't be known. "[" is
  // only allowed in an IP literal, so the host is only split out for an identifier that has one.
  if (value.includes("[")) {
    components = split(value);
    const host = /** @type string */ (components.host);
    if (host[1] === "v" || host[1] === "V") {
      throw new UnsupportedIpVersionError(value, host);
    }
  }

  const name = schemeOf(value);
  if (name === undefined) {
    return undefined;
  }

  const scheme = knownScheme(value, name, options);
  if (scheme.validate === undefined && scheme[urnNamespaces] === undefined) {
    return undefined;
  }

  return checkComponents(scheme, components ?? split(value), allComponents, value);
};

/** @type readonly SchemeComponent[] */
const allComponents = ["authority", "userinfo", "host", "port", "path", "query", "fragment"];

// The first of `names` that breaks the scheme's rules, in the order the components are in. Most identifiers pass, so
// the rules a scheme has are checked first in any order, which only looks at the components it has rules for. The
// order only matters for which problem is reported.
/** @type (scheme: InternalScheme, components: Components, names: readonly SchemeComponent[], value: string) => SchemeProblem | undefined */
const checkComponents = (scheme, components, names, value) => {
  const validate = scheme.validate;
  if (validate !== undefined && !passes(validate, components, names)) {
    for (const component of names) {
      const rule = validate[component];
      if (rule === undefined) {
        continue;
      }

      const text = components[component];
      if (rule === "required") {
        if (text === undefined) {
          return { reason: "missing-component", component, name: scheme.name, rule: scheme.rule };
        }
      } else if (rule === "forbidden") {
        if (text !== undefined) {
          return { reason: "forbidden-component", component, name: scheme.name, rule: scheme.rule };
        }
      } else if (text !== undefined && !rule.test(text)) {
        return { reason: "component-mismatch", component, name: scheme.name, rule: scheme.rule, description: rule.description };
      }
    }
  }

  // Only the NSS has a namespace's rules, and its path has already passed RFC 8141's
  const namespaces = scheme[urnNamespaces];
  if (namespaces !== undefined && names.includes("path")) {
    const [nid, nss] = splitUrnPath(components.path);
    const namespace = knownNamespace(value, namespaces, nid);
    if (namespace.test !== undefined && !namespace.test(nss)) {
      return { reason: "component-mismatch", component: "path", name: scheme.name, rule: scheme.rule, description: namespace.description, nid };
    }
  }

  return undefined;
};

/** @type (validate: NonNullable<API.Scheme["validate"]>, components: Components, names: readonly SchemeComponent[]) => boolean */
const passes = (validate, components, names) => {
  for (const key in validate) {
    const component = /** @type SchemeComponent */ (key);
    if (names !== allComponents && !names.includes(component)) {
      continue;
    }

    const rule = validate[component];
    const text = components[component];
    if (rule === "required" ? text === undefined : rule === "forbidden" ? text !== undefined : text !== undefined && rule !== undefined && !rule.test(text)) {
      return false;
    }
  }

  return true;
};

/** @type (path: string) => [string, string] */
const splitUrnPath = (path) => {
  const colon = path.indexOf(":");
  return [path.slice(0, colon), path.slice(colon + 1)];
};

/** @type (value: string, namespaces: Map<string, API.UrnNamespace>, nid: string) => API.UrnNamespace */
const knownNamespace = (value, namespaces, nid) => {
  const namespace = namespaces.get(nid.toLowerCase());
  if (namespace === undefined) {
    throw new UnknownUrnNamespaceError(value, nid.toLowerCase());
  }
  return namespace;
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

/** @type (strategy: Strategy, value: string, options: API.Options | undefined) => string */
const normalize = (strategy, value, options) => {
  const parsed = split(value);
  const name = /** @type string */ (parsed.scheme).toLowerCase();
  const scheme = knownScheme(value, name, options);

  // The syntax-based normalization comes first, then the scheme's, which is the order of RFC 3986's comparison
  // ladder (§6.2)
  const components = scheme.syntaxNormalization === false
    ? { ...parsed, scheme: name }
    : normalizeComponents(strategy, parsed);

  normalizeScheme(scheme, components, value);

  return recompose(components);
};

// A scheme's normalization changes the components it has a function for. A function only runs when its component is
// there, and returns undefined to remove it.
/** @type (scheme: InternalScheme, components: Components, value: string) => void */
const normalizeScheme = (scheme, components, value) => {
  const functions = scheme.normalize;
  if (functions !== undefined) {
    if (components.authority !== undefined) {
      if (functions.userinfo !== undefined && components.userinfo !== undefined) {
        setOrDelete(components, "userinfo", functions.userinfo(components.userinfo));
      }
      if (functions.host !== undefined) {
        components.host = functions.host(/** @type string */ (components.host));
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

  // A namespace's normalization runs after RFC 8141's
  const namespaces = scheme[urnNamespaces];
  if (namespaces !== undefined) {
    const [nid, nss] = splitUrnPath(components.path);
    const namespace = knownNamespace(value, namespaces, nid);
    if (namespace.normalize !== undefined) {
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

const hasUppercase = /[A-Z]/;
const uppercaseOrPercentEncoded = new RegExp(`${pctEncoded}|[A-Z]+`, "g");

// Resolving

// The algorithm of RFC 3986 §5.2, without normalizing. The base is trusted, and isn't read when the reference has a
// scheme. The result is checked with its scheme's rules, except where they can't fail.
/** @type (reference: string, base: string, options: API.Options | undefined) => string */
const resolve = (reference, base, options) => {
  if (reference === "") {
    return base;
  }

  // Only the fragment changes, so only its rule is checked
  if (reference.startsWith("#")) {
    checkResolved(base, { scheme: "", path: "", fragment: reference.slice(1) }, fragmentOnly, reference, base + reference, options);
    return base + reference;
  }

  // Only the query and the fragment change
  if (reference.startsWith("?")) {
    const queryStart = base.indexOf("?");
    const result = (queryStart === -1 ? base : base.slice(0, queryStart)) + reference;
    checkResolved(base, split(reference), queryAndFragment, reference, result, options);
    return result;
  }

  const ref = split(reference);

  /** @type Components */
  let target;
  if (ref.scheme !== undefined) {
    // It passed a validator with its scheme when it got its brand, so without dot segments it's already the result
    if (!hasDotSegment.test(ref.path)) {
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
    } else {
      const path = ref.path.startsWith("/") ? ref.path : mergePaths(ref.path, baseComponents);
      target = { ...baseComponents, path: withoutDotSegments(path), query: ref.query, fragment: ref.fragment };
    }
  }

  // Without an authority, a path starting with "//" would be parsed as an authority. Prefixing "/." keeps it a path.
  if (target.authority === undefined && target.path.startsWith("//")) {
    target.path = "/." + target.path;
  }

  const result = recompose(target);
  checkResolved(result, target, allComponents, reference, result, options);
  return result;
};

/** @type readonly SchemeComponent[] */
const fragmentOnly = ["fragment"];
/** @type readonly SchemeComponent[] */
const queryAndFragment = ["query", "fragment"];

// A result that breaks its scheme's rules can only be the reference's fault, because the base has a brand, so the
// error is about the reference, spanned in it
/** @type (identifier: string, components: Components, names: readonly SchemeComponent[], reference: string, result: string, options: API.Options | undefined) => void */
const checkResolved = (identifier, components, names, reference, result, options) => {
  const name = /** @type string */ (schemeOf(identifier));
  const scheme = knownScheme(result, name, options);
  if (scheme.validate === undefined && scheme[urnNamespaces] === undefined) {
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
      return `${rule.startsWith("absolute-") ? "an" : "a"} ${rule} has to have a scheme`;
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
