declare const result: unique symbol;

/**
 * What's known about the input before a pattern runs. Every field is
 * optional, and a pattern compiled with no context matches a whole string
 * against its ABNF and nothing else.
 *
 * `T` is what the tag returns. It's only in the type, so a context can say
 * that its patterns are a brand of `RegExp`.
 */
export type Context<T extends RegExp = RegExp> = {
  /**
   * A rule list that the text can reference. A rule in the text replaces
   * one of the same name here, and these are resolved among themselves and
   * RFC 5234's core rules.
   */
  readonly rules?: string;

  /**
   * ABNF that matches one character: every character the input can have.
   * A character set can include or leave out the others without changing
   * what it matches, so it's compiled as whichever class is shortest.
   * Defaults to every character.
   */
  readonly alphabet?: string;

  /**
   * ABNF that matches one character: the characters that end what a
   * pattern matches. They're removed from every character set, so a
   * pattern can't match past one.
   */
  readonly delimiters?: string;

  /**
   * Whether each `%` in the input has already been checked to be followed
   * by two hex digits, so `pct-encoded` can match `%` as one character
   * where that doesn't change what matches. Defaults to `false`.
   */
  readonly percentEncoded?: boolean;

  /**
   * Whether the pattern matches a whole string, with `^` and `$`. Defaults
   * to `true`. A pattern that's put inside a larger one isn't anchored.
   */
  readonly anchored?: boolean;

  readonly [result]?: T;
};

/**
 * Makes a tag that compiles ABNF (RFC 5234, with RFC 7405's
 * case-sensitive strings) into a `RegExp` with the `u` flag.
 *
 * The text is a rule list, and its first rule is the one matched, or an
 * expression, which can be followed by the rules it references. `${}`
 * splices text in.
 *
 * ```js
 * const date = abnf()`
 *   full-date = date-fullyear "-" date-month "-" date-mday
 *   date-fullyear = 4DIGIT
 *   date-month = 2DIGIT
 *   date-mday = 2DIGIT
 * `;
 * ```
 *
 * @throws {SyntaxError} If the text isn't ABNF, a rule is defined twice,
 * a rule it references isn't defined, a rule is recursive, it has a prose
 * value, or it can't match anything once the context's delimiters are
 * removed.
 * @throws {TypeError} If a spliced value isn't a string, or a context's
 * `alphabet` or `delimiters` isn't one character.
 */
export const abnf: <T extends RegExp = RegExp>(context?: Context<T>) => Tag<T>;

/** Compiles the ABNF it's given. */
export type Tag<T extends RegExp = RegExp> = (strings: TemplateStringsArray, ...values: string[]) => T;
