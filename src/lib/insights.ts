// Insights (P0.5-05, K-26, K-138): this month's Google figures against last month's and, on Pro, the search terms of
// the last full month. The insights Edge Function reads them from Google when the screen opens and stores nothing;
// the browser keeps them in memory only. While Google is in mock mode the answer says `example` and every figure is
// labelled Example on screen.
import { anonHeaders, sessionFetch, supabase, supabaseUrl } from "@/lib/supabase";
import { SessionEnded } from "@/lib/session-ended";
import type { NearbyCheck, NearbyPlace } from "@/components/kabsi/map-data";
import { AI_LABEL, rivalLine } from "../../supabase/functions/_shared/results-report/receipt.ts";

export type TileKey = "calls" | "website_clicks" | "directions" | "views" | "bookings" | "messages";
export type InsightTile = {
  key: TileKey;
  label: string;
  this: number;
  last: number;
  change: string;
};
export type DailyPoint = {
  date: string;
  calls: number;
  website_clicks: number;
  directions: number;
  views: number;
};
export type SearchTerm = { term: string; count: number | null; fewer_than: number | null };
export type InsightsAnswer = {
  available: boolean;
  example: boolean;
  pro: boolean;
  summary: {
    headline: string;
    interactions: { this: number; last: number };
    tiles: InsightTile[];
    daily: DailyPoint[];
    periods: { kind: "month_so_far" | "last_month"; this_label: string; last_label: string };
  } | null;
  terms: { month_label: string; items: SearchTerm[] } | null;
};

export class InsightsError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function loadInsights(locationId: string): Promise<InsightsAnswer> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new InsightsError("sign_in_required", "Sign in to see your Insights.");
  let res: Response;
  try {
    res = await sessionFetch(`${supabaseUrl}/functions/v1/insights`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...anonHeaders,
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ location_id: locationId }),
    });
  } catch (e) {
    if (e instanceof SessionEnded) throw e;
    throw new InsightsError(
      "network",
      "We could not reach Kabsi. Check your connection and try again.",
    );
  }
  const j = (await res.json().catch(() => ({}))) as InsightsAnswer & {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new InsightsError(j.error ?? "failed", j.message || "Your figures could not be read.");
  }
  return j;
}

/** How a search term's count reads: a number, or "fewer than 15" when Google only gives a threshold (K-26). */
export const termCountText = (t: SearchTerm) =>
  t.count !== null ? String(t.count) : `fewer than ${t.fewer_than}`;

/** "12% more" becomes "12% more than last month"; no comparison gives nothing to say. */
export const compareText = (change: string, against: string) =>
  !change ? "" : change === "no change" ? `no change from ${against}` : `${change} than ${against}`;

/* ---------- Where you show up (UX 1, Design 3): Kabsi's own checks, read through RLS (members only) ---------- */

export { AI_LABEL, rivalLine };

/** V4's nearby cards as visibility_scans.nearby stores them (supabase/functions/_shared/visibility/nearby.ts). */
type NearbyCard = {
  kind: "home" | "away";
  row: number;
  col: number;
  place: string;
  rank: number | null;
  first: string | null;
  firstIsYou: boolean;
};
type StoredNearby = { cards: NearbyCard[]; top3: number; points: number; count_line: string };
type ScanRow = {
  id: string;
  keyword: string;
  state: "queued" | "done" | "failed";
  done_at: string | null;
  created_at: string;
  nearby: StoredNearby | null;
};

export type NearbyState =
  | { state: "none" }
  | { state: "running"; keyword: string | null }
  | { state: "failed"; keyword: string }
  | { state: "done"; scanId: string; check: NearbyCheck | null; countLine: string | null };

const longDate = (iso: string, tz?: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(tz ? { timeZone: tz } : {}),
  }).format(new Date(iso));

/** The three nearby places, the dots and the date, in the shape the design studio's NearbyPlaces draws. Null when V4 has no cards for it. */
export function toNearbyCheck(
  o: { business: string; keyword: string; done_at: string; nearby: StoredNearby | null },
  points: { row: number; col: number; rank: number | null }[],
  tz?: string,
): NearbyCheck | null {
  if (!o.nearby || o.nearby.cards.length < 3) return null;
  const ranks = Array.from({ length: 49 }, () => 0);
  for (const p of points) if (p.row < 7 && p.col < 7) ranks[p.row * 7 + p.col] = p.rank ?? 0;
  const letters = ["A", "B", "C"] as const;
  const places = o.nearby.cards.slice(0, 3).map((c, i): NearbyPlace => ({
    letter: letters[i]!,
    name: c.place,
    rank: c.rank ?? 0,
    first: c.firstIsYou ? o.business : (c.first ?? ""),
    point: c.row * 7 + c.col,
    where: c.kind === "home" ? "at the business" : "",
  })) as NearbyCheck["places"];
  return {
    business: o.business,
    kind: "business",
    keyword: o.keyword,
    date: longDate(o.done_at, tz),
    ranks,
    places,
  };
}

/** The latest nearby check: the newest finished scan, else a scan still running or one that failed. */
export async function loadNearby(
  locationId: string,
  business: string,
  tz?: string,
): Promise<NearbyState> {
  const { data, error } = await supabase
    .from("visibility_scans")
    .select("id, keyword, state, done_at, created_at, nearby")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as ScanRow[];
  const done = rows.find((r) => r.state === "done" && r.done_at);
  if (done) {
    const pts = await supabase
      .from("visibility_points")
      .select("row, col, rank")
      .eq("scan_id", done.id);
    if (pts.error) throw new Error(pts.error.message);
    const check = toNearbyCheck(
      { business, keyword: done.keyword, done_at: done.done_at!, nearby: done.nearby },
      (pts.data ?? []) as { row: number; col: number; rank: number | null }[],
      tz,
    );
    return { state: "done", scanId: done.id, check, countLine: done.nearby?.count_line ?? null };
  }
  const first = rows[0];
  if (!first) return { state: "none" };
  if (first.state === "failed") return { state: "failed", keyword: first.keyword };
  return { state: "running", keyword: first.keyword };
}

export type AiAnswerView = {
  question: string;
  assistant: string;
  askedOn: string;
  every: "monthly" | "every 2 weeks";
  named: boolean | null;
  sources: string[];
  answer: string | null;
};

const ASSISTANT: Record<string, string> = { chatgpt: "ChatGPT", perplexity: "Perplexity" };

/** The latest live AI answer (ChatGPT or Perplexity; Gemini text is never kept): the exact question, who and when, named or not, the sources. */
export async function loadAiAnswer(locationId: string, tz?: string): Promise<AiAnswerView | null> {
  const { data, error } = await supabase
    .from("ai_visibility_runs")
    .select("id, provider, run_at, named, sources, ai_visibility_prompts(text, cadence)")
    .eq("location_id", locationId)
    .eq("state", "done")
    .eq("source", "live")
    .in("provider", ["chatgpt", "perplexity"])
    .order("run_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const r = (data ?? [])[0] as unknown as
    | {
        id: string;
        provider: string;
        run_at: string;
        named: boolean | null;
        sources: { domain: string; title: string }[] | null;
        ai_visibility_prompts:
          { text: string; cadence: string } | { text: string; cadence: string }[] | null;
      }
    | undefined;
  if (!r) return null;
  const p = Array.isArray(r.ai_visibility_prompts)
    ? r.ai_visibility_prompts[0]
    : r.ai_visibility_prompts;
  if (!p?.text) return null;
  const ans = await supabase
    .from("ai_visibility_answers")
    .select("answer")
    .eq("run_id", r.id)
    .maybeSingle();
  return {
    question: p.text,
    assistant: ASSISTANT[r.provider] ?? r.provider,
    askedOn: new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      ...(tz ? { timeZone: tz } : {}),
    }).format(new Date(r.run_at)),
    every: p.cadence === "biweekly" ? "every 2 weeks" : "monthly",
    named: r.named,
    sources: [...new Set((r.sources ?? []).map((s) => s.domain).filter(Boolean))].slice(0, 3),
    answer: (ans.data as { answer?: string } | null)?.answer ?? null,
  };
}

type Snapshot = {
  key: string;
  is_self: boolean;
  name: string;
  reviews: number | null;
  taken_on: string;
};

/**
 * Review gains over about a month for the business and the competitors it watches, from Kabsi's own public snapshots. The
 * same rule as supabase/functions/_shared/report.ts rivalChanges: two snapshots at least three weeks apart, or it is not
 * "this month". Pure.
 */
export function rivalChanges(rows: Snapshot[]): { name: string; theirs: number; mine: number }[] {
  const DAY = 86_400_000;
  const by = new Map<
    string,
    { name: string; self: boolean; first: number | null; last: number | null; days: number }
  >();
  const first = new Map<string, string>();
  for (const s of [...rows].sort((a, b) => a.taken_on.localeCompare(b.taken_on))) {
    const cur = by.get(s.key) ?? {
      name: s.name,
      self: s.is_self,
      first: s.reviews,
      last: s.reviews,
      days: 0,
    };
    if (!first.has(s.key)) first.set(s.key, s.taken_on);
    cur.last = s.reviews ?? cur.last;
    cur.days = (Date.parse(s.taken_on) - Date.parse(first.get(s.key)!)) / DAY;
    by.set(s.key, cur);
  }
  const gain = (x: { first: number | null; last: number | null }) =>
    x.first == null || x.last == null ? null : Math.max(0, x.last - x.first);
  const me = [...by.values()].find((x) => x.self);
  const mine = me ? gain(me) : null;
  if (!me || mine == null || me.days < 21) return [];
  return [...by.values()]
    .filter((x) => !x.self && x.days >= 21 && gain(x) != null)
    .map((x) => ({ name: x.name, theirs: gain(x)!, mine }));
}

/** Competitor Watch's one line, or null when nothing changed that matters (V4: at least 5 reviews and at least twice yours). */
export async function loadRivalLine(locationId: string): Promise<string | null> {
  const since = new Date(Date.now() - 35 * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("competitor_snapshots")
    .select("key, is_self, name, reviews, taken_on")
    .eq("location_id", locationId)
    .gte("taken_on", since)
    .order("taken_on");
  if (error) throw new Error(error.message);
  return rivalLine(rivalChanges((data ?? []) as Snapshot[]));
}

export type AiQuestion = { id: string; text: string; kind: "suggested" | "owner"; cadence: string };

/** The AI questions Kabsi asks for this business. Owners and managers change them with save_ai_prompt (UX 1). */
export async function loadAiQuestions(locationId: string): Promise<AiQuestion[]> {
  const { data, error } = await supabase
    .from("ai_visibility_prompts")
    .select("id, text, kind, cadence")
    .eq("location_id", locationId)
    .eq("active", true)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as AiQuestion[];
}

export type TrackedSearch = { id: string; keyword: string; cadence: string };

/** The searches Kabsi checks on Google Maps (visibility_keywords). */
export async function loadSearches(locationId: string): Promise<TrackedSearch[]> {
  const { data, error } = await supabase
    .from("visibility_keywords")
    .select("id, keyword, cadence")
    .eq("location_id", locationId)
    .eq("active", true)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as TrackedSearch[];
}

/** A stored question (kept in lower case by promptFrom) as a sentence: its first letter in capitals. */
export const asSentence = (q: string) => (q ? q[0]!.toUpperCase() + q.slice(1) : q);

/** Adds a question, or changes one when `id` is given (save_ai_prompt: promptFrom's rules, the plan's limit, after the first task). */
export async function saveAiPrompt(locationId: string, text: string, id?: string): Promise<string> {
  const { data, error } = await supabase.rpc("save_ai_prompt", {
    p_location: locationId,
    p_text: text,
    ...(id ? { p_id: id } : {}),
  });
  if (error) throw new AiPromptError(error.message, error.details ?? null);
  return data as string;
}

/** Stops Kabsi asking a question. */
export async function removeAiPrompt(id: string): Promise<void> {
  const { error } = await supabase.rpc("remove_ai_prompt", { p_id: id });
  if (error) throw new AiPromptError(error.message, null);
}

export class AiPromptError extends Error {
  constructor(
    public code: string,
    public detail: string | null,
  ) {
    super(code);
  }
}

/** The owner's words for each refusal of save_ai_prompt. */
export function aiPromptMessage(e: unknown): string {
  const code = e instanceof AiPromptError ? e.code : "";
  if (code.includes("bad_prompt"))
    return "Write it the way a customer would ask, in 8 to 120 characters, with no links, emails or phone numbers.";
  if (code.includes("prompt_limit")) {
    const n = e instanceof AiPromptError && e.detail && /^\d+$/.test(e.detail) ? e.detail : null;
    return n
      ? `Your plan asks up to ${n} questions. Remove one to add another.`
      : "Your plan's questions are all in use. Remove one to add another.";
  }
  if (code.includes("duplicate")) return "Kabsi already asks this one.";
  if (code.includes("after_first_task"))
    return "These open after your first task is done. One thing at a time.";
  return "That did not save. Try again in a minute.";
}
