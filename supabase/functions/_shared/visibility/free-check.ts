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
import { cardLine, countWithUsual, nearbyPlaces, type Nearby, offsetWords, ordinal, type PlaceName } from "./nearby.ts";
import type { FreeCheck as AiCheck } from "./ai/run.ts";
import { core, norm } from "./ai/analyze.ts";
import { countryName, latinName, ownName, shownTerm } from "./area.ts";
export { shownTerm } from "./area.ts";
import { refusalOf } from "./refusal.ts";
import type { ReportParts } from "./report.ts";
import { AI_QUESTION, aiAskedLines, aiVerdict, askedLead, assistantName, nearbyCount, nearbyLead } from "./scan-words.ts";
export { CODE_RE, NOT_PART } from "./report.ts";

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
  state: "mapping" | "done" | "failed"; fast: Fast; ai: StoredAi | null; points: PointRow[]; nearby: Nearby | null;
  created_at: string;
};

/** A business Google Maps showed at or around the address: names only, no ratings (30.29). */
export type LocalBiz = { title: string; cid: string | null };
/**
 * The AI part as the row keeps it (30.29). `local` is up to 20 businesses of the live call at the address; `named_local`
 * the answer's businesses that Google Maps has near the business, in the answer's order; `named_other` how many others it
 * named (a count only). `pending` holds the answer's names only while the 49 places are still coming in, and goes when
 * they are matched. A row from before Scan 2 has `competitors` and no `question`.
 */
export type StoredAi = Omit<AiCheck, "names" | "question" | "assistant" | "model" | "asked_at" | "web_search_forced" | "city_dropped"> &
  Partial<Pick<AiCheck, "question" | "assistant" | "model" | "asked_at" | "web_search_forced" | "city_dropped">> & {
    local?: LocalBiz[]; named_local?: string[]; named_other?: number; pending?: string[]; competitors?: string[];
  };

/** The same business by name, as analyze.ts matches them; a name with no distinctive part matches only in full. */
export function sameBusiness(a: string, b: string): boolean {
  const ca = core(a), cb = core(b);
  return (ca.length >= 3 && ca === cb) || (norm(a).length >= 3 && norm(a) === norm(b));
}

/**
 * The answer's names against what Google Maps showed near the business: a name counts as local only when it matches one of
 * those businesses (the Maps title is kept, in the answer's order). Everything else is only counted.
 */
export function matchLocal(names: string[], local: LocalBiz[]): { named_local: string[]; named_other: number } {
  const out: string[] = [];
  let other = 0;
  for (const n of names) {
    const hit = local.find((l) => sameBusiness(l.title, n));
    if (!hit) other++;
    else if (!out.includes(hit.title)) out.push(hit.title);
  }
  return { named_local: out, named_other: other };
}

/** The answer as the row keeps it: matched against `local` (plus the 49 places when they are in); `final` drops the names. */
export function storeAi(a: AiCheck | StoredAi, local: LocalBiz[], final: boolean, more: LocalBiz[] = []): StoredAi {
  const { names, ...rest } = a as AiCheck & StoredAi;
  const all = names ?? rest.pending ?? [];
  const m = matchLocal(all, [...local, ...more]);
  const { pending: _p, ...kept } = rest;
  return { ...kept, local, ...m, ...(final ? {} : { pending: all }) };
}

/** The question the free check asks (30.29): always with the town and the country. Null without a town. */
export function aiQuestion(term: string, area: string | null, country: string): string | null {
  const c = countryName(country);
  return area && c ? `best ${term} in ${area}, ${c}` : null;
}

/** "At your address you rank 4 for 'hair salon'." / "At your address you are not in the top 20 for 'hair salon'." */
export function fastLine(rank: number | null, term: string): string {
  return rank != null && rank <= DEPTH ? `At your address you rank ${rank} for '${term}'.` : `At your address you are not in the top ${DEPTH} for '${term}'.`;
}

export const NOT_NEAR = "ChatGPT did not name you. The businesses it named are not near you on Google Maps, so this answer does not reflect your area.";
export const NO_SOURCES = "No sources cited.";

/** The local names that may be shown: Latin letters only, at most 3, in the answer's order. */
export const shownLocal = (a: StoredAi) => (a.named_local ?? []).filter(latinName).slice(0, 3);

/**
 * docs/COPY.md 49: "ChatGPT named you." / "ChatGPT did not name you. It named A, B and C, which Google Maps shows near you." /
 * the not-near line / "ChatGPT did not name you." A business Google Maps does not show near the owner is never named.
 */
export function aiLine(a: StoredAi | null): string | null {
  if (!a) return null;
  if (a.named) return "ChatGPT named you.";
  const n = shownLocal(a);
  if (n.length) {
    const list = n.length === 1 ? n[0] : `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;
    return `ChatGPT did not name you. It named ${list}, which Google Maps shows near you.`;
  }
  if (!a.named_local?.length && (a.named_other ?? 0) > 0) return NOT_NEAR;
  return "ChatGPT did not name you.";
}

/** The AI card's lines, the same on the page, in the email and on WhatsApp (docs/COPY.md 49). */
export function aiLines(a: StoredAi | null) {
  if (!a) return null;
  const sources = (a.sources ?? []).filter((x) => latinName(x.title) || !x.title).slice(0, 3);
  return {
    question: a.question ? `We asked ChatGPT: '${a.question}'` : null,
    line: aiLine(a),
    sources,
    sources_line: a.question && !sources.length ? NO_SOURCES : null,
    asked: a.question && a.asked_at
      ? `${askedLead(a.assistant, a.asked_at)}${a.web_search_forced ? ", with web search" : ""}. The ${assistantName(a.assistant)} app can answer differently, and answers change from run to run.`
      : null,
  };
}

/** A card's names in Latin letters only (R-61, 30.29): another script reads "another business" or the distance words. */
export function safeNearby(n: Nearby | null, radiusKm: number, type: string, ranks?: readonly (number | null | undefined)[]): Nearby | null {
  if (!n) return null;
  return {
    ...n,
    // Copy 3 (30.30 item 2): every check, also one stored before, says where the business usually comes up, from its points.
    ...(ranks ? { count_line: countWithUsual(n.top3, n.points, ranks) } : {}),
    cards: n.cards.map((c) => {
      const hideFirst = !!c.first && !latinName(c.first);
      const hideName = !!c.name && !latinName(c.name);
      return {
        ...c,
        first: hideFirst ? null : c.first,
        ...(hideFirst || c.first_hidden ? { first_hidden: true } : {}),
        ...(hideName ? { name: null, place: c.kind === "home" ? c.place : offsetWords(c.row, c.col, radiusKm, type) } : {}),
      };
    }),
  };
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
  ai: (o: { business: string; prompt: string; country: string; city: string | null; place_id: string | null }) => Promise<AiCheck | null>;
  /** Room in this month's DataForSEO cap for this much, and recording what was spent. */
  room: (micros: number) => Promise<boolean>;
  spend: (calls: number, micros: number) => Promise<void>;
  code: () => string;
  /** Scan 2 (30.29): a live check of the same place and search in the last 7 days, reused before anything is paid. */
  reuse?: () => Promise<CheckRow | null>;
};
/** `industry_term`: the industry page's search term, the fallback when the visitor's own term is not in Latin letters (30.30). */
export type StartInput = { name: string; address: string | null; country: string; city: string | null; place_id: string | null; term: string; industry_term?: string | null };
export type Started =
  | { ok: true; row: Omit<CheckRow, "id" | "created_at"> }
  | { ok: "reused"; check: CheckRow }
  | { ok: false; reason: "not_found_on_maps" | "paused" | "country" | "term" };

/** The fast part, and the full search queued. One locate call, one live call at the address, 49 queued tasks. */
export async function startCheck(d: StartDeps, i: StartInput): Promise<Started> {
  const again = d.reuse ? await d.reuse().catch(() => null) : null;
  if (again) return { ok: "reused", check: again };
  const live = d.source === "live";
  const cost = live ? 2 * COST_MICROS.live + 49 * COST_MICROS.standard : 0;
  if (live && !(await d.room(cost))) return { ok: false, reason: "paused" };
  const found = await locate(d.provider, { name: i.name, address: i.address, country: i.country, place_id: i.place_id });
  if (live) await d.spend(1, COST_MICROS.live);
  if (!found) return { ok: false, reason: "not_found_on_maps" };
  // Review of Scan 2: the place the visitor picked (Places) is the check's key, so the report and the 7-day reuse bind to
  // it even when DataForSEO gives the same place under another ID; the cid still identifies it in the results.
  const self = { title: found.title, cid: found.cid, place_id: i.place_id ?? found.place_id };
  const center = { lat: found.lat, lng: found.lng };
  // Copy 3 (30.30 item 3): the Latin rule for the visitor's own term (area.ts shownTerm).
  const t = shownTerm(i.term, found.category, i.industry_term ?? null);
  if (!t) return { ok: false, reason: "term" };
  const term = t.term;
  const here = await d.provider.liveOne({ keyword: term, lat: center.lat, lng: center.lng, tag: "fast:3:3" });
  if (live) await d.spend(1, COST_MICROS.live);
  const rank = rankOf(here, self);
  const others = here.filter((x) => !isSame(x, self));
  // Who comes up at the address: names in Latin letters only, the next business taking the place of one that is not.
  const rivals = others.filter((x) => latinName(x.title)).slice(0, 3).map((x) => ({ name: x.title, rating: x.rating, reviews: x.reviews }));
  const local: LocalBiz[] = others.slice(0, 20).map((x) => ({ title: x.title, cid: x.cid ?? null }));
  const code = d.code();
  const radius = radiusFor(found.category);
  const pts = gridPoints(center, radius);
  let points: PointRow[] = pts.map((p) => ({ ...p, task: null }));
  let state: CheckRow["state"] = "mapping";
  try {
    const tasks: MapsTask[] = pts.map((p) => ({ keyword: term, lat: p.lat, lng: p.lng, tag: `${code}:${p.row}:${p.col}` }));
    const ids = await d.provider.post(tasks);
    if (live) await d.spend(Object.keys(ids).length, Object.keys(ids).length * COST_MICROS.standard);
    points = pts.map((p) => ({ ...p, task: ids[`${code}:${p.row}:${p.col}`] ?? null }));
    // A map with a hole would be wrong: every point is queued, or the fast part stands on its own.
    if (points.some((p) => !p.task)) state = "failed";
  } catch (e) {
    // Go live 1 (30.28): a refusal of the 49 tasks goes up to the endpoint (one staff alert a day); the fast part is kept
    // only for other failures. Refused tasks are not charged.
    if (refusalOf(e) && refusalOf(e) !== "provider_error") throw e;
    state = "failed";
  }
  // Scan 2 (30.29): the question always names the town and the country; without a town it is not asked.
  // AI Answers 1: the answer is compared with the Google profile read live by its place ID; only the fact that differs and
  // ChatGPT's sentence come back (ai.accuracy), never a value from Places.
  const question = t.ai ? aiQuestion(term, i.city, i.country) : null;
  const asked = question
    ? await d.ai({ business: found.title, prompt: question, country: i.country, city: i.city, place_id: self.place_id ?? null }).catch(() => null)
    : null;
  const ai = asked ? storeAi(asked, local, state !== "mapping") : null;
  return {
    ok: true,
    row: {
      code, business: found.title, term, country: i.country, city: i.city, self, center, radius_km: radius, category: found.category,
      source: d.source, state, fast: { rank, line: fastLine(rank, term), competitors: rivals }, ai, points, nearby: null,
    },
  };
}

export type CollectDeps = { provider: MapsProvider; name?: PlaceName; now: () => Date };

/** Collect what DataForSEO has finished; when every point is in, the nearby places. Returns the changed row, or null. */
export async function collectCheck(d: CollectDeps, c: CheckRow): Promise<CheckRow | null> {
  if (c.state !== "mapping") return null;
  if (d.now().getTime() - new Date(c.created_at).getTime() > 24 * 3_600_000) {
    return { ...c, state: "failed", ai: c.ai ? storeAi(c.ai, c.ai.local ?? [], true) : null };
  }
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
  // 30.29: the answer's names are matched against every business the 49 places showed, then only the count is kept.
  const seen: LocalBiz[] = cells.flatMap((x) => x.items).filter((x) => !isSame(x, c.self)).map((x) => ({ title: x.title, cid: x.cid ?? null }));
  const ai = c.ai ? storeAi(c.ai, c.ai.local ?? [], true, seen) : null;
  return { ...c, points, nearby, ai, state: "done" };
}

/** What the page and WhatsApp may show: no task ids, no coordinates of other businesses. */
export function publicView(c: CheckRow) {
  const cells: CellResult[] = c.points.filter((p) => p.items != null).map((p) => ({ row: p.row, col: p.col, rank: p.rank ?? null, items: p.items ?? [] }));
  const s = c.state === "done" ? summarize(cells, c.self) : null;
  return {
    // created_at: the page prints the date of the search (Web 2), never today's date for an older check.
    code: c.code, business: ownName(c.business), term: c.term, created_at: c.created_at, check_line: CHECK_LINE, trial_line: TRIAL_LINE,
    // 30.29: names in Latin letters only; the answer's own names are never shown unless Google Maps has them nearby.
    fast: { ...c.fast, competitors: c.fast.competitors.filter((x) => latinName(x.name)).slice(0, 3) },
    ai: c.ai ? publicAi(c.ai) : null,
    map: c.state === "done"
      ? { state: "done", nearby: safeNearby(c.nearby, c.radius_km, businessType(c.category), c.points.map((p) => p.rank ?? null)), top3: s!.top3, points: s!.points, average: s!.averageRank,
        rivals: competitors(cells, c.self, 10).filter((r) => latinName(r.name)).slice(0, 3).map((r) => ({ name: r.name, places: r.spots })),
        // The detailed results: the owner's position at every checked place, rows north to south.
        dots: c.points.map((p) => ({ row: p.row, col: p.col, rank: p.rank ?? null })) }
      : { state: c.state, line: c.state === "mapping" ? MAP_LOADING : null },
  };
}

/** The AI part a visitor may see: never the answer's own list, the businesses near the address or the names held. */
export function publicAi(a: StoredAi) {
  const l = aiLines(a)!;
  return {
    provider: "chatgpt" as const, assistant: a.assistant ?? "ChatGPT", model: a.model ?? null, question: a.question ?? null,
    asked_at: a.asked_at ?? null, named: a.named, line: l.line, question_line: l.question, asked_line: l.asked,
    sources: l.sources, sources_line: l.sources_line, named_other: a.question ? a.named_other ?? 0 : null,
    accuracy: a.accuracy ?? null, label: AI_LABEL,
  };
}


/**
 * What "Send me this report" carries beyond the Google part, in the result page's own words from the one shared module
 * (scan-words.ts; Launch 1, master plan 30.35 item 4): the nearby lead ("When someone searches for ... you appear 2nd in
 * this Google Maps check."), the points line with the usual position, "Did ChatGPT name your business?" with the answer
 * line, the question, the model and the date, and the link to the saved result. Null when the check never finished (the
 * report then says NOT_PART). A part the check does not hold is left out.
 */
export function reportParts(c: CheckRow, appUrl: string): ReportParts | null {
  if (c.state !== "done") return null;
  const v = publicView(c);
  const done = v.map.state === "done" ? v.map : null;
  // The counts of the nearby card the page shows (the same as the map's for every real check of 49 points).
  const n = done?.nearby ?? null;
  const nearby = done
    ? [nearbyLead(v.term, c.fast.rank), nearbyCount(n?.top3 ?? done.top3, n?.points ?? done.points, c.points.map((p) => p.rank ?? null))]
    : [];
  const ai = v.ai ? [AI_QUESTION, aiVerdict(v.ai).line, ...aiAskedLines(v.ai)] : [];
  return { nearby, ai, link: `${appUrl.replace(/\/$/, "")}/scan/${c.code}` };
}

/** One factual line for WhatsApp's "The check:" message (docs/COPY.md 20). */
export function checkFact(c: Pick<CheckRow, "fast" | "nearby"> & Partial<Pick<CheckRow, "points">>): string {
  if (c.nearby) return c.points ? countWithUsual(c.nearby.top3, c.nearby.points, c.points.map((p) => p.rank ?? null)) : c.nearby.count_line;
  return c.fast.rank != null && c.fast.rank <= DEPTH ? `At your address you came up ${ordinal(c.fast.rank)}.` : `At your address you were not in the first ${DEPTH}.`;
}
