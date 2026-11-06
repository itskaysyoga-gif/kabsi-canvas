// The name a review card can print (Scan 3; Launch 2 part B, master plan 30.36 item 7). The card's fonts are Latin-1
// (the PNG draws the same words the PDF's standard fonts can hold), so printable() drops any other letter. When it drops
// one, the review link tool asks the owner for the name to print; no Arabic or other font is loaded (R-61). Small on
// purpose: the tool reads it at once, and src/lib/qr-card.ts (with the QR encoder) loads only where a card shows.
/** The name in the letters and signs the card can print, spaces tidied. */
export const printable = (t: string) =>
  t
    .normalize("NFC")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7e\xa0-\xff]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Launch 2 part B: letters before and after printable(), so a name that loses any letter is caught.
const letterCount = (t: string) => (t.normalize("NFC").match(/\p{L}/gu) ?? []).length;
/** True when printable() would leave out a letter of this name. */
export const dropsLetters = (t: string) => letterCount(printable(t)) < letterCount(t);
/** True when the printed name has at least one letter, so the card can be made. */
export const hasLetters = (t: string) => letterCount(printable(t)) > 0;
