import { describe, expect, test } from "vitest";
import { normalizeIri, normalizeUri, resolveIri, resolveUri, toRelativeIri, toRelativeUri } from "./index.js";

describe("toRelativeIri", () => {
  test.each([
    ["https://example.com/var/lib", "https://example.com", "/var/lib"],
    ["https://example.com/var/lib", "https://example.com/z", "var/lib"],
    ["https://example.com/a/var/lib", "https://example.com/a", "a/var/lib"],
    ["https://example.com/a/var/lib", "https://example.com/a/", "var/lib"],
    ["https://example.com/foo/test/bar/package.json", "https://example.com/foo/test", "test/bar/package.json"],
    ["https://example.com/var", "https://example.com/var/lib", "../var"],
    ["https://example.com/bin", "https://example.com/var/lib", "../bin"],
    ["https://example.com/var/lib", "https://example.com/var/lib", ""],
    ["https://example.com/var/apache", "https://example.com/var/lib", "apache"],
    ["https://example.com/Users/a/web/b", "https://example.com/Users/a/web/b/test/mails", "../../b"],
    ["https://example.com/foo/bar/baz", "https://example.com/foo/bar/baz-quux", "baz"],
    ["https://example.com/foo/bar/baz-quux", "https://example.com/foo/bar/baz", "baz-quux"],
    ["https://example.com/baz", "https://example.com/baz-quux", "baz"],
    ["https://example.com/baz-quux", "https://example.com/baz", "baz-quux"],
    ["https://example.com/", "https://example.com/page1/page2/foo", "../../"],
    ["https://example.com/a/b:c", "https://example.com/a/d", "./b:c"], // Segment that looks like a scheme
    ["https://example.com/a//x", "https://example.com/a/b", ".//x"], // Empty segment
    ["https://example.com/a//x", "https://example.com/a/b/c", "..//x"], // Empty segment after a double dot segment
    ["https://example.com/a/", "https://example.com/a/b", "./"], // Trailing slash
    ["https://example.com/a/b", "https://example.com/a/b?q", "b"], // Base has a query and the target doesn't
    ["https://example.com/a/", "https://example.com/a/?q", "./"], // Base has a query and the target doesn't, trailing slash
    ["https://example.com", "https://example.com?q", "https://example.com"], // Base has a query and the target has an empty path
    ["foo:x", "foo:a", "x"], // Rootless paths with one segment
    ["foo:a/x", "foo:a/b/c", "../x"], // Rootless paths with a common first segment
    ["foo:x", "foo:a/b", "foo:x"], // Rootless paths without a common first segment
    ["foo:a/", "foo:a/b", "./"], // Rootless path with a trailing slash
    ["foo:/x", "foo:a/b", "/x"], // Rootless base and absolute target
    ["foo:x", "foo:/a/b", "foo:x"], // Absolute base and rootless target
    ["foo:", "foo:a/b", "foo:"], // Rootless base and empty target
    ["https://example.com/a/c", "https://example.com/a/./b", "c"], // Dot segment in base
    ["https://example.com/a/../c", "https://example.com/a/b", "../c"], // Double dot segment in target
    ["https://example.com/a/%62", "https://example.com/a/b", ""], // Unnecessary encoding in target
    ["https://example.com/a/c", "HTTPS://Example.com/a/b", "c"], // Case normalization of base
    ["https://example.com/a/c?%7Ex", "https://example.com/a/b", "c?~x"], // Unnecessary encoding in query
    ["bar:x/./y", "foo:a/b", "bar:x/y"] // Different schemes return the normalized target
  ])("toRelativeIri(%s, %s) => %s", (uri, base, expected) => {
    const relative = toRelativeIri(uri, base);
    expect(relative).to.equal(expected);
    expect(resolveIri(relative, base)).to.equal(normalizeIri(uri));
  });
});

describe("toRelativeUri", () => {
  test.each([
    ["https://example.com/var/lib", "https://example.com", "/var/lib"],
    ["https://example.com/var/lib", "https://example.com/z", "var/lib"],
    ["https://example.com/a/var/lib", "https://example.com/a", "a/var/lib"],
    ["https://example.com/a/var/lib", "https://example.com/a/", "var/lib"],
    ["https://example.com/foo/test/bar/package.json", "https://example.com/foo/test", "test/bar/package.json"],
    ["https://example.com/var", "https://example.com/var/lib", "../var"],
    ["https://example.com/bin", "https://example.com/var/lib", "../bin"],
    ["https://example.com/var/lib", "https://example.com/var/lib", ""],
    ["https://example.com/var/apache", "https://example.com/var/lib", "apache"],
    ["https://example.com/Users/a/web/b", "https://example.com/Users/a/web/b/test/mails", "../../b"],
    ["https://example.com/foo/bar/baz", "https://example.com/foo/bar/baz-quux", "baz"],
    ["https://example.com/foo/bar/baz-quux", "https://example.com/foo/bar/baz", "baz-quux"],
    ["https://example.com/baz", "https://example.com/baz-quux", "baz"],
    ["https://example.com/baz-quux", "https://example.com/baz", "baz-quux"],
    ["https://example.com/", "https://example.com/page1/page2/foo", "../../"],
    ["https://example.com/a/b:c", "https://example.com/a/d", "./b:c"], // Segment that looks like a scheme
    ["https://example.com/a//x", "https://example.com/a/b", ".//x"], // Empty segment
    ["https://example.com/a//x", "https://example.com/a/b/c", "..//x"], // Empty segment after a double dot segment
    ["https://example.com/a/", "https://example.com/a/b", "./"], // Trailing slash
    ["https://example.com/a/b", "https://example.com/a/b?q", "b"], // Base has a query and the target doesn't
    ["https://example.com/a/", "https://example.com/a/?q", "./"], // Base has a query and the target doesn't, trailing slash
    ["https://example.com", "https://example.com?q", "https://example.com"], // Base has a query and the target has an empty path
    ["foo:x", "foo:a", "x"], // Rootless paths with one segment
    ["foo:a/x", "foo:a/b/c", "../x"], // Rootless paths with a common first segment
    ["foo:x", "foo:a/b", "foo:x"], // Rootless paths without a common first segment
    ["foo:a/", "foo:a/b", "./"], // Rootless path with a trailing slash
    ["foo:/x", "foo:a/b", "/x"], // Rootless base and absolute target
    ["foo:x", "foo:/a/b", "foo:x"], // Absolute base and rootless target
    ["foo:", "foo:a/b", "foo:"], // Rootless base and empty target
    ["https://example.com/a/c", "https://example.com/a/./b", "c"], // Dot segment in base
    ["https://example.com/a/../c", "https://example.com/a/b", "../c"], // Double dot segment in target
    ["https://example.com/a/%62", "https://example.com/a/b", ""], // Unnecessary encoding in target
    ["https://example.com/a/c", "HTTPS://Example.com/a/b", "c"], // Case normalization of base
    ["https://example.com/a/c?%7Ex", "https://example.com/a/b", "c?~x"], // Unnecessary encoding in query
    ["bar:x/./y", "foo:a/b", "bar:x/y"] // Different schemes return the normalized target
  ])("toRelativeUri(%s, %s) => %s", (uri, base, expected) => {
    const relative = toRelativeUri(uri, base);
    expect(relative).to.equal(expected);
    expect(resolveUri(relative, base)).to.equal(normalizeUri(uri));
  });
});
