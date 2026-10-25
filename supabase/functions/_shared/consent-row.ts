// The row the `consent` Edge Function stores for one banner choice (P0.6-01). Pure, so tests/consent.test.ts runs it.
import { CONSENT_WORDING, ruleFor } from "./consent.ts";
import { countryFromTimezone } from "./tz-country.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ACTIONS = ["accept", "decline", "switch", "save", "ok"];

export type ConsentInput = Record<string, unknown>;

// Turns the request body into the row to store, or an error code.
export function consentRow(b: ConsentInput): { row: Record<string, unknown> } | { error: string } {
  const visitor = typeof b.visitor_id === "string" ? b.visitor_id.toLowerCase() : "";
  if (!UUID.test(visitor)) return { error: "bad_visitor" };
  const action = String(b.action ?? "");
  if (!ACTIONS.includes(action)) return { error: "bad_action" };
  const version = String(b.version ?? "");
  const wording = CONSENT_WORDING[version];
  if (!wording) return { error: "bad_version" };
  if (typeof b.analytics !== "boolean" || typeof b.advertising !== "boolean") return { error: "bad_choices" };

  let country = typeof b.country === "string" ? b.country.trim().toUpperCase() : "";
  let source = b.country_source === "network" && /^[A-Z]{2}$/.test(country) && country !== "XX" ? "network" : "unknown";
  if (source === "unknown") {
    const tzCountry = countryFromTimezone(typeof b.tz === "string" ? b.tz.slice(0, 64) : null);
    country = tzCountry ?? "";
    source = tzCountry ? "timezone" : "unknown";
  }
  const rule = ruleFor(country || null);
  // The panel ("Your privacy choices") stores its own line; the bar stores the rule's line. A version that has no line
  // for what the browser says it showed is refused, so no record claims words that were never on screen.
  const method = b.method === "panel" || action === "switch" ? "panel" : "banner";
  const shown = method === "panel" ? (wording.panel ?? wording[rule]) : wording[rule];
  if (!shown) return { error: "bad_version" };
  const rawPage = typeof b.page === "string" ? b.page : "/";
  // Only the path: never a query string or a token (email action links carry one in /a/<token>).
  const page = (rawPage.split(/[?#]/)[0] || "/").replace(/^\/a\/[^/]+/, "/a/:token").slice(0, 300) || "/";
  return {
    row: {
      visitor_id: visitor,
      country: country || null,
      country_source: source,
      rule,
      action,
      analytics: b.analytics,
      advertising: b.advertising,
      wording_version: version,
      wording: shown,
      language: "en",
      page: page.startsWith("/") ? page : "/",
      method,
    },
  };
}
