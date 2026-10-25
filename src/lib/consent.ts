// The visitor's privacy choices in the browser (P0.6-01, G-18, G-21, R-04, master plan 20.4).
//
// - The country comes from kabsi.co itself (/api/geo reads Cloudflare's cf-ipcountry or Vercel's country header);
//   the browser time zone is the fallback. Until it is known the strictest rule (opt_in) applies.
// - opt_in (the EU, the EEA, the UK, Switzerland, the UAE and Saudi Arabia): one small bar asks; nothing that needs consent loads before a
//   yes. notice (everywhere else): no bar; "Your privacy choices" in the footer has one switch.
// - Before any choice PostHog runs without cookies or identifiers under every rule; it keeps an identifier only
//   after a yes, and stops entirely after a no.
// - Advertising tags (the Meta Pixel, src/lib/meta-pixel.ts) may load only through runWhenAdvertisingAllowed, which
//   waits for a yes where the rule is opt_in.
// - A choice counts for 12 months (CONSENT_DAYS), then the bar asks again where the rule asks first.
// - The choice is kept in this browser (strictly necessary, so the banner is not shown again) and sent once to the
//   `consent` Edge Function, which stores the proof.
import {
  CONSENT_DAYS,
  CONSENT_VERSION,
  ruleFor,
  type ConsentAction,
  type ConsentRule,
} from "@/lib/consent-rules";
import { anonHeaders, supabaseUrl } from "@/lib/supabase-config";
import { hasStoredSession } from "@/lib/stored-session";

export { CONSENT_VERSION, CONSENT_WORDING, type ConsentRule } from "@/lib/consent-rules";

const STORE_KEY = "kabsi_consent";
const GEO_KEY = "kabsi_geo";

export type ConsentChoice = {
  version: string;
  visitor: string;
  analytics: boolean;
  advertising: boolean;
  at: string;
};
export type ConsentState = {
  rule: ConsentRule;
  country: string | null;
  countrySource: "network" | "timezone" | "unknown";
  choice: ConsentChoice | null;
  ready: boolean;
};

let state: ConsentState = {
  rule: "opt_in",
  country: null,
  countrySource: "unknown",
  choice: null,
  ready: false,
};
const listeners = new Set<(s: ConsentState) => void>();

function read<T>(storage: Storage | undefined, key: string): T | null {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(storage: Storage | undefined, key: string, value: unknown) {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode: the choice still applies for this page view */
  }
}
const local = () => (typeof window === "undefined" ? undefined : window.localStorage);
const session = () => (typeof window === "undefined" ? undefined : window.sessionStorage);

function set(next: Partial<ConsentState>) {
  state = { ...state, ...next };
  for (const fn of listeners) fn(state);
}

export function getConsent(): ConsentState {
  return state;
}
export function onConsentChange(fn: (s: ConsentState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// A stored choice counts for 12 months.
export function liveChoice(
  s: ConsentState = state,
  now: number = Date.now(),
): ConsentChoice | null {
  const c = s.choice;
  if (!c) return null;
  const at = Date.parse(c.at);
  return Number.isFinite(at) && now - at < CONSENT_DAYS * 86_400_000 ? c : null;
}

// The bar shows only where the rule asks first, while there is no live choice for the current wording version.
export function needsChoice(s: ConsentState = state): boolean {
  if (!s.ready || s.rule !== "opt_in") return false;
  const c = liveChoice(s);
  return !c || c.version !== CONSENT_VERSION;
}

// Statistics may be counted (cookieless before a choice, under every rule).
export function analyticsAllowed(s: ConsentState = state): boolean {
  const c = liveChoice(s);
  return c ? c.analytics : true;
}
// PostHog may keep an identifier and record a session: only after a yes.
export function analyticsPersistent(s: ConsentState = state): boolean {
  return liveChoice(s)?.analytics === true;
}
// Advertising tags may load: a yes, or no choice where the rule is notice and the country is known.
export function advertisingAllowed(s: ConsentState = state): boolean {
  const c = liveChoice(s);
  if (c) return c.advertising;
  return s.ready && s.rule === "notice";
}

// The one way an advertising tag may load. Runs now if allowed, otherwise the first time it becomes allowed.
export function runWhenAdvertisingAllowed(load: () => void): () => void {
  if (advertisingAllowed()) {
    load();
    return () => {};
  }
  let done = false;
  const off = onConsentChange((s) => {
    if (!done && advertisingAllowed(s)) {
      done = true;
      off();
      load();
    }
  });
  return off;
}

function newVisitorId() {
  try {
    return crypto.randomUUID();
  } catch {
    return "00000000-0000-4000-8000-000000000000".replace(/0/g, () =>
      Math.floor(Math.random() * 16).toString(16),
    );
  }
}

function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

type Geo = { country: string | null; source: "network" | "timezone" | "unknown" };

async function loadGeo(fetchImpl: typeof fetch): Promise<Geo> {
  const cached = read<Geo>(session(), GEO_KEY);
  if (cached) return cached;
  let country: string | null = null;
  try {
    const res = await fetchImpl("/api/geo", { headers: { accept: "application/json" } });
    if (res.ok) {
      const j = (await res.json()) as { country?: string | null };
      if (typeof j.country === "string" && /^[A-Z]{2}$/.test(j.country) && j.country !== "XX")
        country = j.country;
    }
  } catch {
    /* fall back to the time zone */
  }
  let geo: Geo = { country, source: country ? "network" : "unknown" };
  if (!country) {
    const { countryFromTimezone } = await import("../../supabase/functions/_shared/tz-country");
    const tzCountry = countryFromTimezone(browserTimeZone());
    geo = { country: tzCountry, source: tzCountry ? "timezone" : "unknown" };
  }
  write(session(), GEO_KEY, geo);
  return geo;
}

let started = false;
// Called once from the root component after hydration.
export async function initConsent(fetchImpl: typeof fetch = fetch) {
  if (started || typeof window === "undefined") return;
  started = true;
  const choice = read<ConsentChoice>(local(), STORE_KEY);
  if (choice) set({ choice });
  const geo = await loadGeo(fetchImpl);
  set({ rule: ruleFor(geo.country), country: geo.country, countrySource: geo.source, ready: true });
}

async function sessionToken(): Promise<string | undefined> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  } catch {
    return undefined;
  }
}

// Saves a choice from the bar or the panel: in this browser at once, then the proof on the server.
export async function saveChoice(
  action: ConsentAction,
  choices: { analytics: boolean; advertising: boolean },
  page: string,
  method: "banner" | "panel" = "banner",
) {
  const visitor =
    state.choice?.visitor ?? read<ConsentChoice>(local(), STORE_KEY)?.visitor ?? newVisitorId();
  const choice: ConsentChoice = {
    version: CONSENT_VERSION,
    visitor,
    ...choices,
    at: new Date().toISOString(),
  };
  write(local(), STORE_KEY, choice);
  set({ choice });
  try {
    // The proof carries the signed-in person's token when there is one. supabase-js is loaded only for a visitor who
    // has a stored session, so choosing "Decline" on a first visit loads nothing extra.
    const token = hasStoredSession() ? await sessionToken() : undefined;
    await fetch(`${supabaseUrl}/functions/v1/consent`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...anonHeaders,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        visitor_id: visitor,
        country: state.country,
        country_source: state.countrySource,
        tz: browserTimeZone(),
        action,
        analytics: choices.analytics,
        advertising: choices.advertising,
        version: CONSENT_VERSION,
        page,
        method,
      }),
      keepalive: true,
    });
  } catch {
    /* the choice still applies; the proof is retried the next time the visitor chooses */
  }
}

// The footer link "Your privacy choices" opens the panel.
export const OPEN_EVENT = "kabsi:privacy-choices";
export function openPrivacyChoices() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_EVENT));
}
