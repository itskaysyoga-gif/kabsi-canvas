// AI Visibility, the database and provider side (V2). Used by the `visibility` function (cron tick, prompts, summary) and
// by the `api` function's job handler (`ai_visibility_run`). The logic is in run.ts, analyze.ts and numbers.ts; this
// file only reads and writes tables, picks the provider and sends through the existing interfaces: the staff alert is an
// ops_events row (13b part 2's staff alerts) and the owner's line goes through the whatsapp outbox, never its internals.
import { admin } from "../../kabsi.ts";
import { outDb } from "../../whatsapp/db.ts";
import { type AiDeps, type AiRunDb, type PromptRow, type RunRow } from "./run.ts";
import { dataForSeoAi, geminiAi, type AiProvider, type AiProviderName, PROVIDERS } from "./providers.ts";
import { mockAi } from "./mock.ts";
import { areaOf, cadenceOf, suggestPrompts } from "./prompts.ts";
import { type DoneRun, numbers, ownerLine, type PeriodWords } from "./numbers.ts";
import type { CompetitorNamed } from "./analyze.ts";

const db = () => admin();
const must = <T>(r: { data: T; error: unknown }) => {
  if (r.error) throw r.error;
  return r.data;
};
export async function setting(key: string): Promise<string | null> {
  const { data } = await db().from("app_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as string | undefined) ?? null;
}

export function realProvider(mode: "mock" | "live", name: AiProviderName, business: string): AiProvider {
  if (mode === "mock") return mockAi(name, business);
  if (name === "gemini") {
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) throw new Error("gemini_not_configured");
    return geminiAi(key);
  }
  const login = Deno.env.get("DATAFORSEO_LOGIN"), password = Deno.env.get("DATAFORSEO_PASSWORD");
  if (!login || !password) throw new Error("dataforseo_not_configured");
  return dataForSeoAi(name, login, password);
}

/** A staff alert is one ops_events row; the WhatsApp tick sends it to the staff phone (urgent kinds, staff-alerts.ts). */
async function staffAlert(summary: string, key: string) {
  const kind = key.startsWith("ai_cap80") ? "ai_visibility_80" : "ai_visibility_cap";
  await db().rpc("ops_emit", { p_kind: kind, p_channel: "alerts", p_title: summary, p_body: null, p_dedupe: key });
}

const DAY = 86_400_000;

export const aiRunDb: AiRunDb = {
  async duePrompts(limit) {
    return must(await db().from("ai_visibility_prompts").select("id, location_id, text, cadence").eq("active", true)
      .not("confirmed_at", "is", null).lte("next_run_at", new Date().toISOString()).order("next_run_at").limit(limit)) as PromptRow[];
  },
  async createRuns(p, providers) {
    return must(await db().from("ai_visibility_runs").insert(providers.map((provider) => ({ location_id: p.location_id, prompt_id: p.id, provider })))
      .select("id, provider")) as { id: string; provider: AiProviderName }[];
  },
  async bumpPrompt(id, next) {
    must(await db().from("ai_visibility_prompts").update({ next_run_at: next.toISOString() }).eq("id", id));
  },
  async run(id) {
    const { data: r } = await db().from("ai_visibility_runs").select("id, provider, state, location_id, ai_visibility_prompts(text)").eq("id", id).maybeSingle();
    if (!r) return null;
    const one = <T>(v: unknown) => (Array.isArray(v) ? v[0] : v) as T | null;
    const { data: loc } = await db().from("locations").select("name, country, address, area, is_demo, google_location_id").eq("id", r.location_id).maybeSingle();
    if (!loc) return null;
    const { data: kw } = await db().from("visibility_keywords").select("center_lat, center_lng").eq("location_id", r.location_id).order("created_at").limit(1).maybeSingle();
    const picks = must(await db().from("competitor_picks").select("key, name").eq("location_id", r.location_id)) as { key: string; name: string }[];
    const { data: scan } = await db().from("visibility_scans").select("competitors").eq("location_id", r.location_id).eq("state", "done")
      .order("done_at", { ascending: false }).limit(1).maybeSingle();
    const seen = ((scan?.competitors ?? []) as { key: string; name: string }[]).map((c) => ({ key: c.key, name: c.name }));
    const known = [...picks, ...seen].filter((c, i, a) => a.findIndex((x) => x.key === c.key) === i);
    return {
      id: r.id as string, provider: r.provider as AiProviderName, state: r.state as string, location_id: r.location_id as string,
      prompt: one<{ text: string }>(r.ai_visibility_prompts)?.text ?? "", business: loc.name as string,
      demo: !!loc.is_demo || String(loc.google_location_id ?? "").startsWith("locations/demo-"),
      country: (loc.country as string | null) ?? null, city: areaOf(loc.area as string | null, loc.address as string | null),
      lat: kw?.center_lat ?? null, lng: kw?.center_lng ?? null, known,
    } satisfies RunRow;
  },
  async saveRun(id, r) {
    const now = new Date();
    const { data: run } = await db().from("ai_visibility_runs").select("location_id, provider").eq("id", id).single();
    must(await db().from("ai_visibility_runs").update({
      state: "done", run_at: now.toISOString(), model: r.model, source: r.source, named: r.named, position: r.position,
      competitors: r.competitors, sources: r.sources, source_count: r.sourceCount, cost_micros: r.costMicros, error: null,
      expires_at: run?.provider === "gemini" ? new Date(now.getTime() + 90 * DAY).toISOString() : null,
    }).eq("id", id));
    if (r.answer) must(await db().from("ai_visibility_answers").upsert({ run_id: id, location_id: run!.location_id, answer: r.answer }));
  },
  async failRun(id, error) {
    must(await db().from("ai_visibility_runs").update({ state: "failed", error: error.slice(0, 300) }).eq("id", id));
  },
};

export const aiDeps: AiDeps = {
  db: aiRunDb,
  provider: realProvider,
  mode: async () => ((await setting("ai_visibility_mode")) === "live" ? "live" : "mock"),
  // Gemini stays off until lane R decides (Google's Additional Terms); ChatGPT and Perplexity follow the mode.
  enabled: async (p) => p !== "gemini" || (await setting("ai_visibility_gemini")) === "on",
  room: async (micros) => {
    const { data, error } = await db().rpc("provider_spend_room", { p_provider: "ai_visibility", p_micros: micros });
    return !error && data === true;
  },
  spend: async (calls, micros) => {
    const { data } = await db().rpc("provider_spend_add", { p_provider: "ai_visibility", p_calls: calls, p_micros: micros });
    return data === true;
  },
  staffAlert,
  enqueue: async (runId, locationId) => {
    must(await db().rpc("enqueue_job", { p_kind: "ai_visibility_run", p_location: locationId, p_dedupe_key: `ai_visibility_run:${runId}`, p_payload: { run_id: runId } }));
  },
  now: () => new Date(),
};

export const enabledProviders = async () => {
  const out: AiProviderName[] = [];
  for (const p of PROVIDERS) if (await aiDeps.enabled(p)) out.push(p);
  return out;
};

// ─── prompts for a business: suggested from its category, area and confirmed search ──────────────────────────────────
type Ent = { state?: string; limits?: { ai_prompts?: number; ai_every?: string } | null; watch?: boolean };

/**
 * Make sure the business has its plan's prompts. Called when the owner confirms a search (13b part 2's keyword confirm is
 * the owner's yes to the prompts built from it). Returns the prompts now active. Without a known area nothing is made.
 */
export async function syncPrompts(locationId: string, keyword: string | null): Promise<string[]> {
  const { data } = await db().rpc("entitlements", { p_org: null, p_location: locationId });
  const ent = (data ?? {}) as Ent;
  const max = ent.limits?.ai_prompts ?? (ent.state === "demo" ? 3 : 0);
  const cadence = cadenceOf(ent.limits?.ai_every ?? "month");
  if (!max) return [];
  const { data: loc } = await db().from("locations").select("category, category_label, area, address").eq("id", locationId).maybeSingle();
  const existing = must(await db().from("ai_visibility_prompts").select("id, text").eq("location_id", locationId).eq("active", true)) as { id: string; text: string }[];
  const wanted = suggestPrompts({ category: (loc?.category_label ?? loc?.category) as string | null, keyword, area: areaOf(loc?.area as string | null, loc?.address as string | null) }, max);
  const have = new Set(existing.map((p) => p.text.toLowerCase()));
  const add = wanted.filter((t) => !have.has(t)).slice(0, Math.max(0, max - existing.length));
  for (const text of add) {
    // The unique index is on lower(text): a duplicate (23505) means the prompt is already there.
    const { error } = await db().from("ai_visibility_prompts").insert({ location_id: locationId, text, kind: "suggested", cadence, confirmed_at: new Date().toISOString() });
    if (error && error.code !== "23505") throw error;
  }
  return [...existing.map((p) => p.text), ...add];
}

// ─── the numbers, and the owner's line on WhatsApp ───────────────────────────────────────────────────────────────────
export async function doneRuns(locationId: string, since: Date, liveOnly = false): Promise<DoneRun[]> {
  let q = db().from("ai_visibility_runs").select("provider, run_at, named, position, competitors, sources").eq("location_id", locationId)
    .eq("state", "done").gte("run_at", since.toISOString());
  if (liveOnly) q = q.eq("source", "live");
  return (must(await q) as (Omit<DoneRun, "named" | "competitors"> & { named: boolean | null; competitors: CompetitorNamed[] | null })[]).map((r) => ({ ...r, named: !!r.named, competitors: r.competitors ?? [] })) as DoneRun[];
}

/**
 * After the last queued run of a cycle finished, tell the owners and managers on WhatsApp, once per period. Only real
 * answers are ever sent: a mock run never reaches an owner. Goes through the outbox, which applies the sending rules.
 */
export async function sendOwnerLine(locationId: string, now = new Date()): Promise<number> {
  const { count } = await db().from("ai_visibility_runs").select("id", { count: "exact", head: true }).eq("location_id", locationId).eq("state", "queued");
  if ((count ?? 0) > 0) return 0;
  const { data: p } = await db().from("ai_visibility_prompts").select("cadence").eq("location_id", locationId).eq("active", true).limit(1).maybeSingle();
  const biweekly = p?.cadence === "biweekly";
  const days = biweekly ? 14 : 30;
  const when: PeriodWords = biweekly ? "in the last 2 weeks" : "this month";
  const runs = await doneRuns(locationId, new Date(now.getTime() - days * DAY), true);
  const line = ownerLine(numbers(runs, { from: new Date(now.getTime() - days * DAY), to: new Date(now.getTime() + 1000) }), when);
  if (!line) return 0;
  const bucket = biweekly ? `${now.toISOString().slice(0, 7)}-${now.getUTCDate() <= 14 ? 1 : 2}` : now.toISOString().slice(0, 7);
  const { data: to } = await db().from("location_members").select("user_id").eq("location_id", locationId).in("role", ["owner", "manager"]);
  let sent = 0;
  for (const m of (to ?? []) as { user_id: string }[]) {
    const { data: o } = await db().from("whatsapp_optins").select("phone").eq("user_id", m.user_id).eq("state", "active").maybeSingle();
    if (!o?.phone) continue;
    const id = await outDb.add({ phone: o.phone as string, userId: m.user_id, locationId, kind: "ai_visibility", body: line, urgent: false, dedupe: `ai_line:${locationId}:${bucket}:${m.user_id}` });
    if (id) sent++;
  }
  return sent;
}
