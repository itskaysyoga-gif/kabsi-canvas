// The free check (master plan 28.1, 30.15 section 3.10, 30.17 section 2; V4 item 6). A useful result before asking for
// anything: "Free check. No Google access needed." On the page within seconds (DataForSEO live endpoints): where the business
// comes up at its own address for one search, who comes up around it, and one AI answer. The 7 by 7 search is queued on
// DataForSEO's standard queue and turns into the nearby places when it is ready (the page keeps asking, and WhatsApp sends it
// when the visitor taps "Send the full map to my WhatsApp" and sends the code). The 14-day trial is explained apart from the
// check: it starts only when Google access works.
//
// Public results only, from DataForSEO (30.10.2); nothing from Places is stored. The page shows the public profile facts live
// from the existing profile-snapshot function, which keeps nothing but the place ID. Pure apart from the deps, so the tests run
// on the mock provider.
import { COST_MICROS, DEPTH, type Identity, isSame, type MapsItem, type MapsProvider, type MapsTask, rankOf } from "./dataforseo.ts";
import { gridPoints, radiusFor, type LatLng } from "./grid.ts";
import { locate } from "./locate.ts";
import { businessType, type CellResult, competitors, summarize } from "./scan.ts";
import { nearbyPlaces, type Nearby, ordinal, type PlaceName } from "./nearby.ts";
import type { FreeCheck as AiCheck } from "./ai/run.ts";

export const CHECK_LINE = "Free check. No Google access needed.";
export const TRIAL_LINE = "The 14-day free trial is separate from this check. It starts only when Kabsi's access to your Google profile works.";
export const MAP_LOADING = "Searching from 49 places around you, like a customer would. This takes a few minutes.";
export const AI_LABEL = "One sample. AI answers change from run to run.";

export type Rival = { name: string; rating: number | null; reviews: number | null };
export type Fast = { rank: number | null; line: string; competitors: Rival[] };
export type PointRow = { row: number; col: number; lat: number; lng: number; task: string | null; rank?: number | null; items?: MapsItem[] | null };
export type CheckRow = {
  id: string; code: string; business: string; term: string; country: string; city: string | null;
  self: Identity & { title: string }; center: LatLng; radius_km: number; category: string | null; source: "mock" | "live";
  state: "mapping" | "done" | "failed"; fast: Fast; ai: AiCheck | null; points: PointRow[]; nearby: Nearby | null;
  created_at: string;
};

/** "At your address you rank 4 for 'hair salon'." / "At your address you are not in the top 20 for 'hair salon'." */
export function fastLine(rank: number | null, term: string): string {
  return rank != null && rank <= DEPTH ? `At your address you rank ${rank} for '${term}'.` : `At your address you are not in the top ${DEPTH} for '${term}'.`;
}

/** "ChatGPT named you." / "ChatGPT did not name you. It named A, B and C." */
export function aiLine(a: AiCheck | null): string | null {
  if (!a) return null;
  if (a.named) return "ChatGPT named you.";
  const n = a.competitors;
  if (!n.length) return "ChatGPT did not name you.";
  const list = n.length === 1 ? n[0] : `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;
  return `ChatGPT did not name you. It named ${list}.`;
}

/** A short code the visitor can send on WhatsApp: 8 letters and digits, no look-alikes (0, O, 1, I, L). */
export function newCode(rand: () => number = Math.random): string {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => abc[Math.floor(rand() * abc.length)]).join("");
}

/** The search term: the visitor's own, else the industry page's, cleaned like the owner's search (lower case, short). */
export function cleanTerm(t: unknown): string | null {
  const s = String(t ?? "").replace(/[^\p{L}\p{N}\s'&-]/gu, " ").replace(/\s+/g, " ").trim().toLowerCase();
  return s.length >= 2 && s.length <= 60 ? s : null;
}

export type StartDeps = {
  provider: MapsProvider;
  source: "mock" | "live";
  /** The one AI answer (28.1), or null when ai_visibility_free_scan is off or the cap is reached. */
  ai: (o: { business: string; prompt: string; country: string; city: string | null }) => Promise<AiCheck | null>;
  /** Room in this month's DataForSEO cap for this much, and recording what was spent. */
  room: (micros: number) => Promise<boolean>;
  spend: (calls: number, micros: number) => Promise<void>;
  code: () => string;
};
export type StartInput = { name: string; address: string | null; country: string; city: string | null; place_id: string | null; term: string };
export type Started =
  | { ok: true; row: Omit<CheckRow, "id" | "created_at"> }
  | { ok: false; reason: "not_found_on_maps" | "paused" | "country" };

/** The fast part, and the full search queued. One locate call, one live call at the address, 49 queued tasks. */
export async function startCheck(d: StartDeps, i: StartInput): Promise<Started> {
  const live = d.source === "live";
  const cost = live ? 2 * COST_MICROS.live + 49 * COST_MICROS.standard : 0;
  if (live && !(await d.room(cost))) return { ok: false, reason: "paused" };
  const found = await locate(d.provider, { name: i.name, address: i.address, country: i.country, place_id: i.place_id });
  if (live) await d.spend(1, COST_MICROS.live);
  if (!found) return { ok: false, reason: "not_found_on_maps" };
  const self = { title: found.title, cid: found.cid, place_id: found.place_id ?? i.place_id };
  const center = { lat: found.lat, lng: found.lng };
  const here = await d.provider.liveOne({ keyword: i.term, lat: center.lat, lng: center.lng, tag: "fast:3:3" });
  if (live) await d.spend(1, COST_MICROS.live);
  const rank = rankOf(here, self);
  const rivals = here.filter((x) => !isSame(x, self)).slice(0, 3).map((x) => ({ name: x.title, rating: x.rating, reviews: x.reviews }));
  const code = d.code();
  const radius = radiusFor(found.category);
  const pts = gridPoints(center, radius);
  let points: PointRow[] = pts.map((p) => ({ ...p, task: null }));
  let state: CheckRow["state"] = "mapping";
  try {
    const tasks: MapsTask[] = pts.map((p) => ({ keyword: i.term, lat: p.lat, lng: p.lng, tag: `${code}:${p.row}:${p.col}` }));
    const ids = await d.provider.post(tasks);
    if (live) await d.spend(Object.keys(ids).length, Object.keys(ids).length * COST_MICROS.standard);
    points = pts.map((p) => ({ ...p, task: ids[`${code}:${p.row}:${p.col}`] ?? null }));
    // A map with a hole would be wrong: every point is queued, or the fast part stands on its own.
    if (points.some((p) => !p.task)) state = "failed";
  } catch {
    state = "failed";
  }
  const where = i.city ? ` in ${i.city}` : "";
  const ai = await d.ai({ business: found.title, prompt: `best ${i.term}${where}`, country: i.country, city: i.city }).catch(() => null);
  return {
    ok: true,
    row: {
      code, business: found.title, term: i.term, country: i.country, city: i.city, self, center, radius_km: radius, category: found.category,
      source: d.source, state, fast: { rank, line: fastLine(rank, i.term), competitors: rivals }, ai, points, nearby: null,
    },
  };
}

export type CollectDeps = { provider: MapsProvider; name?: PlaceName; now: () => Date };

/** Collect what DataForSEO has finished; when every point is in, the nearby places. Returns the changed row, or null. */
export async function collectCheck(d: CollectDeps, c: CheckRow): Promise<CheckRow | null> {
  if (c.state !== "mapping") return null;
  if (d.now().getTime() - new Date(c.created_at).getTime() > 24 * 3_600_000) return { ...c, state: "failed" };
  const open = c.points.filter((p) => p.task && p.items == null);
  if (!open.length) return null;
  const ready = c.source === "live" ? new Set(await d.provider.ready()) : null;
  let changed = false;
  const points = [...c.points];
  for (const p of open) {
    if (ready && !ready.has(p.task!)) continue;
    const got = await d.provider.get(p.task!);
    if (!got) continue;
    const idx = points.findIndex((x) => x.row === p.row && x.col === p.col);
    points[idx] = { ...p, rank: rankOf(got.items, c.self), items: got.items.slice(0, 3) };
    changed = true;
  }
  if (!changed) return null;
  if (points.some((p) => p.items == null)) return { ...c, points };
  // Only the first three businesses of each point are kept: enough for "who came first" and the count.
  const cells: (CellResult & LatLng)[] = points.map((p) => ({ row: p.row, col: p.col, lat: p.lat, lng: p.lng, rank: p.rank ?? null, items: p.items ?? [] }));
  const me = cells.flatMap((x) => x.items).find((x) => isSame(x, c.self));
  const nearby = await nearbyPlaces({ cells, who: c.self, keyword: c.term, radiusKm: c.radius_km, businessType: businessType(me?.category ?? c.category), name: d.name });
  return { ...c, points, nearby, state: "done" };
}

/** What the page and WhatsApp may show: no task ids, no coordinates of other businesses. */
export function publicView(c: CheckRow) {
  const cells: CellResult[] = c.points.filter((p) => p.items != null).map((p) => ({ row: p.row, col: p.col, rank: p.rank ?? null, items: p.items ?? [] }));
  const s = c.state === "done" ? summarize(cells, c.self) : null;
  return {
    code: c.code, business: c.business, term: c.term, check_line: CHECK_LINE, trial_line: TRIAL_LINE,
    fast: c.fast, ai: c.ai ? { ...c.ai, line: aiLine(c.ai), label: AI_LABEL } : null,
    map: c.state === "done"
      ? { state: "done", nearby: c.nearby, top3: s!.top3, points: s!.points, average: s!.averageRank,
        rivals: competitors(cells, c.self, 3).map((r) => ({ name: r.name, places: r.spots })),
        // The detailed results: the owner's position at every checked place, rows north to south.
        dots: c.points.map((p) => ({ row: p.row, col: p.col, rank: p.rank ?? null })) }
      : { state: c.state, line: c.state === "mapping" ? MAP_LOADING : null },
  };
}

/** One factual line for WhatsApp's "The check:" message (docs/COPY.md 20). */
export function checkFact(c: Pick<CheckRow, "fast" | "nearby">): string {
  if (c.nearby) return c.nearby.count_line;
  return c.fast.rank != null && c.fast.rank <= DEPTH ? `At your address you came up ${ordinal(c.fast.rank)}.` : `At your address you were not in the first ${DEPTH}.`;
}
