// Copy 3 (master plan 30.30 item 2): where the business usually comes up. The count line alone can mislead (SEVEN Burgers came
// up 3rd at most places in the morning and 4th at most places three hours later, a move of one position), so the nearby part
// also says the middle position. No imports, so the website's map and the Edge Functions share this one function.

/** A rank counts as "in the first 20" for this line; the free check never reads deeper than 20 (DEPTH). */
const FIRST = 20;

/** "1st", "2nd", "3rd", "4th", "11th", "21st". */
function ord(n: number): string {
  const s =
    n % 100 >= 11 && n % 100 <= 13
      ? "th"
      : (({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th");
  return `${n}${s}`;
}

/** The middle position among the points where the business is in the first 20 (the lower middle when the count is even). */
export function usualRank(ranks: readonly (number | null | undefined)[]): number | null {
  const got = ranks
    .filter((r): r is number => typeof r === "number" && r >= 1 && r <= FIRST)
    .sort((a, b) => a - b);
  if (!got.length) return null;
  return got[Math.floor((got.length - 1) / 2)]!;
}

/**
 * The second sentence of the count line: "Most places put you 4th." from the median position among the points where the business is
 * in the first 20, or "Most places did not put you in the first 20." when fewer than half the points have it there. Null when
 * there are no points.
 */
export function usualLine(ranks: readonly (number | null | undefined)[]): string | null {
  if (!ranks.length) return null;
  const inFirst = ranks.filter((r) => typeof r === "number" && r >= 1 && r <= FIRST).length;
  if (inFirst * 2 < ranks.length) return `Most places did not put you in the first ${FIRST}.`;
  return `Most places put you ${ord(usualRank(ranks)!)}.`;
}

/** "In the first 3 at 40 of 49 places Kabsi checked." and then, when there are points, the line above. */
export function countWithUsual(
  top3: number,
  points: number,
  ranks: readonly (number | null | undefined)[],
): string {
  const base = `In the first 3 at ${top3} of ${points} places Kabsi checked.`;
  const u = usualLine(ranks);
  return u ? `${base} ${u}` : base;
}
