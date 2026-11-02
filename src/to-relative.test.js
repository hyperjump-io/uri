import { describe, expect, test } from "vitest";
import { normalizeIri, normalizeUri, resolveIri, resolveUri, toRelativeIri, toRelativeUri } from "./index.js";


describe("toRelativeIri", () => {
  test.each([
    ["https://example.com", "https://example.com/var/lib", "/var/lib"],
    ["https://example.com/z", "https://example.com/var/lib", "var/lib"],
    ["https://example.com/a", "https://example.com/a/var/lib", "a/var/lib"],
    ["https://example.com/a/", "https://example.com/a/var/lib", "var/lib"],
    ["https://example.com/foo/test", "https://example.com/foo/test/bar/package.json", "test/bar/package.json"],
    ["https://example.com/var/lib", "https://example.com/var", "../var"],
    ["https://example.com/var/lib", "https://example.com/bin", "../bin"],
    ["https://example.com/var/lib", "https://example.com/var/lib", ""],
    ["https://example.com/var/lib", "https://example.com/var/apache", "apache"],
    ["https://example.com/Users/a/web/b/test/mails", "https://example.com/Users/a/web/b", "../../b"],
    ["https://example.com/foo/bar/baz-quux", "https://example.com/foo/bar/baz", "baz"],
    ["https://example.com/foo/bar/baz", "https://example.com/foo/bar/baz-quux", "baz-quux"],
    ["https://example.com/baz-quux", "https://example.com/baz", "baz"],
    ["https://example.com/baz", "https://example.com/baz-quux", "baz-quux"],
    ["https://example.com/page1/page2/foo", "https://example.com/", "../../"],
    ["https://example.com/a/d", "https://example.com/a/b:c", "./b:c"], // Segment that looks like a scheme
    ["https://example.com/a/b", "https://example.com/a//x", ".//x"], // Empty segment
    ["https://example.com/a/b/c", "https://example.com/a//x", "..//x"], // Empty segment after a double dot segment
    ["https://example.com/a/b", "https://example.com/a/", "./"], // Trailing slash
    ["https://example.com/a/b?q", "https://example.com/a/b", "b"], // Base has a query and the target doesn't
    ["https://example.com/a/?q", "https://example.com/a/", "./"], // Base has a query and the target doesn't, trailing slash
    ["https://example.com?q", "https://example.com", "https://example.com"], // Base has a query and the target has an empty path
    ["foo:a", "foo:x", "x"], // Rootless paths with one segment
    ["foo:a/b/c", "foo:a/x", "../x"], // Rootless paths with a common first segment
    ["foo:a/b", "foo:x", "foo:x"], // Rootless paths without a common first segment
    ["foo:a/b", "foo:a/", "./"], // Rootless path with a trailing slash
    ["foo:a/b", "foo:/x", "/x"], // Rootless base and absolute target
    ["foo:/a/b", "foo:x", "foo:x"], // Absolute base and rootless target
    ["foo:a/b", "foo:", "foo:"], // Rootless base and empty target
    ["https://example.com/a/./b", "https://example.com/a/c", "c"], // Dot segment in base
    ["https://example.com/a/b", "https://example.com/a/../c", "../c"], // Double dot segment in target
    ["https://example.com/a/b", "https://example.com/a/%62", ""], // Unnecessary encoding in target
    ["HTTPS://Example.com/a/b", "https://example.com/a/c", "c"], // Case normalization of base
    ["https://example.com/a/b", "https://example.com/a/c?%7Ex", "c?~x"], // Unnecessary encoding in query
    ["foo:a/b", "bar:x/./y", "bar:x/y"] // Different schemes return the normalized target
  ])("toRelativeIri(%s, %s) => %s", (from, to, expected) => {
    const relative = toRelativeIri(from, to);
    expect(relative).to.equal(expected);
    expect(resolveIri(relative, from)).to.equal(normalizeIri(to)); // sanity check
  });
});

describe("toRelativeUri", () => {
  test.each([
    ["https://example.com", "https://example.com/var/lib", "/var/lib"],
    ["https://example.com/z", "https://example.com/var/lib", "var/lib"],
    ["https://example.com/a", "https://example.com/a/var/lib", "a/var/lib"],
    ["https://example.com/a/", "https://example.com/a/var/lib", "var/lib"],
    ["https://example.com/foo/test", "https://example.com/foo/test/bar/package.json", "test/bar/package.json"],
    ["https://example.com/var/lib", "https://example.com/var", "../var"],
    ["https://example.com/var/lib", "https://example.com/bin", "../bin"],
    ["https://example.com/var/lib", "https://example.com/var/lib", ""],
    ["https://example.com/var/lib", "https://example.com/var/apache", "apache"],
    ["https://example.com/Users/a/web/b/test/mails", "https://example.com/Users/a/web/b", "../../b"],
    ["https://example.com/foo/bar/baz-quux", "https://example.com/foo/bar/baz", "baz"],
    ["https://example.com/foo/bar/baz", "https://example.com/foo/bar/baz-quux", "baz-quux"],
    ["https://example.com/baz-quux", "https://example.com/baz", "baz"],
    ["https://example.com/baz", "https://example.com/baz-quux", "baz-quux"],
    ["https://example.com/page1/page2/foo", "https://example.com/", "../../"],
    ["https://example.com/a/d", "https://example.com/a/b:c", "./b:c"], // Segment that looks like a scheme
    ["https://example.com/a/b", "https://example.com/a//x", ".//x"], // Empty segment
    ["https://example.com/a/b/c", "https://example.com/a//x", "..//x"], // Empty segment after a double dot segment
    ["https://example.com/a/b", "https://example.com/a/", "./"], // Trailing slash
    ["https://example.com/a/b?q", "https://example.com/a/b", "b"], // Base has a query and the target doesn't
    ["https://example.com/a/?q", "https://example.com/a/", "./"], // Base has a query and the target doesn't, trailing slash
    ["https://example.com?q", "https://example.com", "https://example.com"], // Base has a query and the target has an empty path
    ["foo:a", "foo:x", "x"], // Rootless paths with one segment
    ["foo:a/b/c", "foo:a/x", "../x"], // Rootless paths with a common first segment
    ["foo:a/b", "foo:x", "foo:x"], // Rootless paths without a common first segment
    ["foo:a/b", "foo:a/", "./"], // Rootless path with a trailing slash
    ["foo:a/b", "foo:/x", "/x"], // Rootless base and absolute target
    ["foo:/a/b", "foo:x", "foo:x"], // Absolute base and rootless target
    ["foo:a/b", "foo:", "foo:"], // Rootless base and empty target
    ["https://example.com/a/./b", "https://example.com/a/c", "c"], // Dot segment in base
    ["https://example.com/a/b", "https://example.com/a/../c", "../c"], // Double dot segment in target
    ["https://example.com/a/b", "https://example.com/a/%62", ""], // Unnecessary encoding in target
    ["HTTPS://Example.com/a/b", "https://example.com/a/c", "c"], // Case normalization of base
    ["https://example.com/a/b", "https://example.com/a/c?%7Ex", "c?~x"], // Unnecessary encoding in query
    ["foo:a/b", "bar:x/./y", "bar:x/y"] // Different schemes return the normalized target
  ])("toRelativeIri(%s, %s) => %s", (from, to, expected) => {
    const relative = toRelativeUri(from, to);
    expect(relative).to.equal(expected);
    expect(resolveUri(relative, from)).to.equal(normalizeUri(to)); // sanity check
  });
});
