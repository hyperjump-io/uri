declare const reference: unique symbol;
declare const full: unique symbol;
declare const absolute: unique symbol;
declare const ascii: unique symbol;
declare const normalized: unique symbol;
declare const normalizedUri: unique symbol;
declare const defined: unique symbol;
declare const component: unique symbol;

/**
 * A string that {@link isIriReference} or {@link assertIriReference}
 * checked: an IRI, or a relative reference. Brands are only in the types.
 * At runtime it's a string.
 */
export type IriReference = string & { readonly [reference]: true };

/** A string that {@link isIri} or {@link assertIri} checked. */
export type Iri = IriReference & { readonly [full]: true };

/** A string that {@link isAbsoluteIri} or {@link assertAbsoluteIri} checked. */
export type AbsoluteIri = Iri & { readonly [absolute]: true };

/** An IRI that {@link normalizeIri} normalized. */
export type NormalizedIri = Iri & { readonly [normalized]: true };

/** A string that {@link isUriReference} or {@link assertUriReference} checked. */
export type UriReference = IriReference & { readonly [ascii]: true };

/** A string that {@link isUri} or {@link assertUri} checked. Every URI is an IRI. */
export type Uri = Iri & UriReference;

/** A string that {@link isAbsoluteUri} or {@link assertAbsoluteUri} checked. */
export type AbsoluteUri = AbsoluteIri & Uri;

/**
 * A URI that {@link normalizeUri} normalized. It isn't a
 * {@link NormalizedIri}, because {@link normalizeIri} decodes Unicode
 * characters that {@link normalizeUri} leaves encoded.
 */
export type NormalizedUri = Uri & { readonly [normalizedUri]: true };

/** The options of the functions that know schemes. */
export type Options = {
  /**
   * Schemes to know besides the built-in ones, `http`, `https`, `file`,
   * `tag`, and `urn`. A scheme with a built-in's name replaces it.
   */
  readonly customSchemes?: readonly Scheme[];
};

/**
 * A scheme {@link defineScheme} made, to pass in `customSchemes`. It has
 * its definition's fields, and its patterns compiled.
 */
export type Scheme = SchemeDefinition & { readonly [defined]: true };

/**
 * A scheme's rules and normalization, on top of the generic syntax, for
 * {@link defineScheme}. A scheme with neither, like
 * `{ name: "data", rule: "dataurl" }`, is known and adds nothing.
 */
export type SchemeDefinition = {
  /** The scheme's name. It matches without case. */
  readonly name: string;

  /** The ABNF rule its specification names it by, like `"http-URI"`. Errors say it. */
  readonly rule: string;

  /**
   * Whether {@link normalizeIri} applies RFC 3986's syntax-based
   * normalization before the scheme's. With `false`, only the scheme is
   * lowercased. Defaults to `true`.
   */
  readonly syntaxNormalization?: boolean;

  /** A rule for each component that has one. The generic syntax is checked too. */
  readonly validate?: {
    readonly [Component in SchemeComponent]?: ComponentRule<Component>;
  };

  /**
   * A function for each component the scheme normalizes. It runs only when
   * its component is there, after the syntax-based normalization, and
   * returns `undefined` to remove it.
   */
  readonly normalize?: {
    readonly userinfo?: (userinfo: string) => string | undefined;
    readonly host?: (host: string) => string;
    readonly port?: (port: string) => string | undefined;
    readonly path?: (path: string) => string;
    readonly query?: (query: string) => string | undefined;
  };
};

/** A component a scheme can have a rule for: every one but the scheme. */
export type SchemeComponent = Exclude<keyof IdentifierComponents, "scheme">;

/**
 * What a scheme requires of a component.
 *
 * - `"required"`: it has to be there.
 * - `"forbidden"`: it can't be there.
 * - `{ pattern, description? }`: when it's there, it has to match
 *   `pattern`. `description` finishes "a tag URI's path must be …" in the
 *   error.
 */
export type ComponentRule<C extends SchemeComponent = SchemeComponent>
  = "required"
    | "forbidden"
    | { readonly pattern: ComponentPattern<C>; readonly description?: string };

/**
 * A pattern for a component, compiled from ABNF by `@hyperjump/abnf` with
 * a context from `@hyperjump/uri/abnf`:
 *
 * ```js
 * import { abnf } from "@hyperjump/abnf";
 * import { host } from "@hyperjump/uri/abnf";
 *
 * const nonEmptyHost = abnf(host)`IP-literal / 1*( unreserved / pct-encoded / sub-delims )`;
 * ```
 *
 * The brand is only in the types. At runtime a pattern is any `RegExp`
 * with the `u` flag and no other, so one compiled at build time can be
 * loaded with `new RegExp(source, "u") as ComponentPattern<"host">`.
 *
 * A hand-written `RegExp` needs the same cast, and then what the compiler
 * does is the caller's to do. A pattern is matched where its component
 * starts, against the rest of the identifier, and has to be followed by
 * what can follow the component, like `?`, `#`, or the end for a path. It
 * only checks structure, since the generic syntax checks the characters.
 * So a pattern that can match its component's delimiters can run past it:
 * `/.+/u` for a host lets an empty host through, where `/[^:/?#]+/u`
 * doesn't. And `^` and `$` are the start and end of the whole identifier.
 */
export type ComponentPattern<C extends SchemeComponent> = RegExp & { readonly [component]: C };

/**
 * A URN namespace's rules and normalization, on its NSS. `{}` is a
 * namespace that's known and adds nothing.
 */
export type UrnNamespace = {
  /**
   * What an NSS of the namespace matches, compiled with
   * `@hyperjump/uri/abnf`'s `asciiPath`, since the NSS ends where the path
   * does and a URN is ASCII. RFC 8141's rules are checked too.
   */
  readonly pattern?: ComponentPattern<"path">;

  /** Finishes "a uuid URN's NSS must be …" in the error. */
  readonly description?: string;

  /** Normalizes an NSS, after RFC 8141's normalization. */
  readonly normalize?: (nss: string) => string;
};

/**
 * Whether `value` is a URI (RFC 3986 §3), with the rules of its scheme: it
 * has a scheme, and it can have a fragment.
 *
 * @throws {UnknownSchemeError} If the scheme isn't built in or in
 *   `customSchemes`. Whether `value` is valid for it can't be known.
 * @throws {UnknownUrnNamespaceError} If it's a URN of a namespace the
 *   `urn` scheme doesn't know.
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version, like `[v7.future]`. Its syntax is known, but not
 *   whether the address is valid.
 */
export const isUri: (value: string, options?: Options) => value is Uri;

/**
 * Whether `value` is a URI-reference (RFC 3986 §4.1): a URI, or a relative
 * reference like `../foo#bar`. A relative reference isn't checked against
 * a scheme.
 *
 * @throws {UnknownSchemeError} If `value` has a scheme that isn't known.
 * @throws {UnknownUrnNamespaceError} If it's a URN of an unknown namespace.
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const isUriReference: (value: string, options?: Options) => value is UriReference;

/**
 * Whether `value` is an absolute-URI (RFC 3986 §4.3): a URI without a
 * fragment.
 *
 * @throws {UnknownSchemeError} If the scheme isn't known.
 * @throws {UnknownUrnNamespaceError} If it's a URN of an unknown namespace.
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const isAbsoluteUri: (value: string, options?: Options) => value is AbsoluteUri;

/**
 * Whether `value` is an IRI (RFC 3987): a URI that can have Unicode
 * characters.
 *
 * @throws {UnknownSchemeError} If the scheme isn't known.
 * @throws {UnknownUrnNamespaceError} If it's a URN of an unknown namespace.
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const isIri: (value: string, options?: Options) => value is Iri;

/**
 * Whether `value` is an IRI-reference: an IRI, or a relative reference.
 *
 * @throws {UnknownSchemeError} If `value` has a scheme that isn't known.
 * @throws {UnknownUrnNamespaceError} If it's a URN of an unknown namespace.
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const isIriReference: (value: string, options?: Options) => value is IriReference;

/**
 * Whether `value` is an absolute-IRI: an IRI without a fragment.
 *
 * @throws {UnknownSchemeError} If the scheme isn't known.
 * @throws {UnknownUrnNamespaceError} If it's a URN of an unknown namespace.
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const isAbsoluteIri: (value: string, options?: Options) => value is AbsoluteIri;

/**
 * Checks that `value` is a URI, like {@link isUri}, and throws an error
 * that says what's wrong and where if it isn't.
 *
 * @throws {InvalidUriError} If `value` isn't a URI.
 * @throws {UnknownSchemeError} If the scheme isn't known.
 * @throws {UnknownUrnNamespaceError} If it's a URN of an unknown namespace.
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const assertUri: (value: string, options?: Options) => asserts value is Uri;

/**
 * Checks that `value` is a URI-reference, like {@link isUriReference}.
 *
 * @throws {InvalidUriError} If `value` isn't a URI-reference.
 * @throws {UnknownSchemeError} If `value` has a scheme that isn't known.
 * @throws {UnknownUrnNamespaceError} If it's a URN of an unknown namespace.
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const assertUriReference: (value: string, options?: Options) => asserts value is UriReference;

/**
 * Checks that `value` is an absolute-URI, like {@link isAbsoluteUri}.
 *
 * @throws {InvalidUriError} If `value` isn't an absolute-URI.
 * @throws {UnknownSchemeError} If the scheme isn't known.
 * @throws {UnknownUrnNamespaceError} If it's a URN of an unknown namespace.
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const assertAbsoluteUri: (value: string, options?: Options) => asserts value is AbsoluteUri;

/**
 * Checks that `value` is an IRI, like {@link isIri}.
 *
 * @throws {InvalidIriError} If `value` isn't an IRI.
 * @throws {UnknownSchemeError} If the scheme isn't known.
 * @throws {UnknownUrnNamespaceError} If it's a URN of an unknown namespace.
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const assertIri: (value: string, options?: Options) => asserts value is Iri;

/**
 * Checks that `value` is an IRI-reference, like {@link isIriReference}.
 *
 * @throws {InvalidIriError} If `value` isn't an IRI-reference.
 * @throws {UnknownSchemeError} If `value` has a scheme that isn't known.
 * @throws {UnknownUrnNamespaceError} If it's a URN of an unknown namespace.
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const assertIriReference: (value: string, options?: Options) => asserts value is IriReference;

/**
 * Checks that `value` is an absolute-IRI, like {@link isAbsoluteIri}.
 *
 * @throws {InvalidIriError} If `value` isn't an absolute-IRI.
 * @throws {UnknownSchemeError} If the scheme isn't known.
 * @throws {UnknownUrnNamespaceError} If it's a URN of an unknown namespace.
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const assertAbsoluteIri: (value: string, options?: Options) => asserts value is AbsoluteIri;

/**
 * Splits an IRI or a URI into its components, at its delimiters (RFC 3986
 * Appendix B). It doesn't check `value`, and never throws. A component that
 * isn't there isn't a property of the result. An empty one is `""`.
 */
export function parseIri(value: AbsoluteIri): AbsoluteIdentifierComponents;
export function parseIri(value: Iri): IdentifierComponents;
export function parseIri(value: IriReference): RelativeIdentifierComponents;

/**
 * Splits a URN into the parts of RFC 8141's grammar, as written. It
 * doesn't check that `value` is a URN.
 */
export const parseUrn: (value: Iri) => UrnComponents;

/**
 * Splits a tag URI into the parts of RFC 4151's grammar, as written. It
 * doesn't check that `value` is a tag.
 */
export const parseTag: (value: Iri) => TagComponents;

/**
 * Removes the fragment from an IRI or a URI: `value` up to its first `#`.
 * It keeps every other brand `value` has.
 */
export const toAbsoluteIri: <T extends Iri>(value: T) => T & AbsoluteIri;

/**
 * The scheme of an IRI or a URI, as written: `value` up to its first `:`.
 * It's what `parseIri(value).scheme` is, without splitting the other
 * components out.
 */
export const getScheme: (value: Iri) => string;

/**
 * The fragment of an IRI or a URI, or of a reference, as written: what's
 * after the first `#`, or `undefined` if there isn't one. It's what
 * `parseIri(value).fragment` is, without splitting the other components
 * out.
 */
export const getFragment: (value: IriReference) => string | undefined;

/**
 * The path of an IRI or a URI, or of a reference, as written. It's what
 * `parseIri(value).path` is, without splitting the other components out.
 * Every identifier has a path, but it can be `""`.
 */
export const getPath: (value: IriReference) => string;

/**
 * The query of an IRI or a URI, or of a reference, as written: what's
 * after the first `?` and before the fragment, or `undefined` if there
 * isn't one. It's what `parseIri(value).query` is, without splitting the
 * other components out.
 */
export const getQuery: (value: IriReference) => string | undefined;

/**
 * Normalizes a URI, so that equivalent URIs are equal strings: the
 * syntax-based normalization of RFC 3986 §6.2.2, then its scheme's. It
 * decodes percent-encoded characters that don't need to be encoded,
 * uppercases the hex digits of the ones that do, removes dot segments from
 * the path, and lowercases the scheme and host. A scheme can turn the
 * syntax-based normalization off, like `urn` and `tag` do.
 *
 * @throws {UnknownSchemeError} If the scheme isn't known.
 * @throws {UnknownUrnNamespaceError} If it's a URN of an unknown namespace.
 */
export function normalizeUri(uri: AbsoluteUri, options?: Options): AbsoluteUri & NormalizedUri;
export function normalizeUri(uri: Uri, options?: Options): NormalizedUri;

/**
 * Normalizes an IRI, like {@link normalizeUri}. Percent-encoded Unicode
 * characters that an IRI allows are decoded, so the result isn't a
 * {@link Uri} even when `iri` is.
 *
 * @throws {UnknownSchemeError} If the scheme isn't known.
 * @throws {UnknownUrnNamespaceError} If it's a URN of an unknown namespace.
 */
export function normalizeIri(iri: AbsoluteIri, options?: Options): AbsoluteIri & NormalizedIri;
export function normalizeIri(iri: Iri, options?: Options): NormalizedIri;

/**
 * Makes the case-insensitive part of a component lowercase, for a custom
 * scheme's normalization. It changes ASCII letters only, and leaves
 * percent-encoded characters alone, so `%2F` stays `%2F`.
 */
export const lowercaseComponent: (component: string) => string;

/**
 * Percent-encodes a string for a URI's fragment, like a JSON Pointer. It
 * encodes every character that a fragment doesn't allow, including `%`, and
 * nothing else, so the result is already normalized.
 */
export const encodeUriFragment: (fragment: string) => string;

/**
 * Percent-encodes a string for an IRI's fragment, like
 * {@link encodeUriFragment}. Unicode characters that an IRI allows aren't
 * encoded.
 */
export const encodeIriFragment: (fragment: string) => string;

/**
 * Resolves a reference against a base (RFC 3986 §5.2), and nothing else:
 * it removes dot segments, because the algorithm does, but it doesn't
 * normalize. Neither argument is checked, and `base` isn't read when
 * `reference` has a scheme. The result is checked with its scheme's rules,
 * because a valid reference against a valid base can make an identifier
 * that isn't, like `b` against `urn:example:a`.
 *
 * @throws {InvalidIriError} If the result breaks its scheme's rules. The
 *   error is about `reference`.
 * @throws {UnknownSchemeError} If the result's scheme isn't known, when
 *   `base` was checked with other options.
 * @throws {UnknownUrnNamespaceError} If the result is a URN of an unknown
 *   namespace.
 */
export function resolveIri(reference: UriReference, base: AbsoluteUri, options?: Options): Uri;
export function resolveIri(reference: IriReference, base: AbsoluteIri, options?: Options): Iri;

/**
 * The shortest reference to `target` relative to `base`. It's the opposite
 * of {@link resolveIri}: `resolveIri(toRelativeIri(target, base), base)` is
 * `target`. When no relative reference reaches `target`, it returns
 * `target`. Both are normalized, so equivalent identifiers compare equal.
 */
export function toRelativeIri(target: NormalizedUri, base: NormalizedUri & AbsoluteUri): UriReference;
export function toRelativeIri(target: NormalizedIri, base: NormalizedIri & AbsoluteIri): IriReference;

/**
 * Makes a scheme from its definition, compiling its patterns once. Pass it
 * in `customSchemes`.
 *
 * @throws {TypeError} If `name` isn't a scheme name, or a pattern isn't a
 *   `RegExp` with exactly the `u` flag.
 */
export const defineScheme: (definition: SchemeDefinition) => Scheme;

/**
 * Makes a `urn` scheme that knows the namespaces given, keyed by NID, and
 * `uuid` unless one of them replaces it. Pass it in `customSchemes`, where
 * it replaces the built-in `urn`, which is `urnScheme({})`.
 *
 * @throws {TypeError} If a key isn't a NID, or a pattern isn't a `RegExp`
 *   with exactly the `u` flag.
 */
export const urnScheme: (namespaces: Readonly<Record<string, UrnNamespace>>) => Scheme;

/**
 * The components of a URI or IRI. The authority's parts, `userinfo`,
 * `host`, and `port`, are there only if `authority` is.
 */
export type IdentifierComponents = {
  readonly scheme: string;
  readonly authority?: string;
  readonly userinfo?: string;
  readonly host?: string;
  readonly port?: string;
  readonly path: string;
  readonly query?: string;
  readonly fragment?: string;
};

/** The components of a URI-reference or IRI-reference. */
export type RelativeIdentifierComponents = {
  readonly scheme?: string;
  readonly authority?: string;
  readonly userinfo?: string;
  readonly host?: string;
  readonly port?: string;
  readonly path: string;
  readonly query?: string;
  readonly fragment?: string;
};

/** The components of an absolute-URI or absolute-IRI. */
export type AbsoluteIdentifierComponents = {
  readonly scheme: string;
  readonly authority?: string;
  readonly userinfo?: string;
  readonly host?: string;
  readonly port?: string;
  readonly path: string;
  readonly query?: string;
};

/**
 * The parts of a URN (RFC 8141): `"urn" ":" NID ":" NSS [ "?+"
 * r-component ] [ "?=" q-component ] [ "#" f-component ]`.
 */
export type UrnComponents = {
  readonly nid: string;
  readonly nss: string;
  readonly rComponent?: string;
  readonly qComponent?: string;
  readonly fComponent?: string;
};

/**
 * The parts of a tag URI (RFC 4151): `"tag:" authorityName "," date ":"
 * specific [ "#" fragment ]`. `date` is a year, a month, or a day, like
 * `"2004"` or `"2004-01-15"`.
 */
export type TagComponents = {
  readonly authorityName: string;
  readonly date: string;
  readonly specific: string;
  readonly fragment?: string;
};

/** The rules of RFC 3986 that a URI can be checked against. */
export type UriRule = "URI" | "URI-reference" | "absolute-URI";

/** The rules of RFC 3987 that an IRI can be checked against. */
export type IriRule = "IRI" | "IRI-reference" | "absolute-IRI";

/**
 * What's wrong with a value that isn't a valid URI or IRI.
 *
 * - `invalid-character`: a character the component doesn't allow.
 * - `invalid-percent-encoding`: a `%` that isn't followed by two hex digits.
 * - `invalid-ip-literal`: a host in brackets that isn't an IPv6 address or
 *   an `IPvFuture`.
 * - `missing-scheme`: a value without a scheme, for a rule that needs one.
 * - `fragment-not-allowed`: a fragment, for an absolute rule.
 * - `colon-in-first-segment`: a relative reference with `:` in its first
 *   segment, which would make it look like a scheme. Prefix it with `./`.
 * - `missing-component`: a component the scheme requires isn't there.
 * - `forbidden-component`: a component the scheme forbids is there.
 * - `component-mismatch`: a component doesn't match the scheme's rule
 *   for it.
 */
export type InvalidIdentifierReason
  = "invalid-character"
    | "invalid-percent-encoding"
    | "invalid-ip-literal"
    | "missing-scheme"
    | "fragment-not-allowed"
    | "colon-in-first-segment"
    | "missing-component"
    | "forbidden-component"
    | "component-mismatch";

/** A value isn't the kind of URI that it was expected to be. */
export class InvalidUriError extends Error {
  /** The value that isn't valid. */
  readonly value: string;

  /**
   * The rule that `value` doesn't match: one of RFC 3986's, or its
   * scheme's, like `"http-URI"`.
   */
  readonly rule: UriRule | (string & {});

  /** What's wrong with `value`. */
  readonly reason: InvalidIdentifierReason;

  /** The component that's wrong. */
  readonly component: keyof IdentifierComponents;

  /**
   * Where the problem starts in `value`, as a UTF-16 index like any index
   * of a JavaScript string. The problem is `value.slice(start, end)`.
   */
  readonly start: number;

  /**
   * Where the problem ends in `value`, exclusive. Something that's missing,
   * like a scheme, is empty where it would go, with `start` and `end` the
   * same.
   */
  readonly end: number;

  private constructor();
}

/** A value isn't the kind of IRI that it was expected to be. */
export class InvalidIriError extends Error {
  /** The value that isn't valid. */
  readonly value: string;

  /**
   * The rule that `value` doesn't match: one of RFC 3987's, or its
   * scheme's, like `"http-URI"`.
   */
  readonly rule: IriRule | (string & {});

  /** What's wrong with `value`. */
  readonly reason: InvalidIdentifierReason;

  /** The component that's wrong. */
  readonly component: keyof IdentifierComponents;

  /**
   * Where the problem starts in `value`, as a UTF-16 index like any index
   * of a JavaScript string. The problem is `value.slice(start, end)`.
   */
  readonly start: number;

  /**
   * Where the problem ends in `value`, exclusive. Something that's missing,
   * like a scheme, is empty where it would go, with `start` and `end` the
   * same.
   */
  readonly end: number;

  private constructor();
}

/**
 * The host is an IP literal of a version after IPv6, like `[v7.future]`.
 * RFC 3986 defines its syntax but not its addresses, so whether it's valid
 * can't be known.
 */
export class UnsupportedIpVersionError extends Error {
  /** The value with the host. */
  readonly value: string;

  /** The host, with its brackets, like `[v7.future]`. */
  readonly host: string;

  private constructor();
}

/**
 * A function that needs a scheme's rules was given an identifier with a
 * scheme that isn't built in or in `customSchemes`. Whether it's valid
 * can't be known.
 */
export class UnknownSchemeError extends Error {
  /** The identifier, as it was given. */
  readonly value: string;

  /** The scheme, lowercased, since it names what to configure. */
  readonly scheme: string;

  private constructor();
}

/**
 * A function that needs a URN namespace's rules was given a URN with a NID
 * that the `urn` scheme doesn't know. Add it with {@link urnScheme}.
 */
export class UnknownUrnNamespaceError extends Error {
  /** The URN, as it was given. */
  readonly value: string;

  /** The NID, lowercased, since it names what to configure. */
  readonly nid: string;

  private constructor();
}
