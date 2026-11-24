// Nearby totals (PROOF-2, blueprint section 7, register section 2): the current rating and review count of up to 3 nearby
// businesses the owner picked, from one live Google Places read. Shown, never stored: Places allows only the place ID to be
// kept (master plan 30.10), so nothing here writes a name, a rating or a count. A small log records only when a read was made,
// so the monthly report reads once a month and a request on WhatsApp reads at most once a week; inside those limits no
// provider call is made. Totals only: no history, no "they gained", no claim about why. Pure of the database and Google.
import type { Nearby, NearbyTotal } from "./compose.ts";

export const MAX_PICKS = 3;
export const WEEK_MS = 7 * 86400_000;

export type CompetitorDeps = {
  /** The place IDs of the businesses the owner picked (at most 3 are read). */
  picks(): Promise<{ place_id: string | null }[]>;
  /** One live read: the name, rating and review count; null when Google cannot answer; "back_soon" when today's cap is spent. */
  read(placeId: string): Promise<{ name: string | null; rating: number | null; count: number | null } | null | "back_soon">;
  /** When a read was last made for this business, of any kind (the log, no figures). */
  lastRead(): Promise<Date | null>;
  /** Records that a read was made. */
  log(kind: "monthly" | "request"): Promise<void>;
  now(): Date;
};

export type CompetitorResult =
  | { state: "ok"; nearby: Nearby }
  | { state: "none" }
  | { state: "too_soon"; again_on: string }
  | { state: "back_soon" }
  | { state: "unavailable" };

const sameMonth = (a: Date, b: Date) => a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** When the next read of this kind is allowed, or null when one is allowed now. */
export function nextAllowed(kind: "monthly" | "request", last: Date | null, now: Date): Date | null {
  if (!last) return null;
  if (kind === "monthly") return sameMonth(last, now) ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) : null;
  const next = new Date(last.getTime() + WEEK_MS);
  return next.getTime() > now.getTime() ? next : null;
}

export async function competitorTotals(kind: "monthly" | "request", d: CompetitorDeps): Promise<CompetitorResult> {
  const now = d.now();
  const wait = nextAllowed(kind, await d.lastRead(), now);
  if (wait) return { state: "too_soon", again_on: isoDay(wait) };
  const ids = (await d.picks()).map((p) => p.place_id).filter((p): p is string => !!p).slice(0, MAX_PICKS);
  if (!ids.length) return { state: "none" };
  const items: NearbyTotal[] = [];
  let reached = false;
  for (const id of ids) {
    const r = await d.read(id);
    if (r === "back_soon") {
      if (reached) await d.log(kind);
      return items.length ? { state: "ok", nearby: { read_on: isoDay(now), items } } : { state: "back_soon" };
    }
    reached = true;
    if (r && r.name) items.push({ name: r.name, rating: r.rating, count: r.count });
  }
  await d.log(kind);
  return items.length ? { state: "ok", nearby: { read_on: isoDay(now), items } } : { state: "unavailable" };
}
