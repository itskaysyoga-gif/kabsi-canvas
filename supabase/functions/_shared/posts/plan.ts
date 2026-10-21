// The posts care routine (P0.5-02, K-24, K-115): the job that replaces posts-weekly. Once a day, per business, it
// looks at this month and the next: how many posts the owner chose (2 a month by default, or 1 or 4), how many are
// already prepared, waiting or published, and fills the gap. A post is prepared only from something true (verified
// facts, an approved photo); when there is nothing true to say, Kabsi asks one question instead of writing filler.
// Kabsi's own drafts are always Updates; an Offer or Event exists only because the owner typed it. Nothing is
// published here: the owner approves the month or each post, and the publish job sends each at its time.
import { checkPost, type CheckContext, NOTHING_NEW_QUESTION } from "./checks.ts";

export type Cadence = 1 | 2 | 4;
export const CADENCES: Cadence[] = [1, 2, 4];

/** Local publishing times for a month: 1 a month on the first slot day, 2 in the first and third weeks, 4 weekly.
 * Professional services on Tuesday 08:30, shops and dining on Thursday 09:00 (the slots posts-weekly used). */
export function monthSlots(month: string, cadence: Cadence, slot: "pro" | "retail"): string[] {
  const [y, m] = month.split("-").map(Number);
  const weekday = slot === "pro" ? 2 : 4;
  const time = slot === "pro" ? "08:30" : "09:00";
  const days: number[] = [];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  for (let d = 1; d <= last; d++) if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() === weekday) days.push(d);
  const pick = cadence === 4 ? days.slice(0, 4) : cadence === 2 ? [days[0], days[2]] : [days[0]];
  return pick.map((d) => `${month}-${String(d).padStart(2, "0")}T${time}`);
}

export type Planned = { publishLocal: string; state: string; summary: string };

export type CareDeps = {
  // Posts already planned or published in the month (not skipped), with their local time.
  planned: (month: string) => Promise<Planned[]>;
  // Something true to say: verified facts for posts confirmed or changed lately, or a photo approved lately.
  material: () => Promise<{ recentFacts: boolean; photoId: string | null }>;
  context: () => Promise<CheckContext>;
  // The model writer; production passes none until the AI credit is on (K-146, R-43).
  write?: (angle: string) => Promise<string>;
  prepare: (p: { publishLocal: string; summary: string; photoId: string | null }) => Promise<string>;
  ask: (month: string, question: string) => Promise<void>;
};

const ANGLES = [
  "Write about the main thing this business offers, using the owner's facts.",
  "Write about one specific product, service or answer from the owner's facts.",
  "Write a practical post: when to come and what to know before visiting, if those facts exist.",
  "Write a short, warm invitation to visit this month, grounded in the owner's facts.",
];

export type CareResult = { month: string; prepared: number; asked: boolean; full: boolean };

/** One business, one month: prepare what is missing, or ask the one question. */
export async function careMonth(month: string, cadence: Cadence, slot: "pro" | "retail", nowLocal: string, deps: CareDeps): Promise<CareResult> {
  const planned = await deps.planned(month);
  const taken = new Set(planned.map((p) => p.publishLocal.slice(0, 10)));
  const free = monthSlots(month, cadence, slot).filter((s) => s > nowLocal && !taken.has(s.slice(0, 10)));
  const missing = Math.min(free.length, cadence - planned.length);
  if (missing <= 0) return { month, prepared: 0, asked: false, full: true };

  const m = await deps.material();
  if (!m.recentFacts && !m.photoId) {
    await deps.ask(month, NOTHING_NEW_QUESTION);
    return { month, prepared: 0, asked: true, full: false };
  }
  if (!deps.write) {
    // No model: Kabsi cannot write the post, so it asks the owner for one.
    await deps.ask(month, NOTHING_NEW_QUESTION);
    return { month, prepared: 0, asked: true, full: false };
  }
  const ctx = await deps.context();
  let prepared = 0;
  for (let i = 0; i < missing; i++) {
    const angle = ANGLES[(planned.length + i) % ANGLES.length];
    const summary = (await deps.write(angle)).trim();
    const issues = checkPost({ type: "STANDARD", summary }, { ...ctx, kabsiDraft: true, recent: [...ctx.recent, ...planned.map((p) => p.summary)] });
    if (issues.length) continue; // a draft that fails a check never reaches the owner
    await deps.prepare({ publishLocal: free[i], summary, photoId: i === 0 ? m.photoId : null });
    prepared++;
  }
  if (!prepared) {
    await deps.ask(month, NOTHING_NEW_QUESTION);
    return { month, prepared: 0, asked: true, full: false };
  }
  return { month, prepared, asked: false, full: prepared === missing };
}
