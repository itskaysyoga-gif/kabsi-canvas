// Signup 1 (30.50 item 3): Continue with WhatsApp, end to end on a fake world. The fake store below keeps the same rules as
// the SQL functions of migration 20261110125951 (wa_signin_start, _claim, _confirm, _check): the code's hash, 10 minutes,
// the first phone claims it, the tap from that phone only, the browser's secret, one use. Every refusal the card names is
// here: expired, reused, wrong browser, forwarded, no tap, rate limit. No database, Kapso or Auth call.
import assert from "node:assert/strict";
import {
  CARD_ALPHABET, codeHash, codeOf, type CheckResult, CODE_LIFE_MS, deviceName, deviceOf, type HandlerDeps, makeCode, makeHandler,
  geoSignKey, readGeo, signinHref, SIGNIN_SAY, type StartRow,
} from "./wa-signin.ts";
import { signinSeam, type SigninDb } from "./whatsapp/signin.ts";
import type { Inbound } from "./whatsapp/channel.ts";
import type { Out } from "./whatsapp/outbox.ts";
import type { SendState } from "./whatsapp/policy.ts";

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha256Hex = async (t: string) => hex(await crypto.subtle.digest("SHA-256", enc.encode(t)));
const hmacHex = async (key: string, text: string) => {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(text)));
};
const T0 = Date.UTC(2026, 10, 10, 12, 0, 0);
const CHROME_WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const OWNER = "+447700900123", OTHER = "+447700900456";

type Row = StartRow & { id: string; state: "waiting" | "asked" | "confirmed" | "used"; phone: string | null; user: string | null; created: number; confirmed: number | null };

/** The fake world: the store with the SQL rules, the clock, the limits, the phones already connected and the users made. */
class World {
  now = T0;
  rows: Row[] = [];
  connected = new Map<string, string>([[OWNER, "user-owner"]]);
  made: string[] = [];
  minted: string[] = [];
  limits = new Map<string, number>();
  turnstileOk = true;
  sent: { to: string; body: string; buttons: string[] }[] = [];
  env: Record<string, string> = { SUPABASE_URL: "https://x.supabase.co", GEO_SIGN_KEY: "geo-test-key" };

  deps(): HandlerDeps {
    return {
      env: (n) => this.env[n], ip: () => "203.0.113.9", sha256Hex, hmacHex, geoKey: async () => this.env.GEO_SIGN_KEY,
      randomBytes: (n) => crypto.getRandomValues(new Uint8Array(n)),
      rateLimit: async (key, max) => {
        const n = (this.limits.get(key) ?? 0) + 1;
        this.limits.set(key, n);
        return n <= max;
      },
      verifyTurnstile: async (t) => this.turnstileOk && !!t,
      start: async (r) => {
        const id = crypto.randomUUID();
        this.rows.push({ ...r, id, state: "waiting", phone: null, user: null, created: this.now, confirmed: null });
        return id;
      },
      check: async (id, browserHash): Promise<CheckResult> => {
        const r = this.rows.find((x) => x.id === id && x.browserHash === browserHash);
        if (!r) return { result: "unknown" };
        if (r.state === "used") return { result: "used" };
        if (r.state === "confirmed") {
          if (r.confirmed! < this.now - 2 * 60_000) return { result: "expired" };
          r.state = "used";
          return { result: "take", user_id: r.user! };
        }
        if (r.created + CODE_LIFE_MS <= this.now) return { result: "expired" };
        if (r.state === "asked") return { result: "asked", phone_end: r.phone!.slice(-2) };
        return { result: r.state };
      },
      mint: async (user) => (this.minted.push(user), { access_token: `at-${user}`, refresh_token: `rt-${user}`, expires_at: null }),
      captureError: async () => {},
      cors: {},
      now: () => this.now,
    };
  }

  signin(): SigninDb {
    return {
      allow: async (phone) => {
        const n = (this.limits.get(`phone:${phone}`) ?? 0) + 1;
        this.limits.set(`phone:${phone}`, n);
        return n <= 5;
      },
      claim: async (code, phone) => {
        const h = await codeHash({ sha256Hex, env: (n) => this.env[n] }, code);
        const r = this.rows.find((x) => x.codeHash === h && x.created + CODE_LIFE_MS > this.now);
        if (!r || !(r.state === "waiting" || (r.state === "asked" && r.phone === phone))) return { result: "unknown" };
        r.state = "asked";
        r.phone = phone;
        return { result: "asked", id: r.id, device: { browser: r.browser, os: r.os }, city: r.city };
      },
      confirm: async (id, phone) => {
        const r = this.rows.find((x) => x.id === id);
        if (!r || r.state !== "asked" || r.phone !== phone || r.created + CODE_LIFE_MS <= this.now) return { result: "unknown" };
        let user = this.connected.get(phone);
        if (!user) {
          user = `user-new-${this.made.length + 1}`;
          this.made.push(user);
          this.connected.set(phone, user);
        }
        r.state = "confirmed";
        r.user = user;
        r.confirmed = this.now;
        return { result: "confirmed" };
      },
      signOut: async () => ({ result: "unknown" }),
    };
  }

  out(): Out {
    const rec = (to: string, body: string, buttons: { title: string }[] = []) => (this.sent.push({ to, body, buttons: buttons.map((b) => b.title) }), { id: "wamid" });
    const sender = { live: false, text: async (to: string, b: string) => rec(to, b), buttons: async (to: string, b: string, bs: { title: string }[]) => rec(to, b, bs),
      template: async () => ({ id: "t" }), media: async () => new Uint8Array() };
    return { db: { add: async () => 1, mark: async () => {} } as never, live: sender as never, mock: sender as never, now: () => new Date(this.now) };
  }
}

const state: SendState = { time_zone: "Europe/London", sent_today: 0, last_sent_at: null, window_expires_at: null, stopped: false, live_ok: false, digest_only: false };
const inbound = (from: string, o: { text?: string; button?: string; forwarded?: boolean }): Inbound => ({
  phoneNumberId: "pn", from, messageId: crypto.randomUUID(), timestamp: T0 / 1000, type: o.button ? "interactive" : "text",
  text: o.text ?? null, buttonId: o.button ?? null, mediaId: null, forwarded: !!o.forwarded,
});

async function browserStart(w: World, opts: { geo?: string | null; ua?: string } = {}) {
  const secret = "s".repeat(16) + crypto.randomUUID().replace(/-/g, "");
  const res = await makeHandler(w.deps())(new Request("https://f/auth-whatsapp/start", {
    method: "POST", headers: { "user-agent": opts.ua ?? CHROME_WIN },
    body: JSON.stringify({ turnstile: "ok", browser_hash: await sha256Hex(secret), geo: opts.geo ?? null }),
  }));
  return { res, body: await res.json() as { id: string; code: string; error?: string }, secret };
}
async function browserCheck(w: World, id: string, secret: string) {
  const res = await makeHandler(w.deps())(new Request("https://f/auth-whatsapp/check", { method: "POST", body: JSON.stringify({ id, secret }) }));
  return await res.json() as { state: string; phone_end?: string | null; session?: { access_token: string } };
}
const geoToken = async (city: string, country: string, exp: number, key = "geo-test-key") => {
  const body = `${encodeURIComponent(city)}|${country}|${exp}`;
  return `${body}.${await hmacHex(key, body)}`;
};
const seam = (w: World, phone: string, o: Parameters<typeof inbound>[1]) => signinSeam({ signin: w.signin(), out: w.out() }, state, phone, inbound(phone, o));
const yesId = (w: World) => `si:y:${w.rows.at(-1)!.id}`;

Deno.test("signup1: a code is 6 characters of the card alphabet", () => {
  for (let i = 0; i < 200; i++) {
    const c = makeCode((n) => crypto.getRandomValues(new Uint8Array(n)));
    assert.equal(c.length, 6);
    for (const ch of c) assert.ok(CARD_ALPHABET.includes(ch), ch);
  }
  assert.equal(signinHref("12057456874", "AB23CD"), "https://wa.me/12057456874?text=Kabsi%20sign%20in%20AB23CD");
});

Deno.test("signup1: only the exact message is read", () => {
  assert.equal(codeOf("Kabsi sign in AB23CD"), "AB23CD");
  assert.equal(codeOf("  kabsi sign in ab23cd "), "AB23CD");
  assert.equal(codeOf("Hi, Kabsi sign in AB23CD"), null);
  assert.equal(codeOf("Kabsi sign in AB23CD please"), null);
  assert.equal(codeOf("Kabsi sign in AB10CD"), null, "0 and 1 are not in the card alphabet");
  assert.equal(codeOf("Kabsi sign in AB23C"), null);
  assert.equal(codeOf("KABSI 123456"), null, "the connect code is another route");
});

Deno.test("signup1: browser and system in plain names, never guessed", () => {
  assert.equal(deviceName(deviceOf(CHROME_WIN)), "Chrome, Windows");
  assert.equal(deviceName(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")), "Safari, iPhone");
  assert.equal(deviceName(deviceOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0")), "Edge, Mac");
  assert.equal(deviceName(deviceOf("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36")), "Samsung Internet, Android");
  assert.equal(deviceName(deviceOf("curl/8.0")), "a new device");
  assert.equal(deviceName(deviceOf(null)), "a new device");
});

Deno.test("signup1: both sides derive the same geo key from the shared route key, never the route key itself", async () => {
  const derived = await geoSignKey(undefined, "r".repeat(64), hmacHex);
  assert.equal(derived, await hmacHex("r".repeat(64), "kabsi geo sign v1"));
  assert.notEqual(derived, "r".repeat(64));
  assert.equal(await geoSignKey("direct", "r".repeat(64), hmacHex), "direct");
  assert.equal(await geoSignKey(undefined, undefined, hmacHex), undefined);
});

Deno.test("signup1: the city comes only from a signed, fresh geo token", async () => {
  assert.deepEqual(await readGeo(await geoToken("London", "GB", T0 + 60_000), "geo-test-key", hmacHex, T0), { city: "London", country: "GB" });
  assert.deepEqual(await readGeo(await geoToken("São Paulo", "BR", T0 + 60_000), "geo-test-key", hmacHex, T0), { city: "São Paulo", country: "BR" });
  assert.deepEqual(await readGeo(await geoToken("London", "GB", T0 - 1), "geo-test-key", hmacHex, T0), { city: null, country: null }, "expired");
  assert.deepEqual(await readGeo(await geoToken("London", "GB", T0 + 60_000, "other"), "geo-test-key", hmacHex, T0), { city: null, country: null }, "forged");
  assert.deepEqual(await readGeo(await geoToken("London", "GB", T0 + 60_000), undefined, hmacHex, T0), { city: null, country: null }, "no key set");
  assert.deepEqual(await readGeo(await geoToken("<b>x</b>", "GB", T0 + 60_000), "geo-test-key", hmacHex, T0), { city: null, country: "GB" }, "not a city");
});

Deno.test("signup1: the whole way, from the browser to the tap to the session", async () => {
  const w = new World();
  const { res, body, secret } = await browserStart(w, { geo: await geoToken("London", "GB", T0 + 300_000) });
  assert.equal(res.status, 200);
  assert.match(body.code, /^[2-9A-HJKMNP-Z]{6}$/);
  const row = w.rows[0];
  assert.notEqual(row.codeHash, body.code, "the code is stored hashed");
  assert.notEqual(row.browserHash, secret, "the secret is stored hashed");
  assert.equal(JSON.stringify(row).includes("203.0.113.9"), false, "no IP address is stored");
  assert.deepEqual([row.browser, row.os, row.city, row.country], ["Chrome", "Windows", "London", "GB"]);
  assert.equal((await browserCheck(w, body.id, secret)).state, "waiting");

  assert.equal(await seam(w, OWNER, { text: `Kabsi sign in ${body.code}` }), "signin_asked");
  assert.equal(w.sent.at(-1)!.body, SIGNIN_SAY.confirm({ browser: "Chrome", os: "Windows" }, "London"));
  assert.match(w.sent.at(-1)!.body, /Sign in on Chrome, Windows, near London\?/);
  assert.match(w.sent.at(-1)!.body, /Only tap if you started this on kabsi\.co just now\./);
  assert.deepEqual(w.sent.at(-1)!.buttons, ["Yes, it's me"]);
  const asked = await browserCheck(w, body.id, secret);
  assert.equal(asked.state, "asked", "no tap: no session");
  assert.equal(asked.phone_end, "23", "the browser sees which phone claimed its code");

  assert.equal(await seam(w, OWNER, { button: yesId(w) }), "signin_confirmed");
  const done = await browserCheck(w, body.id, secret);
  assert.equal(done.state, "signed_in");
  assert.equal(done.session?.access_token, "at-user-owner", "a phone already connected signs that user in");
  assert.deepEqual(w.made, [], "no new user for a connected phone");
});

Deno.test("signup1: a new phone makes a new user", async () => {
  const w = new World();
  const { body, secret } = await browserStart(w);
  await seam(w, OTHER, { text: `Kabsi sign in ${body.code}` });
  assert.match(w.sent.at(-1)!.body, /Sign in on Chrome, Windows\?/, "no city: the message leaves it out");
  await seam(w, OTHER, { button: yesId(w) });
  assert.equal((await browserCheck(w, body.id, secret)).session?.access_token, "at-user-new-1");
  assert.deepEqual(w.made, ["user-new-1"]);
});

Deno.test("signup1: refused when expired, reused, from the wrong browser, forwarded, or never tapped", async () => {
  // Expired: the code is past its 10 minutes before the owner sends it.
  let w = new World();
  let s = await browserStart(w);
  w.now += CODE_LIFE_MS + 1;
  assert.equal(await seam(w, OWNER, { text: `Kabsi sign in ${s.body.code}` }), "signin_unknown");
  assert.equal(w.sent.at(-1)!.body, SIGNIN_SAY.ended);
  assert.equal((await browserCheck(w, s.body.id, s.secret)).state, "expired");

  // Expired between the question and the tap.
  w = new World();
  s = await browserStart(w);
  await seam(w, OWNER, { text: `Kabsi sign in ${s.body.code}` });
  w.now += CODE_LIFE_MS + 1;
  assert.equal(await seam(w, OWNER, { button: yesId(w) }), "signin_tap_refused");

  // Reused: the session is handed out once; the code cannot be sent again after the tap, nor claimed by another phone.
  w = new World();
  s = await browserStart(w);
  await seam(w, OWNER, { text: `Kabsi sign in ${s.body.code}` });
  assert.equal(await seam(w, OTHER, { text: `Kabsi sign in ${s.body.code}` }), "signin_unknown", "another phone cannot take a claimed code");
  assert.equal(await seam(w, OTHER, { button: yesId(w) }), "signin_tap_refused", "the tap counts only from the phone that sent the code");
  await seam(w, OWNER, { button: yesId(w) });
  assert.equal((await browserCheck(w, s.body.id, s.secret)).state, "signed_in");
  assert.equal((await browserCheck(w, s.body.id, s.secret)).state, "used");
  assert.equal(await seam(w, OWNER, { button: yesId(w) }), "signin_tap_refused");
  assert.equal(await seam(w, OWNER, { text: `Kabsi sign in ${s.body.code}` }), "signin_unknown");
  assert.deepEqual(w.minted, ["user-owner"]);

  // The wrong browser: another secret reads exactly like a sign-in that does not exist, and never gets the session.
  w = new World();
  s = await browserStart(w);
  await seam(w, OWNER, { text: `Kabsi sign in ${s.body.code}` });
  await seam(w, OWNER, { button: yesId(w) });
  assert.equal((await browserCheck(w, s.body.id, "x".repeat(48))).state, "unknown");
  assert.equal((await browserCheck(w, crypto.randomUUID(), s.secret)).state, "unknown");
  assert.deepEqual(w.minted, []);
  assert.equal((await browserCheck(w, s.body.id, s.secret)).state, "signed_in", "the right browser still can");

  // Forwarded: ignored, nothing claimed, nothing said.
  w = new World();
  s = await browserStart(w);
  assert.equal(await seam(w, OWNER, { text: `Kabsi sign in ${s.body.code}`, forwarded: true }), "signin_forwarded");
  assert.equal(w.sent.length, 0);
  assert.equal(w.rows[0].state, "waiting");

  // No tap: a confirmed sign-in left uncollected for 2 minutes is gone, and one never tapped ends with its code.
  w = new World();
  s = await browserStart(w);
  await seam(w, OWNER, { text: `Kabsi sign in ${s.body.code}` });
  w.now += CODE_LIFE_MS;
  assert.equal((await browserCheck(w, s.body.id, s.secret)).state, "expired");
  w = new World();
  s = await browserStart(w);
  await seam(w, OWNER, { text: `Kabsi sign in ${s.body.code}` });
  await seam(w, OWNER, { button: yesId(w) });
  w.now += 2 * 60_000 + 1;
  assert.equal((await browserCheck(w, s.body.id, s.secret)).state, "expired");
  assert.deepEqual(w.minted, []);
});

Deno.test("signup1: Turnstile and the limits come before a code", async () => {
  const w = new World();
  w.turnstileOk = false;
  let r = await browserStart(w);
  assert.equal(r.res.status, 400);
  assert.equal(r.body.error, "challenge_failed");
  assert.equal(w.rows.length, 0);
  w.turnstileOk = true;
  for (let i = 0; i < 10; i++) assert.equal((await browserStart(w)).res.status, 200);
  r = await browserStart(w);
  assert.equal(r.res.status, 429, "the 11th start in an hour from one visitor");
  assert.equal(w.rows.length, 10);
  const bad = await makeHandler(w.deps())(new Request("https://f/auth-whatsapp/start", { method: "POST", body: JSON.stringify({ turnstile: "ok", browser_hash: "nope" }) }));
  assert.equal(bad.status, 400);

  // On WhatsApp: at most 5 sign-in messages per phone in 15 minutes, wrong codes included.
  for (let i = 0; i < 5; i++) assert.equal(await seam(w, OTHER, { text: "Kabsi sign in ZZZZZZ" }), "signin_unknown");
  assert.equal(await seam(w, OTHER, { text: "Kabsi sign in ZZZZZZ" }), "signin_limited");
  assert.equal(w.sent.at(-1)!.body, SIGNIN_SAY.tooMany);
});

Deno.test("signup1: anything else is not the seam's", async () => {
  const w = new World();
  assert.equal(await seam(w, OWNER, { text: "hello" }), null);
  assert.equal(await seam(w, OWNER, { text: "Kabsi sign in please" }), null);
  assert.equal(await seam(w, OWNER, { button: "a:abc" }), null);
  assert.equal(await signinSeam({ out: w.out() }, state, OWNER, inbound(OWNER, { text: "Kabsi sign in AB23CD" })), null, "no deps: as before");
});
