// The production wiring of POST /api/suggest (src/server/suggest.ts): the database, Google and Turnstile (no cache).
// Server only (src/server is never bundled for the browser). The three secrets are read from Vercel's environment at
// call time and never logged: PLACES_API_KEY, TURNSTILE_SECRET_KEY and SUGGEST_ROUTE_KEY (the key the database made for
// this route, which opens public.suggest_take only; no service key is ever on Vercel).
import { autocompleteWeb } from "../../supabase/functions/_shared/google/places/autocomplete-web.ts";
import { supabasePublishableKey, supabaseUrl } from "../lib/supabase-config";
import type { SuggestDeps, Take } from "./suggest";

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

export const suggestDeps: SuggestDeps = {
  env,
  take,
  autocomplete: (key, input, token, signal) => autocompleteWeb(key, input, token, signal),
  verifyTurnstile,
  // One line per call: the outcome and the timings only (no address, letters, pass or token).
  log: (fields) => console.log(JSON.stringify(fields)),
  now: () => Date.now(),
  salt: supabaseUrl,
};
