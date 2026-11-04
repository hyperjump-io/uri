import {
  InvalidUriError, UnknownSchemeError, UnknownUrnNamespaceError, UnsupportedIpVersionError,
  assertAbsoluteIri, assertIri, assertIriReference, isAbsoluteUri, isIri, isUri, isUriReference,
  normalizeIri, normalizeUri, parseIri, parseTag, parseUrn, resolveIri, toAbsoluteIri, toRelativeIri, urnScheme
} from "./index.js";
import type {
  AbsoluteIri, AbsoluteUri, IdentifierComponents, Iri, IriReference, IriRule, NormalizedIri, NormalizedUri, Scheme,
  Uri, UriReference, UriRule
} from "./index.d.ts";

declare const value: string;

// A string has to be checked before a function that trusts it takes it
// @ts-expect-error A string that wasn't checked isn't an Iri
parseIri(value);
// @ts-expect-error A string that wasn't checked isn't an AbsoluteIri
resolveIri("a", value);

// The validators are type guards
if (isIri(value)) {
  value satisfies Iri;
  // @ts-expect-error An IRI isn't a URI
  value satisfies Uri;
}

// And assert* are assertion functions
declare const assertedIri: string;
assertIri(assertedIri);
assertedIri satisfies Iri;

// A brand is assignable to what it's a subset of
declare const uri: Uri;
declare const absoluteUri: AbsoluteUri;
declare const absoluteIri: AbsoluteIri;
declare const uriReference: UriReference;
uri satisfies Iri;
uri satisfies IriReference;
absoluteUri satisfies AbsoluteIri;
absoluteIri satisfies Iri;
uriReference satisfies IriReference;
// @ts-expect-error A reference isn't an IRI
uriReference satisfies Iri;
// @ts-expect-error An IRI isn't absolute
uri satisfies AbsoluteIri;

// A URI doesn't have to have an authority, so its parts can be missing
const components = parseIri(uri);
components.scheme satisfies string;
components.path satisfies string;
// @ts-expect-error A URI like urn:example:foo has no host
components.host satisfies string;
components.host satisfies string | undefined;

// A reference doesn't have to have a scheme
declare const reference: IriReference;
// @ts-expect-error A reference like ../foo has no scheme
parseIri(reference).scheme satisfies string;

// An absolute-URI has no fragment
// @ts-expect-error An absolute-URI has no fragment
void parseIri(absoluteIri).fragment;

// The components are readonly
// @ts-expect-error The components can't be changed
components.path = "/foo";

// The components can be spread into a new value
const changed = { ...components, path: "/bar" };
changed.path satisfies string;

// Resolving keeps a URI a URI
resolveIri(uriReference, absoluteUri) satisfies Uri;
resolveIri(reference, absoluteIri) satisfies Iri;
// @ts-expect-error Resolving an IRI-reference doesn't make a URI
resolveIri(reference, absoluteUri) satisfies Uri;
// @ts-expect-error A base has to be absolute
resolveIri(reference, uri);

// toAbsoluteIri keeps the brands its input has
toAbsoluteIri(uri) satisfies AbsoluteUri;
declare const normalizedIri: NormalizedIri;
toAbsoluteIri(normalizedIri) satisfies NormalizedIri & AbsoluteIri;

// Normalizing keeps an absolute IRI absolute, but normalizeIri doesn't keep a URI a URI, since it decodes Unicode
normalizeIri(absoluteIri) satisfies AbsoluteIri & NormalizedIri;
// @ts-expect-error normalizeIri can decode a URI's percent-encoded Unicode
normalizeIri(uri) satisfies Uri;
normalizeUri(absoluteUri) satisfies AbsoluteUri & NormalizedUri;
// @ts-expect-error A URI normalized as a URI isn't normalized as an IRI
normalizeUri(uri) satisfies NormalizedIri;

// toRelativeIri takes normalized identifiers
// @ts-expect-error The target has to be normalized
toRelativeIri(uri, normalizeUri(absoluteUri));
toRelativeIri(normalizeUri(uri), normalizeUri(absoluteUri)) satisfies UriReference;
toRelativeIri(normalizedIri, normalizeIri(absoluteIri)) satisfies IriReference;
// @ts-expect-error The base has to be absolute
toRelativeIri(normalizedIri, normalizedIri);

// The checked forms of each rule
if (isUri(value)) {
  value satisfies Uri;
}
if (isUriReference(value)) {
  value satisfies UriReference;
}
if (isAbsoluteUri(value)) {
  value satisfies AbsoluteUri;
}
declare const assertedReference: string;
assertIriReference(assertedReference);
assertedReference satisfies IriReference;
declare const assertedAbsolute: string;
assertAbsoluteIri(assertedAbsolute);
assertedAbsolute satisfies AbsoluteIri;

// A scheme is a plain object, and its type checks its shape
const did = { name: "did", rule: "did" } satisfies Scheme;
isIri(value, { customSchemes: [did] });
isIri(value, {
  customSchemes: [{
    name: "x",
    rule: "x",
    validate: { authority: "required", path: { test: (path) => path !== "" } },
    normalize: { port: () => undefined }
  }]
});
// @ts-expect-error A scheme needs a rule for its errors
isIri(value, { customSchemes: [{ name: "x" }] });
// @ts-expect-error A scheme's name decides its scheme, so it has no rule
isIri(value, { customSchemes: [{ name: "x", rule: "x", validate: { scheme: "required" } }] });
// @ts-expect-error A rule's test is a function, not a RegExp
isIri(value, { customSchemes: [{ name: "x", rule: "x", validate: { path: { test: /a/ } } }] });
// @ts-expect-error A fragment isn't normalized by a scheme
isIri(value, { customSchemes: [{ name: "x", rule: "x", normalize: { fragment: (fragment: string) => fragment } }] });
// @ts-expect-error A path is always there, so its function can't remove it
isIri(value, { customSchemes: [{ name: "x", rule: "x", normalize: { path: () => undefined } }] });
isIri(value, { customSchemes: [urnScheme({ isbn: { test: (nss) => nss !== "" }, example: {} })] });

// parseUrn and parseTag
const urn = parseUrn(uri);
urn.nid satisfies string;
urn.nss satisfies string;
urn.fComponent satisfies string | undefined;
// @ts-expect-error A URN's scheme is always urn
void urn.scheme;
parseTag(uri).date satisfies string;

// The errors say which rule a value didn't match
declare const error: unknown;
if (error instanceof InvalidUriError) {
  error.rule satisfies UriRule | (string & {});
  // @ts-expect-error A rule can be a scheme's
  error.rule satisfies UriRule;
  // @ts-expect-error An InvalidUriError's rule is a URI rule or a scheme's
  error.rule satisfies IriRule;
}

// The errors say what's wrong and where
if (error instanceof InvalidUriError) {
  error.component satisfies keyof IdentifierComponents;
  error.start satisfies number;
  error.end satisfies number;
  switch (error.reason) {
    case "invalid-character":
    case "invalid-percent-encoding":
    case "invalid-ip-literal":
    case "missing-scheme":
    case "fragment-not-allowed":
    case "colon-in-first-segment":
    case "missing-component":
    case "forbidden-component":
    case "component-mismatch":
      break;
    default:
      error.reason satisfies never;
  }
  // @ts-expect-error A reason is one of the listed codes
  error.reason satisfies "not-a-reason";
}
if (error instanceof UnsupportedIpVersionError) {
  error.host satisfies string;
}
if (error instanceof UnknownSchemeError) {
  error.scheme satisfies string;
}
if (error instanceof UnknownUrnNamespaceError) {
  error.nid satisfies string;
}

// The errors can't be constructed outside the package
// @ts-expect-error The constructor is private
new InvalidUriError();
// @ts-expect-error The constructor is private
new UnknownSchemeError();
