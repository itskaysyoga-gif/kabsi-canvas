// How the banner shows its wording (lane R, 22 Oct 2026). Pure, so a test can read it.

/**
 * The wording as one short paragraph per sentence, the words unchanged. A banner that opens after the page has painted
 * must not become the largest thing on the page: one six-line paragraph is larger than the headline text it appears
 * over, and then it, not the page, is what the browser reports as the page's main content (lane R, 22 Oct 2026).
 */
export function sentences(wording: string): string[] {
  return wording.split(/(?<=\.)\s+/).filter(Boolean);
}
