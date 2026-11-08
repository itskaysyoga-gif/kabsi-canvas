// Digits and text folding (normalizer "digits", version 1). Arabic-Indic and Eastern Arabic-Indic digits become Latin
// digits, one character for one character, so a position found in the changed text is the same position in the original.
// Code points are written as escapes: no Arabic script appears in this file.

export const DIGITS_VERSION = 1;

/** The Latin digit for any decimal digit written in Arabic-Indic, Eastern Arabic-Indic or full-width form, else the character itself. */
export function latinDigit(ch: string): string {
  const c = ch.codePointAt(0) ?? 0;
  if (c >= 0x0660 && c <= 0x0669) return String(c - 0x0660);
  if (c >= 0x06f0 && c <= 0x06f9) return String(c - 0x06f0);
  if (c >= 0xff10 && c <= 0xff19) return String(c - 0xff10);
  return ch;
}

/** The text with every decimal digit written as a Latin digit. Same length as the input, character for character. */
export function toLatinDigits(text: string): string {
  let out = "";
  for (const ch of text) out += latinDigit(ch);
  return out;
}

/**
 * Text prepared for reading words and dates: Latin digits, ASCII letters lower case, and the same length as the input
 * (a character that has no 1 to 1 mapping stays as it is), so evidence positions point into the original message.
 */
export function readable(text: string): string {
  let out = "";
  for (const ch of toLatinDigits(text)) out += ch >= "A" && ch <= "Z" ? ch.toLowerCase() : ch;
  return out;
}

/**
 * Text prepared for matching vocabulary: readable(), then every character that is not a Latin letter or digit becomes a
 * space. Still the same length, so a hyphen, an apostrophe or a comma never hides a word.
 */
export function wordsOnly(text: string): string {
  return readable(text).replace(/[^a-z0-9]/g, " ");
}

/** A name or phrase folded for comparison only: lower case, no accents, single spaces, Latin digits. Never shown to anyone. */
export function foldKey(text: string): string {
  return toLatinDigits(text)
    .normalize("NFKD")
    .replace(/[̀-ͯـً-ٰٟ]/g, "")
    .replace(/[آأإ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
