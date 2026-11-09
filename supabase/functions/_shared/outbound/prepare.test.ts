// Harvey 4A part B: the templates word for word, the detail sentences in order, Harvey's hash rule, robots.txt, the
// register's eligibility rules and the prepare run, all with fictional example.com data.
import assert from "node:assert/strict";
import { fixtureRows } from "./fixture.ts";
import { prepare, type PrepareDeps, type Settings } from "./prepare.ts";
import { robotsAllows } from "./page.ts";
import { COMPANY_FILE_MAX_DAYS, companyRefusal, ordered, parseCsv, rowRefusal, toCandidate } from "./register.ts";
import {
  dailyCap, emailOne, INDUSTRY_ORDER, KIND_WORDS, OPEN_COUNTRIES, SALON_INDUSTRIES, TIME_ZONES, emailOnPage, followUp, followUpDate, houseStyleOk, inWindow, isSuppressed, keysOf, linksOk, localParts,
  nameOk, ownDomain, pickDetail, sha,
} from "./rules.ts";
import { possessive } from "../possessive.ts";

const NOW = new Date("2026-11-06T05:00:00Z"); // a Friday

Deno.test("Email 1 and the follow-up are the templates of COPY.md, word for word", () => {
  const one = emailOne({ business: "Rose Lane Salon", kind: "hair salons", city: "Exampleton", detail: "Your site lists your opening hours, and keeping Google's hours the same saves wasted trips." });
  assert.equal(one.subject, "Rose Lane Salon's Google profile");
  assert.equal(one.body, [
    "Hi Rose Lane Salon team,",
    "I came across Rose Lane Salon looking at hair salons in Exampleton. Your site lists your opening hours, and keeping Google's hours the same saves wasted trips.",
    "I run Kabsi. It prepares your Google review replies, posts and opening hours, and you approve each one on WhatsApp before anything goes live.",
    "Want me to run a free check of Rose Lane Salon's Google profile and send you what I find?",
    "Rashid Abou Hamzy, founder of Kabsi\nkabsi.co",
    "Why you got this: your business email is on your website. Reply 'no thanks' and I will not write again. How Kabsi handles data: kabsi.co/privacy",
  ].join("\n\n"));
  const two = followUp({ business: "Rose Lane Salon" });
  assert.equal(two.subject, "Re: Rose Lane Salon's Google profile");
  assert.ok(two.body.startsWith("Hi again. Happy to run that free check of Rose Lane Salon's Google profile if useful. A yes is enough, and if not, no worries.\n\nRashid Abou Hamzy, founder of Kabsi\nkabsi.co\n\nWhy you got this:"));
  for (const t of [one.body, two.body, one.subject]) {
    assert.ok(houseStyleOk(t), "no dashes or exclamation marks");
    assert.ok(!/facebook|instagram\.com|Drafted with Nora/i.test(t), "no social addresses and no Nora line in a first email");
  }
  assert.ok(linksOk(one.body, "first") && linksOk(two.body, "follow_up"), "only kabsi.co and kabsi.co/privacy");
});

Deno.test("Email 1 and the follow-up offer only the free Google check: no Founding 25 and no founding offer (R-142 4a)", () => {
  const one = emailOne({ business: "Rose Lane Salon", kind: "hair salons", city: "Exampleton", detail: "Your site lists your opening hours, and keeping Google's hours the same saves wasted trips." });
  const two = followUp({ business: "Rose Lane Salon" });
  for (const t of [one.subject, one.body, two.subject, two.body]) {
    assert.ok(!/founding|Founding 25|three months|Pro free|\b25\b|\$|US dollars|price/i.test(t), t);
  }
  assert.match(one.body, /Want me to run a free check of Rose Lane Salon's Google profile and send you what I find\?/);
});

Deno.test("only the UK can open: a non GB country is closed whatever open_countries holds (R-142 4b)", () => {
  assert.deepEqual([...OPEN_COUNTRIES], ["GB"]);
  assert.deepEqual(Object.keys(TIME_ZONES), ["GB"]);
  const ok = { company_id: "1", business_name: "Rose Lane Salon", industry: "hair salon", country: "GB", city: "Exampleton",
    website: "https://www.rose.example.com", email: "hello@rose.example.com", email_page_url: "https://rose.example.com/contact",
    company_type: "registered company", company_number: "01234567", company_status: "Active", company_status_date: "2026-11-01" };
  const all = ["GB", "IE", "AE", "SA", "QA", "KW", "BH", "OM", "AU", "NZ", "SG", "CA", "US"];
  for (const c of all.filter((x) => x !== "GB")) {
    assert.equal(rowRefusal({ ...ok, country: c }, all, "2026-11-06"), "country_closed", c);
  }
  assert.equal(rowRefusal(ok, all, "2026-11-06"), null);
});

Deno.test("the six salon industries come first, in lane R's order, each with its own words (R-142 4c)", () => {
  const six = ["hair salon", "barbershop", "beauty salon", "nail salon", "lash and brow studio", "spa and massage"];
  assert.deepEqual([...SALON_INDUSTRIES], six);
  assert.deepEqual(INDUSTRY_ORDER.slice(0, 6), six);
  assert.deepEqual(six.map((k) => KIND_WORDS[k]), ["hair salons", "barbers", "beauty salons", "nail salons", "lash and brow studios", "spas and massage studios"]);
  assert.equal(KIND_WORDS["beauty salon and spa"], undefined, "the old joined code is split");
  for (const k of INDUSTRY_ORDER) assert.ok(KIND_WORDS[k], k);
  const csv = "company_id,industry,quality_score\n1,cafe,9\n2,spa and massage,1\n3,lash and brow studio,1\n4,beauty salon,1\n5,hair salon,1\n6,nail salon,1\n7,barbershop,1\n";
  assert.deepEqual(ordered(parseCsv(csv)).map((r) => r.company_id), ["5", "7", "4", "6", "3", "2", "1"]);
});

Deno.test("links: Email 1 refuses anything but kabsi.co; a reply may carry a check link and the social pages", () => {
  assert.equal(linksOk("see https://other.example.com now", "first"), false);
  assert.equal(linksOk("kabsi.co/scan/ABC123", "first"), false);
  assert.equal(linksOk("kabsi.co/scan/ABC123 and https://www.instagram.com/kabsi.co", "reply"), true);
  assert.equal(linksOk("www.elsewhere.example", "reply"), false);
});

Deno.test("the detail: the first true one in the order booking, hours, Instagram, updated; none means no draft", () => {
  const both = `<a href="https://booksy.com/en-gb/x">Book</a><p>Monday 9:00 to 17:00</p>`;
  assert.deepEqual(pickDetail(both, NOW), { kind: "booking", sentence: "I saw you take bookings through Booksy, so customers find you online already." });
  assert.equal(pickDetail("<p>Tuesday 9am to 5pm</p>", NOW)?.kind, "hours");
  assert.equal(pickDetail(`<script type="application/ld+json">{"openingHours":"Mo-Fr 09:00-17:00"}</script>`, NOW)?.kind, "hours");
  assert.equal(pickDetail(`<a href="https://www.instagram.com/rose.example/">ig</a>`, NOW)?.sentence,
    "Your Instagram shows the work, and the same photos could do well on your Google profile.");
  assert.equal(pickDetail("<footer>&copy; 2025 Rose Lane</footer>", NOW)?.sentence,
    "Your site looks recently updated, so your Google profile is the next place customers check.");
  assert.equal(pickDetail("<footer>&copy; 2019 Rose Lane</footer>", NOW), null);
  assert.equal(pickDetail(`<a href="https://www.instagram.com/p/abc/">a post</a>`, NOW), null, "a single post is not the business's Instagram");
});

Deno.test("the address must still be on the page", () => {
  assert.ok(emailOnPage(`<a href="mailto:hello@rose.example.com">write</a>`, "Hello@Rose.example.com"));
  assert.ok(emailOnPage("<p>hello&#64;rose.example.com</p>", "hello@rose.example.com"));
  assert.ok(!emailOnPage("<p>info@rose.example.com</p>", "hello@rose.example.com"));
});

Deno.test("Harvey's hash rule: sha256 of the trimmed lower-case text, covered by its domain and parent domains", async () => {
  assert.equal(await sha(" Info@Shop.Example "), await sha("info@shop.example"));
  assert.equal((await sha("a")).length, 64);
  assert.deepEqual(keysOf("a@mail.shop.example"), ["a@mail.shop.example", "mail.shop.example", "shop.example"]);
  const list = new Set([await sha("shop.example")]);
  assert.ok(await isSuppressed("anyone@mail.shop.example", list));
  assert.ok(!(await isSuppressed("anyone@othershop.example", list)));
});

Deno.test("robots.txt is respected: the Kabsi group, else *, longest match wins", () => {
  const r = "User-agent: *\nDisallow: /private\nAllow: /private/contact\n\nUser-agent: BadBot\nDisallow: /";
  assert.ok(robotsAllows(r, "/contact"));
  assert.ok(!robotsAllows(r, "/private/x"));
  assert.ok(robotsAllows(r, "/private/contact"));
  assert.ok(!robotsAllows("User-agent: KabsiOutbound\nDisallow: /", "/contact"));
  assert.ok(robotsAllows("", "/anything"));
});

Deno.test("the register: own-domain email, UK registered company with a number, open countries only", () => {
  const ok = { company_id: "1", business_name: "Rose Lane Salon", industry: "hair salon", country: "GB", city: "Exampleton",
    website: "https://www.rose.example.com", email: "hello@rose.example.com", email_page_url: "https://rose.example.com/contact",
    company_type: "registered company", company_number: "01234567", company_status: "Active", company_status_date: "2026-11-01" };
  const day = "2026-11-06";
  assert.equal(rowRefusal(ok, ["GB"], day), null);
  assert.equal(rowRefusal(ok, [], day), "country_closed");
  assert.equal(rowRefusal({ ...ok, email: "rose@gmail.com" }, ["GB"], day), "not_own_domain");
  assert.equal(rowRefusal({ ...ok, company_type: "sole trader" }, ["GB"], day), "not_registered_company");
  assert.equal(rowRefusal({ ...ok, company_type: "unknown" }, ["GB"], day), "not_registered_company");
  assert.equal(rowRefusal({ ...ok, company_number: "" }, ["GB"], day), "no_company_number");
  assert.equal(rowRefusal({ ...ok, business_name: "Yo Salon!" }, ["GB"], day), "name");
  assert.ok(ownDomain("hello@rose.example.com", "https://shop.rose.example.com/"));
  assert.ok(!nameOk("Salon — Rose"));
  const csv = 'company_id,business_name,industry,quality_score\n1,"Cafe, Ltd",cafe,5\n2,Rose,hair salon,1\n3,Barb,barbershop,9\n';
  assert.deepEqual(ordered(parseCsv(csv)).map((r) => r.company_id), ["2", "3", "1"], "salons and barbers first");
  assert.equal(parseCsv(csv)[0].business_name, "Cafe, Ltd");
});

Deno.test("Companies House from Harvey's register: Active on a Basic Company Data file at most 40 days old", () => {
  const ok = { company_id: "1", business_name: "Rose Lane Salon", industry: "hair salon", country: "GB", city: "Exampleton",
    website: "https://rose.example.com", email: "hello@rose.example.com", email_page_url: "https://rose.example.com/contact",
    company_type: "registered company", company_number: "01234567", company_status: "Active", company_status_date: "2026-10-01" };
  const day = "2026-11-06";
  assert.equal(COMPANY_FILE_MAX_DAYS, 40);
  assert.equal(companyRefusal({ ...ok, company_status_date: "2026-09-27" }, day), null, "exactly 40 days old");
  assert.equal(companyRefusal({ ...ok, company_status_date: "2026-09-26" }, day), "company_status_stale", "41 days old");
  assert.equal(rowRefusal({ ...ok, company_status_date: "2026-08-01" }, ["GB"], day), "company_status_stale", "a stale file refuses even an Active company");
  assert.equal(companyRefusal({ ...ok, company_status_date: day }, day), null, "a file of today");
  assert.equal(companyRefusal({ ...ok, company_status: "active" }, day), null, "case does not matter");
  for (const st of ["Dissolved", "Liquidation", "In Administration", "Active - Proposal to Strike off", "Receivership Action", "Voluntary Arrangement"]) {
    assert.equal(rowRefusal({ ...ok, company_status: st }, ["GB"], day), "company_not_active", st);
  }
  assert.equal(companyRefusal({ ...ok, company_status: "" }, day), "no_company_status");
  assert.equal(companyRefusal({ ...ok, company_status_date: "" }, day), "no_company_status");
  assert.equal(companyRefusal({ ...ok, company_status_date: "01/10/2026" }, day), "no_company_status");
  assert.equal(companyRefusal({ ...ok, company_status_date: "2026-02-30" }, day), "no_company_status", "not a real date");
  assert.equal(companyRefusal({ ok: "x" }, day), "no_company_status", "an older register without the columns");
  assert.equal(companyRefusal({ ...ok, company_status_date: "2026-11-07" }, day), "company_status_date_ahead");
  assert.equal(rowRefusal({ ...ok, country: "US", company_status: "" }, ["US"], day), "country_closed", "only the UK can open (R-142)");
  for (const n of ["LP012345", "SL012345", "NL012345"]) assert.equal(rowRefusal({ ...ok, company_number: n }, ["GB"], day), "limited_partnership", n);
  for (const n of ["OC412345", "SO301234", "NC001234", "SC123456", "NI012345"]) assert.equal(rowRefusal({ ...ok, company_number: n }, ["GB"], day), null, n);
  assert.equal(toCandidate(ok).company_status, "active");
  assert.equal(toCandidate(ok).company_status_date, "2026-10-01");
});

Deno.test("the ramp and the window", () => {
  const s = { ramp_week1: 3, ramp_week2: 5, ramp_after: 10, started_on: "2026-12-01" };
  assert.equal(dailyCap(s, "2026-12-03"), 3);
  assert.equal(dailyCap(s, "2026-12-09"), 5);
  assert.equal(dailyCap(s, "2026-12-20"), 10);
  assert.equal(dailyCap({ ...s, started_on: null }, "2026-12-20"), 3);
  assert.ok(inWindow(new Date("2026-11-06T09:30:00Z"), "Europe/London"));
  assert.ok(!inWindow(new Date("2026-11-06T17:00:00Z"), "Europe/London"), "17:00 is the end");
  assert.ok(!inWindow(new Date("2026-11-07T11:00:00Z"), "Europe/London"), "Saturday");
  assert.ok(!inWindow(new Date("2026-11-06T08:30:00Z"), "Europe/London"));
  assert.ok(inWindow(new Date("2026-07-06T08:30:00Z"), "Europe/London"), "09:30 in summer time");
  const f = followUpDate(new Date("2026-11-04T10:00:00Z"), "Europe/London", () => 0.9); // Wed + 5 = Mon
  assert.equal(localParts(f, "Europe/London").date, "2026-11-09");
  const g = followUpDate(new Date("2026-11-02T10:00:00Z"), "Europe/London", () => 0.1); // Mon + 4 = Fri
  assert.equal(localParts(g, "Europe/London").date, "2026-11-06");
});

function fakeDeps(over: Partial<PrepareDeps> & { settings?: () => Promise<Settings> } = {}) {
  const inserted: unknown[] = [];
  const base: PrepareDeps = {
    settings: async () => ({ sending_open: false, test_mode: true, open_countries: [], ramp_week1: 3, ramp_week2: 5, ramp_after: 10, monthly_cap: 300, started_on: null, stopped_reason: null }),
    refreshSuppression: async () => {}, register: async () => { throw new Error("test mode never reads the register"); },
    page: async () => { throw new Error("test mode never reads a real page"); },
    eligible: async () => true, queuedFor: async () => 0, sentThisMonth: async () => 0,
    insert: async (d) => void inserted.push(d), testRecipients: ["inbox@test.example.com"], now: NOW,
  };
  return { deps: { ...base, ...over }, inserted };
}

Deno.test("test mode: fixture businesses only, addressed to the test recipients, up to the day's cap", async () => {
  const { deps, inserted } = fakeDeps();
  const r = await prepare(deps);
  assert.equal(r.state, "test");
  assert.equal(r.drafted, 3);
  for (const d of inserted as { prospect: { email: string; test: boolean; company_status: string; company_status_date: string | null }; first: { to_address: string; send_after: string } }[]) {
    assert.match(d.prospect.email, /@[a-z]+\.example\.com$/);
    assert.deepEqual([d.prospect.company_status, d.prospect.company_status_date], ["test", null], "no file date shown for a test row");
    assert.equal(d.prospect.test, true);
    assert.equal(d.first.to_address, "inbox@test.example.com");
    assert.equal(localParts(new Date(d.first.send_after), "Europe/London").date, "2026-11-09", "Friday prepares Monday");
  }
  assert.deepEqual((inserted as { prospect: { detail_kind: string } }[]).map((d) => d.prospect.detail_kind), ["booking", "hours", "instagram"]);
});

Deno.test("locked, stopped, full, or no test recipients: nothing is drafted", async () => {
  const locked = fakeDeps({ settings: async () => ({ ...(await fakeDeps().deps.settings()), test_mode: false }) });
  assert.equal((await prepare(locked.deps)).state, "locked");
  const stopped = fakeDeps({ settings: async () => ({ ...(await fakeDeps().deps.settings()), stopped_reason: "complaint" }) });
  assert.equal((await prepare(stopped.deps)).state, "stopped");
  assert.equal((await prepare(fakeDeps({ queuedFor: async () => 3 }).deps)).state, "full");
  assert.equal((await prepare(fakeDeps({ testRecipients: [] }).deps)).state, "no_test_recipients");
  assert.equal((await prepare(fakeDeps({ eligible: async () => false }).deps)).drafted, 0, "suppressed or known: no draft");
});

Deno.test("open: only active registered companies whose page still shows the address and has a detail", async () => {
  const base = fixtureRows("x");
  // Five fictional companies: Active on a fresh file (two, one page no longer shows the address), dissolved, Active on
  // a stale file, Active - Proposal to Strike off.
  const rows = [
    { ...base[0], company_status: "Active", company_status_date: "2026-10-30" },
    { ...base[1], company_status: "Dissolved", company_status_date: "2026-10-30" },
    { ...base[2], company_status: "Active", company_status_date: "2026-10-30" },
    { ...base[0], company_id: "stale", email: "hi@stale.example.com", website: "https://stale.example.com", email_page_url: "https://stale.example.com/c", company_status: "Active", company_status_date: "2026-09-01" },
    { ...base[1], company_id: "strike", email: "hi@strike.example.com", website: "https://strike.example.com", email_page_url: "https://strike.example.com/c", company_status: "Active - Proposal to Strike off", company_status_date: "2026-10-30" },
  ];
  const cols = ["company_id", "business_name", "industry", "country", "city", "website", "email", "email_page_url", "company_type", "company_number", "company_status", "company_status_date", "quality_score"];
  const csv = [cols.join(","), ...rows.map((r) => cols.map((k) => (k === "company_number" ? "01234567" : `"${r[k]}"`)).join(","))].join("\n");
  const pages: Record<string, string> = Object.fromEntries(rows.map((r) => [r.email_page_url, r.html]));
  pages[rows[2].email_page_url] = "<p>no address here</p>";
  const read: string[] = [];
  const { deps, inserted } = fakeDeps({
    settings: async () => ({ sending_open: true, test_mode: true, open_countries: ["GB"], ramp_week1: 3, ramp_week2: 5, ramp_after: 10, monthly_cap: 300, started_on: "2026-11-02", stopped_reason: null }),
    register: async () => csv,
    page: async (u) => (read.push(u), { html: pages[u] ?? "" }),
  });
  const r = await prepare(deps);
  assert.equal(r.state, "open");
  assert.equal(r.drafted, 1);
  assert.equal(r.refused.company_not_active, 2, "dissolved, and Active - Proposal to Strike off");
  assert.equal(r.refused.company_status_stale, 1);
  assert.equal(r.refused.email_not_on_page ?? 0, 1);
  assert.deepEqual(read.sort(), [rows[0].email_page_url, rows[2].email_page_url].sort(), "a refused company's page is never read");
  for (const d of inserted as { prospect: { test: boolean; email: string; company_status: string; company_status_date: string }; first: { to_address: string } }[]) {
    assert.equal(d.prospect.test, false);
    assert.equal(d.first.to_address, d.prospect.email, "a real run writes to the business's own address");
    assert.equal(d.prospect.company_status, "active");
    assert.equal(d.prospect.company_status_date, "2026-10-30");
  }
});

Deno.test("robots.txt wildcards and end anchors, without building a pattern from the file", () => {
  assert.ok(!robotsAllows("User-agent: *\nDisallow: /*.pdf$", "/menu.pdf"));
  assert.ok(robotsAllows("User-agent: *\nDisallow: /*.pdf$", "/menu.pdf.html"));
  assert.ok(!robotsAllows("User-agent: *\nDisallow: /team/*/private", "/team/a/private/x"));
  assert.ok(robotsAllows("User-agent: *\nDisallow: /(.*)+$", "/contact"), "a rule is text, never a pattern");
});

Deno.test("a hostile page is examined in linear time", () => {
  const t = Date.now();
  for (const page of ["<".repeat(300_000), "href=".repeat(60_000), "<script src".repeat(30_000), "© ".repeat(150_000)]) {
    pickDetail(page, NOW);
    emailOnPage(page, "hello@rose.example.com");
  }
  assert.ok(Date.now() - t < 3000, `took ${Date.now() - t} ms`);
});

Deno.test("entities are decoded once: &amp;#64; is not an @", () => {
  assert.ok(!emailOnPage("<p>hello&amp;#64;rose.example.com</p>", "hello@rose.example.com"));
  assert.ok(emailOnPage("<p>hello&#64;rose.example.com</p>", "hello@rose.example.com"));
});

Deno.test("the possessive: a name ending in s takes only an apostrophe, in every subject and body", () => {
  assert.equal(possessive("Rose Lane Salon"), "Rose Lane Salon's");
  assert.equal(possessive("Harbor Barbers"), "Harbor Barbers'");
  assert.equal(possessive("Maple Nails"), "Maple Nails'");
  assert.equal(possessive("Moss"), "Moss'", "a name ending in ss");
  assert.equal(possessive("Harbor Barbers'"), "Harbor Barbers'", "an apostrophe already there is kept, never doubled");
  assert.equal(possessive("Harbor Barbers\u2019"), "Harbor Barbers\u2019", "a curly apostrophe is kept too");
  assert.equal(possessive("Rose Lane Salon "), "Rose Lane Salon's", "trailing space is dropped");
  for (const [name, own] of [["Harbor Barbers", "Harbor Barbers'"], ["Moss", "Moss'"], ["Maple Nails'", "Maple Nails'"], ["Rose Lane Salon", "Rose Lane Salon's"]]) {
    const one = emailOne({ business: name, kind: "barbers", city: "Exampleton", detail: "Your site lists your opening hours, and keeping Google's hours the same saves wasted trips." });
    const two = followUp({ business: name });
    assert.equal(one.subject, `${own} Google profile`);
    assert.ok(one.body.includes(`Want me to run a free check of ${own} Google profile and send you what I find?`));
    assert.equal(two.subject, `Re: ${own} Google profile`);
    assert.ok(two.body.startsWith(`Hi again. Happy to run that free check of ${own} Google profile if useful.`));
    for (const t of [one.subject, one.body, two.subject, two.body]) {
      assert.ok(!/s's |''/.test(t), "no s's and no doubled apostrophe");
      assert.ok(houseStyleOk(t), "no dashes or exclamation marks");
    }
    assert.ok(linksOk(one.body, "first") && linksOk(two.body, "follow_up"));
  }
});
