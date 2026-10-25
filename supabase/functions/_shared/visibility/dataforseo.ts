// DataForSEO Google Maps SERP (master plan 27.3 items 1 and 3, 27.10, 28.1, 30.10 points 2 and 3). The only source of
// ranks and competitor rows in Kabsi: public Google Maps results bought from DataForSEO, for every business in them,
// the owner's own position included. Nothing here calls Google. Subscriber maps use the standard queue (task_post,
// tasks_ready, task_get, about 0.06 cents a point); the free scan's fast part uses the live endpoint (28.1).
// Credentials (DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD) are Supabase secrets read by the caller and never logged.
// In mock mode (app_settings.dataforseo_mode is not 'live', and always for the demo business) mock.ts answers.

export const API = "https://api.dataforseo.com/v3/serp/google/maps";
export const DEPTH = 20; // ranks 1 to 20; anything below is "20+"

// What one call costs Kabsi, in millionths of a US dollar (DataForSEO price list, 25 Oct 2026). Recorded per call
// in provider_spend so the monthly cap (27.10) can stop the work before the money runs out.
export const COST_MICROS = { standard: 600, live: 2000 } as const;

/** One business in a Maps result, as Kabsi keeps it (no review text, no photos, no hours: 30.10.3). */
export type MapsItem = {
  rank: number;
  title: string;
  cid: string | null;
  place_id: string | null;
  category: string | null;
  categories: string[];
  rating: number | null;
  reviews: number | null;
  photos: number | null;
  lat: number | null;
  lng: number | null;
};

/** A grid point (lat, lng) or, to find a business before it has a centre, a country (Google's location code). */
export type MapsTask = { keyword: string; lat?: number; lng?: number; locationCode?: number; zoom?: number; tag: string; language?: string };

type RawItem = {
  type?: string; rank_group?: number; rank_absolute?: number; title?: string; cid?: string | number | null;
  place_id?: string | null; category?: string | null; additional_categories?: string[] | null;
  rating?: { value?: number | null; votes_count?: number | null } | null; total_photos?: number | null;
  latitude?: number | null; longitude?: number | null;
};
type RawTask = { id: string; status_code: number; status_message?: string; data?: { tag?: string }; result?: { items?: RawItem[] | null }[] | null };
export type RawResponse = { status_code: number; status_message?: string; tasks?: RawTask[] | null };

/** The kept fields of every business in one task's result, in rank order. */
export function parseItems(task: RawTask): MapsItem[] {
  const items = task.result?.[0]?.items ?? [];
  return items
    .filter((i) => (i.type ?? "maps_search") === "maps_search" && i.title)
    .map((i) => ({
      rank: Number(i.rank_group ?? i.rank_absolute ?? 0),
      title: String(i.title),
      cid: i.cid == null ? null : String(i.cid),
      place_id: i.place_id ?? null,
      category: i.category ?? null,
      categories: [i.category, ...(i.additional_categories ?? [])].filter((c): c is string => !!c),
      rating: i.rating?.value ?? null,
      reviews: i.rating?.votes_count ?? null,
      photos: i.total_photos ?? null,
      lat: i.latitude ?? null,
      lng: i.longitude ?? null,
    }))
    .filter((i) => i.rank >= 1 && i.rank <= DEPTH)
    .sort((a, b) => a.rank - b.rank);
}

// Zoom 15 keeps Google's own search radius close to the grid cell, as the local rank checkers do.
export const taskBody = (t: MapsTask) => ({
  keyword: t.keyword,
  ...(t.lat != null && t.lng != null ? { location_coordinate: `${t.lat},${t.lng},${t.zoom ?? 15}z` } : { location_code: t.locationCode }),
  language_code: t.language ?? "en",
  depth: DEPTH,
  tag: t.tag,
});

export interface MapsProvider {
  readonly live: boolean;
  /** Queue tasks; returns DataForSEO's task id for each tag. */
  post(tasks: MapsTask[]): Promise<Record<string, string>>;
  /** The ids of queued tasks whose results are ready. */
  ready(): Promise<string[]>;
  /** One finished task: its tag and items, or null while it is not ready. */
  get(id: string): Promise<{ tag: string; items: MapsItem[] } | null>;
  /** The fast path: one point, answered in seconds. */
  liveOne(task: MapsTask): Promise<MapsItem[]>;
}

export class ProviderError extends Error {}

/** The real client. `fetcher` is fetch; tests pass a fake. */
export function dataForSeo(login: string, password: string, fetcher: typeof fetch = fetch): MapsProvider {
  const auth = "Basic " + btoa(`${login}:${password}`);
  const call = async (path: string, body?: unknown): Promise<RawResponse> => {
    const res = await fetcher(`${API}/${path}`, {
      method: body ? "POST" : "GET",
      headers: { authorization: auth, "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new ProviderError(`dataforseo_http_${res.status}`);
    const json = (await res.json()) as RawResponse;
    if (json.status_code !== 20000) throw new ProviderError(`dataforseo_${json.status_code}`);
    return json;
  };
  return {
    live: true,
    async post(tasks) {
      const out: Record<string, string> = {};
      for (let i = 0; i < tasks.length; i += 100) {
        const json = await call("task_post", tasks.slice(i, i + 100).map(taskBody));
        for (const t of json.tasks ?? []) {
          if (t.status_code === 20100 && t.data?.tag) out[t.data.tag] = t.id;
        }
      }
      return out;
    },
    async ready() {
      const json = await call("tasks_ready");
      return (json.tasks ?? []).flatMap((t) => (t.result ?? []).map((r) => (r as unknown as { id: string }).id));
    },
    async get(id) {
      const json = await call(`task_get/advanced/${encodeURIComponent(id)}`);
      const t = json.tasks?.[0];
      if (!t || t.status_code === 40602 || t.status_code === 40601) return null; // in queue, or task handed
      if (t.status_code !== 20000) throw new ProviderError(`dataforseo_task_${t.status_code}`);
      return { tag: t.data?.tag ?? "", items: parseItems(t) };
    },
    async liveOne(task) {
      const json = await call("live/advanced", [taskBody(task)]);
      const t = json.tasks?.[0];
      if (!t || t.status_code !== 20000) throw new ProviderError(`dataforseo_task_${t?.status_code ?? "none"}`);
      return parseItems(t);
    },
  };
}

// ─── who is who ───────────────────────────────────────────────────────────────────────────────────────────────────
export type Identity = { cid?: string | null; place_id?: string | null; title?: string | null };

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();

/** True when the item is the business: the same cid or place ID, or (when neither is known) the same name. */
export function isSame(item: Pick<MapsItem, "cid" | "place_id" | "title">, who: Identity): boolean {
  if (who.cid && item.cid) return who.cid === item.cid;
  if (who.place_id && item.place_id) return who.place_id === item.place_id;
  return !!who.title && norm(item.title) === norm(who.title);
}

/** The business's rank in one result, or null when it is not in the top 20. */
export function rankOf(items: MapsItem[], who: Identity): number | null {
  return items.find((i) => isSame(i, who))?.rank ?? null;
}

/** A stable key for a business across results. */
export const keyOf = (i: Pick<MapsItem, "cid" | "place_id" | "title">) => i.cid ? `cid:${i.cid}` : i.place_id ? `pid:${i.place_id}` : `t:${norm(i.title)}`;
