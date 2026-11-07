import { describe, expect, test } from "vitest";
import { normalizeIri, normalizeUri, resolveIri, toRelativeIri } from "./index.js";

/** @import { AbsoluteUri } from "./index.d.ts" */

// Schemes that aren't built in, so the paths aren't changed by an http normalization
// toRelativeIri takes normalized identifiers, so each is normalized first, the way a caller would
const relativeTests = /** @type [string, string, string][] */ ([
  ["web://example.com/var/lib", "web://example.com", "/var/lib"],
  ["web://example.com/var/lib", "web://example.com/z", "var/lib"],
  ["web://example.com/a/var/lib", "web://example.com/a", "a/var/lib"],
  ["web://example.com/a/var/lib", "web://example.com/a/", "var/lib"],
  ["web://example.com/foo/test/bar/package.json", "web://example.com/foo/test", "test/bar/package.json"],
  ["web://example.com/var", "web://example.com/var/lib", "../var"],
  ["web://example.com/bin", "web://example.com/var/lib", "../bin"],
  ["web://example.com/var/lib", "web://example.com/var/lib", ""],
  ["web://example.com/var/apache", "web://example.com/var/lib", "apache"],
  ["web://example.com/Users/a/web/b", "web://example.com/Users/a/web/b/test/mails", "../../b"],
  ["web://example.com/foo/bar/baz", "web://example.com/foo/bar/baz-quux", "baz"],
  ["web://example.com/foo/bar/baz-quux", "web://example.com/foo/bar/baz", "baz-quux"],
  ["web://example.com/baz", "web://example.com/baz-quux", "baz"],
  ["web://example.com/baz-quux", "web://example.com/baz", "baz-quux"],
  ["web://example.com/", "web://example.com/page1/page2/foo", "../../"],
  ["web://example.com/a/b:c", "web://example.com/a/d", "./b:c"], // Segment that looks like a scheme
  ["web://example.com/a//x", "web://example.com/a/b", ".//x"], // Empty segment
  ["web://example.com/a//x", "web://example.com/a/b/c", "..//x"], // Empty segment after a double dot segment
  ["web://example.com/a/", "web://example.com/a/b", "./"], // Trailing slash
  ["web://example.com/a/b", "web://example.com/a/b?q", "b"], // Base has a query and the target doesn't
  ["web://example.com/a/", "web://example.com/a/?q", "./"], // Base has a query and the target doesn't, trailing slash
  ["web://example.com", "web://example.com?q", "web://example.com"], // Base has a query and the target has an empty path
  ["foo:x", "foo:a", "x"], // Rootless paths with one segment
  ["foo:a/x", "foo:a/b/c", "../x"], // Rootless paths with a common first segment
  ["foo:x", "foo:a/b", "foo:x"], // Rootless paths without a common first segment
  ["foo:a/", "foo:a/b", "./"], // Rootless path with a trailing slash
  ["foo:/x", "foo:a/b", "/x"], // Rootless base and absolute target
  ["foo:x", "foo:/a/b", "foo:x"], // Absolute base and rootless target
  ["foo:", "foo:a/b", "foo:"], // Rootless base and empty target
  ["web://example.com/a/c", "web://example.com/a/./b", "c"], // Dot segment in base
  ["web://example.com/a/../c", "web://example.com/a/b", "../c"], // Double dot segment in target
  ["web://example.com/a/%62", "web://example.com/a/b", ""], // Unnecessary encoding in target
  ["web://example.com/a/c", "WEB://Example.com/a/b", "c"], // Case normalization of base
  ["web://example.com/a/c?%7Ex", "web://example.com/a/b", "c?~x"], // Unnecessary encoding in query
  ["bar:x/./y", "foo:a/b", "bar:x/y"] // Different schemes return the target
]);

describe("toRelativeIri", () => {
  test.each(relativeTests)("toRelativeIri(%s, %s) => %s", (target, base, expected) => {
    const normalizedTarget = normalizeIri(trusted(target));
    const normalizedBase = normalizeIri(trusted(base));
    const relative = toRelativeIri(normalizedTarget, normalizedBase);
    expect(relative).to.equal(expected);
    expect(resolveIri(relative, normalizedBase)).to.equal(normalizedTarget);
  });

  test.each(relativeTests)("toRelativeIri(%s, %s) => %s, for URIs", (target, base, expected) => {
    const normalizedTarget = normalizeUri(trusted(target));
    const normalizedBase = normalizeUri(trusted(base));
    const relative = toRelativeIri(normalizedTarget, normalizedBase);
    expect(relative).to.equal(expected);
    expect(resolveIri(relative, normalizedBase)).to.equal(normalizedTarget);
  });
});

// These are cast, like values a validator checked
/** @type (value: string) => AbsoluteUri */
const trusted = (value) => /** @type AbsoluteUri */ (value);
