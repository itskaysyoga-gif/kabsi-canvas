// The production wiring of POST /api/suggest (src/server/suggest.ts): the database, Google, Turnstile and the two caches.
// Server only (src/server is never bundled for the browser). The three secrets are read from Vercel's environment at
// call time and never logged: PLACES_API_KEY, TURNSTILE_SECRET_KEY and SUGGEST_ROUTE_KEY (the key the database made for
// this route, which opens public.suggest_take only; no service key is ever on Vercel).
import { createHash } from "node:crypto";
import { getCache } from "@vercel/functions";
import { autocompleteWeb } from "../../supabase/functions/_shared/google/places/autocomplete-web.ts";
import { supabasePublishableKey, supabaseUrl } from "../lib/supabase-config";
import { CACHE_SECONDS, type Cached, type SuggestDeps, type Take } from "./suggest";

const env = (name: string) => {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
};

async function take(
  visitor: string,
  limits: [number | null, number | null, number | null],
  places: boolean,
): Promise<Take> {
  const routeKey = env("SUGGEST_ROUTE_KEY");
  if (!routeKey) return { allowed: false, reason: "error" };
  // The public key gets the call to PostgREST; the route key inside the body is what lets it through.
  const headers: Record<string, string> = {
    "content-type": "application/json",
    apikey: supabasePublishableKey,
  };
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/suggest_take`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_key: routeKey,
        p_visitor: visitor,
        p_per_minute: limits[0],
        p_per_hour: limits[1],
        p_per_day: limits[2],
        p_places: places,
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { allowed: false, reason: "error" };
    const j = (await res.json()) as { allowed?: unknown; reason?: unknown };
    if (j.allowed === true) return { allowed: true };
    return {
      allowed: false,
      reason:
        j.reason === "rate_limited"
          ? "rate_limited"
          : j.reason === "back_soon"
            ? "back_soon"
            : "error",
    };
  } catch {
    return { allowed: false, reason: "error" };
  }
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = env("TURNSTILE_SECRET_KEY");
  if (!secret || !token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    const j = (await res.json()) as { success?: boolean };
    return j.success === true;
  } catch {
    return false;
  }
}

// The first cache: this instance's memory (Vercel keeps an instance for many requests). At most 2,000 answers.
const memory = new Map<string, { at: number; value: Cached }>();
const MEMORY_MAX = 2000;
function memoryGet(key: string): Cached | null {
  const e = memory.get(key);
  if (!e) return null;
  if (Date.now() - e.at > CACHE_SECONDS * 1000) {
    memory.delete(key);
    return null;
  }
  return e.value;
}
function memorySet(key: string, value: Cached) {
  if (memory.size >= MEMORY_MAX) memory.delete(memory.keys().next().value!);
  memory.set(key, { at: Date.now(), value });
}

// The second cache: Vercel's Runtime Cache, shared by every instance in the region. Keys are hashed by the library; the
// entry name is left empty so the typed letters never reach Vercel's cache dashboard. A slow cache is not waited for.
const runtime = (() => {
  try {
    // SHA-256 for the key, not the library's 32 bit default, so two prefixes never share an entry (review of 6 Nov).
    return getCache({
      namespace: "kabsi-suggest-v1",
      keyHashFunction: (k: string) => createHash("sha256").update(k).digest("hex"),
    });
  } catch {
    return null;
  }
})();
const within = <T>(p: Promise<T>, ms: number, fallback: T) =>
  Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

async function cacheGet(key: string): Promise<Cached | null> {
  const m = memoryGet(key);
  if (m) return m;
  if (!runtime) return null;
  const v = (await within(
    runtime.get(key).catch(() => null),
    60,
    null,
  )) as Cached | null;
  if (!v || v.key !== key || !Array.isArray(v.suggestions)) return null;
  memorySet(key, v);
  return v;
}
async function cacheSet(key: string, value: Cached): Promise<void> {
  memorySet(key, value);
  await within(
    runtime?.set(key, value, { ttl: CACHE_SECONDS, name: "" }).catch(() => undefined) ??
      Promise.resolve(),
    100,
    undefined,
  );
}

export const suggestDeps: SuggestDeps = {
  env,
  take,
  autocomplete: (key, input, token, signal) => autocompleteWeb(key, input, token, signal),
  verifyTurnstile,
  cacheGet,
  cacheSet,
  // One line per call: the outcome and the timings only (no address, letters, pass or token).
  log: (fields) => console.log(JSON.stringify(fields)),
  now: () => Date.now(),
  salt: supabaseUrl,
};
