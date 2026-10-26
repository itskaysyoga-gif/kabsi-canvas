// AI Visibility runs (master plan 27.3 item 2, 27.10, 28.6 Scout). The work is queued jobs (`ai_visibility_run`, one
// per prompt and provider) under a monthly cap in app_settings with a staff alert at 80 percent, mock mode by default,
// and retries by the jobs queue. Every database and provider call is passed in, so the tests run on fakes.
// Scout never writes to Google. Gemini rows follow Google's Additional Terms (no answer text, deleted after 90 days).
import { type Analysis, analyze, type KnownCompetitor } from "./analyze.ts";
import { type Cadence, nextRunAfter } from "./prompts.ts";
import { type AiProvider, AiProviderError, type AiProviderName, ESTIMATE_MICROS, PROVIDERS, type RawAnswer } from "./providers.ts";

export type PromptRow = { id: string; location_id: string; text: string; cadence: Cadence };
export type RunRow = {
  id: string; provider: AiProviderName; state: string; prompt: string; location_id: string; business: string; demo: boolean;
  country: string | null; city: string | null; lat: number | null; lng: number | null; known: KnownCompetitor[];
};
export type RunResult = Analysis & { model: string; source: "mock" | "live"; costMicros: number; sourceCount: number; answer: string | null };

export interface AiRunDb {
  duePrompts(limit: number): Promise<PromptRow[]>;
  /** One queued run per provider for this prompt; returns the new run ids. */
  createRuns(p: PromptRow, providers: AiProviderName[]): Promise<{ id: string; provider: AiProviderName }[]>;
  bumpPrompt(id: string, next: Date): Promise<void>;
  run(id: string): Promise<RunRow | null>;
  saveRun(id: string, r: RunResult): Promise<void>;
  failRun(id: string, error: string): Promise<void>;
}
export type AiDeps = {
  db: AiRunDb;
  provider: (mode: "mock" | "live", name: AiProviderName, business: string) => AiProvider;
  mode: () => Promise<"mock" | "live">;
  /** Is this provider switched on (Gemini stays off until lane R decides, see the skill)? */
  enabled: (name: AiProviderName) => Promise<boolean>;
  room: (micros: number) => Promise<boolean>;
  /** Record spend; resolves true when the month just passed 80 percent of the cap. */
  spend: (calls: number, micros: number) => Promise<boolean>;
  staffAlert: (summary: string, key: string) => Promise<void>;
  enqueue: (runId: string, locationId: string) => Promise<void>;
  now: () => Date;
};

/** The monthly cap is reached: the job waits (not counted as a try) until `until`. */
export class AiCapped extends Error {
  constructor(readonly until: Date) {
    super("ai_visibility_cap_reached");
  }
}
/** Another try cannot help. */
export class AiPermanent extends Error {}

const month = (d: Date) => d.toISOString().slice(0, 7);
const tomorrow = (d: Date) => new Date(d.getTime() + 86_400_000);

/** The cron tick: every due prompt gets one queued run per enabled provider and one job each. */
export async function tickAi(d: AiDeps, limit = 20): Promise<{ prompts: number; runs: number }> {
  const out = { prompts: 0, runs: 0 };
  const providers: AiProviderName[] = [];
  for (const p of PROVIDERS) if (await d.enabled(p)) providers.push(p);
  for (const p of await d.db.duePrompts(limit)) {
    // Bump first: a crash after this never runs a prompt twice in a period.
    await d.db.bumpPrompt(p.id, nextRunAfter(d.now(), p.cadence));
    if (!providers.length) continue;
    const runs = await d.db.createRuns(p, providers);
    for (const r of runs) await d.enqueue(r.id, p.location_id);
    out.prompts++;
    out.runs += runs.length;
  }
  return out;
}

/** One queued run, as a job: ask the provider, analyse the answer, record it and the cost. Throws to be retried. */
export async function runOne(d: AiDeps, runId: string, o: { lastTry?: boolean } = {}): Promise<"done" | "skipped"> {
  const run = await d.db.run(runId);
  if (!run || run.state !== "queued") return "skipped";
  const mode = run.demo ? "mock" : await d.mode(); // R-17: the demo business is always on the mock
  if (!(await d.enabled(run.provider)) && mode === "live") {
    await d.db.failRun(runId, "provider_off");
    throw new AiPermanent("provider_off");
  }
  const estimate = mode === "live" ? ESTIMATE_MICROS[run.provider] : 0;
  if (estimate && !(await d.room(estimate))) {
    await d.staffAlert("AI Visibility monthly cap reached, answers paused", `ai_cap:${month(d.now())}`);
    throw new AiCapped(tomorrow(d.now()));
  }
  let raw: RawAnswer;
  try {
    raw = await d.provider(mode, run.provider, run.business).ask(run.prompt, { country: run.country, city: run.city, lat: run.lat, lng: run.lng });
  } catch (e) {
    const retry = !(e instanceof AiProviderError) || e.retry;
    const message = String((e as Error)?.message ?? e).slice(0, 300);
    if (!retry || o.lastTry) await d.db.failRun(runId, message);
    if (!retry) throw new AiPermanent(message);
    throw e;
  }
  if (mode === "live" && (await d.spend(1, raw.costMicros))) {
    await d.staffAlert("AI Visibility spend passed 80 percent of this month's cap", `ai_cap80:${month(d.now())}`);
  }
  const a = analyze({ text: raw.text, sources: raw.sources, business: run.business, known: run.known });
  await d.db.saveRun(runId, {
    ...a, model: raw.model, source: mode, costMicros: raw.costMicros, sourceCount: raw.sourceCount,
    // Gemini's Maps result is never kept (Additional Terms); the facts above are.
    answer: run.provider === "gemini" ? null : raw.text,
  });
  return "done";
}

// ─── the free scan's one AI check (28.1), built here, switched on by V4 ──────────────────────────────────────────────
export type FreeCheck = { provider: "chatgpt"; named: boolean; competitors: string[]; sources: { domain: string; title: string }[]; label: string };

/**
 * One ChatGPT answer for "best [trade] in [area]" for a visitor's business: named or not, up to three competitors. Nothing is
 * stored here (the scan row is V4's). Off unless `ai_visibility_free_scan` is on; counts against the same monthly cap.
 */
export async function freeScanCheck(
  d: Pick<AiDeps, "provider" | "mode" | "room" | "spend" | "staffAlert" | "now"> & { on: () => Promise<boolean> },
  o: { business: string; prompt: string; country: string | null; city: string | null },
): Promise<FreeCheck | null> {
  if (!(await d.on())) return null;
  const mode = await d.mode();
  if (mode === "live") {
    if (!(await d.room(ESTIMATE_MICROS.chatgpt))) {
      await d.staffAlert("AI Visibility monthly cap reached, answers paused", `ai_cap:${month(d.now())}`);
      return null;
    }
  }
  const raw = await d.provider(mode, "chatgpt", o.business).ask(o.prompt, { country: o.country, city: o.city });
  if (mode === "live" && (await d.spend(1, raw.costMicros))) {
    await d.staffAlert("AI Visibility spend passed 80 percent of this month's cap", `ai_cap80:${month(d.now())}`);
  }
  const a = analyze({ text: raw.text, sources: raw.sources, business: o.business });
  return { provider: "chatgpt", named: a.named, competitors: a.competitors.slice(0, 3).map((c) => c.name), sources: a.sources.slice(0, 3), label: "One sample. AI answers change from run to run." };
}
