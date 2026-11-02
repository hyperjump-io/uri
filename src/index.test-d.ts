import { InvalidUriError, UnsupportedIpVersionError, parseAbsoluteUri, parseUri, parseUriReference } from "./index.js";
import type { IriRule, UriRule } from "./index.d.ts";

// A URI doesn't have to have an authority, so its parts can be missing
const components = parseUri("urn:example:foo");
components.scheme satisfies string;
components.path satisfies string;
// @ts-expect-error A URI like urn:example:foo has no host
components.host satisfies string;
components.host satisfies string | undefined;

// A reference doesn't have to have a scheme
// @ts-expect-error A reference like ../foo has no scheme
parseUriReference("../foo").scheme satisfies string;

// An absolute-URI has no fragment
// @ts-expect-error An absolute-URI has no fragment
void parseAbsoluteUri("https://example.com").fragment;

// The components are readonly
// @ts-expect-error The components can't be changed
components.path = "/foo";

// The components can be spread into a new value
const changed = { ...components, path: "/bar" };
changed.path satisfies string;

// The errors say which rule a value didn't match
declare const error: unknown;
if (error instanceof InvalidUriError) {
  error.rule satisfies UriRule;
  // @ts-expect-error An InvalidUriError's rule is a URI rule
  error.rule satisfies IriRule;
}
if (error instanceof UnsupportedIpVersionError) {
  error.host satisfies string;
}

// The errors can't be constructed outside the package
// @ts-expect-error The constructor is private
new InvalidUriError();
