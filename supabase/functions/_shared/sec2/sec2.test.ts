// Sec 2 (27 Oct 2026): the stale email yes, codes out of query strings, body size limits, the unsubscribe key and
// Turnstile failing closed. Pure: stub dependencies, no database or network.
import * as assert from "jsr:@std/assert@1/equal";
import { assert as ok, assertEquals, assertMatch } from "jsr:@std/assert@1";
import { BODY_LIMITS, capBody, withBodyCap } from "../body-cap.ts";
import { type EmailLinkDeps, linkRefusal, linkRequest, type LinkView, readJsonCapped, type UseInput } from "../email-links.ts";
import { holidayRequest, type HolidayLinkDeps } from "../holiday-link.ts";
import { signUnsubscribe, unsubscribeRequest, unsubscribeToken, type UnsubscribeClaim } from "../email/unsubscribe.ts";
import { errorText, scrubText } from "../log-scrub.ts";
import { isLocalRun } from "../kabsi.ts";

void assert;
const TOKEN = "t".repeat(43);
const OWNER = "00000000-0000-4000-8000-0000000000a1";
const read = (f: string) => Deno.readTextFileSync(new URL(f, import.meta.url));

function actionWorld(o: { fail?: string } = {}) {
  const calls = { use: [] as UseInput[], view: 0 };
  const deps: EmailLinkDeps = {
    sessionUser: () => Promise.resolve(OWNER),
    view: () => {
      calls.view++;
      return Promise.resolve({ status: "ok", action: "post", target_type: "review", target_id: "r1", user_id: OWNER } as LinkView);
    },
    details: () => Promise.resolve({ draft: "Thank you, version 2.", draft_version: 2 }),
    mode: () => Promise.resolve("mock"),
    use: (_h, input) => {
      calls.use.push(input);
      if (o.fail) return Promise.reject(new Error(o.fail));
      return Promise.resolve({ done: "approved", state: "approved", publication_id: "p1", publish_after: null });
    },
  };
  return { deps, calls };
}
const post = (url: string, body: unknown) => new Request(url, { method: "POST", body: JSON.stringify(body) });

Deno.test("sec2 /a: the page reads with POST { do: view }; a GET with the token in the address is refused unread", async () => {
  const w = actionWorld();
  const get = await linkRequest(new Request(`https://x.test/functions/v1/api/action?t=${TOKEN}`), w.deps);
  assertEquals(get.status, 405);
  assertEquals(w.calls.view, 0, "nothing was looked up for a GET");
  const view = await linkRequest(post("https://x.test/functions/v1/api/action", { t: TOKEN, do: "view" }), w.deps);
  assertEquals(view.status, 200);
  assertEquals(view.body.draft_version, 2, "the page learns the version it shows");
  assertEquals(w.calls.use.length, 0, "viewing never acts");
  // The page side (src/lib/reviews.ts) is checked in tests/sec2-codes.test.ts.
});

Deno.test("sec2 /a: a post carries the version the page showed, and a newer draft is refused as reply_changed", async () => {
  const w = actionWorld();
  await linkRequest(post("https://x.test/a", { t: TOKEN, do: "post", text: "Thank you, version 1.", version: 1 }), w.deps);
  assertEquals(w.calls.use[0].version, 1);
  // Not a whole number: no version is passed, and the database refuses a post without one.
  const w2 = actionWorld();
  await linkRequest(post("https://x.test/a", { t: TOKEN, do: "post", text: "x", version: "1" }), w2.deps);
  assertEquals(w2.calls.use[0].version, undefined);
  const stale = actionWorld({ fail: "reply_changed" });
  const r = await linkRequest(post("https://x.test/a", { t: TOKEN, do: "post", text: "x", version: 1 }), stale.deps);
  assertEquals(r.status, 409);
  assertEquals(r.body.error, "reply_changed");
  assertEquals(linkRefusal("reply_changed")?.status, 409);
  // The database side (use_action_link compares the version under the review's lock) is driven by the property test.
});

Deno.test("sec2 /a: the body is capped at 16 KB", async () => {
  const w = actionWorld();
  const big = await linkRequest(post("https://x.test/a", { t: TOKEN, do: "post", text: "x".repeat(20_000) }), w.deps);
  assertEquals(big.status, 413);
  assertEquals(w.calls.use.length + w.calls.view, 0);
});

Deno.test("sec2 /h: GET is refused; reading is POST { do: view }", async () => {
  let viewed = 0;
  const deps = {
    sessionUser: () => Promise.resolve(null),
    view: () => (viewed++, Promise.resolve({ status: "ok" })),
    mode: () => Promise.resolve("mock"),
    use: () => Promise.reject(new Error("not here")),
    undo: () => Promise.reject(new Error("not here")),
  } as unknown as HolidayLinkDeps;
  assertEquals((await holidayRequest(new Request(`https://x.test/api/holiday?t=${TOKEN}`), deps)).status, 405);
  assertEquals(viewed, 0);
  assertEquals((await holidayRequest(post("https://x.test/api/holiday", { t: TOKEN, do: "view" }), deps)).status, 200);
  assertEquals(viewed, 1);
});

Deno.test("sec2 body caps: a declared or streamed body past the limit is 413 and never reaches the handler", async () => {
  let reached = 0;
  const h = withBodyCap((req) => req.json().then(() => (reached++, new Response("ok"))), 100);
  assertEquals((await h(post("https://x.test", { a: "x".repeat(50) }))).status, 200);
  assertEquals((await h(post("https://x.test", { a: "x".repeat(500) }))).status, 413);
  const stream = new ReadableStream({
    start(c) {
      for (let i = 0; i < 10; i++) c.enqueue(new TextEncoder().encode("x".repeat(50)));
      c.close();
    },
  });
  const chunked = new Request("https://x.test", { method: "POST", body: stream, duplex: "half" } as RequestInit);
  assertEquals((await h(chunked)).status, 413, "no content-length: counted while reading");
  assertEquals(reached, 1);
  const get = new Request("https://x.test/?q=1");
  assertEquals(await capBody(get, 1), get, "GET passes untouched");
  assertEquals(await readJsonCapped(post("https://x.test", { a: 1 }), 100), { a: 1 });
  assertEquals(await readJsonCapped(new Request("https://x.test", { method: "POST", body: "not json" }), 100), null);
  ok(BODY_LIMITS.small < BODY_LIMITS.form && BODY_LIMITS.form < BODY_LIMITS.chat);
});

Deno.test("sec2 body caps: every public function caps its body before it reads it", () => {
  for (const fn of ["consent", "review-page", "assistant", "places-search", "visibility", "programs", "review-link", "api"]) {
    const src = read(`../../${fn}/index.ts`);
    assertMatch(src, /const capped = await capBody\(req, BODY_LIMITS\.\w+, CORS\);/, fn);
  }
  for (const fn of ["auth-code", "profile-snapshot"]) assertMatch(read(`../../${fn}/index.ts`), /withBodyCap\(makeHandler/, fn);
  assertMatch(read("../../email/index.ts"), /capBody\(req, 4096/);
});

Deno.test("sec2 limits: consent and the review page fail closed when the limiter breaks", () => {
  assertMatch(read("../../consent/index.ts"), /rateLimit\(`consent:.*, 30, 3600, \{ failClosed: true \}\)/);
  assertMatch(read("../../review-page/index.ts"), /rateLimit\(`review-page:.*, 120, 3600, \{ failClosed: true \}\)/);
});

const CLAIM: UnsubscribeClaim = { a: "owner@example.test", u: OWNER, l: "loc-a", c: "weekly_report" };
Deno.test("sec2 /unsubscribe: new links are signed with their own key; links signed before with the cron secret still work", async () => {
  const NEW = "new-unsubscribe-key-not-a-secret", OLD = "old-cron-secret-not-a-secret";
  const applied: UnsubscribeClaim[] = [];
  const deps = {
    secret: () => Promise.resolve(NEW),
    oldSecret: () => Promise.resolve(OLD),
    label: () => "weekly report",
    apply: (c: UnsubscribeClaim) => (applied.push(c), Promise.resolve(true)),
  };
  for (const key of [NEW, OLD]) {
    const r = await unsubscribeRequest("POST", await signUnsubscribe(CLAIM, key), deps);
    assertEquals(r.status, 200, key);
  }
  assertEquals((await unsubscribeRequest("POST", await signUnsubscribe(CLAIM, "someone-else"), deps)).status, 400);
  assertEquals(applied.length, 2);
  // Without the old key, an old link no longer verifies.
  const strict = { ...deps, oldSecret: undefined };
  assertEquals((await unsubscribeRequest("POST", await signUnsubscribe(CLAIM, OLD), strict)).status, 400);
});

Deno.test("sec2 /unsubscribe: the token is read from the path, the body, then (old links) the query", () => {
  assertEquals(unsubscribeToken(new URL("https://x.test/functions/v1/email/unsubscribe/abc.def"), null), "abc.def");
  assertEquals(unsubscribeToken(new URL("https://x.test/functions/v1/email/unsubscribe"), { t: "body.tok" }), "body.tok");
  assertEquals(unsubscribeToken(new URL("https://x.test/functions/v1/email/unsubscribe?t=old.tok"), null), "old.tok");
  assertEquals(scrubText("POST /functions/v1/email/unsubscribe/abc.def failed"), "POST /functions/v1/email/unsubscribe/[redacted] failed");
});

Deno.test("sec2 codes: the resume code, the free check code, the card code and the holiday token leave query strings", () => {
  assertMatch(read("../../api/resume.ts"), /if \(req\.method !== "POST"\)/);
  ok(!/searchParams\.get\("code"\)/.test(read("../../api/resume.ts")));
  ok(!/searchParams\.get\("code"\)/.test(read("../../visibility/index.ts")), "the free check result is POST /check/result");
  ok(!/searchParams\.get\("check"\)/.test(read("../../visibility/index.ts")), "the nearby image takes the code in a header");
  assertMatch(read("../../tap/index.ts"), /x-kabsi-code/);
  // The Worker and the browser side are checked in tests/sec2-codes.test.ts.
});

Deno.test("sec2 Turnstile: a missing secret fails closed outside a local stack", () => {
  const env = (m: Record<string, string>) => (n: string) => m[n];
  assertEquals(isLocalRun(env({ SUPABASE_URL: "https://ynjdqjlmdwjgbfezevxy.supabase.co" })), false);
  assertEquals(isLocalRun(env({ SUPABASE_URL: "http://127.0.0.1:54321" })), true);
  assertEquals(isLocalRun(env({ SUPABASE_URL: "http://kong:8000" })), true);
  assertEquals(isLocalRun(env({})), false, "no address is not a local run");
  const src = read("../kabsi.ts");
  assertMatch(src, /if \(!secret\) \{\n\s+if \(isLocalRun\(\)\) return true;[\s\S]*?return false;\n\s+\}/);
});

Deno.test("sec2 errors shown to staff are scrubbed", () => {
  assertEquals(errorText(new Error("send to owner@example.test or +1 555 010 0101 failed, see ?t=secret")), "send to [email] or [phone] failed, see ?t=[redacted]");
  assertEquals(errorText("x".repeat(600), 500).length, 500);
  for (const f of ["../publish.ts", "../whatsapp/deliver.ts"]) ok(!/String\(e\)\.slice\(0, 500\)|String\(\(e as Error\)\?\.message \?\? e\)\.slice\(0, 300\)/.test(read(f)), f);
  const db = read("../whatsapp/db.ts");
  assertMatch(db, /p_error: r\.error \? errorText\(r\.error, 300\) : null/);
});

Deno.test("sec2 drafts: a redraft never puts a review back to a draft under a waiting yes", () => {
  const src = read("../reviews.ts");
  assertMatch(src, /if \(rv\.state === "publishing" \|\| rv\.state === "posted"\) throw new Error\("reply_publishing"\)/);
  assertMatch(src, /db\.rpc\("save_reply_draft"/);
  assertMatch(src, /db\.rpc\("block_reply_draft"/);
  ok(!/from\("reply_drafts"\)\.insert/.test(src), "no draft insert outside save_reply_draft");
  assertMatch(read("../../api/approve.ts"), /msg\.includes\("reply_publishing"\)/);
});

Deno.test("sec2 webhooks: a refused call is counted for the operations view; an accepted one is not", async () => {
  const { counted } = await import("../webhook-rejections.ts");
  const seen: string[] = [];
  const rec = (s: string, r: string) => (seen.push(`${s}:${r}`), Promise.resolve());
  for (const status of [200, 202, 400, 401, 403, 413, 500]) await counted("creem", new Response(null, { status }), rec);
  assertEquals(seen, ["creem:status_401", "creem:status_403", "creem:status_413"]);
  // A failing count never changes the answer.
  const res = await counted("resend", new Response(null, { status: 401 }), () => Promise.reject(new Error("db down")));
  assertEquals(res.status, 401);
  for (const [fn, src] of [["billing-creem", "creem"], ["whatsapp", "whatsapp"], ["google-events", "google_events"], ["email", "resend"]]) {
    assertMatch(read(`../../${fn}/index.ts`), new RegExp(`counted\\("${src}", await `), fn);
  }
});

Deno.test("sec2 Nora: a yes to news counts only for the signed-in person's own address", async () => {
  const { newsConsent } = await import("../nora-contact.ts");
  const now = new Date("2026-10-27T12:00:00Z");
  assertEquals(newsConsent({ asked: true, email: "me@example.test", signedInEmail: "ME@example.test", current: false }, now), { marketing_consent: true });
  assertEquals(newsConsent({ asked: true, email: "someone@example.test", signedInEmail: null, current: false }, now),
    { marketing_consent: false, news_requested_at: "2026-10-27T12:00:00.000Z" }, "a typed address is only a request");
  assertEquals(newsConsent({ asked: true, email: "someone@example.test", signedInEmail: "me@example.test", current: null }, now).marketing_consent, false);
  assertEquals(newsConsent({ asked: false, email: "x@example.test", current: true }), { marketing_consent: true }, "an earlier yes is not taken away");
  assertMatch(read("../../assistant/index.ts"), /\.\.\.news\(false\)/);
  ok(!/marketing_consent: input\.marketing_consent === true/.test(read("../../assistant/index.ts")));
});
