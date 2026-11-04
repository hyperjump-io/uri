/** @import { Context } from "../abnf/index.d.ts" */
/** @import { ComponentPattern } from "./index.d.ts" */

// Contexts for compiling a scheme's ABNF with @hyperjump/abnf, one for each component. They're data: RFC 3986's and
// RFC 3987's rules, the characters a component can have, and the delimiters that end it. Nothing here depends on the
// compiler, and index.js doesn't import this.

// RFC 3986 Appendix A
const rfc3986 = `
  URI           = scheme ":" hier-part [ "?" query ] [ "#" fragment ]
  hier-part     = "//" authority path-abempty
                / path-absolute
                / path-rootless
                / path-empty
  URI-reference = URI / relative-ref
  absolute-URI  = scheme ":" hier-part [ "?" query ]
  relative-ref  = relative-part [ "?" query ] [ "#" fragment ]
  relative-part = "//" authority path-abempty
                / path-absolute
                / path-noscheme
                / path-empty
  scheme        = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
  authority     = [ userinfo "@" ] host [ ":" port ]
  userinfo      = *( unreserved / pct-encoded / sub-delims / ":" )
  host          = IP-literal / IPv4address / reg-name
  port          = *DIGIT
  IP-literal    = "[" ( IPv6address / IPvFuture  ) "]"
  IPvFuture     = "v" 1*HEXDIG "." 1*( unreserved / sub-delims / ":" )
  IPv6address   =                            6( h16 ":" ) ls32
                /                       "::" 5( h16 ":" ) ls32
                / [               h16 ] "::" 4( h16 ":" ) ls32
                / [ *1( h16 ":" ) h16 ] "::" 3( h16 ":" ) ls32
                / [ *2( h16 ":" ) h16 ] "::" 2( h16 ":" ) ls32
                / [ *3( h16 ":" ) h16 ] "::"    h16 ":"   ls32
                / [ *4( h16 ":" ) h16 ] "::"              ls32
                / [ *5( h16 ":" ) h16 ] "::"              h16
                / [ *6( h16 ":" ) h16 ] "::"
  h16           = 1*4HEXDIG
  ls32          = ( h16 ":" h16 ) / IPv4address
  IPv4address   = dec-octet "." dec-octet "." dec-octet "." dec-octet
  dec-octet     = DIGIT                 ; 0-9
                / %x31-39 DIGIT         ; 10-99
                / "1" 2DIGIT            ; 100-199
                / "2" %x30-34 DIGIT     ; 200-249
                / "25" %x30-35          ; 250-255
  reg-name      = *( unreserved / pct-encoded / sub-delims )
  path          = path-abempty    ; begins with "/" or is empty
                / path-absolute   ; begins with "/" but not "//"
                / path-noscheme   ; begins with a non-colon segment
                / path-rootless   ; begins with a segment
                / path-empty      ; zero characters
  path-abempty  = *( "/" segment )
  path-absolute = "/" [ segment-nz *( "/" segment ) ]
  path-noscheme = segment-nz-nc *( "/" segment )
  path-rootless = segment-nz *( "/" segment )
  path-empty    = 0<pchar>
  segment       = *pchar
  segment-nz    = 1*pchar
  segment-nz-nc = 1*( unreserved / pct-encoded / sub-delims / "@" )
                ; non-zero-length segment without any colon ":"
  pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
  query         = *( pchar / "/" / "?" )
  fragment      = *( pchar / "/" / "?" )
  pct-encoded   = "%" HEXDIG HEXDIG
  unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
  reserved      = gen-delims / sub-delims
  gen-delims    = ":" / "/" / "?" / "#" / "[" / "]" / "@"
  sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
                / "*" / "+" / "," / ";" / "="
`;

// RFC 3987 §2.2, the rules that differ from RFC 3986. The rules that are the same are RFC 3986's.
const rfc3987 = `
  IRI            = scheme ":" ihier-part [ "?" iquery ]
                        [ "#" ifragment ]
  ihier-part     = "//" iauthority ipath-abempty
                 / ipath-absolute
                 / ipath-rootless
                 / ipath-empty
  IRI-reference  = IRI / irelative-ref
  absolute-IRI   = scheme ":" ihier-part [ "?" iquery ]
  irelative-ref  = irelative-part [ "?" iquery ] [ "#" ifragment ]
  irelative-part = "//" iauthority ipath-abempty
                      / ipath-absolute
                 / ipath-noscheme
                 / ipath-empty
  iauthority     = [ iuserinfo "@" ] ihost [ ":" port ]
  iuserinfo      = *( iunreserved / pct-encoded / sub-delims / ":" )
  ihost          = IP-literal / IPv4address / ireg-name
  ireg-name      = *( iunreserved / pct-encoded / sub-delims )
  ipath          = ipath-abempty   ; begins with "/" or is empty
                 / ipath-absolute  ; begins with "/" but not "//"
                 / ipath-noscheme  ; begins with a non-colon segment
                 / ipath-rootless  ; begins with a segment
                 / ipath-empty     ; zero characters
  ipath-abempty  = *( "/" isegment )
  ipath-absolute = "/" [ isegment-nz *( "/" isegment ) ]
  ipath-noscheme = isegment-nz-nc *( "/" isegment )
  ipath-rootless = isegment-nz *( "/" isegment )
  ipath-empty    = 0<ipchar>
  isegment       = *ipchar
  isegment-nz    = 1*ipchar
  isegment-nz-nc = 1*( iunreserved / pct-encoded / sub-delims
                       / "@" )
                 ; non-zero-length segment without any colon ":"
  ipchar         = iunreserved / pct-encoded / sub-delims / ":"
                 / "@"
  iquery         = *( ipchar / iprivate / "/" / "?" )
  ifragment      = *( ipchar / "/" / "?" )
  iunreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~" / ucschar
  ucschar        = %xA0-D7FF / %xF900-FDCF / %xFDF0-FFEF
                 / %x10000-1FFFD / %x20000-2FFFD / %x30000-3FFFD
                 / %x40000-4FFFD / %x50000-5FFFD / %x60000-6FFFD
                 / %x70000-7FFFD / %x80000-8FFFD / %x90000-9FFFD
                 / %xA0000-AFFFD / %xB0000-BFFFD / %xC0000-CFFFD
                 / %xD0000-DFFFD / %xE1000-EFFFD
  iprivate       = %xE000-F8FF / %xF0000-FFFFD / %x100000-10FFFD
`;

// An IRI is valid for a scheme when its URI is, and its URI percent-encodes what RFC 3987's rules add (RFC 3987 §3.1),
// so in an IRI, each of RFC 3986's rules that RFC 3987 renamed means the renamed one. RFC 3986's rules are kept under
// their own names only where nothing replaces them.
const renamed = [
  "URI", "hier-part", "URI-reference", "absolute-URI", "relative-ref", "relative-part", "authority", "userinfo", "host",
  "reg-name", "path", "path-abempty", "path-absolute", "path-noscheme", "path-rootless", "path-empty", "segment",
  "segment-nz", "segment-nz-nc", "pchar", "query", "fragment", "unreserved"
];
const iriName = (/** @type string */ name) => name.includes("URI") ? name.replace("URI", "IRI") : `i${name}`;
const rfc3986Kept = rfc3986.replaceAll(/^ {2}(\S+)\s+=[\s\S]*?(?=^ {2}\S|(?![\s\S]))/gm, (rule, name) => renamed.includes(name) ? "" : rule);
const iriRules = `${rfc3987}${rfc3986Kept}${renamed.map((name) => `  ${name} = ${iriName(name)}\n`).join("")}`;
const asciiRules = `${rfc3986}${rfc3987}`;

/** @type (rules: string, alphabet: string, delimiters?: string) => Context<any> */
const context = (rules, alphabet, delimiters) => Object.freeze({ rules, alphabet, delimiters, percentEncoded: true, anchored: false });

// The characters each component can have in an IRI, and the delimiters that end it. A host's delimiters don't include
// ":", because an IP literal has it, and a fragment is the last component, so nothing ends it.
const characters = `iunreserved / sub-delims / "%"`;
const pathCharacters = `${characters} / ":" / "@" / "/"`;
/** @type Record<string, [string, string?]> */
const components = {
  authority: [`${characters} / ":" / "@" / "[" / "]"`, `"/" / "?" / "#"`],
  userinfo: [`${characters} / ":"`, `"@"`],
  host: [`${characters} / ":" / "[" / "]"`, `"/" / "?" / "#"`],
  port: [`DIGIT`, `"/" / "?" / "#"`],
  path: [pathCharacters, `"?" / "#"`],
  query: [`${pathCharacters} / "?" / iprivate`, `"#"`],
  fragment: [`${pathCharacters} / "?"`]
};

/** @type Context<ComponentPattern<"authority">> */
export const authority = context(iriRules, ...components.authority);
/** @type Context<ComponentPattern<"userinfo">> */
export const userinfo = context(iriRules, ...components.userinfo);
/** @type Context<ComponentPattern<"host">> */
export const host = context(iriRules, ...components.host);
/** @type Context<ComponentPattern<"port">> */
export const port = context(iriRules, ...components.port);
/** @type Context<ComponentPattern<"path">> */
export const path = context(iriRules, ...components.path);
/** @type Context<ComponentPattern<"query">> */
export const query = context(iriRules, ...components.query);
/** @type Context<ComponentPattern<"fragment">> */
export const fragment = context(iriRules, ...components.fragment);

/** @type Context<ComponentPattern<"authority">> */
export const asciiAuthority = context(asciiRules, ...components.authority);
/** @type Context<ComponentPattern<"userinfo">> */
export const asciiUserinfo = context(asciiRules, ...components.userinfo);
/** @type Context<ComponentPattern<"host">> */
export const asciiHost = context(asciiRules, ...components.host);
/** @type Context<ComponentPattern<"port">> */
export const asciiPort = context(asciiRules, ...components.port);
/** @type Context<ComponentPattern<"path">> */
export const asciiPath = context(asciiRules, ...components.path);
/** @type Context<ComponentPattern<"query">> */
export const asciiQuery = context(asciiRules, ...components.query);
/** @type Context<ComponentPattern<"fragment">> */
export const asciiFragment = context(asciiRules, ...components.fragment);
