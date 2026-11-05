// P0.8-09 (K-136): the weekly read and the checklist the free Profile Check shows.
import { assertEquals } from "jsr:@std/assert@1";
import { COACH_ITEMS, freeChecklist } from "./catalog.ts";
import { coachNumbers, MOCK_COACH } from "./read.ts";
import { type CoachRefreshDeps, refreshCoach } from "./refresh.ts";

Deno.test("the numbers are counts, never Google's text", () => {
  const n = coachNumbers(
    {
      name: "locations/1",
      profile: { description: "  We roast coffee in small batches.  " },
      categories: { primaryCategory: { name: "categories/a" }, additionalCategories: [{ name: "categories/b" }, { name: "categories/c" }] },
    },
    { name: "locations/1/attributes", attributes: [{ name: "attributes/wi_fi" } as never] },
  );
  assertEquals(n, { descriptionLength: 33, additionalCategories: 2, attributes: 1 });
  assertEquals(coachNumbers({ name: "locations/2" }, { name: "locations/2/attributes" }), { descriptionLength: 0, additionalCategories: 0, attributes: 0 });
  assertEquals(Object.keys(n).sort(), ["additionalCategories", "attributes", "descriptionLength"]);
});

Deno.test("the free checklist is the app's list and asserts only what is public", () => {
  const rows = freeChecklist({ website: "https://example.com", photo_count: 3 });
  assertEquals(rows.map((r) => r.id), COACH_ITEMS.map((i) => i.id));
  assertEquals(rows.filter((r) => r.status === "unknown").map((r) => r.id), ["description", "categories", "services", "attributes", "service_area", "website_match"]);
  assertEquals(rows.find((r) => r.id === "website_tracking")?.status, "todo");
});

function deps(due: boolean, log: string[]): CoachRefreshDeps {
  return {
    due: (id) => (log.push(`due ${id}`), Promise.resolve(due)),
    read: (id) => (log.push(`read ${id}`), Promise.resolve({ ...MOCK_COACH, source: "mock" as const })),
    save: (id, n) => (log.push(`save ${id} ${n.source} ${n.descriptionLength}`), Promise.resolve()),
    failed: (id, e) => (log.push(`failed ${id} ${e}`), Promise.resolve()),
  };
}

Deno.test("a profile is read once it is due, and only then", async () => {
  const quiet: string[] = [];
  assertEquals(await refreshCoach("loc-1", deps(false, quiet)), "skipped");
  assertEquals(quiet, ["due loc-1"]);
  const busy: string[] = [];
  assertEquals(await refreshCoach("loc-1", deps(true, busy)), "read");
  assertEquals(busy, ["due loc-1", "read loc-1", "save loc-1 mock 120"]);
});

Deno.test("a failed read keeps nothing", async () => {
  const log: string[] = [];
  const d = deps(true, log);
  d.read = () => Promise.reject(new Error("google 503"));
  let failed = false;
  try {
    await refreshCoach("loc-1", d);
  } catch {
    failed = true;
  }
  assertEquals(failed, true);
  // Fix 3: the failure is recorded, so coach_read_due waits 24 hours before offering the read again.
  assertEquals(log, ["due loc-1", "failed loc-1 Error: google 503"]);
});

Deno.test("Fix 3: a business with no Google profile to read is skipped and nothing is kept", async () => {
  const log: string[] = [];
  const d = deps(true, log);
  d.read = (id) => (log.push(`read ${id}`), Promise.resolve(null));
  assertEquals(await refreshCoach("loc-1", d), "skipped");
  assertEquals(log, ["due loc-1", "read loc-1"]);
});

Deno.test("Fix 3: the read's own error is reported even when recording the failure fails", async () => {
  const d = deps(true, []);
  d.read = () => Promise.reject(new Error("google 404"));
  d.failed = () => Promise.reject(new Error("db down"));
  let msg = "";
  try {
    await refreshCoach("loc-1", d);
  } catch (e) {
    msg = String(e);
  }
  assertEquals(msg, "Error: google 404");
});
