// Speed 2 part A (lane R, 6 Nov 2026): the one Places Autocomplete (New) request of the kabsi.co route POST /api/suggest
// (src/server/suggest.ts, Vercel fra1). It lives in the Google layer (K-34: every Google address is in this folder) and
// uses nothing but fetch, so the website's server can import it as well as Deno. Same request as live.ts autocomplete():
// the input and the visitor's one session token for the typing session (the chosen place's Place Details call, with the
// same token, still ends the session in profile-snapshot), no field mask (Autocomplete takes none). The caller counts the
// request against the day's Autocomplete cap (public.suggest_take, which runs places_take('autocomplete')).
import type { AutocompleteResponse } from "../types.ts";

export const PLACES_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";

export type WebAutocomplete = { ok: boolean; status: number; data: AutocompleteResponse };

export async function autocompleteWeb(
  key: string,
  input: string,
  sessionToken: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<WebAutocomplete> {
  const res = await fetcher(PLACES_AUTOCOMPLETE_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ input, sessionToken }),
    ...(signal ? { signal } : {}),
  });
  return {
    ok: res.ok,
    status: res.status,
    data: (await res.json().catch(() => ({}))) as AutocompleteResponse,
  };
}
