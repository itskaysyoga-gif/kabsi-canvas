// Speed 2 part A (lane R, 6 Nov 2026; to be recorded as 30.39 item 11): suggestions on kabsi.co itself. The /scan box and
// every other box that suggests a business ask POST /api/suggest on the page's own address, so there is no CORS preflight
// and no Supabase gateway on the way (Rashid's phone on 6 Nov: OPTIONS 1,695 ms cold, then 0.5 s of gateway and network
// around each suggestion). This route, on Vercel in fra1 beside the database, answers them itself:
//
//   POST { action: "warm" }                                         -> { ok, configured }
//   POST { action: "pass", turnstile }                              -> { pass }
//   POST { action: "suggest", query, session_token, turnstile | pass } -> { suggestions, available, pass? }
//
// Every protection of profile-snapshot's suggestions stays, keyed by the visitor's own address (Vercel's x-forwarded-for,
// which Vercel overwrites, so a visitor cannot forge it):
// - the bot check: a Turnstile token once, then the same signed 15 minute pass (same format, same secret, same visitor
//   hash, so a pass from either path is good on the other);
// - the per-visitor limits (20 a minute, 120 an hour, 60 a day) and places_take('autocomplete') against the same daily
//   cap, in one database round trip: public.suggest_take, run over Supabase's pooler as the role suggest_route, which
//   can run that one function and nothing else (Vercel env SUGGEST_DB_URL; its password was made by the database and
//   is kept in Vault). The route holds no service key (Sec 1).
// The database call and the Google call run at the same time only for a visitor this instance saw allowed in the last
// 30 seconds with none of their calls in flight (the typing session's later letters); Google's answer is then dropped
// if the database refuses. Every other call asks the database first, so a burst, a fresh instance or a day at the cap
// costs no Google call that the cap does not count (review of 6 Nov: at most one uncounted call per visitor and
// instance, and only right after an allowed one). After any refusal the instance asks the database first for a minute.
//
// Answers are kept 10 minutes per normalised prefix and country (in this instance's memory, then Vercel's Runtime Cache
// for the region), so a repeat costs no Google call. What is kept is Google's suggestion list for a few letters
// (business names, short addresses, place ids): never the visitor, the address, the pass or the session token. A cached
// answer still passes the bot check and the limits; it takes nothing from the Autocomplete cap.
//
// Server-Timing says db, google and total. One log line per call carries only the outcome and the timings.
import type { AutocompleteResponse } from "../../supabase/functions/_shared/google/types.ts";

export const LIMITS = { perMinute: 20, perHour: 120, perDay: 60 } as const;
export const CACHE_SECONDS = 600;
const PASS_SECONDS = 15 * 60;
const SERIAL_AFTER_REFUSAL_MS = 60_000;
const TRUSTED_MS = 30_000;
const BOT_TRIES_PER_MINUTE = 10;
const SESSION_RE = /^[A-Za-z0-9-]{16,64}$/;
const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,200}$/;
const IP_RE = /^[0-9a-fA-F:.]{2,45}$/;

export type Suggestion = { place_id: string; name: string; address: string };
export type Take = { allowed: boolean; reason?: "rate_limited" | "back_soon" | "error" };
/** The key is stored with the list and compared on read, so a hash collision is never served (review of 6 Nov). */
export type Cached = { key: string; suggestions: Suggestion[] };

export type SuggestDeps = {
  env: (name: string) => string | undefined;
  /** public.suggest_take as the role suggest_route. Fails closed: an error is { allowed: false, reason: "error" }. */
  take: (
    visitor: string,
    limits: [number | null, number | null, number | null],
    places: boolean,
  ) => Promise<Take>;
  autocomplete: (
    key: string,
    input: string,
    sessionToken: string,
    signal: AbortSignal,
  ) => Promise<{ ok: boolean; status: number; data: AutocompleteResponse }>;
  verifyTurnstile: (token: string, ip: string) => Promise<boolean>;
  cacheGet: (key: string) => Promise<Cached | null>;
  cacheSet: (key: string, value: Cached) => Promise<void>;
  log: (fields: Record<string, unknown>) => void;
  now: () => number;
  /** The salt of the visitor hash: profile-snapshot's SUPABASE_URL, so both paths share one count per visitor. */
  salt: string;
};

/** The visitor's address as Vercel saw it. Anything that is not an address becomes "unknown" (one shared, harder key). */
export function visitorIp(req: Request): string {
  const first = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]!.trim();
  if (IP_RE.test(first)) return first;
  const real = (req.headers.get("x-real-ip") ?? "").trim();
  return IP_RE.test(real) ? real : "unknown";
}

/** The cache key: lower case, single spaces, NFKC, plus the visitor's country (from Vercel, two letters or "XX"). */
export function cacheKey(query: string, country: string | null): string {
  const q = query.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  const cc = /^[A-Z]{2}$/.test(country ?? "") ? country! : "XX";
  return `${cc}:${q}`;
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function mac(secret: string, text: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function mapSuggestions(data: AutocompleteResponse): Suggestion[] {
  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .flatMap((p) => {
      if (!p?.placeId || !PLACE_ID_RE.test(p.placeId)) return [];
      const name = p.structuredFormat?.mainText?.text ?? p.text?.text ?? "";
      return name
        ? [{ place_id: p.placeId, name, address: p.structuredFormat?.secondaryText?.text ?? "" }]
        : [];
    })
    .slice(0, 5);
}

const isCached = (v: unknown): v is Cached =>
  !!v && Array.isArray((v as Cached).suggestions) && (v as Cached).suggestions.length <= 5;

export function makeSuggestHandler(d: SuggestDeps) {
  // After a refusal (a limit or the day's cap), this instance waits for the database before asking Google.
  let serialUntil = 0;
  // Visitors this instance saw allowed lately, and how many of their calls are in flight (memory only, hashes only).
  const seen = new Map<string, { allowedAt: number; inFlight: number }>();
  // Turnstile attempts per visitor and minute in this instance, before any database or Cloudflare call.
  const botTries = new Map<string, { at: number; n: number }>();
  const prune = () => {
    if (seen.size + botTries.size < 5000) return;
    const now = d.now();
    for (const [k, v] of seen)
      if (now - v.allowedAt > TRUSTED_MS && v.inFlight === 0) seen.delete(k);
    for (const [k, v] of botTries) if (now - v.at > 60_000) botTries.delete(k);
  };

  return async (req: Request): Promise<Response> => {
    const t0 = d.now();
    const timing: Record<string, number> = {};
    const reply = (body: unknown, status = 200, extra: Record<string, unknown> = {}) => {
      timing["total"] = d.now() - t0;
      d.log({ fn: "suggest", status, ...extra, ms: { ...timing } });
      return new Response(JSON.stringify(body), {
        status,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
          "x-robots-tag": "noindex",
          "server-timing": Object.entries(timing)
            .map(([k, v]) => `${k};dur=${Math.round(v)}`)
            .join(", "),
        },
      });
    };
    const fail = (
      code: string,
      message: string,
      status: number,
      extra: Record<string, unknown> = {},
    ) => reply({ error: code, message }, status, { outcome: code, ...extra });

    if (req.method !== "POST") return fail("method_not_allowed", "Use POST.", 405);
    // Same-origin only: a browser on another site cannot spend Kabsi's suggestions. The hosts are compared (the scheme
    // seen behind Vercel's edge can differ from the browser's).
    const origin = req.headers.get("origin");
    if (origin) {
      const host = (
        req.headers.get("x-forwarded-host") ??
        req.headers.get("host") ??
        new URL(req.url).host
      ).toLowerCase();
      let originHost = "";
      try {
        originHost = new URL(origin).host.toLowerCase();
      } catch {
        originHost = "";
      }
      if (originHost !== host) return fail("forbidden", "Not allowed.", 403);
    }
    const text = await req.text().catch(() => "");
    if (text.length > 2048) return fail("too_large", "Too large.", 413);
    let b: Record<string, unknown> = {};
    try {
      b = (JSON.parse(text || "{}") ?? {}) as Record<string, unknown>;
    } catch {
      b = {};
    }
    const str = (v: unknown) => (typeof v === "string" ? v : "");
    const action = str(b["action"]);

    const placesKey = d.env("PLACES_API_KEY");
    const secret = d.env("TURNSTILE_SECRET_KEY");
    const configured = !!placesKey && !!secret && !!d.env("SUGGEST_DB_URL");
    // The box's first touch wakes this function; it also tells the page whether to use this route at all.
    if (action === "warm") return reply({ ok: true, configured }, 200, { outcome: "warm" });
    // Until the three server values are set on Vercel, the page keeps using profile-snapshot (it reads this answer).
    if (!configured) return fail("not_configured", "Suggestions are not set up here.", 503);

    const ip = visitorIp(req);
    const today = new Date(d.now()).toISOString().slice(0, 10);
    const visitor = (await sha256Hex(`${d.salt}:${today}:${ip}`)).slice(0, 24);
    const nowSeconds = Math.floor(d.now() / 1000);
    const makePass = async (expiry: number) =>
      `${expiry}.${await mac(secret!, `suggest:${visitor}:${expiry}`)}`;
    const passValid = async (pass: string) => {
      const expiry = Number(pass.split(".")[0]);
      if (!Number.isInteger(expiry) || expiry < nowSeconds) return false;
      const want = await makePass(expiry);
      if (want.length !== pass.length) return false;
      let diff = 0;
      for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ pass.charCodeAt(i);
      return diff === 0;
    };
    prune();
    // A cheap stop before Turnstile: at most 10 bot checks a minute per visitor in this instance.
    const botTry = () => {
      const now = d.now();
      const e = botTries.get(visitor);
      if (!e || now - e.at > 60_000) {
        botTries.set(visitor, { at: now, n: 1 });
        return true;
      }
      e.n += 1;
      return e.n <= BOT_TRIES_PER_MINUTE;
    };
    const timed = async <T>(name: string, p: Promise<T>): Promise<T> => {
      const s = d.now();
      try {
        return await p;
      } finally {
        timing[name] = d.now() - s;
      }
    };

    if (action === "pass") {
      const take = await timed("db", d.take(visitor, [LIMITS.perMinute, null, null], false));
      if (!take.allowed)
        return fail("rate_limited", "That is a lot of searches. Try again in a minute.", 429);
      if (!botTry())
        return fail("rate_limited", "That is a lot of searches. Try again in a minute.", 429);
      if (!(await timed("bot", d.verifyTurnstile(str(b["turnstile"]), ip)))) {
        return fail("challenge_failed", "Please complete the check and try again.", 400);
      }
      return reply({ pass: await makePass(nowSeconds + PASS_SECONDS) }, 200, { outcome: "pass" });
    }
    if (action !== "suggest") return fail("bad_action", "Unknown action.", 400);

    const q = str(b["query"]).trim();
    const sessionToken = str(b["session_token"]);
    if (q.length < 3 || q.length > 120 || !SESSION_RE.test(sessionToken)) {
      return fail("bad_query", "Type your business name and city.", 400);
    }

    // The bot check comes first and is never skipped: a pass is checked here, a Turnstile token at Cloudflare.
    let pass: string | null = null;
    const given = str(b["pass"]);
    if (!(given && (await passValid(given)))) {
      if (!botTry())
        return fail("rate_limited", "That is a lot of searches. Try again in a minute.", 429);
      if (!(await timed("bot", d.verifyTurnstile(str(b["turnstile"]), ip)))) {
        return fail("challenge_failed", "Please complete the check and try again.", 400);
      }
      pass = await makePass(nowSeconds + PASS_SECONDS);
    }
    const withPass = (body: Record<string, unknown>) => (pass ? { ...body, pass } : body);
    const limits: [number, number, number] = [LIMITS.perMinute, LIMITS.perHour, LIMITS.perDay];
    const refused = (take: Take) => {
      serialUntil = d.now() + SERIAL_AFTER_REFUSAL_MS;
      if (take.reason === "rate_limited") {
        return fail("rate_limited", "That is a lot of searches. Try again in a minute.", 429);
      }
      // The day's cap, or the database could not be asked: the page falls back to search, then pick.
      return reply(withPass({ suggestions: [], available: false }), 200, {
        outcome: take.reason ?? "error",
      });
    };

    // A repeat within 10 minutes: no Google call, nothing from the cap; the limits still count.
    const key = cacheKey(q, req.headers.get("x-vercel-ip-country"));
    const cached = await timed(
      "cache",
      d.cacheGet(key).catch(() => null),
    );
    if (cached && isCached(cached) && cached.key === key) {
      const take = await timed("db", d.take(visitor, limits, false));
      if (!take.allowed) return refused(take);
      const me = seen.get(visitor);
      if (me) me.allowedAt = d.now();
      else seen.set(visitor, { allowedAt: d.now(), inFlight: 0 });
      return reply(withPass({ suggestions: cached.suggestions, available: true }), 200, {
        outcome: "ok",
        cache: "hit",
      });
    }

    const ctrl = new AbortController();
    const google = async () => {
      const r = await timed("google", d.autocomplete(placesKey!, q, sessionToken, ctrl.signal));
      if (!r.ok) throw new Error(`places autocomplete ${r.status}`);
      return mapSuggestions(r.data);
    };
    let suggestions: Suggestion[];
    const me = seen.get(visitor) ?? { allowedAt: -Infinity, inFlight: 0 };
    seen.set(visitor, me);
    const parallel =
      d.now() >= serialUntil && d.now() - me.allowedAt <= TRUSTED_MS && me.inFlight === 0;
    me.inFlight += 1;
    try {
      if (!parallel) {
        const take = await timed("db", d.take(visitor, limits, true));
        if (!take.allowed) return refused(take);
        me.allowedAt = d.now();
        suggestions = await google();
      } else {
        // The database and Google at the same time; Google's answer is dropped if the database refuses.
        const g = google();
        g.catch(() => undefined);
        const take = await timed("db", d.take(visitor, limits, true));
        if (!take.allowed) {
          ctrl.abort();
          return refused(take);
        }
        me.allowedAt = d.now();
        suggestions = await g;
      }
    } catch {
      return reply(withPass({ suggestions: [], available: false }), 200, {
        outcome: "google_error",
      });
    } finally {
      me.inFlight -= 1;
    }
    await d.cacheSet(key, { key, suggestions }).catch(() => undefined);
    return reply(withPass({ suggestions, available: true }), 200, { outcome: "ok", cache: "miss" });
  };
}
