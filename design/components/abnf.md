# ABNF

A compiler from ABNF (RFC 5234, with RFC 7405's case-sensitive strings)
to regular expressions. It's written here first, for scheme patterns, and
will move to its own package, `@hyperjump/abnf`, which
`json-schema-formats` will use too. Nothing in it knows about URIs. What a
URI component needs is passed to it as a value (see
[Contexts](#contexts)).

## Why

A scheme's pattern for a component is a lookahead in the scheme's pattern
(see [Schemes](schemes.md#patterns-only-add-structure)), so it runs
against the rest of the identifier, not its component alone. A caller
writing one had to know that:

- `.` and wide classes can match the delimiter that ends the component, so
  the pattern runs past it. `http`'s host was `/.+/u` at first, and it let
  `http:///a` through.
- `^` and `$` mean the start and end of the whole identifier. A path
  pattern `/^a.*$/u` rejects every path.
- A lookahead in a pattern sees the components after it.

The specifications a scheme comes from write its syntax in ABNF. Compiled
by a compiler that knows the component, a scheme's ABNF can't leave its
component, ABNF has no anchors and can't look ahead or behind, and the
rules can be copied from the RFC.

## Use cases

- **Custom schemes' patterns**, for `defineScheme` and `urnScheme`.
- **The built-in schemes**, whose patterns are generated from their RFCs'
  ABNF (see [Shipping](#shipping)).
- **`json-schema-formats`**, whose formats are defined in ABNF by their
  RFCs, like RFC 3339's `date-time`.

Not supported on purpose:

- **Grammars a regular expression can't match.** A recursive rule throws.
- **Capturing or parsing.** The result only says whether a string
  matches, like the library's own patterns (see [Parsing](parsing.md)).

## The tag

```js
import { abnf } from "@hyperjump/abnf";

const date = abnf()`
  full-date   = date-fullyear "-" date-month "-" date-mday
  date-fullyear = 4DIGIT
  date-month  = 2DIGIT
  date-mday   = 2DIGIT
`;

date.test("2004-01-15"); // true
```

- `abnf(context?)` returns a tag, and the tag returns a `RegExp` with the
  `u` flag.
- The text is a rule list, and the first rule is the one matched. RFC 5234
  doesn't name a start rule, so this is the convention, and it's what lets
  an RFC's rules be pasted in with one line on top. Text with no rule in
  it is an expression, like `` abnf(path)`path-absolute` ``.
- `${}` splices text in, so a rule list can be shared, like `urn`'s rules
  for its path and its query.
- Rule names match without case, and so do strings, as RFC 5234 says.
  `%s"…"` is case-sensitive and `%i"…"` isn't (RFC 7405).
- Without a context, the result matches a whole string: it's anchored at
  both ends.

It throws a `SyntaxError` for text that isn't ABNF, a rule that isn't
defined, a recursive rule, and a prose value (`<…>`), which can't be
compiled. A prose value repeated zero times is empty, which RFC 3986's
own grammar needs: `path-empty = 0<pchar>`.

A rule defined in the text replaces one of the same name from the context
or RFC 5234's core rules. RFC 9562 defines `DIGIT` and `HEXDIG` again, the
same way, and its rules have to paste in. Rules from a context are
resolved among the context's own rules, so a caller's `DIGIT` doesn't
change them.

## Contexts

A context says what's known about the input before the pattern runs.
It's a value:

```ts
type Context<T extends RegExp = RegExp> = {
  readonly rules?: string;          // a rule list the text can reference
  readonly alphabet?: string;       // the characters the input can have
  readonly delimiters?: string;     // characters that end what's matched
  readonly percentEncoded?: boolean; // each "%" starts a pct-encoded
  readonly anchored?: boolean;      // whether to match a whole string
  readonly [result]?: T;            // only says what the tag returns
};
```

(The character sets are written here as strings for short. How they're
written is decided when it's built.)

- **`delimiters` are removed from every character set.** A pattern can't
  match one, so it ends where its component ends. Without this, the
  differential test found 17,859 differences, like `http://?` being valid
  (see [ABNF](../benchmarks/abnf.md)). A rule that can't match anything
  once they're removed throws, like a host rule that only allows `:`.
  `tag`'s `specific = *( pchar / "/" / "?" )` still compiles for a path:
  only its `"?"` is removed, and that part is the generic query.
- **`alphabet` lets sets be widened.** A character the input can't have is
  free to be in a set or not, without changing what matches, so each set
  is compiled as whichever class is shortest. That's what lets `*pchar`
  compile to `[^/?#]*` where the generic grammar has already checked the
  characters.
- **`percentEncoded`** says the input has already been checked to have two
  hex digits after each `%`, so `*( unreserved / pct-encoded )` can match
  `%` as one character (see [Rewrites](#rewrites)).
- **`rules`** are the rules the text can reference, like RFC 3986's.

The URI contexts are exported by `@hyperjump/uri/abnf`, one for each
component (see [Schemes](schemes.md#patterns-come-from-abnf)).

The phantom `[result]` is how a context says what type the tag returns,
so `@hyperjump/uri`'s contexts make tags that return its
`ComponentPattern` brand, and neither package imports the other's code.
`@hyperjump/uri` imports the `Context` type, as a development dependency.

## Compiling

The text is parsed, its references resolved into one tree, and the tree
rewritten and compiled to a regular expression source:

- Parsing doesn't depend on lines: a rule starts where a name is followed
  by `=` or `=/`, which can't happen inside a rule. So the text can be
  indented however it's written.
- Alternatives are flattened, and character sets among them merged into
  one.

### Rewrites

Each of these matches the same strings as what it replaces, on input the
context describes. They're what make compiled patterns as fast as
hand-written ones (see [ABNF](../benchmarks/abnf.md)).

- **Percent-encoding as one character.** With `percentEncoded`,
  `( set / pct-encoded )` repeated without a bound matches the same as
  `( set / "%" )` when the set has every hex digit, unless a hex digit can
  follow the repetition: `*( unreserved / pct-encoded ) "1"` matches
  `%41` once `%` is a character, and doesn't before. So does one
  `( set / pct-encoded )` followed by a repetition whose set has every hex
  digit, which takes them.
- **Star identities.** `*( b *a )` is `[ b *( a / b ) ]`, and
  `n*a [ b *( a / b ) ]` is `n(a) *( a / b )`, for sets `a` and `b`. These
  take `path-absolute`, `"/" [ segment-nz *( "/" segment ) ]`, from
  nested loops to one.
- **An option as a lookahead.** `[ a *b ]`, where `b` has every character
  of `a`, is `*b` not starting with what's only in `b`, if that can't
  follow it. `path-absolute` becomes `\/(?!\/)[^?#]*`, which is what the
  hand-written pattern was. It was 5% faster than `\/(?:[^/?#][^?#]*)?`.
- **Classes.** A set is compiled as a class or a negated class, whichever
  has fewer ranges, and a negated class when they have as many. A range to
  the end of Unicode starts as low as the alphabet allows: V8 checks a
  class of all non-ASCII characters by checking for ASCII. `urn:uuid`'s
  pattern took 284 milliseconds for 2 million tests when its range started
  at U+A0, and 256 when it started at U+7F.

## Shipping

- The built-in schemes' patterns are generated from their ABNF by a
  script, with the compiler as a development dependency. The generated
  file is committed, and a test fails if it's stale. Nothing is compiled
  when the library loads.
- A caller who defines a scheme imports the compiler. One who cares about
  load time can compile at build time and keep the source:
  `new RegExp(source, "u") as ComponentPattern<"path">`.

So nobody pays for the compiler who doesn't use it (see
[Pay only for what you ask for](../principles/pay-only-for-what-you-ask-for.md)).

## Rejected

- **Rewriting a caller's `RegExp`**, by tokenizing its source and removing
  the delimiters from each atom, and rewriting `^` and `$`. It needs a
  tokenizer of regular expression syntax, what runs isn't what was
  written, and the host's `:` is still a problem. Writing ABNF removes the
  reason to rewrite.
- **Public functions for building patterns**, like `seq`, `alt`, and
  `rep`. They'd be
  checked by editors and types, but they're an API to design and name,
  they read like neither ABNF nor a regular expression, and a `raw(/…/u)`
  escape hatch would bring the problem back. The parsed tree is made of
  the same parts, and it stays internal.
- **The compiler in `@hyperjump/uri`**, with `defineScheme` taking
  `{ abnf }` and compiling it, which the prototype did. Everyone would
  load it: importing took 27 milliseconds instead of 5, and the library
  was 13.7 KB gzipped instead of 8.1.
- **A `@hyperjump/uri/abnf` that wraps the compiler**, with it as a peer
  dependency. Passing the contexts as values does the same with no
  dependency, and the compiler stays general.
- **Compiling the built-ins when the library loads.** It was most of the
  27 milliseconds: about 8 for `http`'s and `https`'s host, which inline
  RFC 3986's `IP-literal`, and about 6 for parsing RFC 3986 and RFC 3987.
- **Renaming RFC 3986's rules to RFC 3987's in the compiler**, so that
  `pchar` means `ipchar` in an IRI. It's data: an IRI context's rules
  define `pchar = ipchar`, and an ASCII context's don't.
- **Widening every range of a class**, not only the last. It turned single
  characters into classes, like `"?"` into `[>?]`, and `urn:uuid` was
  slower.
- **A rule for the whole identifier**, like RFC 8089's `file-URI`, in
  place of one per component. The RFCs' rules leave out the fragment, which RFC
  3986 §3.5 leaves to the generic syntax, so `http-URI` would forbid one.
  And per-component rules are what errors and `#f` need (see
  [Schemes](schemes.md#patterns-are-regexps)).
