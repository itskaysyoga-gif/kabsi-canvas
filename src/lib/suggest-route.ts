// Speed 2 part A: where the suggestion box sends its calls. First POST /api/suggest on the page's own address (no CORS
// preflight, no Supabase gateway; src/server/suggest.ts). Until that route is set up on Vercel (it answers 503
// not_configured, or 404 on an older deploy) the box keeps using profile-snapshot's suggest and pass actions as before,
// for the rest of the page view. Both paths take the same request and give the same answer.
import { anonHeaders, supabaseUrl } from "@/lib/supabase-config";

export const SUGGEST_PATH = "/api/suggest";
let route: "unknown" | "on" | "off" = "unknown";

/** For the tests: forget what this page view learned about the route. */
export function resetSuggestRoute() {
  route = "unknown";
}

const viaFunction = (body: string, init: RequestInit) =>
  fetch(`${supabaseUrl}/functions/v1/profile-snapshot`, {
    ...init,
    method: "POST",
    headers: { "content-type": "application/json", ...anonHeaders },
    body,
  });

async function routeIsOff(res: Response): Promise<boolean> {
  if (res.status === 404 || res.status === 405) return true;
  if (res.status !== 503) return false;
  const j = (await res
    .clone()
    .json()
    .catch(() => ({}))) as { error?: unknown };
  return j.error === "not_configured";
}

/** One suggestion call (suggest or pass): the route, or profile-snapshot when the route is not set up. */
export async function postSuggest(
  payload: Record<string, unknown>,
  init: { signal?: AbortSignal | undefined } = {},
): Promise<Response> {
  const body = JSON.stringify(payload);
  const signal = init.signal ? { signal: init.signal } : {};
  if (route !== "off") {
    const res = await fetch(SUGGEST_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      ...signal,
    });
    if (!(await routeIsOff(res))) {
      route = "on";
      return res;
    }
    route = "off";
  }
  return viaFunction(body, signal);
}

let woken = false;
/**
 * The first touch of a search box wakes the route (once per page), so its cold start is paid while the visitor is
 * still typing. If the route says it is not set up, the old function is woken instead (Launch 4 part D).
 */
export function wakeSuggestRoute() {
  if (woken) return;
  woken = true;
  void (async () => {
    try {
      const res = await fetch(SUGGEST_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "warm" }),
        keepalive: true,
      });
      const j = (await res.json().catch(() => ({}))) as { configured?: unknown };
      if (res.ok && j.configured === true) {
        route = "on";
        return;
      }
      route = "off";
      await viaFunction(JSON.stringify({ action: "warm" }), { keepalive: true });
    } catch {
      woken = false;
    }
  })();
}
