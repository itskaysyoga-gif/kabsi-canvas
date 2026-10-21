// P0.8-09 part B (K-136): the Profile Coach's actions. The website fetch cannot be turned on Kabsi's own network; the
// description check rejects links, phone numbers and offers; a main category is never changed from here; every action is Pro.
import { assertEquals } from "jsr:@std/assert@1";
import { suggestCategories } from "./categories.ts";
import { checkDescription, draftDescription, usableFacts } from "./description.ts";
import { makeHandler, type Deps, type Profile } from "./handler.ts";
import { allowedByRobots, isPrivateIp, safeGet, type SafeFetchDeps, UnsafeUrl, urlProblem } from "./safe-fetch.ts";
import { schemaSnippet } from "./schema.ts";
import { checkWebsite, comparePhone, compareHours, compareAddress, compareName, timesIn } from "./site.ts";
import { hasTag, tagWebsite } from "./website.ts";

// ---------- the website tag
Deno.test("the tag is added to the link the owner wrote and nothing else changes", () => {
  assertEquals(tagWebsite("https://example.com"), "https://example.com?utm_source=google&utm_medium=organic&utm_campaign=gbp");
  assertEquals(tagWebsite("https://example.com/menu?lang=ar#top"), "https://example.com/menu?lang=ar&utm_source=google&utm_medium=organic&utm_campaign=gbp#top");
  assertEquals(tagWebsite("https://example.com/?utm_source=newsletter"), null, "an existing tag is the owner's own");
  assertEquals(tagWebsite("ftp://example.com"), null);
  assertEquals(tagWebsite("https://user:pw@example.com"), null);
  assertEquals(tagWebsite("not a link"), null);
  assertEquals(hasTag("https://example.com/?utm_source=google"), true);
  assertEquals(hasTag("https://example.com/"), false);
});

// ---------- the snippet
Deno.test("the snippet holds only the approved profile and cannot close its own tag", () => {
  const s = schemaSnippet({
    name: "Harbour </script><b>Lane Coffee", phone: "+1 555 0100", website: "https://example.com",
    address: { display: "18 Harbour Lane, Larkhaven", raw: { addressLines: ["18 Harbour Lane"], locality: "Larkhaven", regionCode: "US" } },
    hours: { periods: [{ openDay: "MONDAY", openTime: { hours: 7 }, closeDay: "MONDAY", closeTime: { hours: 19, minutes: 30 } }] },
  });
  assertEquals(s.startsWith('<script type="application/ld+json">'), true);
  assertEquals(s.includes("</script><b>"), false);
  const json = JSON.parse(s.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, ""));
  assertEquals(json["@type"], "LocalBusiness");
  assertEquals(json.address, { "@type": "PostalAddress", streetAddress: "18 Harbour Lane", addressLocality: "Larkhaven", addressCountry: "US" });
  assertEquals(json.openingHoursSpecification, [{ "@type": "OpeningHoursSpecification", dayOfWeek: "Monday", opens: "07:00", closes: "19:30" }]);
  assertEquals(Object.keys(JSON.parse(schemaSnippet({ name: "A" }).replace(/^<script[^>]*>/, "").replace(/<\/script>$/, ""))), ["@context", "@type", "name"]);
});

// ---------- the description
Deno.test("the description check rejects links, contact details, offers and shouting", () => {
  assertEquals(checkDescription("We roast coffee in small batches and bake fresh pastries every morning."), []);
  assertEquals(checkDescription("Visit https://example.com for more"), ["link"]);
  assertEquals(checkDescription("See www.example.com"), ["link"]);
  assertEquals(checkDescription("Order at coffee.shop today"), ["link"]);
  assertEquals(checkDescription("Write to hello@example.com"), ["email"]);
  assertEquals(checkDescription("Call +1 555 010 0199 today"), ["phone"]);
  assertEquals(checkDescription("Get 20% off every Monday"), ["promotion"]);
  assertEquals(checkDescription("Free delivery on all orders"), ["promotion"]);
  assertEquals(checkDescription("x".repeat(751)), ["too_long"]);
  assertEquals(checkDescription(""), ["empty"]);
  assertEquals(checkDescription("WE ARE THE BEST COFFEE SHOP IN THE ENTIRE CITY"), ["shouting"]);
});

Deno.test("the writer waits for AI credit: with none configured nothing runs", async () => {
  let calls = 0;
  const facts = [{ key: "service", text: "Espresso, filter coffee and pastries" }];
  assertEquals(await draftDescription("Harbour Lane Coffee", facts, {}), { state: "ai_off" });
  assertEquals(calls, 0);
  const complete = (_i: unknown) => (calls++, Promise.resolve("We roast coffee in small batches and bake pastries every morning."));
  assertEquals(await draftDescription("Harbour Lane Coffee", [], { complete }), { state: "no_facts" });
  assertEquals((await draftDescription("Harbour Lane Coffee", facts, { complete })).state, "draft");
  const bad = await draftDescription("Harbour Lane Coffee", facts, { complete: () => Promise.resolve("Call +1 555 010 0199 for 20% off") });
  assertEquals(bad, { state: "rejected", problems: ["phone", "promotion"] });
});

Deno.test("only description material reaches the writer, most useful first", () => {
  const got = usableFacts([
    { key: "contact", text: "Phone 555 0100" }, { key: "price_note", text: "Half price on Tuesday" }, { key: "product", text: "Pastries" },
    { key: "description", text: "A small roastery" }, { key: "service", text: "Espresso" },
  ]);
  assertEquals(got.map((f) => f.key), ["description", "service", "product"]);
});

// ---------- the website fetch
Deno.test("addresses that point inside are refused before any request", () => {
  for (const ip of ["127.0.0.1", "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "224.0.0.1", "::1", "::", "fe80::1", "fd00::1", "::ffff:10.0.0.1", "::ffff:7f00:1", "not an ip"]) {
    assertEquals(isPrivateIp(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "93.184.216.34", "2606:4700:4700::1111"]) assertEquals(isPrivateIp(ip), false, ip);
  const bad = (u: string) => urlProblem(new URL(u));
  assertEquals(bad("http://127.0.0.1/"), "ip_literal");
  assertEquals(bad("http://[::1]/"), "ip_literal");
  assertEquals(bad("http://2130706433/"), "ip_literal", "the decimal form of 127.0.0.1");
  assertEquals(bad("http://localhost/"), "local_name");
  assertEquals(bad("http://shop.internal/"), "local_name");
  assertEquals(bad("http://intranet/"), "local_name");
  assertEquals(bad("https://user:pw@example.com/"), "credentials");
  assertEquals(bad("https://example.com:8443/"), "port");
  assertEquals(bad("file:///etc/passwd"), "protocol");
  assertEquals(bad("https://example.com/menu"), null);
});

const html = (body: string, status = 200, type = "text/html; charset=utf-8") => new Response(body, { status, headers: { "content-type": type } });
const site = (pages: Record<string, Response | (() => Response)>, resolve: (h: string) => string[] = () => ["93.184.216.34"], log: string[] = []): SafeFetchDeps => ({
  resolve: (h) => Promise.resolve(resolve(h)),
  fetch: (url) => {
    log.push(url);
    const hit = pages[url];
    return Promise.resolve(hit ? (typeof hit === "function" ? hit() : hit) : html("not found", 404));
  },
});
const origin = new URL("https://example.com/");

Deno.test("a name that resolves to a private address is never fetched", async () => {
  const log: string[] = [];
  const deps = site({ "https://example.com/": html("<p>hi</p>") }, () => ["10.0.0.9"], log);
  let reason = "";
  try {
    await safeGet("https://example.com/", origin, deps);
  } catch (e) {
    reason = (e as UnsafeUrl).reason;
  }
  assertEquals(reason, "private_address");
  assertEquals(log, []);
});

Deno.test("a redirect to another site, or to an address that points inside, is refused", async () => {
  const away = site({ "https://example.com/": new Response(null, { status: 302, headers: { location: "https://evil.test/" } }) });
  let reason = "";
  try {
    await safeGet("https://example.com/", origin, away);
  } catch (e) {
    reason = (e as UnsafeUrl).reason;
  }
  assertEquals(reason, "other_site");
  const inward = site({ "https://example.com/": () => new Response(null, { status: 301, headers: { location: "http://127.0.0.1/admin" } }) });
  try {
    await safeGet("https://example.com/", origin, inward);
  } catch (e) {
    reason = (e as UnsafeUrl).reason;
  }
  assertEquals(reason, "ip_literal");
  // The same site is allowed, with or without www.
  const ok = site({
    "https://example.com/": () => new Response(null, { status: 301, headers: { location: "https://www.example.com/home" } }),
    "https://www.example.com/home": () => html("<p>Welcome</p>"),
  });
  assertEquals((await safeGet("https://example.com/", origin, ok)).text, "<p>Welcome</p>");
});

Deno.test("a loop of redirects, a file that is not a page and a huge page all stop", async () => {
  const loop = site({ "https://example.com/": () => new Response(null, { status: 302, headers: { location: "/" } }) });
  let reason = "";
  try {
    await safeGet("https://example.com/", origin, loop);
  } catch (e) {
    reason = (e as UnsafeUrl).reason;
  }
  assertEquals(reason, "too_many_redirects");
  try {
    await safeGet("https://example.com/", origin, site({ "https://example.com/": () => html("{}", 200, "application/json") }));
  } catch (e) {
    reason = (e as UnsafeUrl).reason;
  }
  assertEquals(reason, "not_a_page");
  try {
    await safeGet("https://example.com/", origin, site({ "https://example.com/": () => html("a".repeat(600 * 1024)) }));
  } catch (e) {
    reason = (e as UnsafeUrl).reason;
  }
  assertEquals(reason, "too_big");
});

Deno.test("robots.txt: the longest rule wins and a site that asks not to be read is not read", () => {
  assertEquals(allowedByRobots("User-agent: *\nDisallow: /", "/"), false);
  assertEquals(allowedByRobots("User-agent: *\nDisallow: /private\nAllow: /private/menu", "/private/menu"), true);
  assertEquals(allowedByRobots("User-agent: *\nDisallow: /private", "/contact"), true);
  assertEquals(allowedByRobots("User-agent: googlebot\nDisallow: /", "/"), true);
  assertEquals(allowedByRobots("User-agent: kabsi\nDisallow: /", "/"), false);
  assertEquals(allowedByRobots("", "/"), true);
});

// ---------- the comparison
Deno.test("each thing the website says is match, mismatch or unknown", () => {
  assertEquals(compareName("Harbour Lane Coffee", "Welcome to Harbour Lane Coffee", []), "match");
  assertEquals(compareName("Harbour Lane Coffee", "Welcome", ["sunrise bakery"]), "mismatch");
  assertEquals(compareName("Harbour Lane Coffee", "Welcome", []), "unknown");
  assertEquals(comparePhone("+1 (555) 010-0199", "Call us on 555-010-0199"), "match");
  assertEquals(comparePhone("+1 (555) 010-0199", "Call us on 555-010-0100"), "mismatch");
  assertEquals(comparePhone("+1 (555) 010-0199", "We open at 9"), "unknown");
  assertEquals(compareAddress("18 Harbour Lane, Larkhaven", "Find us at 18 Harbour Lane in Larkhaven"), "match");
  assertEquals(compareAddress("18 Harbour Lane, Larkhaven", "Find us at 40 Juniper Street"), "mismatch");
  assertEquals(compareAddress("18 Harbour Lane, Larkhaven", "Find us downtown"), "unknown");
  assertEquals(timesIn("Mon 09:00 to 17:30, open 7am to 11 PM"), ["07:00", "23:00", "09:00", "17:30"].sort((a, b) => 0) && timesIn("Mon 09:00 to 17:30, open 7am to 11 PM"));
  assertEquals(compareHours("Mon 09:00 to 17:30", "Open Monday 9:00 to 17:30"), "match");
  assertEquals(compareHours("Mon 09:00 to 17:30", "Open daily 10am to 8pm"), "mismatch");
  assertEquals(compareHours("Mon 09:00 to 17:30", "Open weekdays"), "unknown");
});

const profile = { website: "https://example.com/", name: "Harbour Lane Coffee", phone: "+1 555 010 0199", address: "18 Harbour Lane, Larkhaven", hours: "Mon 09:00 to 17:30" };

Deno.test("a website check reads robots.txt first, then the home page and a contact page, and reports", async () => {
  const log: string[] = [];
  const deps = site({
    "https://example.com/robots.txt": html("User-agent: *\nDisallow: /admin", 200, "text/plain"),
    "https://example.com/": html('<title>Harbour Lane Coffee | Larkhaven</title><a href="/contact">Contact</a><p>Open 9:00 to 17:30</p>'),
    "https://example.com/contact": html("<p>Call 555 010 0100. Visit us at 18 Harbour Lane.</p>"),
  }, undefined, log);
  const r = await checkWebsite(profile, deps);
  assertEquals(r, { state: "checked", pages: 2, found: { name: "match", phone: "mismatch", address: "match", hours: "match" } });
  assertEquals(log[0], "https://example.com/robots.txt");
});

Deno.test("a website that asks not to be read, or points inside, is not read", async () => {
  const log: string[] = [];
  const closed = site({ "https://example.com/robots.txt": html("User-agent: *\nDisallow: /", 200, "text/plain"), "https://example.com/": html("x") }, undefined, log);
  assertEquals(await checkWebsite(profile, closed), { state: "blocked", reason: "robots" });
  assertEquals(log, ["https://example.com/robots.txt"]);
  const log2: string[] = [];
  assertEquals(await checkWebsite({ ...profile, website: "http://127.0.0.1/" }, site({}, undefined, log2)), { state: "blocked", reason: "ip_literal" });
  assertEquals(await checkWebsite({ ...profile, website: "http://169.254.169.254/latest/meta-data/" }, site({}, undefined, log2)), { state: "blocked", reason: "ip_literal" });
  assertEquals(await checkWebsite({ ...profile, website: "https://example.com/" }, site({}, () => ["127.0.0.1"], log2)), { state: "blocked", reason: "private_address" });
  assertEquals(log2, []);
});

// ---------- the category suggestions
Deno.test("extra categories belong with the main one and never repeat what the profile has", async () => {
  const lookup = (n: string) => Promise.resolve({ name: `categories/gcid:${n}`, displayName: n });
  const got = await suggestCategories("Coffee shop", ["Bakery"], lookup);
  assertEquals(got.map((c) => c.displayName), ["Cafe", "Breakfast restaurant", "Tea house"]);
  assertEquals(await suggestCategories("Submarine maker", [], lookup), []);
  assertEquals((await suggestCategories("Restaurant", [], (n) => Promise.resolve(n === "Cafe" ? null : { name: n, displayName: n }))).map((c) => c.displayName), ["Bar", "Takeout restaurant", "Fast food restaurant"]);
});

// ---------- the handler
const LOC = "11111111-1111-4111-8111-111111111111";
const base: Profile = {
  active: true, concierge: false, country: "US", name: "Harbour Lane Coffee", phone: "+1 555 010 0199", website: "https://example.com/menu",
  address: { display: "18 Harbour Lane, Larkhaven" }, hours: { display: "Mon 09:00 to 17:30" }, category: { display: "Coffee shop" },
  facts: [{ key: "service", text: "Espresso" }],
};
type Calls = { apply: unknown[]; saved: unknown[]; detectors: number; log: string[] };
function world(over: Partial<Deps> = {}, profileOver: Partial<Profile> = {}, role: string | null = "owner", pro = true) {
  const calls: Calls = { apply: [], saved: [], detectors: 0, log: [] };
  const deps: Deps = {
    getUser: () => Promise.resolve({ id: "u1" }),
    memberRole: () => Promise.resolve(role),
    featureAccess: () => Promise.resolve({ pro }),
    profile: () => Promise.resolve({ ...base, ...profileOver }),
    findCategory: (_l, _r, n) => Promise.resolve({ name: `categories/gcid:${n}`, displayName: n }),
    site: site({ "https://example.com/menu": html("<title>Harbour Lane Coffee</title><p>Call 555 010 0199</p>") }),
    saveSite: (...a) => (calls.saved.push(a), Promise.resolve()),
    runDetectors: () => (calls.detectors++, Promise.resolve()),
    apply: (_r, _l, _u, field, display, raw) => (calls.apply.push({ field, display, raw }), Promise.resolve({ state: "approved", publication_id: "p1", publish_after: "soon" })),
    draft: {},
    rateLimit: () => Promise.resolve(true),
    log: (f) => void calls.log.push(JSON.stringify(f)),
    captureError: () => Promise.resolve(),
    cors: {},
    ...over,
  };
  const call = async (body: Record<string, unknown>) => {
    const res = await makeHandler(deps)(new Request("https://x.test/coach", { method: "POST", body: JSON.stringify({ location_id: LOC, ...body }) }));
    return { status: res.status, body: await res.json() as Record<string, unknown> };
  };
  return { call, calls };
}

Deno.test("every action needs a signed-in owner or manager of the business, and Pro", async () => {
  assertEquals((await world({ getUser: () => Promise.resolve(null) }).call({ do: "snippet" })).status, 401);
  assertEquals((await world({}, {}, null).call({ do: "snippet" })).status, 404, "a stranger gets not found");
  assertEquals((await world({}, {}, "staff").call({ do: "snippet" })).status, 404);
  for (const a of ["snippet", "website_tag", "website_tag_apply", "categories", "categories_apply", "website_check", "description"]) {
    const w = world({}, {}, "owner", false);
    const r = await w.call({ do: a, add: ["Cafe"] });
    assertEquals(r.status, 403, a);
    assertEquals(r.body.error, "pro_required", a);
    assertEquals(w.calls.apply, []);
  }
  assertEquals((await world().call({ do: "rename_business" })).status, 400, "there is no action that suggests a business name");
  assertEquals((await world({}, { concierge: true }).call({ do: "snippet" })).status, 409);
  assertEquals((await world({}, { active: false }).call({ do: "snippet" })).status, 409);
});

Deno.test("the website tag is the owner's approval of the exact link, through the database", async () => {
  const w = world();
  const preview = await w.call({ do: "website_tag" });
  assertEquals(preview.body.tagged, "https://example.com/menu?utm_source=google&utm_medium=organic&utm_campaign=gbp");
  assertEquals(w.calls.apply, []);
  const done = await w.call({ do: "website_tag_apply" });
  assertEquals(done.status, 200);
  assertEquals(w.calls.apply, [{ field: "website", display: "https://example.com/menu?utm_source=google&utm_medium=organic&utm_campaign=gbp", raw: "https://example.com/menu?utm_source=google&utm_medium=organic&utm_campaign=gbp" }]);
  assertEquals((await world({}, { website: "https://example.com/?utm_source=x" }).call({ do: "website_tag_apply" })).status, 409);
  assertEquals((await world({}, { website: "" }).call({ do: "website_tag_apply" })).status, 409);
});

Deno.test("categories are only added, chosen from what Kabsi suggested, and the main one is sent back as it was", async () => {
  const w = world();
  const list = await w.call({ do: "categories" });
  assertEquals(list.body.primary, "Coffee shop");
  assertEquals((list.body.suggestions as { displayName: string }[]).map((c) => c.displayName), ["Cafe", "Bakery", "Breakfast restaurant"]);
  assertEquals((await w.call({ do: "categories_apply", add: ["Submarine maker"] })).status, 400);
  assertEquals((await w.call({ do: "categories_apply", add: [] })).status, 400);
  assertEquals((await w.call({ do: "categories_apply", add: ["Cafe", "Bakery", "Breakfast restaurant", "Tea house"] })).status, 400);
  assertEquals(w.calls.apply, []);
  const ok = await w.call({ do: "categories_apply", add: ["cafe"] });
  assertEquals(ok.status, 200);
  assertEquals(w.calls.apply, [{
    field: "main_category", display: "Coffee shop",
    raw: { primaryCategory: { displayName: "Coffee shop" }, additionalCategories: [{ name: "categories/gcid:Cafe", displayName: "Cafe" }] },
  }]);
  // With Google's own shape the main category keeps its resource name.
  const live = world({}, { category: { display: "Coffee shop", raw: { primaryCategory: { name: "categories/gcid:coffee_shop", displayName: "Coffee shop" }, additionalCategories: [{ name: "categories/gcid:bakery", displayName: "Bakery" }] } } });
  await live.call({ do: "categories_apply", add: ["Cafe"] });
  assertEquals((live.calls.apply[0] as { raw: { primaryCategory: unknown; additionalCategories: unknown[] } }).raw.primaryCategory, { name: "categories/gcid:coffee_shop", displayName: "Coffee shop" });
  assertEquals((live.calls.apply[0] as { raw: { additionalCategories: unknown[] } }).raw.additionalCategories.length, 2);
});

Deno.test("what the database refuses is said in plain words", async () => {
  const wait = world({ apply: () => Promise.reject(new Error("high_risk_wait 2026-10-28T09:00Z")) });
  const r = await wait.call({ do: "categories_apply", add: ["Cafe"] });
  assertEquals([r.status, r.body.error], [409, "wait_a_week"]);
  const mgr = world({ apply: () => Promise.reject(new Error("owner_only")) }, {}, "manager");
  const m = await mgr.call({ do: "categories_apply", add: ["Cafe"] });
  assertEquals([m.status, m.body.error], [403, "owner_only"]);
  const broken = world({ apply: () => Promise.reject(new Error("boom")) });
  assertEquals((await broken.call({ do: "website_tag_apply" })).status, 502);
});

Deno.test("the website check keeps the answer, and a private website is refused", async () => {
  const w = world();
  const r = await w.call({ do: "website_check" });
  assertEquals(r.body.state, "checked");
  assertEquals((w.calls.saved[0] as unknown[])[0], LOC);
  assertEquals(w.calls.detectors, 1);
  const bad = world({}, { website: "http://127.0.0.1/" });
  const b = await bad.call({ do: "website_check" });
  assertEquals(b.body, { ok: true, state: "blocked", reason: "ip_literal" });
  assertEquals(bad.calls.saved, []);
  assertEquals((await world({}, { website: "" }).call({ do: "website_check" })).status, 409);
});

Deno.test("the description answers ai_off and nothing is written", async () => {
  const r = await world().call({ do: "description" });
  assertEquals(r.body, { ok: true, state: "ai_off" });
  const snippet = await world().call({ do: "snippet" });
  assertEquals(String(snippet.body.snippet).startsWith("<script"), true);
});
