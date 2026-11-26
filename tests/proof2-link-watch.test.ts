import { describe, expect, it } from "vitest";
import {
  checkLink,
  extractLinks,
  FRESH,
  incidentTitle,
  incidentWhy,
  onlyShownLinks,
  shownWebsite,
  type LinkKind,
  type LinkState,
  type LinkWatchDeps,
  recoveryLine,
  step,
  watchLinks,
} from "../supabase/functions/_shared/link-watch/link-watch";

// PROOF-2 link watch: three failures in a row (now, 30 minutes, 2 hours) before one task; a recovery closes it.
const T0 = new Date("2026-11-24T05:17:00Z");
const min = (m: number) => new Date(T0.getTime() + m * 60_000);

describe("the three tries", () => {
  it("the first failure schedules a retry in 30 minutes and does not alert", () => {
    const s = step(FRESH, false, T0);
    expect(s).toMatchObject({ alert: false, recovered: false, retryInMinutes: 30 });
    expect(s.state).toMatchObject({
      failures: 1,
      alerted: false,
      retryAt: min(30).toISOString(),
      firstFailedAt: T0.toISOString(),
    });
  });
  it("the second failure schedules a retry in 2 hours and still does not alert", () => {
    const s = step(step(FRESH, false, T0).state, false, min(30));
    expect(s).toMatchObject({ alert: false, retryInMinutes: 120 });
    expect(s.state.failures).toBe(2);
    expect(s.state.retryAt).toBe(min(150).toISOString());
  });
  it("only the third failure in a row alerts, once per incident", () => {
    const two = step(step(FRESH, false, T0).state, false, min(30)).state;
    const third = step(two, false, min(150));
    expect(third).toMatchObject({ alert: true, retryInMinutes: null });
    expect(third.state).toMatchObject({ failures: 3, alerted: true, retryAt: null });
    const fourth = step(third.state, false, min(1590)); // the next day's check
    expect(fourth.alert).toBe(false);
    expect(fourth.state.alerted).toBe(true);
  });
  it("a success in between resets the count: two failures and a success never alert", () => {
    const one = step(FRESH, false, T0).state;
    const ok = step(one, true, min(30));
    expect(ok).toMatchObject({ alert: false, recovered: false });
    expect(ok.state).toEqual(FRESH);
    expect(step(ok.state, false, min(60)).state.failures).toBe(1);
  });
  it("a link that loads again after an alert says so once, and the incident ends", () => {
    const alerted: LinkState = {
      failures: 3,
      alerted: true,
      retryAt: null,
      firstFailedAt: T0.toISOString(),
    };
    const back = step(alerted, true, min(1440));
    expect(back).toMatchObject({ alert: false, recovered: true });
    expect(back.state).toEqual(FRESH);
    expect(step(back.state, true, min(2880)).recovered).toBe(false);
  });
});

// A fake web: what each address answers.
const OK_DNS = async () => ["93.184.216.34"];
const page =
  (status: number, headers: Record<string, string> = {}) =>
  () =>
    Promise.resolve(
      new Response(status < 300 ? "<html>hello</html>" : "", {
        status,
        headers: { "content-type": "text/html", ...headers },
      }),
    );
const web = (routes: Record<string, () => Promise<Response>>) => ({
  resolve: OK_DNS,
  fetch: (url: string) => (routes[url] ?? page(404))(),
});

describe("does a link load", () => {
  it("200 is up; 404, 410 and 500 are down; 401, 403 and 429 are up (the site is refusing a robot, not down)", async () => {
    const d = web({
      "https://a.example/": page(200),
      "https://b.example/": page(404),
      "https://c.example/": page(500),
      "https://d.example/": page(403),
      "https://e.example/": page(429),
      "https://f.example/": page(410),
    });
    expect(await checkLink("website", "https://a.example/", d)).toEqual({
      ok: true,
      reason: "loads",
    });
    expect(await checkLink("website", "https://b.example/", d)).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(await checkLink("website", "https://c.example/", d)).toEqual({
      ok: false,
      reason: "server_error",
    });
    expect(await checkLink("website", "https://d.example/", d)).toEqual({
      ok: true,
      reason: "blocked_us",
    });
    expect(await checkLink("website", "https://e.example/", d)).toEqual({
      ok: true,
      reason: "blocked_us",
    });
    expect(await checkLink("website", "https://f.example/", d)).toEqual({
      ok: false,
      reason: "not_found",
    });
  });
  it("a redirect to another domain is a failure for the website and fine for a booking or menu link", async () => {
    const d = web({
      "https://shop.example/": page(301, { location: "https://elsewhere.example/" }),
    });
    expect(await checkLink("website", "https://shop.example/", d)).toEqual({
      ok: false,
      reason: "other_site",
    });
    expect(await checkLink("booking", "https://shop.example/", d)).toEqual({
      ok: true,
      reason: "loads",
    });
    expect(await checkLink("menu", "https://shop.example/", d)).toEqual({
      ok: true,
      reason: "loads",
    });
  });
  it("www and no www are the same site", async () => {
    const d = web({
      "https://shop.example/": page(301, { location: "https://www.shop.example/" }),
      "https://www.shop.example/": page(200),
    });
    expect(await checkLink("website", "https://shop.example/", d)).toEqual({
      ok: true,
      reason: "loads",
    });
  });
  it("a timeout, a refused connection or a certificate error is a failure", async () => {
    const boom = {
      resolve: OK_DNS,
      fetch: () => Promise.reject(new TypeError("certificate has expired")),
    };
    expect(await checkLink("website", "https://a.example/", boom)).toEqual({
      ok: false,
      reason: "unreachable",
    });
    const slow = {
      resolve: OK_DNS,
      fetch: (_u: string, init: { signal: AbortSignal }) =>
        new Promise<Response>((_, rej) =>
          init.signal.addEventListener("abort", () =>
            rej(new DOMException("aborted", "AbortError")),
          ),
        ),
    };
    expect(await checkLink("website", "https://a.example/", { ...slow, timeoutMs: 50 })).toEqual({
      ok: false,
      reason: "unreachable",
    });
  });
  it("a name that does not resolve is a failure; a file such as a PDF menu is up; Kabsi's network is never reached", async () => {
    expect(
      await checkLink("website", "https://gone.example/", {
        resolve: async () => [],
        fetch: page(200),
      }),
    ).toEqual({ ok: false, reason: "unreachable" });
    expect(
      await checkLink(
        "menu",
        "https://a.example/menu.pdf",
        web({
          "https://a.example/menu.pdf": () =>
            Promise.resolve(
              new Response("%PDF", { status: 200, headers: { "content-type": "application/pdf" } }),
            ),
        }),
      ),
    ).toEqual({ ok: true, reason: "loads" });
    let called = 0;
    const private_ = {
      resolve: async () => ["10.0.0.5"],
      fetch: () => {
        called++;
        return page(200)();
      },
    };
    expect((await checkLink("website", "https://internal-looking.example/", private_)).ok).toBe(
      false,
    );
    expect(called).toBe(0);
    expect((await checkLink("website", "http://127.0.0.1:8080/", web({}))).ok).toBe(false);
  });
});

describe("which links the listing holds", () => {
  it("the website, a booking link and a menu link; a kind the listing lacks is left out", () => {
    const got = extractLinks({
      websiteUri: " https://rose.example/ ",
      placeActionLinks: [
        { uri: "https://order.example/x", placeActionType: "FOOD_ORDERING" },
        { uri: "https://book.example/r", placeActionType: "APPOINTMENT" },
      ],
      attributes: [
        { name: "attributes/has_wifi" },
        { name: "attributes/url_menu", uriValues: [{ uri: "https://rose.example/menu" }] },
      ],
    });
    expect(got).toEqual({
      website: "https://rose.example/",
      booking: "https://book.example/r",
      menu: "https://rose.example/menu",
    });
    expect(
      extractLinks({
        websiteUri: "javascript:alert(1)",
        placeActionLinks: [{ uri: "ftp://x", placeActionType: "APPOINTMENT" }],
      }),
    ).toEqual({});
    expect(extractLinks({})).toEqual({});
  });
});

// The whole business, with every effect recorded.
function harness(
  links: Partial<Record<LinkKind, string>>,
  routes: Record<string, () => Promise<Response>>,
  states: Partial<Record<LinkKind, LinkState>> = {},
  at = T0,
) {
  const log: string[] = [];
  const stored = { ...states };
  let now = at;
  const deps: LinkWatchDeps = {
    links: async () => links,
    states: async () => ({ ...stored }),
    save: async (k, s) => void ((stored[k] = s), log.push(`save ${k} ${s.failures}`)),
    drop: async (k) => void (delete stored[k], log.push(`drop ${k}`)),
    fetch: web(routes),
    retry: async (m) => void log.push(`retry ${m}`),
    openTask: async (k) => void log.push(`task open ${k}`),
    closeTask: async (k) => void log.push(`task close ${k}`),
    now: () => now,
  };
  return { deps, log, stored, at: (d: Date) => void (now = d) };
}

describe("one business, from the first failure to the recovery", () => {
  it("a broken booking link alerts only after the third failure, then closes when it loads", async () => {
    let up = false;
    const routes = {
      "https://rose.example/": page(200),
      "https://book.example/": () => (up ? page(200)() : page(404)()),
    };
    const h = harness(
      { website: "https://rose.example/", booking: "https://book.example/" },
      routes,
    );
    // Try 1, now.
    expect(await watchLinks(h.deps)).toMatchObject({ checked: 2, failed: 1, alerted: [] });
    expect(h.log).toContain("retry 30");
    expect(h.log).not.toContain("task open booking");
    // The daily run an hour later finds the booking link still waiting for its retry: it is left alone.
    h.at(min(10));
    expect(await watchLinks(h.deps)).toMatchObject({ checked: 1, skipped: 1 });
    // Try 2, after 30 minutes.
    h.at(min(30));
    await watchLinks(h.deps);
    expect(h.log).toContain("retry 120");
    expect(h.log).not.toContain("task open booking");
    // Try 3, after 2 hours: one task.
    h.at(min(150));
    const third = await watchLinks(h.deps);
    expect(third.alerted).toEqual(["booking"]);
    expect(h.log.filter((l) => l === "task open booking")).toHaveLength(1);
    // The next days: still down, no second task.
    h.at(min(1590));
    await watchLinks(h.deps);
    expect(h.log.filter((l) => l === "task open booking")).toHaveLength(1);
    // It loads again.
    up = true;
    h.at(min(3030));
    const back = await watchLinks(h.deps);
    expect(back.recovered).toEqual(["booking"]);
    expect(h.log.filter((l) => l === "task close booking")).toHaveLength(1);
  });
  it("a link that fails once and loads at the retry never makes a task", async () => {
    let n = 0;
    const h = harness(
      { website: "https://rose.example/" },
      { "https://rose.example/": () => (n++ === 0 ? page(500)() : page(200)()) },
    );
    await watchLinks(h.deps);
    h.at(min(30));
    await watchLinks(h.deps);
    expect(h.log.some((l) => l.startsWith("task"))).toBe(false);
    expect(h.stored.website).toEqual(FRESH);
  });
  it("a link the listing no longer has is forgotten, and an incident the owner was told about is closed", async () => {
    const h = harness(
      {},
      {},
      {
        menu: { failures: 3, alerted: true, retryAt: null, firstFailedAt: T0.toISOString() },
        booking: { failures: 1, alerted: false, retryAt: null, firstFailedAt: T0.toISOString() },
      },
    );
    await watchLinks(h.deps);
    expect(h.log).toEqual(["drop booking", "task close menu", "drop menu"]);
  });
  it("the task is made before the state is saved, so a failed task is tried again as the third failure, not lost", async () => {
    const two: LinkState = {
      failures: 2,
      alerted: false,
      retryAt: null,
      firstFailedAt: T0.toISOString(),
    };
    const h = harness(
      { booking: "https://book.example/" },
      { "https://book.example/": page(404) },
      { booking: two },
    );
    h.deps.openTask = async () => {
      throw new Error("database down");
    };
    await expect(watchLinks(h.deps)).rejects.toThrow("database down");
    expect(h.stored.booking).toEqual(two);
    h.deps.openTask = async (k) => void h.log.push(`task open ${k}`);
    expect((await watchLinks(h.deps)).alerted).toEqual(["booking"]);
  });
  it("each retry has its own job key, so the 2 hour retry is not dropped while the 30 minute one is running", async () => {
    const { readFileSync } = await import("node:fs");
    const code = readFileSync("supabase/functions/_shared/link-watch/job.ts", "utf8");
    expect(code).toMatch(/p_dedupe_key: `link_watch:\$\{locationId\}:retry:\$\{minutes\}`/);
  });
  it("a listing that cannot be read checks nothing", async () => {
    const h = harness({}, {});
    h.deps.links = async () => null;
    expect(await watchLinks(h.deps)).toEqual({
      checked: 0,
      failed: 0,
      alerted: [],
      recovered: [],
      skipped: 0,
    });
    expect(h.log).toEqual([]);
  });
});

describe("the words", () => {
  it("one plain line each, no address, no dash, no exclamation mark", () => {
    for (const k of ["website", "booking", "menu"] as const) {
      for (const t of [incidentTitle(k), incidentWhy(k), recoveryLine(k)]) {
        expect(t).not.toMatch(/[–—!]|https?:/);
      }
    }
    expect(incidentTitle("booking")).toBe("Your booking link on Google is not loading");
    expect(recoveryLine("website")).toBe("Your website link is loading again.");
  });
  it("the only table that remembers a link holds counts and times, never an address", async () => {
    const { readFileSync } = await import("node:fs");
    const sql = readFileSync("supabase/migrations/20261124171826_proof2_links_monthly.sql", "utf8");
    const table = sql.slice(
      sql.indexOf("create table public.link_watch ("),
      sql.indexOf("create table public.link_watch_events"),
    );
    expect(table).not.toMatch(/\burl\b|\buri\b|\bhref\b|address/i);
  });
});

// APP-3 (R-169): Yawmiyati's profile said the website was Missing (Google removed it on 2 Nov) while the watch kept checking
// the owner's old address and opened "Your website link on Google is not loading". A link is checked only when it exists.
describe("a link is checked only when it exists on the profile", () => {
  it("Google's own update of the website wins over the owner's stored address", () => {
    expect(
      shownWebsite("http://old.example/", { diffMask: "websiteUri", location: {} }),
    ).toBeNull();
    expect(
      shownWebsite("http://old.example/", {
        diffMask: "title,websiteUri",
        location: { websiteUri: "https://new.example/" },
      }),
    ).toBe("https://new.example/");
    expect(shownWebsite("http://old.example/", { diffMask: "title", location: {} })).toBe(
      "http://old.example/",
    );
    expect(shownWebsite("http://old.example/", null)).toBe("http://old.example/");
    expect(shownWebsite(undefined, null)).toBeNull();
  });

  it("a website read as empty (Missing on the screen) is left out; booking and menu stay", () => {
    const found = { website: "http://old.example/", booking: "https://book.example/" };
    expect(onlyShownLinks(found, { display: "" })).toEqual({ booking: "https://book.example/" });
    expect(onlyShownLinks(found, { display: "  " })).toEqual({ booking: "https://book.example/" });
    expect(onlyShownLinks(found, { display: "http://old.example/" })).toEqual(found);
    // Not read yet: nothing to compare with, the listing read decides.
    expect(onlyShownLinks(found, null)).toEqual(found);
  });

  it("with the website Missing, the watch checks nothing for it and closes the incident the owner was told about", async () => {
    const closed: string[] = [];
    const dropped: string[] = [];
    let fetched = 0;
    const deps: LinkWatchDeps = {
      links: async () => onlyShownLinks({ website: "http://old.example/" }, { display: "" }),
      states: async () => ({
        website: { failures: 4, alerted: true, retryAt: null, firstFailedAt: T0.toISOString() },
      }),
      save: async () => {},
      drop: async (k) => void dropped.push(k),
      fetch: {
        resolve: async () => ["93.184.216.34"],
        fetch: async () => {
          fetched++;
          return new Response("", { status: 500 });
        },
      },
      retry: async () => {},
      openTask: async () => {},
      closeTask: async (k, why) => void closed.push(`${k}:${why}`),
      now: () => T0,
    };
    const out = await watchLinks(deps);
    expect(out.checked).toBe(0);
    expect(fetched).toBe(0);
    expect(closed).toEqual(["website:removed"]);
    expect(dropped).toEqual(["website"]);
  });
});
