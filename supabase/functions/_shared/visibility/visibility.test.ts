// V1 (master plan 27.3, 28.2, 30.10): the grid, the DataForSEO client and parser, the numbers and the WhatsApp line,
// Competitor Watch, the category check, the runs on fakes, the spend cap and the map image.
import { assert, assertAlmostEquals, assertEquals, assertMatch, assertRejects } from "jsr:@std/assert@1";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import fxGet from "../../../../tests/fixtures/dataforseo/maps-task-get.json" with { type: "json" };
import fxReady from "../../../../tests/fixtures/dataforseo/tasks-ready.json" with { type: "json" };
import fxPost from "../../../../tests/fixtures/dataforseo/task-post.json" with { type: "json" };
import { directionOf, gridPoints, project, radiusFor, zoomFor } from "./grid.ts";
import { dataForSeo, isSame, keyOf, type MapsItem, parseItems, rankOf, taskBody } from "./dataforseo.ts";
import { MOCK_CENTER, mockItems, mockProvider, mockRank } from "./mock.ts";
import { businessType, categoryCheck, type CellResult, competitors, mapMessage, reviewRaceLine, summarize } from "./scan.ts";
import { band, CREDIT_KABSI, CREDIT_MAP, GRID_SPAN, LEGEND, LEGEND_NOTE, MAX_BYTES, pinStyle, renderMap, title } from "./map-image.ts";
import { staticMapUrl } from "./geoapify.ts";
import { locate } from "./locate.ts";
import { type KeywordRow, type PointRow, type RunDeps, type ScanRow, tick } from "./run.ts";

const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371, r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const C = { lat: 25.0805, lng: 55.1403 };

Deno.test("grid: 49 points, the business in the middle, evenly spaced to the radius", () => {
  const g = gridPoints(C, 3);
  assertEquals(g.length, 49);
  const mid = g.find((p) => p.row === 3 && p.col === 3)!;
  assertAlmostEquals(mid.lat, C.lat, 1e-6);
  assertAlmostEquals(mid.lng, C.lng, 1e-6);
  const north = g.find((p) => p.row === 0 && p.col === 3)!, east = g.find((p) => p.row === 3 && p.col === 6)!;
  assertAlmostEquals(km(C, north), 3, 0.01);
  assertAlmostEquals(km(C, east), 3, 0.01);
  assert(north.lat > C.lat && east.lng > C.lng);
  assertAlmostEquals(km(g[0], g[1]), 1, 0.01);
});

Deno.test("grid: radius by trade (27.3: cafe 1 km, salon 3 km, clinic or auto repair 5 km)", () => {
  assertEquals(radiusFor("Cafe"), 1);
  assertEquals(radiusFor("Bakery"), 1);
  assertEquals(radiusFor("Hair salon"), 3);
  assertEquals(radiusFor("Dental clinic"), 5);
  assertEquals(radiusFor("Auto repair shop"), 5);
  assertEquals(radiusFor(null), 3);
});

Deno.test("grid: the zoom puts the grid's width on GRID_SPAN pixels, and the pins land symmetric", () => {
  for (const r of [1, 3, 5]) {
    const z = zoomFor(C, r, GRID_SPAN);
    const g = gridPoints(C, r);
    const w = project(C, z, g.find((p) => p.row === 3 && p.col === 0)!), e = project(C, z, g.find((p) => p.row === 3 && p.col === 6)!);
    assertAlmostEquals(e.x - w.x, GRID_SPAN, 6);
    assertAlmostEquals(e.x, -w.x, 1);
    const n = project(C, z, g.find((p) => p.row === 0 && p.col === 3)!);
    assert(n.y < 0);
    assertAlmostEquals(-n.y, GRID_SPAN / 2, 6);
  }
});

Deno.test("grid: the side a set of cells leans to", () => {
  assertEquals(directionOf([{ row: 3, col: 5 }, { row: 2, col: 6 }, { row: 4, col: 6 }]), "east");
  assertEquals(directionOf([{ row: 0, col: 0 }, { row: 1, col: 1 }]), "north west");
  assertEquals(directionOf([{ row: 0, col: 3 }, { row: 6, col: 3 }]), null);
});

Deno.test("dataforseo: the parser keeps public fields only, organic results only, in rank order", () => {
  const items = parseItems(fxGet.tasks[0] as never);
  assertEquals(items.map((i) => i.title), ["Harbor Bakes", "Yawmiyati Demo Bakery", "Corner Crumb"]);
  assertEquals(items[0], {
    rank: 1, title: "Harbor Bakes", cid: "1111111111111111111", place_id: "ChIJfixture0001", category: "Bakery",
    categories: ["Bakery", "Cafe", "Dessert shop"], rating: 4.7, reviews: 312, photos: 210, lat: 25.0811, lng: 55.1452,
  });
  assertEquals(items[2].rating, null);
  // Nothing beyond the kept fields: no address, phone, snippet, image or hours (30.10.3).
  assertEquals(Object.keys(items[0]).sort(), ["categories", "category", "cid", "lat", "lng", "photos", "place_id", "rank", "rating", "reviews", "title"]);
});

Deno.test("dataforseo: who is who, by cid, then place ID, then name", () => {
  const items = parseItems(fxGet.tasks[0] as never);
  assertEquals(rankOf(items, { cid: "2222222222222222222" }), 2);
  assertEquals(rankOf(items, { place_id: "ChIJfixture0002" }), 2);
  assertEquals(rankOf(items, { title: "yawmiyati  demo bakery" }), 2);
  assertEquals(rankOf(items, { cid: "999" , title: "Yawmiyati Demo Bakery" }), null);
  assertEquals(keyOf(items[0]), "cid:1111111111111111111");
  assert(isSame(items[2], { title: "Corner Crumb" }));
});

Deno.test("dataforseo: the request body (a grid point or a country) and the client calls", async () => {
  assertEquals(taskBody({ keyword: "bakery", lat: 1.5, lng: 2.25, tag: "s:0:0" }), {
    keyword: "bakery", location_coordinate: "1.5,2.25,15z", language_code: "en", depth: 20, tag: "s:0:0",
  });
  assertEquals((taskBody({ keyword: "x y", locationCode: 2784, tag: "locate" }) as Record<string, unknown>).location_code, 2784);
  const calls: { url: string; method: string; auth: string | null; body: unknown }[] = [];
  const fake = (async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method!, auth: new Headers(init.headers).get("authorization"), body: init.body ? JSON.parse(String(init.body)) : null });
    const r = url.endsWith("task_post") ? fxPost : url.endsWith("tasks_ready") ? fxReady : fxGet;
    return new Response(JSON.stringify(r), { status: 200 });
  }) as unknown as typeof fetch;
  const c = dataForSeo("login", "pw", fake);
  assertEquals(await c.post([{ keyword: "bakery", lat: 1, lng: 2, tag: "scan-1:3:4" }, { keyword: "bakery", lat: 1, lng: 3, tag: "scan-1:3:5" }]),
    { "scan-1:3:4": "10251200-0000-0066-0000-fixture00001" });
  assertEquals(calls[0].auth, "Basic " + btoa("login:pw"));
  assertEquals(calls[0].method, "POST");
  assertEquals(await c.ready(), ["10251200-0000-0066-0000-fixture00001"]);
  const got = await c.get("10251200-0000-0066-0000-fixture00001");
  assertEquals(got?.tag, "scan-1:3:4");
  assertEquals(got?.items.length, 3);
  const bad = dataForSeo("l", "p", (() => Promise.resolve(new Response("no", { status: 401 }))) as unknown as typeof fetch);
  await assertRejects(() => bad.ready(), Error, "dataforseo_http_401");
});

Deno.test("locate: the business's centre and identity from one public search; the mock has a fixed spot", async () => {
  const fake = { live: true, post: () => Promise.resolve({}), ready: () => Promise.resolve([]), get: () => Promise.resolve(null),
    liveOne: () => Promise.resolve(parseItems(fxGet.tasks[0] as never)) };
  const hit = await locate(fake, { name: "Yawmiyati Demo Bakery", address: "Marina", country: "ae", place_id: null });
  assertEquals(hit, { lat: 25.0805, lng: 55.1403, title: "Yawmiyati Demo Bakery", cid: "2222222222222222222", place_id: "ChIJfixture0002", category: "Bakery" });
  assertEquals(await locate(fake, { name: "Nobody", address: null, country: "AE", place_id: null }), null);
  assertEquals(await locate(fake, { name: "X", address: null, country: "ZZ", place_id: null }), null);
  const m = await locate(mockProvider({ title: "Demo" }), { name: "Demo", address: null, country: "GB", place_id: null });
  assertEquals([m?.lat, m?.lng], [MOCK_CENTER.lat, MOCK_CENTER.lng]);
});

const who = { title: "Yawmiyati", cid: "self-1" };
const mockCells = (): CellResult[] =>
  gridPoints(C, 1).map((p) => {
    const items = mockItems(`s:${p.row}:${p.col}`, who);
    return { row: p.row, col: p.col, rank: rankOf(items, who), items };
  });

Deno.test("scan: the three numbers and who beats the business where", () => {
  const cells = mockCells();
  const s = summarize(cells, who);
  assertEquals(s.points, 49);
  assertEquals(s.centreRank, 1);
  assertEquals(s.top3, cells.filter((c) => mockRank(c.row, c.col)! <= 3 && mockRank(c.row, c.col) != null).length);
  assertEquals(s.ranked, 48);
  const expected = Math.round((cells.reduce((t, c) => t + (c.rank ?? 21), 0) / 49) * 10) / 10;
  assertEquals(s.averageRank, expected);
  assertEquals(s.beats?.name, "Harbor Bakes");
  assertEquals(s.beats?.direction, "east");
});

Deno.test("scan: the WhatsApp line is docs/COPY.md section 20, with no dash and no exclamation mark", () => {
  const s = summarize(mockCells(), who);
  const m = mapMessage({ summary: s, keyword: "bakery", businessType: "bakery", first: true });
  assertEquals(m.body, `Your first map is ready. We searched 'bakery' on Google Maps from 49 places around your bakery, like a customer standing there. You came up in the top 3 from ${s.top3} of them. To the east, Harbor Bakes comes up first.`);
  assertEquals(/spot|grid|pin\b/i.test(m.body), false, "COPY 0.1: never spots, grid or pin");
  assertEquals(businessType("Hair Salon"), "hair salon");
  assertEquals(businessType(null), "business");
  assertEquals(m.buttons.map((b) => b.title), ["Show me", "Later"]);
  const later = mapMessage({ summary: s, keyword: "bakery", businessType: "bakery", first: false, steps: ["Reply to 2 reviews", "Add 5 photos", "Post this week"] });
  assertMatch(later.body, /^Your new map is ready\./);
  assertMatch(later.body, /3 next steps:\n1\. Reply to 2 reviews\n2\. Add 5 photos\n3\. Post this week$/);
  for (const t of [m.body, later.body]) assert(!/[–—!]/.test(t));
  // Everywhere beaten: no side to name, so the count instead.
  const everywhere = mapMessage({ summary: { ...s, beats: { key: "k", name: "Oven Street", spots: 49, direction: null } }, keyword: "bakery", businessType: "bakery", first: false });
  assertMatch(everywhere.body, /Oven Street comes up first from 49 of the 49 places\.$/);
  // Nobody above it anywhere: the line stops after the numbers.
  assertMatch(mapMessage({ summary: { ...s, beats: null }, keyword: "bakery", businessType: "bakery", first: true }).body, /of them\.$/);
});

Deno.test("Competitor Watch: the offer list, never the business itself, best first", () => {
  const list = competitors(mockCells(), who, 5);
  assertEquals(list.length, 5);
  assert(list.every((c) => c.name !== "Yawmiyati"));
  for (let i = 1; i < list.length; i++) assert(list[i - 1].averageRank <= list[i].averageRank);
  assertEquals(reviewRaceLine({ name: "Smile Clinic", before: 100, now: 114 }, { before: 50, now: 53 }), "Smile Clinic got 14 reviews this month. You got 3.");
  assertEquals(reviewRaceLine({ name: "A", before: 1, now: 2 }, { before: 1, now: 5 }), null);
  assertEquals(reviewRaceLine({ name: "A", before: null, now: 2 }, { before: 1, now: 5 }), null);
});

Deno.test("category check: a proposal only when 2 of the top 3 share a category the business lacks", () => {
  const top = [
    { name: "A", category: "Dentist" }, { name: "B", category: "Dentist" }, { name: "C", category: "Orthodontist" },
  ].map((c, i) => ({ ...c, key: `k${i}`, cid: null, place_id: null, categories: [c.category], rating: null, reviews: null, photos: null, spots: 1, bestRank: 1, averageRank: 1 }));
  assertEquals(categoryCheck({ category: "Medical clinic", categories: ["Medical clinic"] }, top), { current: "Medical clinic", suggested: "Dentist", shared_by: ["A", "B"] });
  assertEquals(categoryCheck({ category: "Medical clinic", categories: ["Medical clinic", "Dentist"] }, top), null);
  assertEquals(categoryCheck(null, top), null);
});

// ─── runs on fakes ───────────────────────────────────────────────────────────────────────────────────────────────
function world(o: { mode?: "mock" | "live"; demo?: boolean; room?: boolean; crossed80?: boolean } = {}) {
  const now = new Date("2026-10-25T10:00:00Z");
  const kw: KeywordRow = { id: "kw1", location_id: "loc1", keyword: "bakery", radius_km: 1, center_lat: C.lat, center_lng: C.lng, self_title: "Yawmiyati", self_cid: "self-1", self_place_id: null, cadence: "monthly" };
  const scans: (ScanRow & { state: string; data?: Record<string, unknown>; error?: string; costMicros: number })[] = [];
  const pts = new Map<string, PointRow[]>();
  const alerts: string[] = [];
  const spent: number[] = [];
  const snaps: unknown[] = [];
  let next: Date | null = null;
  const live = { live: true, ready: () => Promise.resolve([] as string[]), get: () => Promise.resolve(null),
    post: (t: { tag: string }[]) => Promise.resolve(Object.fromEntries(t.map((x) => [x.tag, `live|${x.tag}`]))), liveOne: () => Promise.resolve([] as MapsItem[]) };
  const d: RunDeps = {
    db: {
      dueKeywords: () => Promise.resolve(next ? [] : [kw]),
      hasScan: () => Promise.resolve(scans.some((s) => s.state === "done")),
      business: () => Promise.resolve({ name: "Yawmiyati", demo: !!o.demo }),
      createScan(k, s, points) {
        const id = `scan${scans.length + 1}`;
        scans.push({ id, location_id: k.location_id, keyword: k.keyword, source: s.source, first: s.first, created_at: now.toISOString(), self: { title: k.self_title, cid: k.self_cid, place_id: k.self_place_id }, business: "Yawmiyati", state: "queued", costMicros: s.costMicros });
        pts.set(id, points.map((p) => ({ ...p, task_id: null, rank: null, items: null, done: false })));
        return Promise.resolve(id);
      },
      setTasks(id, tasks) {
        for (const p of pts.get(id)!) p.task_id = tasks[`${id}:${p.row}:${p.col}`] ?? null;
        return Promise.resolve();
      },
      failScan(id, error) { Object.assign(scans.find((s) => s.id === id)!, { state: "failed", error }); return Promise.resolve(); },
      bumpKeyword(_id, n) { next = n; return Promise.resolve(); },
      queuedScans: () => Promise.resolve(scans.filter((s) => s.state === "queued")),
      points: (id) => Promise.resolve(pts.get(id)!.map((p) => ({ ...p }))),
      savePoint(id, row, col, rank, items) { Object.assign(pts.get(id)!.find((p) => p.row === row && p.col === col)!, { rank, items, done: true }); return Promise.resolve(); },
      picks: () => Promise.resolve(["cid:mock-0"]),
      finishScan(id, data, s) { Object.assign(scans.find((x) => x.id === id)!, { state: "done", data }); snaps.push(...s); return Promise.resolve(); },
    },
    provider: (mode, self) => (mode === "mock" ? mockProvider(self) : live),
    mode: () => Promise.resolve(o.mode ?? "mock"),
    room: () => Promise.resolve(o.room ?? true),
    spend: (_c, m) => { spent.push(m); return Promise.resolve(!!o.crossed80); },
    staffAlert: (s) => { alerts.push(s); return Promise.resolve(); },
    now: () => now,
  };
  return { d, scans, alerts, spent, snaps, next: () => next };
}

Deno.test("run: a due search becomes a finished grid with its numbers, line, offer list and snapshots (mock)", async () => {
  const w = world();
  const out = await tick(w.d);
  assertEquals(out.started, 1);
  assertEquals(out.finished, 1);
  const s = w.scans[0];
  assertEquals([s.state, s.source, s.first, s.costMicros], ["done", "mock", true, 0]);
  assertEquals(s.data?.centre_rank, 1);
  assertMatch((s.data?.message as { body: string }).body, /^Your first map is ready\. We searched 'bakery' on Google Maps from 49 places around .+ You came up in the top 3 from \d+ of them\./);
  assertEquals(w.spent, []);
  assertEquals(w.next()?.toISOString(), "2026-11-24T10:00:00.000Z");
  // The business's own public row and the picked competitor's.
  assertEquals((w.snaps as { is_self: boolean }[]).map((x) => x.is_self), [true, false]);
});

Deno.test("run: live grids are paid for, recorded, and stop at the monthly cap with a staff alert", async () => {
  const w = world({ mode: "live", crossed80: true });
  const out = await tick(w.d);
  assertEquals(out.started, 1);
  assertEquals(out.waiting, 1); // DataForSEO has not finished yet
  assertEquals(w.spent, [49 * 600]);
  assertEquals(w.alerts, ["DataForSEO spend passed 80 percent of this month's cap"]);
  const capped = world({ mode: "live", room: false });
  const out2 = await tick(capped.d);
  assertEquals([out2.started, out2.capped], [0, 1]);
  assertEquals(capped.scans.length, 0);
  assertEquals(capped.alerts, ["DataForSEO monthly cap reached, maps paused"]);
  assertEquals(capped.next()?.toISOString(), "2026-10-26T10:00:00.000Z");
});

Deno.test("run: the demo business stays on the mock even when live is on (R-17)", async () => {
  const w = world({ mode: "live", demo: true });
  await tick(w.d);
  assertEquals(w.scans[0].source, "mock");
  assertEquals(w.spent, []);
});

Deno.test("run: a grid that cannot be fully queued fails and is tried again tomorrow", async () => {
  const w = world({ mode: "live" });
  w.d.provider = () => ({ live: true, ready: () => Promise.resolve([]), get: () => Promise.resolve(null), liveOne: () => Promise.resolve([]),
    post: (t) => Promise.resolve(Object.fromEntries(t.slice(1).map((x) => [x.tag, "id"]))) });
  const out = await tick(w.d);
  assertEquals(out.failed, 1);
  assertEquals(w.scans[0].state, "failed");
  assertMatch(w.scans[0].error!, /tasks_not_created_1/);
  assertEquals(w.spent, [48 * 600]);
  assertEquals(w.next()?.toISOString(), "2026-10-26T10:00:00.000Z");
});

// ─── the image ───────────────────────────────────────────────────────────────────────────────────────────────────
Deno.test("map image: the bands and pins follow DESIGN.md (never red, amber ring on 11 to 20, 20+)", () => {
  assertEquals([1, 3, 4, 10, 11, 20, 21, null].map((r) => band(r)), ["top", "top", "mid", "mid", "low", "low", "none", "none"]);
  assertEquals(pinStyle(2), { band: "top", label: "2", fill: "#146c46", text: "#FFFFFF", ring: "#FFFFFF" });
  assertEquals(pinStyle(7).fill, "#6cc497");
  assertEquals(pinStyle(15), { band: "low", label: "15", fill: "#fef3c7", text: "#111111", ring: "#b45309" });
  assertEquals(pinStyle(null), { band: "none", label: "20+", fill: "#0b0b0b", text: "#FFFFFF", ring: "#FFFFFF" });
  assertEquals([...LEGEND], ["1 to 3", "4 to 10", "11 to 20", "Not in top 20"]);
  assertEquals(LEGEND_NOTE, "Each dot is a place near you where Kabsi searched like a customer. The number is where you came up. 1 is first.");
  assertEquals(/spot|grid|pin\b|[–—!]/i.test(LEGEND_NOTE), false);
  assertEquals(CREDIT_KABSI, "Kabsi rank check, not provided by Google.");
  assertEquals(CREDIT_MAP, "Map: Geoapify, © OpenStreetMap contributors.");
  assertEquals(title("bakery", "Harbor Cafe"), "'bakery' around Harbor Cafe");
  assertEquals([...title("bakery", "A very long business name that will not fit on one line")].length, 40);
});

Deno.test("map image: a 1080 x 1080 palette PNG under 250 KB, with and without a base map", async () => {
  const center = C, zoom = zoomFor(C, 1, GRID_SPAN);
  const points = gridPoints(C, 1).map((p) => ({ ...p, rank: mockRank(p.row, p.col) }));
  // A busy base: a noisy picture compresses worse than any street map.
  const noise = new Image(1080, 720);
  for (let x = 1; x <= 1080; x++) for (let y = 1; y <= 720; y++) noise.setPixelAt(x, y, Image.rgbaToColor(200 + ((x * y) % 40), 200 + ((x + y) % 30), 195, 255));
  for (const base of [null, { bytes: await noise.encodeJPEG(80), type: "image/jpeg" as const }]) {
    const png = await renderMap({ keyword: "bakery", business: "Yawmiyati", date: "25 Oct 2026", center, zoom, points, base });
    assert(png.length < MAX_BYTES, `size ${png.length}`);
    assertEquals([...png.slice(1, 4)].map((c) => String.fromCharCode(c)).join(""), "PNG");
    assertEquals(png[25], 3); // colour type: palette
    const img = await Image.decode(png);
    assertEquals([img.width, img.height], [1080, 1080]);
  }
});

Deno.test("geoapify: the static map request (never OpenStreetMap's tile servers)", () => {
  const u = new URL(staticMapUrl("KEY", C, 15.3));
  assertEquals(u.host, "maps.geoapify.com");
  assertEquals(u.searchParams.get("center"), `lonlat:${C.lng},${C.lat}`);
  assertEquals([u.searchParams.get("width"), u.searchParams.get("height"), u.searchParams.get("zoom")], ["1080", "720", "15.3"]);
});
