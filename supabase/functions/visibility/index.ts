// visibility: the Visibility Map, Competitor Watch and the category check (V1, master plan 27.3 items 1, 3 and 4).
//   POST /visibility/tick     x-cron-secret (pg_cron every 5 minutes when work is due): start due grids, collect results.
//   POST /visibility/keyword  the signed-in owner or manager, or staff: track a search (the owner's yes; 27.4 limits).
//   POST /visibility/picks    the signed-in owner or manager: the competitors to watch (3 on Essentials, 5 on Pro).
//   POST /visibility/ai-tick  x-cron-secret (pg_cron every 15 minutes when a prompt is due): queue one AI Visibility job per prompt and provider (V2).
//   GET  /visibility/ai-summary  the signed-in member or staff: the period's AI numbers, the owner's line and Insights' source actions (V2).
//   POST /visibility/ai-calibrate  x-cron-secret: one live answer per provider for named businesses, saved to app_settings for the calibration check (30.9 item 3).
//   GET  /visibility/image    the signed-in member, staff or x-cron-secret: one finished grid as the nearby places image (PNG),
//                             or its 7 by 7 dots with view=dots; with check=CODE (x-cron-secret) a free check's nearby places.
//   POST /visibility/check    public (Turnstile, rate limits, daily cap): the free check (V4, 28.1). GET ?code= its result.
//   GET  /visibility/terms    public: the search an industry page prefills (?industry=&market=). POST: staff op, DataForSEO keyword data.
// Ranks and competitors come only from DataForSEO public results (30.10.2); mock mode unless app_settings
// dataforseo_mode is 'live', and the demo business always on the mock (R-17). The logic is in _shared/visibility/.
import { admin, captureError, CORS, currentUser, isInternal, json, log, rateLimit, sha256Hex, verifyTurnstile } from "../_shared/kabsi.ts";
import { outDb } from "../_shared/whatsapp/db.ts";
import { ref } from "../_shared/whatsapp/templates.ts";
import { COST_MICROS, dataForSeo, type Identity, type MapsItem, type MapsProvider } from "../_shared/visibility/dataforseo.ts";
import { mockProvider } from "../_shared/visibility/mock.ts";
import { locate } from "../_shared/visibility/locate.ts";
import { radiusFor } from "../_shared/visibility/grid.ts";
import { mapDate, renderMap } from "../_shared/visibility/map-image.ts";
import { baseMap, placeNamer } from "../_shared/visibility/geoapify.ts";
import { renderNearby } from "../_shared/visibility/nearby-image.ts";
import type { Nearby } from "../_shared/visibility/nearby.ts";
import { type CheckRow, cleanTerm, collectCheck, newCode, publicView, startCheck } from "../_shared/visibility/free-check.ts";
import { freeScanCheck } from "../_shared/visibility/ai/run.ts";
import { MARKETS, pickTerms, searchVolumes } from "../_shared/visibility/terms.ts";
import { aiDeps, doneRuns, enabledProviders, realProvider, setting as aiSetting, syncPrompts } from "../_shared/visibility/ai/deps.ts";
import { tickAi } from "../_shared/visibility/ai/run.ts";
import { analyze } from "../_shared/visibility/ai/analyze.ts";
import { numbers, reportBlock } from "../_shared/visibility/ai/numbers.ts";
import { PROVIDERS, type AiProviderName } from "../_shared/visibility/ai/providers.ts";
import { sourceActions } from "../_shared/insights/ai-visibility.ts";
import { type KeywordRow, type RunDb, type RunDeps, type ScanRow, tick } from "../_shared/visibility/run.ts";

const db = () => admin();
const fn = "visibility";

async function setting(key: string): Promise<string | null> {
  const { data } = await db().from("app_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as string | undefined) ?? null;
}

function provider(mode: "mock" | "live", self: Identity & { title: string }): MapsProvider {
  if (mode === "mock") return mockProvider(self);
  const login = Deno.env.get("DATAFORSEO_LOGIN"), password = Deno.env.get("DATAFORSEO_PASSWORD");
  if (!login || !password) throw new Error("dataforseo_not_configured");
  return dataForSeo(login, password);
}

async function staffAlert(summary: string, key: string) {
  const { data } = await db().from("phone_roles").select("phone").eq("role", "staff_admin").is("revoked_at", null);
  for (const r of (data ?? []) as { phone: string }[]) {
    await outDb.add({ phone: r.phone, userId: null, locationId: null, kind: "staff_alert", urgent: true, body: `${summary}.`,
      template: ref("staff_alert", { summary }), dedupe: `visibility_staff:${key}:${r.phone}` });
  }
}

const must = <T>(r: { data: T; error: unknown }) => {
  if (r.error) throw r.error;
  return r.data;
};

const runDb: RunDb = {
  async dueKeywords(limit) {
    return must(await db().from("visibility_keywords").select("*").eq("active", true).not("confirmed_at", "is", null)
      .lte("next_run_at", new Date().toISOString()).order("next_run_at").limit(limit)) as KeywordRow[];
  },
  async hasScan(locationId) {
    const { count } = await db().from("visibility_scans").select("id", { count: "exact", head: true }).eq("location_id", locationId).eq("state", "done");
    return (count ?? 0) > 0;
  },
  async business(locationId) {
    const { data } = await db().from("locations").select("name, is_demo, google_location_id").eq("id", locationId).maybeSingle();
    if (!data) return null;
    return { name: data.name as string, demo: !!data.is_demo || String(data.google_location_id ?? "").startsWith("locations/demo-") };
  },
  async createScan(k, o, points) {
    const scan = must(await db().from("visibility_scans").insert({
      location_id: k.location_id, keyword_id: k.id, keyword: k.keyword, radius_km: k.radius_km, center_lat: k.center_lat,
      center_lng: k.center_lng, zoom: o.zoom, source: o.source, first: o.first, cost_micros: o.costMicros,
    }).select("id").single()) as { id: string };
    must(await db().from("visibility_points").insert(points.map((p) => ({ scan_id: scan.id, ...p }))));
    return scan.id;
  },
  async setTasks(scanId, tasks) {
    for (const [tag, id] of Object.entries(tasks)) {
      const [, row, col] = tag.split(":");
      must(await db().from("visibility_points").update({ task_id: id }).eq("scan_id", scanId).eq("row", Number(row)).eq("col", Number(col)));
    }
  },
  async failScan(scanId, error) {
    must(await db().from("visibility_scans").update({ state: "failed", error, done_at: new Date().toISOString() }).eq("id", scanId));
  },
  async bumpKeyword(id, next) {
    must(await db().from("visibility_keywords").update({ next_run_at: next.toISOString() }).eq("id", id));
  },
  async queuedScans(limit) {
    const rows = must(await db().from("visibility_scans")
      .select("id, location_id, keyword, source, first, created_at, radius_km, locations(name, time_zone), visibility_keywords(self_title, self_cid, self_place_id)")
      .eq("state", "queued").order("created_at").limit(limit)) as Record<string, unknown>[];
    return rows.map((r) => {
      const one = <T>(v: unknown) => (Array.isArray(v) ? v[0] : v) as T | null;
      const k = one<{ self_title: string; self_cid: string | null; self_place_id: string | null }>(r.visibility_keywords);
      const l = one<{ name: string; time_zone: string | null }>(r.locations);
      return {
        id: r.id as string, location_id: r.location_id as string, keyword: r.keyword as string, source: r.source as "mock" | "live",
        first: !!r.first, created_at: r.created_at as string, business: l?.name ?? "",
        radius_km: Number(r.radius_km ?? 3), time_zone: l?.time_zone ?? "UTC",
        self: { title: k?.self_title ?? l?.name ?? "", cid: k?.self_cid ?? null, place_id: k?.self_place_id ?? null },
      } satisfies ScanRow;
    });
  },
  async points(scanId) {
    const rows = must(await db().from("visibility_points").select("row, col, lat, lng, task_id, rank, items, done_at").eq("scan_id", scanId)) as
      { row: number; col: number; lat: number; lng: number; task_id: string | null; rank: number | null; items: MapsItem[] | null; done_at: string | null }[];
    return rows.map((r) => ({ ...r, done: !!r.done_at }));
  },
  async savePoint(scanId, row, col, rank, items) {
    must(await db().from("visibility_points").update({ rank, items, done_at: new Date().toISOString() }).eq("scan_id", scanId).eq("row", row).eq("col", col));
  },
  async picks(locationId) {
    const rows = must(await db().from("competitor_picks").select("key").eq("location_id", locationId)) as { key: string }[];
    return rows.map((r) => r.key);
  },
  async finishScan(scanId, data, snapshots) {
    const scan = must(await db().from("visibility_scans").update({ ...data, state: "done", done_at: new Date().toISOString() })
      .eq("id", scanId).select("location_id").single()) as { location_id: string };
    const today = new Date().toISOString().slice(0, 10);
    if (snapshots.length) {
      must(await db().from("competitor_snapshots").upsert(snapshots.map((s) => ({ location_id: scan.location_id, taken_on: today, ...s }))));
    }
    // V4 (27.3 item 4, LATER): the category check as a proposal the owner answers; never a change Kabsi makes itself.
    const { error } = await db().rpc("category_task_from_scan", { p_scan: scanId });
    if (error) await captureError(fn, error, { step: "category_task" });
  },
};

const deps: RunDeps = {
  db: runDb,
  provider,
  mode: async () => ((await setting("dataforseo_mode")) === "live" ? "live" : "mock"),
  room: async (micros) => {
    const { data, error } = await db().rpc("provider_spend_room", { p_provider: "dataforseo", p_micros: micros });
    return !error && data === true;
  },
  spend: async (calls, micros) => {
    const { data } = await db().rpc("provider_spend_add", { p_provider: "dataforseo", p_calls: calls, p_micros: micros });
    return data === true;
  },
  staffAlert,
  now: () => new Date(),
  placeName: placeNamer(Deno.env.get("GEOAPIFY_API_KEY")),
};

// ─── who may ask ──────────────────────────────────────────────────────────────────────────────────────────────────
type Caller = { kind: "internal" } | { kind: "staff"; id: string } | { kind: "member"; id: string; role: string } | null;
async function caller(req: Request, locationId: string | null): Promise<Caller> {
  if (await isInternal(req)) return { kind: "internal" };
  const user = await currentUser(req);
  if (!user) return null;
  const { data: staff } = await db().from("staff").select("user_id").eq("user_id", user.id).maybeSingle();
  if (staff) return { kind: "staff", id: user.id };
  if (!locationId) return null;
  const { data } = await db().from("location_members").select("role").eq("location_id", locationId).eq("user_id", user.id).maybeSingle();
  return data ? { kind: "member", id: user.id, role: data.role as string } : null;
}

type Limits = { map_keywords?: number; map_every?: string; competitors?: number } | null;
/** V4 (30.16 section 3): a business still before its first completed task. Before Google access works it may confirm its one
 *  search (the map runs when access works); competitors, extra searches and AI questions wait for the first task. */
async function onboarding(locationId: string): Promise<{ locked: boolean; beforeAccess: boolean }> {
  const { data } = await db().from("locations").select("first_task_done_at, access_granted_at, is_demo").eq("id", locationId).maybeSingle();
  if (!data || data.is_demo) return { locked: false, beforeAccess: false };
  return { locked: !data.first_task_done_at, beforeAccess: !data.access_granted_at };
}

async function limits(locationId: string): Promise<{ limits: Limits; demo: boolean; watch: boolean }> {
  const { data } = await db().rpc("entitlements", { p_org: null, p_location: locationId });
  const e = (data ?? {}) as { state?: string; limits?: Limits; watch?: boolean };
  // The demo business shows the Essentials map (one search, monthly) whatever its plan.
  if (e.state === "demo") return { limits: e.limits ?? { map_keywords: 1, map_every: "month", competitors: 3 }, demo: true, watch: true };
  return { limits: e.limits ?? null, demo: false, watch: !!e.watch };
}

async function addKeyword(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({})) as { location_id?: string; keyword?: string };
  const keyword = String(body.keyword ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  const locationId = String(body.location_id ?? "");
  if (!locationId || keyword.length < 2 || keyword.length > 80) return json({ error: "bad_request" }, 400);
  const who = await caller(req, locationId);
  if (!who) return json({ error: "forbidden" }, 403);
  if (who.kind !== "internal" && !(await rateLimit(`visibility_kw:${locationId}`, 10, 3600, { failClosed: true }))) return json({ error: "rate_limited" }, 429);
  let ent = await limits(locationId);
  const ob = await onboarding(locationId);
  // Stage 3: the owner confirms the search during setup, before the trial; it waits for access (next_run_at far ahead).
  const waiting = ob.beforeAccess && (!ent.watch || !ent.limits?.map_keywords);
  if (waiting) ent = { ...ent, watch: true, limits: { map_keywords: 1, map_every: "month", competitors: 0 } };
  if (!ent.watch || !ent.limits?.map_keywords) return json({ error: "no_plan" }, 402);
  const existing = must(await db().from("visibility_keywords").select("id, keyword, center_lat, center_lng, radius_km, self_title, self_cid, self_place_id")
    .eq("location_id", locationId).eq("active", true)) as { id: string; keyword: string; center_lat: number; center_lng: number; radius_km: number; self_title: string; self_cid: string | null; self_place_id: string | null }[];
  const same = existing.find((k) => k.keyword === keyword);
  if (!same && existing.length >= ent.limits.map_keywords) return json({ error: "keyword_limit", limit: ent.limits.map_keywords }, 409);
  if (!same && existing.length >= 1 && ob.locked) return json({ error: "after_first_task" }, 409);
  const cadence = ent.limits.map_every === "week" ? "weekly" : "monthly";
  let place = existing[0] ?? null;
  if (!place) {
    const { data: loc } = await db().from("locations").select("name, address, country, place_id").eq("id", locationId).single();
    const mode = ent.demo ? "mock" : ((await setting("dataforseo_mode")) === "live" ? "live" : "mock");
    if (mode === "live") {
      if (!(await deps.room(COST_MICROS.live))) return json({ error: "paused" }, 503);
      await deps.spend(1, COST_MICROS.live);
    }
    const found = await locate(provider(mode, { title: loc!.name }), loc as { name: string; address: string | null; country: string | null; place_id: string | null });
    if (!found) return json({ error: "not_found_on_maps" }, 404);
    place = {
      id: "", keyword, center_lat: found.lat, center_lng: found.lng, radius_km: radiusFor(found.category),
      self_title: found.title, self_cid: found.cid, self_place_id: found.place_id,
    };
  }
  const row = {
    location_id: locationId, keyword, radius_km: place.radius_km, center_lat: place.center_lat, center_lng: place.center_lng,
    self_title: place.self_title, self_cid: place.self_cid, self_place_id: place.self_place_id, cadence,
    confirmed_at: new Date().toISOString(), next_run_at: waiting ? "9999-12-31T00:00:00Z" : new Date().toISOString(), active: true,
  };
  const saved = same
    ? must(await db().from("visibility_keywords").update({ cadence, confirmed_at: row.confirmed_at }).eq("id", same.id).select("id, keyword, cadence, radius_km").single())
    : must(await db().from("visibility_keywords").insert(row).select("id, keyword, cadence, radius_km").single());
  log(fn, { action: "keyword", location_id: locationId, by: who.kind });
  // V2: the owner's yes to this search is also the yes to the AI Visibility prompts built from it. A failure here never
  // undoes the search the owner just confirmed.
  let prompts: string[] = [];
  try {
    // AI questions come after the first completed task (the onboarding tick makes them then).
    if (!ob.locked) prompts = await syncPrompts(locationId, keyword);
  } catch (e) {
    await captureError(fn, e, { step: "ai_prompts" });
  }
  return json({ ok: true, keyword: saved, ai_prompts: prompts, waiting_for_access: waiting });
}

async function setPicks(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({})) as { location_id?: string; keys?: string[] };
  const locationId = String(body.location_id ?? "");
  const keys = Array.isArray(body.keys) ? [...new Set(body.keys.map(String))] : [];
  if (!locationId) return json({ error: "bad_request" }, 400);
  const who = await caller(req, locationId);
  if (!who) return json({ error: "forbidden" }, 403);
  if ((await onboarding(locationId)).locked) return json({ error: "after_first_task" }, 409);
  const ent = await limits(locationId);
  const max = ent.limits?.competitors ?? 0;
  if (!ent.watch || keys.length > max) return json({ error: "competitor_limit", limit: max }, 409);
  // Only businesses Kabsi saw in this business's own latest grid can be picked.
  const { data: scan } = await db().from("visibility_scans").select("competitors").eq("location_id", locationId).eq("state", "done")
    .order("done_at", { ascending: false }).limit(1).maybeSingle();
  const offered = new Map(((scan?.competitors ?? []) as { key: string; name: string; cid: string | null; place_id: string | null }[]).map((c) => [c.key, c]));
  if (keys.some((k) => !offered.has(k))) return json({ error: "not_offered" }, 400);
  must(await db().from("competitor_picks").delete().eq("location_id", locationId));
  if (keys.length) {
    must(await db().from("competitor_picks").insert(keys.map((k) => {
      const c = offered.get(k)!;
      return { location_id: locationId, key: k, name: c.name, cid: c.cid, place_id: c.place_id };
    })));
  }
  return json({ ok: true, picked: keys.length });
}

const png = (bytes: Uint8Array<ArrayBuffer>) => new Response(bytes, { headers: { ...CORS, "content-type": "image/png", "cache-control": "private, max-age=3600" } });

async function image(req: Request, url: URL): Promise<Response> {
  const code = url.searchParams.get("check");
  if (code) {
    // A free check's nearby places, for WhatsApp only (the page draws its own cards from GET /check).
    if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
    const c = await loadCheck(code);
    if (!c) return json({ error: "not_found" }, 404);
    if (c.state !== "done" || !c.nearby) return json({ error: "not_ready" }, 409);
    return png(await renderNearby(c.nearby, { business: c.business, date: mapDate(new Date(c.created_at), "UTC") }));
  }
  const scanId = url.searchParams.get("scan") ?? "";
  const { data: scan } = await db().from("visibility_scans")
    .select("id, location_id, keyword, center_lat, center_lng, zoom, state, done_at, nearby, locations(name, time_zone)").eq("id", scanId).maybeSingle();
  if (!scan) return json({ error: "not_found" }, 404);
  if (!(await caller(req, scan.location_id as string))) return json({ error: "forbidden" }, 403);
  if (scan.state !== "done") return json({ error: "not_ready" }, 409);
  // 30.15 section 2: the nearby places first; the dots behind "Detailed results" (view=dots), and for maps made before V4.
  if (scan.nearby && url.searchParams.get("view") !== "dots") {
    const l = (Array.isArray(scan.locations) ? scan.locations[0] : scan.locations) as { name: string; time_zone: string } | null;
    return png(await renderNearby(scan.nearby as Nearby, { business: l?.name ?? "", date: mapDate(new Date(scan.done_at as string), l?.time_zone ?? "UTC") }));
  }
  const pts = must(await db().from("visibility_points").select("row, col, lat, lng, rank").eq("scan_id", scanId)) as
    { row: number; col: number; lat: number; lng: number; rank: number | null }[];
  const loc = (Array.isArray(scan.locations) ? scan.locations[0] : scan.locations) as { name: string; time_zone: string } | null;
  const center = { lat: Number(scan.center_lat), lng: Number(scan.center_lng) };
  const zoom = Number(scan.zoom);
  const map = await renderMap({
    keyword: scan.keyword as string, business: loc?.name ?? "", date: mapDate(new Date(scan.done_at as string), loc?.time_zone ?? "UTC"),
    center, zoom, points: pts, base: await baseMap(Deno.env.get("GEOAPIFY_API_KEY"), center, zoom),
  });
  return png(map);
}

// ─── AI Visibility (V2) ─────────────────────────────────────────────────────────────────────────────────────────────
async function aiSummary(req: Request, url: URL): Promise<Response> {
  const locationId = url.searchParams.get("location_id") ?? "";
  const days = Math.min(90, Math.max(7, Number(url.searchParams.get("days") ?? 30) || 30));
  if (!locationId || !(await caller(req, locationId))) return json({ error: "forbidden" }, 403);
  const to = new Date(), from = new Date(to.getTime() - days * 86_400_000);
  const runs = await doneRuns(locationId, new Date(from.getTime() - days * 86_400_000));
  const n = numbers(runs, { from, to: new Date(to.getTime() + 1000) });
  const when = days <= 14 ? "in the last 2 weeks" : days <= 7 ? "this week" : "this month";
  return json({ ...reportBlock(n, when), actions: sourceActions(runs.filter((r) => new Date(r.run_at) >= from)) });
}

/** One live answer per provider for named businesses; the analysis and the text are saved in one settings row, read once and deleted. */
async function aiCalibrate(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({})) as { id?: string; checks?: { business: string; country: string; city: string; prompt: string; providers?: AiProviderName[]; known?: string[] }[] };
  const id = String(body.id ?? "run").replace(/[^a-z0-9_-]/gi, "").slice(0, 40);
  const checks = (body.checks ?? []).slice(0, 12);
  const work = (async () => {
    const out: unknown[] = [];
    for (const c of checks) {
      for (const p of (c.providers ?? PROVIDERS).filter((x) => PROVIDERS.includes(x))) {
        try {
          if (!(await aiDeps.room(40_000))) { out.push({ ...c, provider: p, error: "cap" }); continue; }
          const raw = await realProvider("live", p, c.business).ask(c.prompt, { country: c.country, city: c.city });
          await aiDeps.spend(1, raw.costMicros);
          const a = analyze({ text: raw.text, sources: raw.sources, business: c.business, known: (c.known ?? []).map((name) => ({ key: name, name })), prompt: c.prompt });
          out.push({ business: c.business, prompt: c.prompt, provider: p, model: raw.model, cost_micros: raw.costMicros, source_count: raw.sourceCount, text: raw.text, recorded: a });
        } catch (e) {
          out.push({ business: c.business, prompt: c.prompt, provider: p, error: String((e as Error)?.message ?? e).slice(0, 200) });
        }
      }
    }
    await db().from("app_settings").upsert({ key: `ai_calibration_${id}`, value: JSON.stringify(out) });
  })();
  // @ts-ignore EdgeRuntime is provided by the Supabase Edge runtime
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(work); else await work;
  return json({ ok: true, id, checks: checks.length });
}

// ─── The free check (V4, 28.1, 30.15 3.10) ──────────────────────────────────────────────────────────────────────────
const CHECK_COLS = "id, code, business, term, country, city, self, center, radius_km, category, source, state, fast, ai, points, nearby, created_at";

async function loadCheck(code: string): Promise<CheckRow | null> {
  const c = String(code).replace(/^KAB-/i, "").toUpperCase();
  if (!/^[A-Z2-9]{8}$/.test(c)) return null;
  const { data } = await db().from("free_checks").select(CHECK_COLS).eq("code", c).maybeSingle();
  return (data as CheckRow | null) ?? null;
}

/** Collect what DataForSEO finished for one check and save it; the changed row, or null when nothing changed. Only the
 *  visibility tick calls it (one writer, so two collects never overwrite each other's points). */
async function refreshCheck(c: CheckRow): Promise<CheckRow | null> {
  if (c.state !== "mapping") return null;
  const next = await collectCheck({ provider: provider(c.source, c.self), name: deps.placeName, now: () => new Date() }, c);
  if (!next) return null;
  must(await db().from("free_checks").update({
    points: next.points, nearby: next.nearby, state: next.state, done_at: next.state === "mapping" ? null : new Date().toISOString(),
  }).eq("id", c.id));
  return next;
}

async function startFreeCheck(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({})) as {
    name?: string; address?: string; country?: string; city?: string; place_id?: string; term?: string; industry?: string; turnstile?: string;
  };
  const internal = await isInternal(req);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const name = String(body.name ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  const country = String(body.country ?? "").toUpperCase();
  const city = body.city ? String(body.city).replace(/\s+/g, " ").trim().slice(0, 80) : null;
  const industry = body.industry && /^[a-z0-9-]{2,40}$/.test(body.industry) ? body.industry : null;
  let term = cleanTerm(body.term);
  if (!term && industry) {
    const { data } = await db().from("industry_search_terms").select("term").eq("industry", industry).eq("market", country).maybeSingle();
    term = (data?.term as string | undefined) ?? null;
  }
  if (name.length < 2 || !/^[A-Z]{2}$/.test(country) || !term) return json({ error: "bad_request" }, 400);
  if (!internal) {
    if (!(await verifyTurnstile(body.turnstile, ip))) return json({ error: "challenge_failed" }, 400);
    const who = await sha256Hex(`free_check:${ip}`);
    if (!(await rateLimit(`free_check:${who}`, 5, 3600, { failClosed: true }))) return json({ error: "rate_limited" }, 429);
  }
  // Public results only, and only real ones: in mock mode or past the day's cap a visitor sees the waiting list (COPY 0).
  const mode = (await setting("dataforseo_mode")) === "live" ? "live" : "mock";
  const cap = Number((await setting("free_check_daily_cap")) ?? 0);
  if (!internal && (mode !== "live" || cap <= 0 || !(await rateLimit(`free_check_day:${new Date().toISOString().slice(0, 10)}`, cap, 86400, { failClosed: true })))) {
    return json({ state: "waitlist" }, 200);
  }
  const aiLive = (await aiSetting("ai_visibility_mode")) === "live";
  const started = await startCheck({
    provider: provider(mode, { title: name, place_id: body.place_id ?? null }), source: mode, code: () => newCode(),
    room: deps.room, spend: async (calls, micros) => void (await deps.spend(calls, micros)),
    // The one AI answer: never a made-up answer for a visitor (mock answers only on staff calls).
    ai: (o) => (aiLive || internal) ? freeScanCheck({ ...aiDeps, on: async () => (await aiSetting("ai_visibility_free_scan")) === "on" }, o) : Promise.resolve(null),
  }, { name, address: body.address ? String(body.address).slice(0, 200) : null, country, city, place_id: body.place_id ?? null, term });
  if (!started.ok) return json({ error: started.reason }, started.reason === "paused" ? 503 : 404);
  const r = started.row;
  const saved = must(await db().from("free_checks").insert({
    code: r.code, business: r.business, term: r.term, industry, country: r.country, city: r.city, self: r.self, center: r.center,
    radius_km: r.radius_km, category: r.category, source: r.source, state: r.state, fast: r.fast, ai: r.ai, points: r.points,
    cost_micros: r.source === "live" ? 2 * 2000 + 49 * 600 : 0,
  }).select(CHECK_COLS).single()) as CheckRow;
  log(fn, { action: "free_check", source: r.source, state: r.state });
  return json({ ...publicView(saved), whatsapp_text: `Hi Kabsi, my scan code is KAB-${saved.code}` });
}

/** The page keeps asking while the 7 by 7 search runs: a read only (the tick collects), limited per visitor. */
async function getFreeCheck(req: Request, url: URL): Promise<Response> {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!(await rateLimit(`free_check_get:${await sha256Hex(`free_check:${ip}`)}`, 240, 3600))) return json({ error: "rate_limited" }, 429);
  const c = await loadCheck(url.searchParams.get("code") ?? "");
  if (!c) return json({ error: "not_found" }, 404);
  return json(publicView(c));
}

/** The free checks still mapping, collected on the visibility tick so WhatsApp can send them when they are in. */
async function collectChecks(): Promise<number> {
  const rows = must(await db().from("free_checks").select(CHECK_COLS).eq("state", "mapping").order("created_at").limit(10)) as CheckRow[];
  let n = 0;
  for (const c of rows) if (await refreshCheck(c).catch(() => null)) n++;
  return n;
}

/** Staff op: the search each wave 1 industry page prefills, from DataForSEO keyword data (one call per market). */
async function terms(): Promise<Response> {
  const login = Deno.env.get("DATAFORSEO_LOGIN"), password = Deno.env.get("DATAFORSEO_PASSWORD");
  if (!login || !password) return json({ error: "dataforseo_not_configured" }, 503);
  const out: Record<string, unknown> = {};
  for (const market of MARKETS) {
    if (!(await deps.room(80_000))) return json({ error: "cap", done: out }, 503);
    const v = await searchVolumes(login, password, market);
    await deps.spend(1, v.cost);
    const picked = pickTerms(v.volumes);
    for (const [industry, p] of Object.entries(picked)) {
      must(await db().from("industry_search_terms").upsert({
        industry, market, term: p.term, volume: p.volume, candidates: p.candidates, checked_on: new Date().toISOString().slice(0, 10),
      }));
    }
    out[market] = { cost_micros: v.cost, picked: Object.fromEntries(Object.entries(picked).map(([k, p]) => [k, `${p.term} (${p.volume})`])) };
  }
  return json({ ok: true, ...out });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const url = new URL(req.url);
  const route = url.pathname.replace(/^.*\/visibility/, "") || "/";
  try {
    if (req.method === "POST" && route === "/tick") {
      if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
      // V4: a search confirmed before access runs once access is checked; free checks still mapping are collected here only.
      const { data: released } = await db().rpc("release_parked_searches");
      const out = { released, ...(await tick(deps)), free_checks: await collectChecks().catch(() => 0) };
      log(fn, { action: "tick", ...out });
      return json(out);
    }
    if (req.method === "POST" && route === "/ai-tick") {
      if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
      const out = await tickAi(aiDeps);
      log(fn, { action: "ai_tick", ...out, providers: (await enabledProviders()).join(",") });
      return json(out);
    }
    if (req.method === "POST" && route === "/ai-calibrate") {
      if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
      return await aiCalibrate(req);
    }
    if (req.method === "GET" && route === "/ai-summary") return await aiSummary(req, url);
    if (req.method === "POST" && route === "/keyword") return await addKeyword(req);
    if (req.method === "POST" && route === "/picks") return await setPicks(req);
    if (req.method === "GET" && route === "/image") return await image(req, url);
    if (req.method === "POST" && route === "/check") return await startFreeCheck(req);
    if (req.method === "GET" && route === "/check") return await getFreeCheck(req, url);
    if (req.method === "GET" && route === "/terms") {
      const { data } = await db().from("industry_search_terms").select("industry, market, term, checked_on")
        .eq("industry", url.searchParams.get("industry") ?? "").eq("market", (url.searchParams.get("market") ?? "").toUpperCase()).maybeSingle();
      return data ? json(data) : json({ error: "not_found" }, 404);
    }
    if (req.method === "POST" && route === "/terms") return (await isInternal(req)) ? await terms() : json({ error: "forbidden" }, 403);
    return json({ error: "not_found" }, 404);
  } catch (e) {
    await captureError(fn, e, { route });
    return json({ error: "server_error" }, 500);
  }
});
