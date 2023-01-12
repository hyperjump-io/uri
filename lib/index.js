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

const parse = {
  uri: { base: parseAbsoluteUri, reference: parseUriReference },
  iri: { base: parseAbsoluteIri, reference: parseIriReference }
};

export const resolveReference = (uriReference, baseUri, type = "uri") => {
  let { scheme, authority, path, query, fragment } = parse[type].reference(uriReference);

  if (scheme === undefined) {
    const base = parse[type].base(baseUri);
    scheme = base.scheme;

    if (authority === undefined) {
      authority = base.authority;

      if (path === "") {
        path = base.path;

        if (query === undefined) {
          query = base.query;
        }
      } else if (!path.startsWith("/")) {
        path = mergePaths(path, base);
      }
    }
  }

  let resolved = scheme + ":";
  resolved += authority === undefined ? "" : "//" + authority;
  resolved += removeDotSegments(path);
  resolved += query === undefined ? "" : "?" + query;
  resolved += fragment === undefined ? "" : "#" + fragment;
  return resolved;
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
