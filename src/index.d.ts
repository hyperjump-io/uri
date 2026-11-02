/**
 * Whether `value` is a URI (RFC 3986 §3): it has a scheme, and it can have
 * a fragment.
 *
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version, like `[v7.future]`. Its syntax is known, but not
 *   whether the address is valid.
 */
export const isUri: (value: string) => boolean;

/**
 * Whether `value` is a URI-reference (RFC 3986 §4.1): a URI, or a relative
 * reference like `../foo#bar`.
 *
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const isUriReference: (value: string) => boolean;

/**
 * Whether `value` is an absolute-URI (RFC 3986 §4.3): a URI without a
 * fragment.
 *
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const isAbsoluteUri: (value: string) => boolean;

/**
 * Whether `value` is an IRI (RFC 3987): a URI that can have Unicode
 * characters.
 *
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const isIri: (value: string) => boolean;

/**
 * Whether `value` is an IRI-reference: an IRI, or a relative reference.
 *
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const isIriReference: (value: string) => boolean;

/**
 * Whether `value` is an absolute-IRI: an IRI without a fragment.
 *
 * @throws {UnsupportedIpVersionError} If the host is an IP literal of a
 *   future version.
 */
export const isAbsoluteIri: (value: string) => boolean;

/**
 * Splits a URI into its components. A component that isn't there isn't a
 * property of the result. An empty one is `""`.
 *
 * @throws {InvalidUriError} If `value` isn't a URI.
 */
export const parseUri: (value: string) => IdentifierComponents;

/**
 * Splits a URI-reference into its components.
 *
 * @throws {InvalidUriError} If `value` isn't a URI-reference.
 */
export const parseUriReference: (value: string) => RelativeIdentifierComponents;

/**
 * Splits an absolute-URI into its components.
 *
 * @throws {InvalidUriError} If `value` isn't an absolute-URI.
 */
export const parseAbsoluteUri: (value: string) => AbsoluteIdentifierComponents;

/**
 * Splits an IRI into its components.
 *
 * @throws {InvalidIriError} If `value` isn't an IRI.
 */
export const parseIri: (value: string) => IdentifierComponents;

/**
 * Splits an IRI-reference into its components.
 *
 * @throws {InvalidIriError} If `value` isn't an IRI-reference.
 */
export const parseIriReference: (value: string) => RelativeIdentifierComponents;

/**
 * Splits an absolute-IRI into its components.
 *
 * @throws {InvalidIriError} If `value` isn't an absolute-IRI.
 */
export const parseAbsoluteIri: (value: string) => AbsoluteIdentifierComponents;

/**
 * Removes the fragment from a URI, and normalizes it.
 *
 * @throws {InvalidUriError} If `uri` isn't a URI.
 */
export const toAbsoluteUri: (uri: string) => string;

/**
 * Removes the fragment from an IRI, and normalizes it.
 *
 * @throws {InvalidIriError} If `iri` isn't an IRI.
 */
export const toAbsoluteIri: (iri: string) => string;

/**
 * Normalizes a URI, so that equivalent URIs are equal strings (RFC 3986
 * §6.2.2). It decodes percent-encoded characters that don't need to be
 * encoded, uppercases the hex digits of the ones that do, removes dot
 * segments from the path, and lowercases the scheme and host.
 *
 * @throws {InvalidUriError} If `uri` isn't a URI.
 */
export const normalizeUri: (uri: string) => string;

/**
 * Normalizes an IRI, like {@link normalizeUri}. Percent-encoded Unicode
 * characters that an IRI allows are decoded.
 *
 * @throws {InvalidIriError} If `iri` isn't an IRI.
 */
export const normalizeIri: (iri: string) => string;

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
 * Resolves a URI-reference against a base URI (RFC 3986 §5.2), and
 * normalizes the result. `base` is checked even when `reference` has a
 * scheme. With no base, use {@link normalizeUri}, which throws if
 * `reference` isn't a URI.
 *
 * @throws {InvalidUriError} If `reference` isn't a URI-reference, or `base`
 *   isn't an absolute-URI.
 */
export const resolveUri: (reference: string, base: string) => string;

/**
 * Resolves an IRI-reference against a base IRI, and normalizes the result.
 * `base` is checked like in {@link resolveUri}. With no base, use
 * {@link normalizeIri}.
 *
 * @throws {InvalidIriError} If `reference` isn't an IRI-reference, or
 *   `base` isn't an absolute-IRI.
 */
export const resolveIri: (reference: string, base: string) => string;

/**
 * The shortest reference to `uri` relative to `base`. It's the opposite of
 * {@link resolveUri}: `resolveUri(toRelativeUri(uri, base), base)` is
 * `normalizeUri(uri)`. When no relative reference reaches `uri`, it returns
 * `uri`, normalized.
 *
 * @throws {InvalidUriError} If `uri` isn't a URI, or `base` isn't an
 *   absolute-URI.
 */
export const toRelativeUri: (uri: string, base: string) => string;

/**
 * The shortest reference to `iri` relative to `base`, like
 * {@link toRelativeUri}.
 *
 * @throws {InvalidIriError} If `iri` isn't an IRI, or `base` isn't an
 *   absolute-IRI.
 */
export const toRelativeIri: (iri: string, base: string) => string;

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

/** The rules of RFC 3986 that a URI can be checked against. */
export type UriRule = "URI" | "URI-reference" | "absolute-URI";

/** The rules of RFC 3987 that an IRI can be checked against. */
export type IriRule = "IRI" | "IRI-reference" | "absolute-IRI";

/** A value isn't the kind of URI that it was expected to be. */
export class InvalidUriError extends Error {
  /** The value that isn't valid. */
  readonly value: string;

  /** The rule that `value` doesn't match. */
  readonly rule: UriRule;

  private constructor();
}

/** A value isn't the kind of IRI that it was expected to be. */
export class InvalidIriError extends Error {
  /** The value that isn't valid. */
  readonly value: string;

  /** The rule that `value` doesn't match. */
  readonly rule: IriRule;

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
