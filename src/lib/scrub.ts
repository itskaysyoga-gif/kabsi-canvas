// What never leaves the browser in an error report or an analytics event (master plan 20.5): email addresses, phone
// numbers and review text. The same patterns run inside the boot script in src/lib/telemetry.ts (it is plain inline
// JavaScript, so it gets them as strings from here); tests/scrub.test.ts checks both.
export const EMAIL_PATTERN = "[\\w.+-]+@[\\w-]+\\.[\\w.-]+";
// A number written with a plus, or 9 to 15 digits in a row. Dates, times, counts and ids stay readable.
export const PHONE_PATTERN = "\\+\\d[\\d\\s().-]{6,}\\d|\\b\\d{9,15}\\b";
// Keys whose value is dropped whatever it holds: review text, reviewer names, contact details. ("token" is not here:
// PostHog carries its public project key under that name.) Keys that start with "$" are PostHog's own and left alone.
export const SECRET_KEYS = [
  "text",
  "body",
  "comment",
  "review",
  "review_text",
  "reviewer",
  "reviewer_name",
  "email",
  "phone",
  "message_body",
];

// Sec 1: one-time credentials and codes that ride in a page address. The path ones: email action links (/a/), holiday
// links (/h/), staff photo links (/u/), card activation (/activate/), a saved free check (/scan/), a review page
// (/review/) and a resumed setup (/start/resume/). The query and fragment ones: unsubscribe (t), card codes (code), and
// what a sign-in return can carry (access_token, refresh_token and the like). Each value becomes ":token" or "redacted".
export const TOKEN_PATH_PATTERN =
  "\\/(a|h|u|activate|scan|review|start\\/resume|unsubscribe)\\/[^\\/?#\\s\"'<>]+";
export const TOKEN_QUERY_PATTERN =
  "([?&#](?:t|token|code|otp|key|sig|access_token|refresh_token|provider_token|provider_refresh_token|id_token)=)[^&#\\s\"'<>]+";

export function scrubUrl(value: string): string {
  return value
    .replace(new RegExp(TOKEN_PATH_PATTERN, "g"), "/$1/:token")
    .replace(new RegExp(TOKEN_QUERY_PATTERN, "g"), "$1redacted");
}

// Pages whose address holds a credential: session replay never records them (src/lib/telemetry.ts).
export function isTokenPath(path: string): boolean {
  return new RegExp(`^${TOKEN_PATH_PATTERN}`).test(path) || /^\/unsubscribe(\/|$)/.test(path);
}

export function scrubString(value: string): string {
  return scrubUrl(value)
    .replace(new RegExp(EMAIL_PATTERN, "g"), "[email]")
    .replace(new RegExp(PHONE_PATTERN, "g"), "[phone]");
}

export function scrubProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (SECRET_KEYS.includes(k.toLowerCase())) continue;
    out[k] = typeof v === "string" && !k.startsWith("$") ? scrubString(v) : v;
  }
  return out;
}
