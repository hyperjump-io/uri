import { abnf } from "./index.js";
import type { Context } from "./index.d.ts";

// The tag returns a RegExp, or the type a context says
abnf()`"a"` satisfies RegExp;

type Brand = RegExp & { readonly brand: true };
declare const branded: Context<Brand>;
abnf(branded)`"a"` satisfies Brand;
// @ts-expect-error Without a context, it's a RegExp, not a brand
abnf()`"a"` satisfies Brand;

// A context is a plain object
abnf({ rules: `a = "x"`, alphabet: `%x0-7F`, delimiters: `"/"`, percentEncoded: true, anchored: false });
// @ts-expect-error A spliced value is a string
abnf()`a = ${1}` satisfies RegExp;
