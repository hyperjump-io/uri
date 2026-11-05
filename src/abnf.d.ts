import type { Context } from "@hyperjump/abnf";
import type { ComponentPattern } from "./index.d.ts";

/*
 * Contexts for compiling a scheme's patterns from ABNF with
 * `@hyperjump/abnf`, one for each component. A pattern compiled with one
 * can't match past its component. Its text can reference RFC 3986's rules,
 * which mean RFC 3987's in an IRI, like `pchar` meaning `ipchar`, and the
 * RFC 3987 rules by their own names.
 *
 * ```js
 * import { abnf } from "@hyperjump/abnf";
 * import { host } from "@hyperjump/uri/abnf";
 *
 * const nonEmptyHost = abnf(host)`IP-literal / 1*( unreserved / pct-encoded / sub-delims )`;
 * ```
 *
 * The `ascii` contexts keep RFC 3986's rules as they are, so a pattern is
 * ASCII in an IRI too, like a URN's.
 *
 * A host's pattern can't match past it into the path, query, or fragment,
 * but `:` can't be removed from a host's characters, since an IP literal
 * has it. A host's pattern that needs a `:` outside an IP literal can
 * match into the port.
 */

export const authority: Context<ComponentPattern<"authority">>;
export const userinfo: Context<ComponentPattern<"userinfo">>;
export const host: Context<ComponentPattern<"host">>;
export const port: Context<ComponentPattern<"port">>;
export const path: Context<ComponentPattern<"path">>;
export const query: Context<ComponentPattern<"query">>;
export const fragment: Context<ComponentPattern<"fragment">>;

export const asciiAuthority: Context<ComponentPattern<"authority">>;
export const asciiUserinfo: Context<ComponentPattern<"userinfo">>;
export const asciiHost: Context<ComponentPattern<"host">>;
export const asciiPort: Context<ComponentPattern<"port">>;
export const asciiPath: Context<ComponentPattern<"path">>;
export const asciiQuery: Context<ComponentPattern<"query">>;
export const asciiFragment: Context<ComponentPattern<"fragment">>;
