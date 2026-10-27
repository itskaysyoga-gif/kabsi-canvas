// The one scrub for what the Edge Functions write to their logs, to Sentry and to jobs_log (D266, master plan 20.5, Sec 1).
// No Deno and no imports, so tests/sec1-no-secrets-in-logs.test.ts runs it under Node too.
// Review text, reviewer names, emails, phone numbers and tokens never leave in a log line or an error report.
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
// 20.5: phone numbers too (a number with a plus, or 9 to 15 digits in a row), as src/lib/scrub.ts does in the browser.
const PHONE_RE = /\+\d[\d\s().-]{6,}\d|\b\d{9,15}\b/g;
// Sec 1: a token in a link's query (unsubscribe t, action t, an API key) loses its value too.
const QUERY_SECRET_RE = /([?&#](?:t|token|key|sig|code|otp|access_token|refresh_token|api_key)=)[^&#\s"']+/g;
// Sec 2: the one-click unsubscribe token rides in the path (/email/unsubscribe/TOKEN, /unsubscribe/TOKEN).
const PATH_SECRET_RE = /(\/unsubscribe\/)[^/?#\s"']+/g;

export const scrubText = (s: string) =>
  s.replace(QUERY_SECRET_RE, "$1[redacted]").replace(PATH_SECRET_RE, "$1[redacted]").replace(EMAIL_RE, "[email]")
    .replace(PHONE_RE, "[phone]");

/** An error's text as staff may see it (Sec 2: the operations view, publication and WhatsApp errors): scrubbed of
 *  emails, phone numbers and tokens, and cut to `max` characters. */
export const errorText = (e: unknown, max = 300) =>
  scrubText(String((e as Error)?.message ?? e)).slice(0, max);

// Keys whose value is dropped whatever it holds.
export const SENSITIVE_KEYS = new Set([
  "comment", "reviewer_name", "body", "instruction", "text", "payload", "email", "to", "token", "authorization",
  "sig", "signature", "api_key", "x-api-key", "phone", "review", "review_text",
  // Sec 1: credentials and codes by name.
  "access_token", "refresh_token", "id_token", "otp", "password", "secret", "cookie", "apikey", "x-kabsi-secret",
  // Sec 2: codes that moved from query strings into bodies and headers; names of people and businesses (privacy trace).
  "x-kabsi-check", "x-kabsi-code", "reviewer", "reviewer_first", "business_name",
]);

export function scrubFields(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return scrubText(value).slice(0, 300);
  if (depth >= 3 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => scrubFields(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? "[redacted]" : scrubFields(v, depth + 1);
  }
  return out;
}
