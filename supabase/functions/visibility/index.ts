// visibility: the Visibility Map, Competitor Watch and the category check (V1, master plan 27.3 items 1, 3 and 4).
//   POST /visibility/tick     x-cron-secret (pg_cron every 5 minutes when work is due): start due grids, collect results.
//   POST /visibility/keyword  the signed-in owner or manager, or staff: track a search (the owner's yes; 27.4 limits).
//   POST /visibility/picks    the signed-in owner or manager: the competitors to watch (3 on Essentials, 5 on Pro).
//   GET  /visibility/image    the signed-in member, staff or x-cron-secret: the map image of one finished grid (PNG).
// Ranks and competitors come only from DataForSEO public results (30.10.2); mock mode unless app_settings
// dataforseo_mode is 'live', and the demo business always on the mock (R-17). The logic is in _shared/visibility/.
import { admin, captureError, CORS, currentUser, isInternal, json, log, rateLimit } from "../_shared/kabsi.ts";
import { outDb } from "../_shared/whatsapp/db.ts";
import { ref } from "../_shared/whatsapp/templates.ts";
import { COST_MICROS, dataForSeo, type Identity, type MapsItem, type MapsProvider } from "../_shared/visibility/dataforseo.ts";
import { mockProvider } from "../_shared/visibility/mock.ts";
import { locate } from "../_shared/visibility/locate.ts";
import { radiusFor } from "../_shared/visibility/grid.ts";
import { mapDate, renderMap } from "../_shared/visibility/map-image.ts";
import { baseMap } from "../_shared/visibility/geoapify.ts";
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
      .select("id, location_id, keyword, source, first, created_at, locations(name), visibility_keywords(self_title, self_cid, self_place_id)")
      .eq("state", "queued").order("created_at").limit(limit)) as Record<string, unknown>[];
    return rows.map((r) => {
      const one = <T>(v: unknown) => (Array.isArray(v) ? v[0] : v) as T | null;
      const k = one<{ self_title: string; self_cid: string | null; self_place_id: string | null }>(r.visibility_keywords);
      const l = one<{ name: string }>(r.locations);
      return {
        id: r.id as string, location_id: r.location_id as string, keyword: r.keyword as string, source: r.source as "mock" | "live",
        first: !!r.first, created_at: r.created_at as string, business: l?.name ?? "",
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
  const ent = await limits(locationId);
  if (!ent.watch || !ent.limits?.map_keywords) return json({ error: "no_plan" }, 402);
  const existing = must(await db().from("visibility_keywords").select("id, keyword, center_lat, center_lng, radius_km, self_title, self_cid, self_place_id")
    .eq("location_id", locationId).eq("active", true)) as { id: string; keyword: string; center_lat: number; center_lng: number; radius_km: number; self_title: string; self_cid: string | null; self_place_id: string | null }[];
  const same = existing.find((k) => k.keyword === keyword);
  if (!same && existing.length >= ent.limits.map_keywords) return json({ error: "keyword_limit", limit: ent.limits.map_keywords }, 409);
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
    confirmed_at: new Date().toISOString(), next_run_at: new Date().toISOString(), active: true,
  };
  const saved = same
    ? must(await db().from("visibility_keywords").update({ cadence, confirmed_at: row.confirmed_at }).eq("id", same.id).select("id, keyword, cadence, radius_km").single())
    : must(await db().from("visibility_keywords").insert(row).select("id, keyword, cadence, radius_km").single());
  log(fn, { action: "keyword", location_id: locationId, by: who.kind });
  return json({ ok: true, keyword: saved });
}

async function setPicks(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({})) as { location_id?: string; keys?: string[] };
  const locationId = String(body.location_id ?? "");
  const keys = Array.isArray(body.keys) ? [...new Set(body.keys.map(String))] : [];
  if (!locationId) return json({ error: "bad_request" }, 400);
  const who = await caller(req, locationId);
  if (!who) return json({ error: "forbidden" }, 403);
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

async function image(req: Request, url: URL): Promise<Response> {
  const scanId = url.searchParams.get("scan") ?? "";
  const { data: scan } = await db().from("visibility_scans")
    .select("id, location_id, keyword, center_lat, center_lng, zoom, state, done_at, locations(name, time_zone)").eq("id", scanId).maybeSingle();
  if (!scan) return json({ error: "not_found" }, 404);
  if (!(await caller(req, scan.location_id as string))) return json({ error: "forbidden" }, 403);
  if (scan.state !== "done") return json({ error: "not_ready" }, 409);
  const pts = must(await db().from("visibility_points").select("row, col, lat, lng, rank").eq("scan_id", scanId)) as
    { row: number; col: number; lat: number; lng: number; rank: number | null }[];
  const loc = (Array.isArray(scan.locations) ? scan.locations[0] : scan.locations) as { name: string; time_zone: string } | null;
  const center = { lat: Number(scan.center_lat), lng: Number(scan.center_lng) };
  const zoom = Number(scan.zoom);
  const png = await renderMap({
    keyword: scan.keyword as string, business: loc?.name ?? "", date: mapDate(new Date(scan.done_at as string), loc?.time_zone ?? "UTC"),
    center, zoom, points: pts, base: await baseMap(Deno.env.get("GEOAPIFY_API_KEY"), center, zoom),
  });
  return new Response(png, { headers: { ...CORS, "content-type": "image/png", "cache-control": "private, max-age=3600" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const url = new URL(req.url);
  const route = url.pathname.replace(/^.*\/visibility/, "") || "/";
  try {
    if (req.method === "POST" && route === "/tick") {
      if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
      const out = await tick(deps);
      log(fn, { action: "tick", ...out });
      return json(out);
    }
    if (req.method === "POST" && route === "/keyword") return await addKeyword(req);
    if (req.method === "POST" && route === "/picks") return await setPicks(req);
    if (req.method === "GET" && route === "/image") return await image(req, url);
    return json({ error: "not_found" }, 404);
  } catch (e) {
    await captureError(fn, e, { route });
    return json({ error: "server_error" }, 500);
  }
});
