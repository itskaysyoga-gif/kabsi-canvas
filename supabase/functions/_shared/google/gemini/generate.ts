// Gemini API, the one Google call AI Visibility makes (V2, master plan 27.3 item 2): generateContent with the Google Maps
// grounding tool. It reads and writes nothing in a Business Profile. Kept here with every other Google call (K-34).
// Terms: docs/GOOGLE-ARCHITECTURE.md and .claude/skills/kabsi-data-providers (Additional Terms, Grounding with Google Maps).
// The key is GEMINI_API_KEY in Supabase secrets, sent in a header and never in the URL or a log.
export const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** One generateContent call; the caller parses the answer. Non-2xx other than 400 are returned as the status for the caller to map. */
export async function generateContent(apiKey: string, model: string, body: unknown, fetcher: typeof fetch = fetch): Promise<{ status: number; json: unknown }> {
  const res = await fetcher(`${GEMINI_BASE}/models/${model}:generateContent`, {
    method: "POST", headers: { "x-goog-api-key": apiKey, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}
