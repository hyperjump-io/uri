// Common
const hexdig = `[a-fA-F0-9]`;
const unreserved = `[a-zA-Z0-9-._~]`;
const subDelims = `[!$&'()*+,;=]`;
const pctEncoded = `%${hexdig}${hexdig}`;

const decOctet = `(?:\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])`;
const ipV4Address = `${decOctet}\\.${decOctet}\\.${decOctet}\\.${decOctet}`;
const h16 = `${hexdig}{1,4}`;
const ls32 = `(?:${h16}:${h16}|${ipV4Address})`;
const ipV6Address = `(?:(?:${h16}:){6}${ls32}|::(?:${h16}:){5}${ls32}|(?:${h16})?::(?:${h16}:){4}${ls32}|(?:(?:${h16}:){0,1}${h16})?::(?:${h16}:){3}${ls32}|(?:(?:${h16}:){0,2}${h16})?::(?:${h16}:){2}${ls32}|(?:(?:${h16}:){0,3}${h16})?::(?:${h16}:){1}${ls32}|(?:(?:${h16}:){0,4}${h16})?::${ls32}|(?:(?:${h16}:){0,5}${h16})?::${h16}|(?:(?:${h16}:){0,6}${h16})?::)`;
const ipVFuture = `v${hexdig}+\\.(?:${unreserved}|${subDelims}|:)+`;
const ipLiteral = `\\[(?:${ipV6Address}|${ipVFuture})\\]`;
const scheme = `(?<scheme>[a-zA-Z][a-zA-Z0-9-+.]*)`;
const port = `:(?<port>\\d*)`;

// URI
const regName = `(?:${unreserved}|${pctEncoded}|${subDelims})*?`;
const host = `(?<host>${ipLiteral}|${ipV4Address}|${regName})`;
const userinfo = `(?<userinfo>(?:${unreserved}|${pctEncoded}|${subDelims}|:)*)`;
const pchar = `(?:${unreserved}|${pctEncoded}|${subDelims}|:|@)`;
const segment = `${pchar}*?`;
const pathAbEmpty = `(?:/${segment})*`;

const authority = `(?<authority>(?:${userinfo}@)?${host}(?:${port})?)`;
const path = `(?<path>${pathAbEmpty})`;
const pathWithoutAuthority = `(?<path2>${segment}${pathAbEmpty})`;
const query = `(?:\\?(?<query>(?:${pchar}|/|\\?)*))?`;
const fragment = `(?:#(?<fragment>(?:${pchar}|/|\\?)*))?`;

const uri = `^${scheme}:(?://${authority}${path}|${pathWithoutAuthority})${query}${fragment}$`;
const uriReference = `^(?:${scheme}:|)(?://${authority}${path}|${pathWithoutAuthority})${query}${fragment}$`;
const absoluteUri = `^${scheme}:(?://${authority}${path}|${pathWithoutAuthority})${query}$`;

// IRI
const iunreserved = `[a-zA-Z0-9-._~\\00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF\\u10000-\\u1FFFD\\u20000-\\u2FFFD\\u30000-\\u3FFFD\\u40000-\\u4FFFD\\u50000-\\u5FFFD\\u60000-\\u6FFFD\\u70000-\\u7FFFD\\u80000-\\u8FFFD\\u90000-\\u9FFFD\\uA0000-\\uAFFFD\\uB0000-\\uBFFFD\\uC0000-\\uCFFFD\\uD0000-\\uDFFFD\\uE1000-\\uEFFFD]`;
const iprivate = `[\\uE000-\\uF8FF\\uF0000-\\uFFFFD\\u100000-\\u10FFFD]`;

const iregName = `(?:${iunreserved}|${pctEncoded}|${subDelims})*?`;
const ihost = `(?<host>${ipLiteral}|${ipV4Address}|${iregName})`;
const iuserinfo = `(?<userinfo>(?:${iunreserved}|${pctEncoded}|${subDelims}|:)*)`;
const ipchar = `(?:${iunreserved}|${pctEncoded}|${subDelims}|:|@)`;
const isegment = `${ipchar}*?`;
const ipathAbEmpty = `(?:/${isegment})*`;

const iauthority = `(?<authority>(?:${iuserinfo}@)?${ihost}(?:${port})?)`;
const ipath = `(?<path>${ipathAbEmpty})`;
const ipathWithoutAuthority = `(?<path2>${isegment}${ipathAbEmpty})`;
const iquery = `(?:\\?(?<query>(?:${ipchar}|${iprivate}|/|\\?)*))?`;
const ifragment = `(?:#(?<fragment>(?:${ipchar}|/|\\?)*))?`;

const iri = `^${scheme}:(?://${iauthority}${ipath}|${ipathWithoutAuthority})${iquery}${ifragment}$`;
const iriReference = `^(?:${scheme}:|)(?://${iauthority}${ipath}|${ipathWithoutAuthority})${iquery}${ifragment}$`;
const absoluteIri = `^${scheme}:(?://${iauthority}${ipath}|${ipathWithoutAuthority})${iquery}$`;

// Components
const resolveReference = (strategy) => (reference, base) => {
  const resolvedComponents = strategy.parseReference(reference);

  if (resolvedComponents.scheme === undefined) {
    const baseComponents = strategy.parseAbsolute(base);
    resolvedComponents.scheme = baseComponents.scheme;

    if (resolvedComponents.authority === undefined) {
      resolvedComponents.authority = baseComponents.authority;

      if (resolvedComponents.path === "") {
        resolvedComponents.path = baseComponents.path;

        if (resolvedComponents.query === undefined) {
          resolvedComponents.query = baseComponents.query;
        }
      } else if (!resolvedComponents.path.startsWith("/")) {
        resolvedComponents.path = mergePaths(resolvedComponents.path, baseComponents);
      }
    }
  }

  return composeIdentifier(strategy, resolvedComponents);
};

const mergePaths = (path, base) => {
  if (base.authority && base.path === "") {
    return "/" + path;
  } else {
    const position = base.path.lastIndexOf("/");
    return position === -1 ? path : base.path.slice(0, position + 1) + path;
  }
};

const isNoOpSegment = /^\.?\.\/|^\.\.?$/;
const isSlashDotSegment = /^\/\.(?:\/|$)/;
const isUpSegment = /^\/\.\.(?:\/|$)/;
const removeDotSegments = (path) => {
  let output = "";

  while (path.length > 0) {
    if (isNoOpSegment.test(path)) {
      path = removeSegment(path);
    } else if (isSlashDotSegment.test(path)) {
      path = replaceSegmentWithSlash(path);
    } else if (isUpSegment.test(path)) {
      path = replaceSegmentWithSlash(path);
      output = removeLastSegment(output);
    } else {
      const segment = getSegment(path);
      path = removeSegment(path);
      output += segment;
    }
  }

  return output;
};

const removeSegment = (path) => {
  const position = path.indexOf("/", 1);
  return position === -1 ? "" : "/" + path.slice(position + 1);
};

const replaceSegmentWithSlash = (path) => {
  const position = path.indexOf("/", 1);
  return position === -1 ? "/" : "/" + path.slice(position + 1);
};

const removeLastSegment = (path) => {
  const position = path.lastIndexOf("/");
  return position === -1 ? path : path.slice(0, position);
};

const getSegment = (path) => {
  const position = path.indexOf("/", 1);
  return position === -1 ? path : path.slice(0, position);
};

const composeIdentifier = (strategy, components) => {
  let resolved = components.scheme + ":";
  resolved += components.authority === undefined ? "" : "//" + components.authority;
  resolved += strategy.normalizePath(components.path);
  resolved += components.query === undefined ? "" : "?" + strategy.normalizeQuery(components.query);
  resolved += components.fragment === undefined ? "" : "#" + strategy.normalizeFragment(components.fragment);

  return resolved;
};

const percentEncoded = new RegExp(pctEncoded, "g");
const percentEncodedToChar = (isAllowed) => (match) => {
  const charCode = parseInt(match.slice(1), 16);
  const char = String.fromCharCode(charCode);

  return isAllowed(char) ? char : match.toUpperCase();
};

const isAllowedUnescapedInPath = RegExp.prototype.test.bind(new RegExp(`${unreserved}|${subDelims}|[:@]`));
const isAllowedUnescapedInIPath = RegExp.prototype.test.bind(new RegExp(`${iunreserved}|${subDelims}|[:@]`));
const normalizePath = (isAllowed) => (segment) => removeDotSegments(segment).replaceAll(percentEncoded, percentEncodedToChar(isAllowed));

const isAllowedUnescapedInQuery = RegExp.prototype.test.bind(new RegExp(`${unreserved}|${subDelims}|[:@/?]`));
const isAllowedUnescapedInIQuery = RegExp.prototype.test.bind(new RegExp(`${iunreserved}|${subDelims}|[:@/?]`));
const normalizeQuery = (isAllowed) => (query) => query.replaceAll(percentEncoded, percentEncodedToChar(isAllowed));

// API
export const isUri = RegExp.prototype.test.bind(new RegExp(uri));
export const isUriReference = RegExp.prototype.test.bind(new RegExp(uriReference));
export const isAbsoluteUri = RegExp.prototype.test.bind(new RegExp(absoluteUri));

export const isIri = RegExp.prototype.test.bind(new RegExp(iri));
export const isIriReference = RegExp.prototype.test.bind(new RegExp(iriReference));
export const isAbsoluteIri = RegExp.prototype.test.bind(new RegExp(absoluteIri));

const createParser = (pattern, type) => (value) => {
  const match = pattern.exec(value);
  if (match === null) {
    throw Error(`Invalid ${type}: ${value}`);
  }
  if (match.groups.authority === undefined) {
    match.groups.path = match.groups.path2;
  }
  delete match.groups.path2;

  return match.groups;
};

export const parseUri = createParser(new RegExp(uri), "URI");
export const parseUriReference = createParser(new RegExp(uriReference), "URI-reference");
export const parseAbsoluteUri = createParser(new RegExp(absoluteUri), "absolute-URI");

export const parseIri = createParser(new RegExp(iri), "IRI");
export const parseIriReference = createParser(new RegExp(iriReference), "IRI-reference");
export const parseAbsoluteIri = createParser(new RegExp(absoluteIri), "absolute-IRI");

const strategies = {
  uri: {
    parseAbsolute: parseAbsoluteUri,
    parseReference: parseUriReference,
    parse: parseUri,
    normalizePath: normalizePath(isAllowedUnescapedInPath),
    normalizeQuery: normalizeQuery(isAllowedUnescapedInQuery),
    normalizeFragment: normalizeQuery(isAllowedUnescapedInQuery)
  },
  iri: {
    parseAbsolute: parseAbsoluteIri,
    parseReference: parseIriReference,
    parse: parseIri,
    normalizePath: normalizePath(isAllowedUnescapedInIPath),
    normalizeQuery: normalizeQuery(isAllowedUnescapedInIQuery),
    normalizeFragment: normalizeQuery(isAllowedUnescapedInIQuery)
  }
};

const toAbsolute = (strategy) => (identifier) => {
  const components = strategy.parse(identifier);
  delete components.fragment;
  return composeIdentifier(strategy, components);
};

export const toAbsoluteUri = toAbsolute(strategies.uri);
export const toAbsoluteIri = toAbsolute(strategies.iri);

const normalize = (strategy) => (identifier) => {
  const components = strategy.parse(identifier);
  return composeIdentifier(strategy, components);
};

export const normalizeUri = normalize(strategies.uri);
export const normalizeIri = normalize(strategies.iri);

export const resolveUri = resolveReference(strategies.uri);
export const resolveIri = resolveReference(strategies.iri);
