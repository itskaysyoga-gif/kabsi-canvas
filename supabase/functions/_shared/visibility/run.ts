// The Visibility Map's runs (master plan 27.3, 28.1, 28.6 Scout), with every database and provider call passed in, so
// the tests run on fakes. tick() starts the grids that are due and collects the ones DataForSEO has finished; a
// finished grid gets its three numbers, the WhatsApp line, the competitors to offer, the category check and today's
// public snapshot of the business and its picked competitors. Scout never writes to Google.
import { COST_MICROS, type Identity, keyOf, type MapsItem, type MapsProvider, type MapsTask, rankOf } from "./dataforseo.ts";
import { gridPoints, zoomFor } from "./grid.ts";
import { GRID_SPAN } from "./map-image.ts";
import { type CellResult, categoryCheck, competitors, mapMessage, selfRow, summarize } from "./scan.ts";

export type KeywordRow = {
  id: string; location_id: string; keyword: string; radius_km: number; center_lat: number; center_lng: number;
  self_title: string; self_cid: string | null; self_place_id: string | null; cadence: "monthly" | "weekly";
};
export type ScanRow = {
  id: string; location_id: string; keyword: string; source: "mock" | "live"; first: boolean; created_at: string;
  self: Identity & { title: string }; business: string;
};
export type PointRow = { row: number; col: number; lat: number; lng: number; task_id: string | null; rank: number | null; items: MapsItem[] | null; done: boolean };
export type Snapshot = { key: string; is_self: boolean; name: string; rating: number | null; reviews: number | null; photos: number | null; category: string | null; categories: string[] };

export interface RunDb {
  dueKeywords(limit: number): Promise<KeywordRow[]>;
  hasScan(locationId: string): Promise<boolean>;
  business(locationId: string): Promise<{ name: string; demo: boolean } | null>;
  createScan(k: KeywordRow, o: { source: "mock" | "live"; zoom: number; first: boolean; costMicros: number }, points: { row: number; col: number; lat: number; lng: number }[]): Promise<string>;
  setTasks(scanId: string, tasks: Record<string, string>): Promise<void>;
  failScan(scanId: string, error: string): Promise<void>;
  bumpKeyword(id: string, next: Date): Promise<void>;
  queuedScans(limit: number): Promise<ScanRow[]>;
  points(scanId: string): Promise<PointRow[]>;
  savePoint(scanId: string, row: number, col: number, rank: number | null, items: MapsItem[]): Promise<void>;
  picks(locationId: string): Promise<string[]>;
  finishScan(scanId: string, data: Record<string, unknown>, snapshots: Snapshot[]): Promise<void>;
}
export type RunDeps = {
  db: RunDb;
  provider: (mode: "mock" | "live", self: Identity & { title: string }) => MapsProvider;
  mode: () => Promise<"mock" | "live">;
  /** May this much be spent this month (27.10)? */
  room: (micros: number) => Promise<boolean>;
  /** Record spend; resolves true when the month just passed 80 percent of the cap. */
  spend: (calls: number, micros: number) => Promise<boolean>;
  staffAlert: (summary: string, key: string) => Promise<void>;
  now: () => Date;
};

export const STALE_HOURS = 24;
const tag = (scanId: string, row: number, col: number) => `${scanId}:${row}:${col}`;
const nextRun = (from: Date, cadence: "monthly" | "weekly") =>
  new Date(from.getTime() + (cadence === "weekly" ? 7 : 30) * 86_400_000);

export async function startDue(d: RunDeps, limit = 10): Promise<Record<string, number>> {
  const out = { started: 0, capped: 0, failed: 0 };
  const global = await d.mode();
  for (const k of await d.db.dueKeywords(limit)) {
    const biz = await d.db.business(k.location_id);
    if (!biz) continue;
    const mode = biz.demo ? "mock" : global; // R-17: the demo business is always on the mock
    const pts = gridPoints({ lat: k.center_lat, lng: k.center_lng }, Number(k.radius_km));
    const cost = mode === "live" ? pts.length * COST_MICROS.standard : 0;
    if (cost && !(await d.room(cost))) {
      out.capped++;
      await d.staffAlert("DataForSEO monthly cap reached, maps paused", `cap:${d.now().toISOString().slice(0, 7)}`);
      await d.db.bumpKeyword(k.id, new Date(d.now().getTime() + 86_400_000));
      continue;
    }
    const zoom = zoomFor({ lat: k.center_lat, lng: k.center_lng }, Number(k.radius_km), GRID_SPAN);
    const first = !(await d.db.hasScan(k.location_id));
    const scanId = await d.db.createScan(k, { source: mode, zoom, first, costMicros: cost }, pts);
    await d.db.bumpKeyword(k.id, nextRun(d.now(), k.cadence));
    const self = { title: k.self_title, cid: k.self_cid, place_id: k.self_place_id };
    try {
      const tasks: MapsTask[] = pts.map((p) => ({ keyword: k.keyword, lat: p.lat, lng: p.lng, tag: tag(scanId, p.row, p.col) }));
      const ids = await d.provider(mode, self).post(tasks);
      const made = Object.keys(ids).length;
      if (cost && made && (await d.spend(made, made * COST_MICROS.standard))) {
        await d.staffAlert("DataForSEO spend passed 80 percent of this month's cap", `cap80:${d.now().toISOString().slice(0, 7)}`);
      }
      // A grid with a hole would show a wrong map: every point must be queued, or the run fails and is tried next time.
      if (made < pts.length) throw new Error(`tasks_not_created_${pts.length - made}`);
      await d.db.setTasks(scanId, ids);
      out.started++;
    } catch (e) {
      await d.db.failScan(scanId, String((e as Error)?.message ?? e).slice(0, 300));
      await d.db.bumpKeyword(k.id, new Date(d.now().getTime() + 86_400_000));
      out.failed++;
    }
  }
  return out;
}

export async function collect(d: RunDeps, limit = 10): Promise<Record<string, number>> {
  const out = { finished: 0, waiting: 0, stale: 0 };
  let readyLive: Set<string> | null = null;
  for (const s of await d.db.queuedScans(limit)) {
    const provider = d.provider(s.source, s.self);
    const pts = await d.db.points(s.id);
    if (s.source === "live") readyLive ??= new Set(await provider.ready());
    for (const p of pts.filter((p) => !p.done && p.task_id)) {
      if (s.source === "live" && !readyLive!.has(p.task_id!)) continue;
      const got = await provider.get(p.task_id!);
      if (!got) continue;
      const rank = rankOf(got.items, s.self);
      await d.db.savePoint(s.id, p.row, p.col, rank, got.items);
      Object.assign(p, { rank, items: got.items, done: true });
    }
    if (pts.every((p) => p.done)) {
      const cells: CellResult[] = pts.map((p) => ({ row: p.row, col: p.col, rank: p.rank, items: p.items ?? [] }));
      const { data, snapshots } = finish(cells, s, await d.db.picks(s.location_id));
      await d.db.finishScan(s.id, data, snapshots);
      out.finished++;
    } else if (d.now().getTime() - new Date(s.created_at).getTime() > STALE_HOURS * 3_600_000) {
      await d.db.failScan(s.id, "not_finished_in_24h");
      out.stale++;
    } else out.waiting++;
  }
  return out;
}

/** Everything a finished grid produces. */
export function finish(cells: CellResult[], s: Pick<ScanRow, "self" | "keyword" | "business" | "first">, picked: string[]) {
  const summary = summarize(cells, s.self);
  const rivals = competitors(cells, s.self, 10);
  const me = selfRow(cells, s.self);
  const snapshots: Snapshot[] = [];
  if (me) snapshots.push({ key: keyOf(me), is_self: true, name: me.title, rating: me.rating, reviews: me.reviews, photos: me.photos, category: me.category, categories: me.categories });
  for (const c of rivals.filter((c) => picked.includes(c.key))) {
    snapshots.push({ key: c.key, is_self: false, name: c.name, rating: c.rating, reviews: c.reviews, photos: c.photos, category: c.category, categories: c.categories });
  }
  const message = mapMessage({ summary, keyword: s.keyword, business: s.business, first: s.first });
  return {
    data: {
      average_rank: summary.averageRank, top3: summary.top3, ranked: summary.ranked, centre_rank: summary.centreRank,
      beats: summary.beats, competitors: rivals, category_check: categoryCheck(me, rivals), message,
    },
    snapshots,
  };
}

export async function tick(d: RunDeps) {
  return { ...(await startDue(d)), ...(await collect(d)) };
}

