declare const reference: unique symbol;
declare const full: unique symbol;
declare const absolute: unique symbol;
declare const ascii: unique symbol;
declare const normalized: unique symbol;
declare const normalizedUri: unique symbol;

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

/**
 * Whether `value` is a URI (RFC 3986 §3): it has a scheme, and it can have
 * a fragment. A built-in scheme's rules are checked too, for `http`,
 * `https`, `file`, `urn`, and `did`. Any other scheme gets the generic
 * syntax only.
 *
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version, like `[v7.future]`. Its syntax is known, but not
 *   whether the address is valid.
 */
export const isUri: (value: string) => value is Uri;

/**
 * Whether `value` is a URI-reference (RFC 3986 §4.1): a URI, or a relative
 * reference like `../foo#bar`. A relative reference isn't checked against
 * a scheme.
 *
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const isUriReference: (value: string) => value is UriReference;

/**
 * Whether `value` is an absolute-URI (RFC 3986 §4.3): a URI without a
 * fragment.
 *
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const isAbsoluteUri: (value: string) => value is AbsoluteUri;

/**
 * Whether `value` is an IRI (RFC 3987): a URI that can have Unicode
 * characters.
 *
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const isIri: (value: string) => value is Iri;

/**
 * Whether `value` is an IRI-reference: an IRI, or a relative reference.
 *
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const isIriReference: (value: string) => value is IriReference;

/**
 * Whether `value` is an absolute-IRI: an IRI without a fragment.
 *
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const isAbsoluteIri: (value: string) => value is AbsoluteIri;

/**
 * Checks that `value` is a URI, like {@link isUri}, and throws an error
 * that says what's wrong and where if it isn't.
 *
 * @throws {InvalidUriError} If `value` isn't a URI.
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const assertUri: (value: string) => asserts value is Uri;

/**
 * Checks that `value` is a URI-reference, like {@link isUriReference}.
 *
 * @throws {InvalidUriError} If `value` isn't a URI-reference.
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const assertUriReference: (value: string) => asserts value is UriReference;

/**
 * Checks that `value` is an absolute-URI, like {@link isAbsoluteUri}.
 *
 * @throws {InvalidUriError} If `value` isn't an absolute-URI.
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const assertAbsoluteUri: (value: string) => asserts value is AbsoluteUri;

/**
 * Checks that `value` is an IRI, like {@link isIri}.
 *
 * @throws {InvalidIriError} If `value` isn't an IRI.
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const assertIri: (value: string) => asserts value is Iri;

/**
 * Checks that `value` is an IRI-reference, like {@link isIriReference}.
 *
 * @throws {InvalidIriError} If `value` isn't an IRI-reference.
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const assertIriReference: (value: string) => asserts value is IriReference;

/**
 * Checks that `value` is an absolute-IRI, like {@link isAbsoluteIri}.
 *
 * @throws {InvalidIriError} If `value` isn't an absolute-IRI.
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const assertAbsoluteIri: (value: string) => asserts value is AbsoluteIri;

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
 * Whether a reference has a scheme, which makes it an IRI, or a URI if
 * it's a URI-reference. It's how a reference that was already checked
 * becomes an {@link Iri} without being checked again, so it doesn't check
 * `value`. It keeps every other brand `value` has.
 */
export const hasScheme: <T extends IriReference>(value: T) => value is T & Iri;

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
 * the path, and lowercases the scheme and host. A built-in scheme can turn
 * the syntax-based normalization off, like `urn` and `tag` do. Any other
 * scheme gets the syntax-based normalization only.
 */
export function normalizeUri(uri: AbsoluteUri): AbsoluteUri & NormalizedUri;
export function normalizeUri(uri: Uri): NormalizedUri;

/**
 * Normalizes an IRI, like {@link normalizeUri}. Percent-encoded Unicode
 * characters that an IRI allows are decoded, so the result isn't a
 * {@link Uri} even when `iri` is.
 */
export function normalizeIri(iri: AbsoluteIri): AbsoluteIri & NormalizedIri;
export function normalizeIri(iri: Iri): NormalizedIri;

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
 * if it's built in, because a valid reference against a valid base can
 * make an identifier that isn't, like `b` against `urn:example:a`.
 *
 * @throws {InvalidIriError} If the result breaks its scheme's rules. The
 *   error is about `reference`.
 */
export function resolveIri(reference: UriReference, base: AbsoluteUri): Uri;
export function resolveIri(reference: IriReference, base: AbsoluteIri): Iri;

/**
 * The shortest reference to `target` relative to `base`. It's the opposite
 * of {@link resolveIri}: `resolveIri(toRelativeIri(target, base), base)` is
 * `target`. When no relative reference reaches `target`, it returns
 * `target`. Both are normalized, so equivalent identifiers compare equal.
 */
export function toRelativeIri(target: NormalizedUri, base: NormalizedUri & AbsoluteUri): UriReference;
export function toRelativeIri(target: NormalizedIri, base: NormalizedIri & AbsoluteIri): IriReference;

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
