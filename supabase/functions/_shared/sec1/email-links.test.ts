// Sec 1: email links never act on open. A GET only shows a page, a POST acts, and a HEAD (or any other method a link
// scanner sends) does nothing at all. Links are hashed before they leave the function, expire, are used once, and are
// bound to their business and their person. The one POST without a page is the RFC 8058 one-click unsubscribe, and its
// token is signed, so a plain address unsubscribes nobody. The database half (STABLE view, one use, 72 hours, the
// recipient check) is in supabase/tests/email_approvals.sql and email_suppressions.sql.
// Run with: deno test --no-check --allow-read _shared/ (scripts/deno-check.sh).
import assert from "node:assert/strict";
import {
  type EmailLinkDeps,
  hashToken,
  LINK_HEADERS,
  linkGet,
  linkPost,
  linkRequest,
  type LinkResult,
  type LinkView,
  type UseInput,
} from "../email-links.ts";
import { type HolidayLinkDeps, holidayRequest, type HolidayView } from "../holiday-link.ts";
import { newToken } from "../holiday.ts";
import {
  signUnsubscribe,
  type UnsubscribeClaim,
  unsubscribeHeaders,
  UNSUBSCRIBE_HEADERS,
  unsubscribeRequest,
} from "../email/unsubscribe.ts";

const TOKEN = "Zk3n" + "x".repeat(39); // 43 characters, the length of 32 random bytes in URL-safe base64
const OWNER = "00000000-0000-4000-8000-0000000000a1";
const OTHER = "00000000-0000-4000-8000-0000000000b2";
const PUB = "00000000-0000-4000-8000-000000000901";
const SCANNER_METHODS = ["HEAD", "PUT", "PATCH", "DELETE"];
const read = (rel: string) => Deno.readTextFileSync(new URL(rel, import.meta.url));

// ── /a: the action link ───────────────────────────────────────────────────────────────────────────────────────────

function actionWorld(o: { view?: Partial<LinkView>; session?: string | null; use?: (input: UseInput) => LinkResult } = {}) {
  const calls = { session: 0, view: [] as string[], details: 0, use: [] as { hash: string; input: UseInput; recipient: string | null }[] };
  const deps: EmailLinkDeps = {
    sessionUser: () => {
      calls.session++;
      return Promise.resolve(o.session ?? null);
    },
    view: (hash, session) => {
      calls.view.push(hash);
      return Promise.resolve({
        status: "ok", action: "post", target_type: "review", target_id: "r1", location_id: "loc-a", user_id: OWNER, sign_in: false,
        signed_in: session === OWNER, other_account: session !== null && session !== OWNER, result: null, ...o.view,
      });
    },
    details: () => {
      calls.details++;
      return Promise.resolve({ business: "QA Bakery", review: { id: "r1" }, draft: "Thank you." });
    },
    mode: () => Promise.resolve("mock"),
    use: (hash, input, recipient) => {
      calls.use.push({ hash, input, recipient });
      return Promise.resolve(o.use ? o.use(input) : { done: "approved", state: "approved", publication_id: PUB, publish_after: null });
    },
  };
  return { deps, calls };
}
// Sec 2: reading is POST { do: "view" }; the token is never in the address. A GET (with the old ?t=) is refused unread.
const get = (q = TOKEN, method = "GET") =>
  method === "GET" ? new Request("https://x.supabase.co/functions/v1/api/action", { method: "POST", body: JSON.stringify({ t: q, do: "view" }) })
    : new Request(`https://x.supabase.co/functions/v1/api/action?t=${encodeURIComponent(q)}`, { method });
const post = (body: unknown) => new Request("https://x.supabase.co/functions/v1/api/action", { method: "POST", body: JSON.stringify(body) });

Deno.test("sec1 /a: GET never acts, whatever state the link is in", async () => {
  for (const status of ["ok", "used", "expired", "invalid"] as const) {
    for (const session of [null, OWNER, OTHER]) {
      const { deps, calls } = actionWorld({ view: { status }, session });
      const r = await linkRequest(get(), deps);
      assert.equal(calls.use.length, 0, `${status} ${session}: GET never calls use_action_link`);
      assert.ok(r.status === 200 || r.status === 404);
    }
  }
});

Deno.test("sec1 /a and /h (Sec 2): a GET with the token in the address is refused before any lookup", async () => {
  const a = actionWorld();
  const r = await linkRequest(new Request(`https://x.supabase.co/functions/v1/api/action?t=${TOKEN}`), a.deps);
  assert.equal(r.status, 405);
  assert.equal(a.calls.use.length + a.calls.view.length + a.calls.details + a.calls.session, 0, "nothing was read or done");
  const h = holidayWorld();
  const rh = await holidayRequest(new Request(`https://x.supabase.co/functions/v1/api/holiday?t=${TOKEN}`), h.deps);
  assert.equal(rh.status, 405);
  assert.equal(h.calls.view.length + h.calls.use.length + h.calls.undo.length + h.calls.session, 0);
});

Deno.test("sec1 /a: HEAD and other scanner methods never act and never look the link up", async () => {
  for (const method of SCANNER_METHODS) {
    const { deps, calls } = actionWorld();
    const r = await linkRequest(get(TOKEN, method), deps);
    assert.equal(r.status, 405, method);
    assert.equal(calls.use.length + calls.view.length + calls.details + calls.session, 0, `${method}: nothing was read or done`);
  }
});

Deno.test("sec1 /a: POST acts once, through the hash only", async () => {
  const { deps, calls } = actionWorld({ session: OWNER });
  const r = await linkRequest(post({ t: TOKEN, do: "post", text: "Thank you." }), deps);
  assert.equal(r.status, 200);
  assert.equal(calls.use.length, 1);
  assert.equal(calls.use[0].hash, await hashToken(TOKEN));
  assert.notEqual(calls.use[0].hash, TOKEN);
});

Deno.test("sec1 /a: the token is hashed with SHA-256 before any lookup, and the raw token goes nowhere", async () => {
  // SHA-256("abc"), the FIPS 180-2 test vector.
  assert.equal(await hashToken("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  const { deps, calls } = actionWorld({ session: OWNER });
  await linkGet(TOKEN, deps);
  await linkPost({ t: TOKEN, do: "skip" }, deps);
  for (const h of [...calls.view, ...calls.use.map((u) => u.hash)]) assert.match(h, /^[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(calls).includes(TOKEN), "the raw token reached no dependency");
});

Deno.test("sec1 /a: expired and used links are refused, and their page shows nothing of the item", async () => {
  const expired = actionWorld({ view: { status: "expired" } });
  const g = await linkGet(TOKEN, expired.deps);
  assert.equal(g.body.status, "expired");
  assert.equal(expired.calls.details, 0, "an expired link shows nothing");
  for (const [msg, code, status] of [["link_expired", "expired", 410], ["link_used", "used", 409]] as const) {
    const w = actionWorld({ use: () => { throw new Error(msg); } });
    const r = await linkPost({ t: TOKEN, do: "post", text: "x" }, w.deps);
    assert.equal(r.status, status);
    assert.equal(r.body.error, code);
  }
});

Deno.test("sec1 /a: single use, a second POST only reads back the first result", async () => {
  const { deps } = actionWorld({ use: () => ({ done: "approved", state: "published", publication_id: PUB, repeat: true }) });
  const r = await linkPost({ t: TOKEN, do: "skip" }, deps);
  assert.equal(r.body.repeat, true);
  assert.equal(r.body.done, "approved", "a different verb on a used link does nothing new");
});

Deno.test("sec1 /a: bound to its person, another signed-in account can neither act nor see the item", async () => {
  for (const sign_in of [false, true]) {
    const w = actionWorld({ view: { sign_in }, session: OTHER });
    for (const verb of ["post", "skip", "handle_myself", "revert", "keep"]) {
      const r = await linkPost({ t: TOKEN, do: verb, text: "x" }, w.deps);
      assert.equal(r.status, 403, `${verb} sign_in=${sign_in}`);
      assert.equal(r.body.error, "wrong_account");
    }
    const undo = await linkPost({ t: TOKEN, do: "undo", publication: PUB }, w.deps);
    assert.equal(undo.body.error, "wrong_account", "nor undo the recipient's approval");
    assert.equal(w.calls.use.length, 0, "nothing reached use_action_link");
    const g = await linkGet(TOKEN, w.deps);
    assert.equal(g.body.other_account, true);
    assert.equal(w.calls.details, 0, `sign_in=${sign_in}: another account sees nothing of the review`);
    assert.equal(g.body.draft, undefined);
  }
  // Signed out, a link that needs no sign-in still works on the token alone (K-17), as its recipient.
  const out = actionWorld({ session: null });
  const r = await linkPost({ t: TOKEN, do: "post", text: "x" }, out.deps);
  assert.equal(r.status, 200);
  assert.equal(out.calls.use[0].recipient, OWNER);
});

Deno.test("sec1 /a: bound to its business, the request cannot name another business, person or item", async () => {
  const { deps, calls } = actionWorld({ session: OWNER });
  await linkPost({ t: TOKEN, do: "post", text: "x", location_id: "loc-b", user_id: OTHER, target_id: "r-other", recipient: OTHER }, deps);
  assert.deepEqual(calls.use[0].input, { do: "post", text: "x", session: OWNER, publication: undefined, version: undefined }, "only the verb, text, version and session pass");
  assert.equal(calls.use[0].recipient, OWNER, "the recipient comes from the stored link, not the request");
});

Deno.test("sec1 /a: answers are never cached and never sent as a Referer", () => {
  assert.equal(LINK_HEADERS["cache-control"], "no-store");
  assert.equal(LINK_HEADERS["referrer-policy"], "no-referrer");
  for (const file of ["../../api/action.ts", "../../api/holiday.ts"]) {
    const src = read(file);
    const calls = src.match(/\bjson\([^;]*;/g) ?? [];
    assert.ok(calls.length >= 3, file);
    for (const c of calls) assert.match(c, /LINK_HEADERS/, `${file}: every answer carries LINK_HEADERS: ${c}`);
    assert.doesNotMatch(src, /\bfail\(/, `${file}: no answer without the headers`);
  }
});

Deno.test("sec1 /a /h /unsubscribe: the token is never logged", () => {
  for (const file of ["../../api/action.ts", "../../api/holiday.ts", "../../email/index.ts", "../email-links.ts", "../holiday-link.ts", "../email/unsubscribe.ts"]) {
    const src = read(file);
    assert.doesNotMatch(src, /console\.(log|info|warn|error|debug)/, `${file}: no console output`);
    for (const line of src.split("\n").filter((l) => /\b(log|captureError)\(/.test(l) && !/^\s*(\/\/|export|import)/.test(l))) {
      assert.doesNotMatch(line, /req\.url|searchParams|\btoken\b|\bt:|body\.t\b|claim\.a\b/, `${file}: ${line.trim()}`);
    }
  }
});

Deno.test("sec1 /a /h: tokens are 32 random bytes, stored only as their SHA-256", () => {
  const reviews = read("../reviews.ts");
  const fn = reviews.slice(reviews.indexOf("export async function actionLink"), reviews.indexOf("// ─── 4."));
  assert.match(fn, /crypto\.getRandomValues\(new Uint8Array\(32\)\)/, "the action link uses 32 random bytes");
  assert.match(fn, /token_hash: await sha256Hex\(token\)/, "only the hash is stored");
  assert.doesNotMatch(fn, /token:\s|token_raw|raw_token/, "the raw token is not stored");
  const holiday = read("../holiday.ts");
  assert.match(read("../../api/jobs.ts"), /random: \(\) => crypto\.getRandomValues\(new Uint8Array\(32\)\)/, "the holiday link uses 32 random bytes");
  assert.match(holiday, /const hash = await deps\.sha256\(token\);\s*await deps\.markSent\(ask\.id, hash,/, "and stores only the hash");
  const t = newToken(crypto.getRandomValues(new Uint8Array(32)));
  assert.match(t, /^[A-Za-z0-9_-]{43}$/, "URL-safe, 256 bits");
});

// ── /h: the holiday link ──────────────────────────────────────────────────────────────────────────────────────────

function holidayWorld(o: { view?: Partial<HolidayView>; session?: string | null; fail?: string } = {}) {
  const calls = { view: [] as string[], use: [] as { hash: string; input: Record<string, unknown> }[], undo: [] as { hash: string; user: string | null }[], session: 0 };
  const deps: HolidayLinkDeps = {
    sessionUser: () => {
      calls.session++;
      return Promise.resolve(o.session ?? null);
    },
    view: (hash) => {
      calls.view.push(hash);
      return Promise.resolve({ status: "ok", business: "QA Bakery", location_id: "loc-a", ...o.view } as HolidayView);
    },
    use: (hash, input) => {
      calls.use.push({ hash, input: input as unknown as Record<string, unknown> });
      if (o.fail) return Promise.reject(new Error(o.fail));
      return Promise.resolve({ state: "answered", answer: input.answer });
    },
    undo: (hash, user) => {
      calls.undo.push({ hash, user });
      return Promise.resolve(null);
    },
  };
  return { deps, calls };
}
const hget = (method = "GET") =>
  method === "GET" ? new Request("https://x.supabase.co/functions/v1/api/holiday", { method: "POST", body: JSON.stringify({ t: TOKEN, do: "view" }) })
    : new Request(`https://x.supabase.co/functions/v1/api/holiday?t=${TOKEN}`, { method });
const hpost = (body: unknown) => new Request("https://x.supabase.co/functions/v1/api/holiday", { method: "POST", body: JSON.stringify(body) });

Deno.test("sec1 /h: GET never acts, HEAD and the rest do nothing at all", async () => {
  for (const status of ["ok", "answered", "expired", "invalid"] as const) {
    const { deps, calls } = holidayWorld({ view: { status } });
    await holidayRequest(hget(), deps);
    assert.equal(calls.use.length + calls.undo.length, 0, status);
  }
  for (const method of SCANNER_METHODS) {
    const { deps, calls } = holidayWorld();
    const r = await holidayRequest(hget(method), deps);
    assert.equal(r.status, 405, method);
    assert.equal(calls.view.length + calls.use.length + calls.undo.length + calls.session, 0, method);
  }
});

Deno.test("sec1 /h: POST acts once through the hash, and the request cannot name another business", async () => {
  const { deps, calls } = holidayWorld({ session: OWNER });
  const r = await holidayRequest(hpost({ t: TOKEN, do: "answer", answer: "closed", location_id: "loc-b", user: OTHER }), deps);
  assert.equal(r.status, 200);
  assert.equal(calls.use.length, 1);
  assert.equal(calls.use[0].hash, await hashToken(TOKEN));
  assert.equal(calls.use[0].input.session, OWNER, "the person is the verified session, never a field of the request");
  assert.ok(!("location_id" in calls.use[0].input) && !("user" in calls.use[0].input), "no business or person from the request");
});

Deno.test("sec1 /h: expiry, a used link, another business's member and a signed-out approval are refused", async () => {
  for (const [msg, code, status] of [
    ["link_expired", "expired", 410], ["holiday_passed", "holiday_passed", 410], ["not_member", "not_member", 403],
    ["sign_in_required", "sign_in_required", 401], ["not_allowed_to_approve", "owner_approves", 403],
  ] as const) {
    const { deps } = holidayWorld({ fail: msg, session: OTHER });
    const r = await holidayRequest(hpost({ t: TOKEN, do: "answer", answer: "closed" }), deps);
    assert.equal(r.status, status, msg);
    assert.equal(r.body.error, code, msg);
  }
});

// ── /unsubscribe and List-Unsubscribe-Post (RFC 8058) ─────────────────────────────────────────────────────────────

const KEY = "test-signing-key-not-a-secret";
const CLAIM: UnsubscribeClaim = { a: "owner@example.test", u: OWNER, l: "loc-a", c: "weekly_report" };
function unsubWorld(key: string | null = KEY) {
  const calls = { secret: 0, apply: [] as UnsubscribeClaim[] };
  return {
    calls,
    deps: {
      secret: () => {
        calls.secret++;
        return Promise.resolve(key);
      },
      label: (c: string) => (c === "weekly_report" ? "Weekly report" : "these"),
      apply: (claim: UnsubscribeClaim) => {
        calls.apply.push(claim);
        return Promise.resolve(true);
      },
    },
  };
}

Deno.test("sec1 /unsubscribe: GET shows what would stop and changes nothing", async () => {
  const t = await signUnsubscribe(CLAIM, KEY);
  const { deps, calls } = unsubWorld();
  const r = await unsubscribeRequest("GET", t, deps);
  assert.equal(r.status, 200);
  assert.equal(r.body.label, "Weekly report");
  assert.equal(calls.apply.length, 0, "a mail scanner that opens the link unsubscribes nobody");
});

Deno.test("sec1 /unsubscribe: HEAD and other methods do nothing and do not even check the token", async () => {
  const t = await signUnsubscribe(CLAIM, KEY);
  for (const method of SCANNER_METHODS) {
    const { deps, calls } = unsubWorld();
    const r = await unsubscribeRequest(method, t, deps);
    assert.equal(r.status, 405, method);
    assert.equal(calls.secret + calls.apply.length, 0, method);
  }
});

Deno.test("sec1 /unsubscribe: the one-click POST stops exactly the signed address and category, and repeats harmlessly", async () => {
  const t = await signUnsubscribe(CLAIM, KEY);
  const { deps, calls } = unsubWorld();
  const r = await unsubscribeRequest("POST", t, deps);
  assert.equal(r.status, 200, "RFC 8058 wants a 2xx");
  assert.deepEqual(calls.apply, [CLAIM]);
  await unsubscribeRequest("POST", t, deps);
  assert.deepEqual(calls.apply[1], CLAIM, "a repeat names the same address and category (apply_unsubscribe is idempotent)");
});

Deno.test("sec1 /unsubscribe: cannot be forged for someone else", async () => {
  const good = await signUnsubscribe(CLAIM, KEY);
  const [, sig] = good.split(".");
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const forged = [
    "victim@example.test", // a plain address
    `${b64({ ...CLAIM, a: "victim@example.test" })}.${sig}`, // another address under a valid signature
    `${b64({ ...CLAIM, c: "billing" })}.${sig}`, // another category
    await signUnsubscribe({ ...CLAIM, a: "victim@example.test" }, "a-guessed-key"), // signed with the wrong key
    `${good}.extra`,
    "",
  ];
  for (const t of forged) {
    const { deps, calls } = unsubWorld();
    const r = await unsubscribeRequest("POST", t, deps);
    assert.equal(r.status, 400, t);
    assert.equal(calls.apply.length, 0, `nothing applied for ${t}`);
  }
  const noKey = unsubWorld(null);
  assert.equal((await unsubscribeRequest("POST", good, noKey.deps)).status, 400, "without the key nothing is accepted");
  assert.equal(noKey.calls.apply.length, 0);
});

Deno.test("sec1 /unsubscribe: answers are not cached and send no Referer; the mail headers point at the signed POST", async () => {
  assert.equal(UNSUBSCRIBE_HEADERS["cache-control"], "no-store");
  assert.equal(UNSUBSCRIBE_HEADERS["referrer-policy"], "no-referrer");
  assert.match(read("../../email/index.ts"), /json\(r\.body, r\.status, UNSUBSCRIBE_HEADERS\)/);
  const t = await signUnsubscribe(CLAIM, KEY);
  const h = unsubscribeHeaders(`https://x.supabase.co/functions/v1/email/unsubscribe/${t}`);
  assert.equal(h["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.match(h["List-Unsubscribe"], /^<https:\/\/[^>]+\/email\/unsubscribe\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+>$/, "one https URL with a signed token");
  const notify = read("../notify.ts");
  assert.match(notify, /const token = await signUnsubscribe\(/, "both links carry the signed token");
  // Sec 2: the page's token is in the fragment and the one-click token in the path; neither is in a query string.
  assert.match(notify, /page: `\$\{APP_URL\}\/unsubscribe#t=\$\{token\}`, oneClick: `[^`]*\/functions\/v1\/email\/unsubscribe\/\$\{token\}`/);
  assert.match(notify, /internal_secret", \{ p_name: "unsubscribe_key" \}/, "signed with its own key, not the cron secret");
});
