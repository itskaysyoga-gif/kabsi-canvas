// Signup 1 (master plan 30.50 item 3, R-150): Continue with WhatsApp. The pure parts, shared by the `auth-whatsapp` Edge
// Function, the WhatsApp agent's one seam (whatsapp/signin.ts) and the tests. No database, network or environment here.
//
// The flow:
//   1. The browser makes a secret of 32 random bytes and keeps it. It sends only the secret's SHA-256 to POST /start, with
//      Turnstile. After Turnstile and the K-100 style limits, Kabsi makes a CODE of 6 characters from the card alphabet and
//      stores the code's hash and the secret's hash, the browser and system read from the request's user agent, and the
//      approximate city and country from the signed geo token (never an IP address). The code lives 10 minutes.
//   2. The owner sends "Kabsi sign in CODE" to Kabsi's number from the ready link. Kabsi never sends a code.
//   3. Kabsi answers "Sign in on Chrome, Windows, near London?" with one button, "Yes, it's me".
//   4. After the tap, the starting browser's next check (POST /check with the secret itself) gets a session. The session is
//      minted on the server only then (a magic link token made by the Auth admin API and verified on the server, no email
//      sent), and the sign-in is spent: it works once.
// A forwarded message, a code from another phone, an expired or used code, the wrong browser and too many tries are refused.

/** The card alphabet: no 0, 1, I, L or O, so a code reads the same aloud and on a card. */
export const CARD_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 6;
export const CODE_LIFE_MS = 10 * 60_000;
/** After the tap, the starting browser has this long to collect its session, even past the code's 10 minutes. */
export const COLLECT_MS = 2 * 60_000;

/** K-100 style limits, before a code is issued: 10 starts per visitor an hour. On WhatsApp: 5 unknown codes per phone per 15 minutes. */
export const LIMITS = { perVisitor: 10, perVisitorSeconds: 3600, perPhone: 5, perPhoneSeconds: 15 * 60, checksPerVisitor: 600, checksSeconds: 600 };

/** The exact message the ready link fills in. Nothing else on the line: a code inside a longer message is not read. */
export const SIGNIN_RE = new RegExp(`^\\s*kabsi\\s+sign\\s+in\\s+([${CARD_ALPHABET}${CARD_ALPHABET.toLowerCase()}]{${CODE_LENGTH}})\\s*$`, "i");
/** The two buttons: "Yes, it's me" under a sign-in (by sign-in id) and "Sign me out everywhere" under a notice (by notice id). */
export const YES_RE = /^si:y:([0-9a-f-]{36})$/;
export const SIGNOUT_RE = /^so:([0-9a-f-]{36})$/;

export function makeCode(randomBytes: (n: number) => Uint8Array): string {
  // Rejection sampling: 31 letters, so bytes of 248 and above are thrown away to keep every letter equally likely.
  let out = "";
  while (out.length < CODE_LENGTH) {
    for (const b of randomBytes(CODE_LENGTH * 2)) {
      if (b >= 248) continue;
      out += CARD_ALPHABET.charAt(b % CARD_ALPHABET.length);
      if (out.length === CODE_LENGTH) break;
    }
  }
  return out;
}

/** The code inside "Kabsi sign in CODE", upper case, or null. */
export function codeOf(text: string | null | undefined): string | null {
  const m = SIGNIN_RE.exec(text ?? "");
  return m?.[1] ? m[1].toUpperCase() : null;
}

export const signinText = (code: string) => `Kabsi sign in ${code}`;

/** The wa.me link with the message typed in. */
export const signinHref = (digits: string, code: string) => `https://wa.me/${digits}?text=${encodeURIComponent(signinText(code))}`;

export type Device = { browser: string | null; os: string | null };

/** The browser and system of a user agent, in plain names. Unknown parts are null: Kabsi never guesses. */
export function deviceOf(ua: string | null | undefined): Device {
  const u = (ua ?? "").slice(0, 512);
  const browser =
    /Instagram/.test(u) ? "Instagram" :
    /FBAN|FBAV|FB_IAB/.test(u) ? "Facebook" :
    /EdgA?\/|EdgiOS\//.test(u) ? "Edge" :
    /OPR\/|Opera/.test(u) ? "Opera" :
    /SamsungBrowser\//.test(u) ? "Samsung Internet" :
    /Firefox\/|FxiOS\//.test(u) ? "Firefox" :
    /CriOS\/|Chrome\//.test(u) ? "Chrome" :
    /Version\/[\d.]+.*Safari\//.test(u) ? "Safari" :
    null;
  const os =
    /iPhone/.test(u) ? "iPhone" :
    /iPad/.test(u) ? "iPad" :
    /Android/.test(u) ? "Android" :
    /Windows NT/.test(u) ? "Windows" :
    /CrOS/.test(u) ? "ChromeOS" :
    /Mac OS X|Macintosh/.test(u) ? "Mac" :
    /Linux/.test(u) ? "Linux" :
    null;
  return { browser, os };
}

/** "Chrome, Windows", "Chrome", "Windows", or "a new device" when neither is known. */
export function deviceName(d: Device): string {
  const parts = [d.browser, d.os].filter((x): x is string => !!x);
  return parts.length ? parts.join(", ") : "a new device";
}

/** A city name as it may appear in the message: letters, spaces, dots, apostrophes and hyphens, at most 60. Else null. */
export function cleanCity(raw: string | null | undefined): string | null {
  let v = raw ?? "";
  try {
    v = decodeURIComponent(v);
  } catch {
    return null;
  }
  v = v.replace(/\s+/g, " ").trim();
  return /^[\p{L}][\p{L} .'-]{0,59}$/u.test(v) ? v : null;
}
export const cleanCountry = (raw: string | null | undefined): string | null => {
  const v = (raw ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(v) && v !== "XX" && v !== "T1" ? v : null;
};

// ─── The words (docs/COPY.md, Signup 1). Reply look 2 (30.50 item 2): one marker from the R-148 set and a bold title, then
// one line; one button. ❓ asks, ✅ is done, ⏳ is a sign-in that ran out.

export const SIGNIN_SAY = {
  confirm: (d: Device, city: string | null) => `❓ *Sign in on ${deviceName(d)}${city ? `, near ${city}` : ""}?*\n\nOnly tap if you started this on kabsi.co just now.`,
  yesButton: "Yes, it's me",
  signedIn: "✅ *Signed in*\n\nGo back to your browser. It opens your Kabsi account by itself.",
  ended: "⏳ *This sign-in has ended*\n\nStart again on kabsi.co.",
  tooMany: "⏳ *Too many sign-in tries*\n\nWait 15 minutes, then start again on kabsi.co.",
  notice: (d: Device) => `❓ *New sign-in on ${deviceName(d)}*\n\nIf this was not you, tap below. Every Kabsi sign-in on the web ends at once.`,
  signOutButton: "Sign me out everywhere",
  signedOut: "✅ *Signed out everywhere*\n\nLog in again on kabsi.co when you need to.",
  signOutEnded: "⏳ *This notice has ended*\n\nWrite \"talk to a person\" and someone at Kabsi will help.",
} as const;

/** The consent shown beside "Continue with WhatsApp" and stored with the opt-in when the sign-in is confirmed. */
export const WHATSAPP_SIGNIN_CONSENT =
  "When you continue with WhatsApp, Kabsi uses your WhatsApp number to sign you in and sends WhatsApp messages to it: " +
  "sign-in confirmations and new sign-in notices, and for your business an alert for each new review with the business " +
  "name, the star rating, the reviewer's first name, the review text up to 300 characters and the draft reply. Meta " +
  "(WhatsApp) and Kapso carry these messages. Reply STOP at any time to stop.";

// ─── The browser's two calls.

export type StartRow = { codeHash: string; browserHash: string; browser: string | null; os: string | null; city: string | null; country: string | null };
export type CheckResult =
  | { result: "waiting" | "expired" | "used" | "unknown" }
  | { result: "asked"; phone_end?: string }
  | { result: "take"; user_id: string };
export type Session = { access_token: string; refresh_token: string; expires_at: number | null };

export type HandlerDeps = {
  env: (name: string) => string | undefined;
  ip: (req: Request) => string;
  sha256Hex: (text: string) => Promise<string>;
  hmacHex: (key: string, text: string) => Promise<string>;
  /** The key the site's server signs the geo token with (geoSignKey); undefined when none is set, and the city is left out. */
  geoKey: () => Promise<string | undefined>;
  randomBytes: (n: number) => Uint8Array;
  rateLimit: (key: string, max: number, windowSeconds: number, opts?: { failClosed?: boolean }) => Promise<boolean>;
  verifyTurnstile: (token: string | undefined, ip?: string) => Promise<boolean>;
  /** Stores a new sign-in; returns its id. */
  start: (row: StartRow) => Promise<string>;
  /** Reads a sign-in by id and browser hash; a confirmed one is spent here and returns its user. */
  check: (id: string, browserHash: string) => Promise<CheckResult>;
  /** Mints the session for a user after the tap (Auth admin magic link token, verified on the server). */
  mint: (userId: string, req: Request) => Promise<Session | null>;
  captureError: (fn: string, error: unknown, extra?: Record<string, unknown>) => Promise<void>;
  cors: Record<string, string>;
  now?: () => number;
};

const HEX64 = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SECRET = /^[A-Za-z0-9_-]{43,64}$/;

/** The geo signing key, the same on both sides with no new secret to paste: GEO_SIGN_KEY when set, else an HMAC of a fixed
 *  label under the route key the database already shares with the site's server (SUGGEST_ROUTE_KEY on Vercel, Vault
 *  'suggest_route_key' in Supabase). The label keeps the derived key apart from the route key itself. */
export const GEO_KEY_LABEL = "kabsi geo sign v1";
export async function geoSignKey(direct: string | undefined, routeKey: string | undefined, hmacHex: HandlerDeps["hmacHex"]): Promise<string | undefined> {
  if (direct) return direct;
  return routeKey ? await hmacHex(routeKey, GEO_KEY_LABEL) : undefined;
}

/** Reads the geo token the site's server signed (GET /api/geo?sign=1): "city|country|expiry" and its HMAC. Bad or old: nothing. */
export async function readGeo(token: unknown, key: string | undefined, hmacHex: HandlerDeps["hmacHex"], now: number): Promise<{ city: string | null; country: string | null }> {
  const none = { city: null, country: null };
  if (!key || typeof token !== "string" || token.length > 400) return none;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return none;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const want = await hmacHex(key, body);
  if (sig.length !== want.length) return none;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return none;
  const [city, country, exp] = body.split("|");
  if (!Number.isFinite(Number(exp)) || Number(exp) < now) return none;
  return { city: cleanCity(city), country: cleanCountry(country) };
}

export function makeHandler(d: HandlerDeps) {
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...d.cors, "content-type": "application/json", "cache-control": "no-store" } });
  const fail = (code: string, message: string, status = 400) => reply({ error: code, message }, status);
  const now = () => (d.now ?? Date.now)();
  const salt = () => d.env("SUPABASE_URL") ?? "";

  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: d.cors });
    if (req.method !== "POST") return fail("method_not_allowed", "Use POST.", 405);
    const path = new URL(req.url).pathname.replace(/\/+$/, "");
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const ip = d.ip(req);
    const visitor = (await d.sha256Hex(`${salt()}:ip:${ip}`)).slice(0, 24);

    if (path.endsWith("/start")) {
      const browserHash = typeof b["browser_hash"] === "string" ? b["browser_hash"].toLowerCase() : "";
      if (!HEX64.test(browserHash)) return fail("bad_request", "Something went wrong. Please try again.");
      if (!(await d.verifyTurnstile(typeof b["turnstile"] === "string" && b["turnstile"] ? b["turnstile"] : undefined, ip))) {
        return fail("challenge_failed", "Please complete the check and try again.");
      }
      if (!(await d.rateLimit(`wasignin:ip:${visitor}`, LIMITS.perVisitor, LIMITS.perVisitorSeconds, { failClosed: true }))) {
        return fail("rate_limited", "That is a lot of sign-in tries. Please try again in an hour.", 429);
      }
      const code = makeCode(d.randomBytes);
      const geo = await readGeo(b["geo"], await d.geoKey().catch(() => undefined), d.hmacHex, now());
      const device = deviceOf(req.headers.get("user-agent"));
      try {
        const id = await d.start({ codeHash: await codeHash(d, code), browserHash, ...device, ...geo });
        return reply({ id, code, expires_at: new Date(now() + CODE_LIFE_MS).toISOString() });
      } catch (e) {
        await d.captureError("auth-whatsapp", e, { step: "start" });
        return fail("start_failed", "Kabsi can't start a WhatsApp sign-in right now. Try again in a minute.", 502);
      }
    }

    if (path.endsWith("/check")) {
      const id = typeof b["id"] === "string" ? b["id"].toLowerCase() : "";
      const secret = typeof b["secret"] === "string" ? b["secret"] : "";
      if (!UUID.test(id) || !SECRET.test(secret)) return reply({ state: "unknown" });
      if (!(await d.rateLimit(`wasignin:check:${visitor}`, LIMITS.checksPerVisitor, LIMITS.checksSeconds))) {
        return fail("rate_limited", "Please wait a minute.", 429);
      }
      // The wrong browser (any other secret) reads exactly like an unknown sign-in: nothing about it is told.
      const r = await d.check(id, await d.sha256Hex(secret));
      if (r.result === "asked") return reply({ state: "asked", phone_end: /^\d{2}$/.test(r.phone_end ?? "") ? r.phone_end : null });
      if (r.result !== "take") return reply({ state: r.result });
      try {
        const session = await d.mint(r.user_id, req);
        if (!session) throw new Error("mint returned no session");
        return reply({ state: "signed_in", session });
      } catch (e) {
        await d.captureError("auth-whatsapp", e, { step: "mint" });
        return reply({ state: "failed" }, 502);
      }
    }
    return fail("not_found", "Not found.", 404);
  };
}

/** The stored code hash: salted with the project URL, so a table read alone does not give codes back by a lookup table. */
export const codeHash = (d: Pick<HandlerDeps, "sha256Hex" | "env">, code: string) => d.sha256Hex(`${d.env("SUPABASE_URL") ?? ""}:wasignin:${code.toUpperCase()}`);
