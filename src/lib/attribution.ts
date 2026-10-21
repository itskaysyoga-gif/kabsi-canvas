// Where a visitor came from (P0.6-02, G-32, K-127). Read from the address on every page, kept in this browser, and
// saved on the account once, on the server, right after the first sign-in (public.save_signup_attribution).
//
// - First touch and last touch: the UTM fields, the landing path and the referring site. A visit without UTMs does not
//   replace the last touch.
// - fbclid and the fbc value made from it, and Meta's fbp cookie when the Pixel has set one: advertising identifiers,
//   so they are kept only where the visitor's privacy choice allows advertising (src/lib/consent.ts).
// - via=CODE: a first-party cookie for 60 days; the last referral wins. Disclosed on /privacy.
import { advertisingAllowed, onConsentChange } from "@/lib/consent";
import { supabase } from "@/lib/supabase";

const TOUCH_KEY = "kabsi_touch";
const SAVED_KEY = "kabsi_touch_saved";
const VIA_COOKIE = "kabsi_via";
const VIA_DAYS = 60;
const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export type Touch = Partial<Record<(typeof UTM)[number] | "landing" | "referrer" | "at", string>>;
type Stored = { first?: Touch; last?: Touch; fbclid?: string; fbc?: string };

function readStored(): Stored {
  try {
    return JSON.parse(window.localStorage.getItem(TOUCH_KEY) ?? "{}") as Stored;
  } catch {
    return {};
  }
}
function writeStored(s: Stored) {
  try {
    window.localStorage.setItem(TOUCH_KEY, JSON.stringify(s));
  } catch {
    /* private mode */
  }
}

function cookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

// The touch in an address, or null when it carries no UTM field.
export function touchFrom(url: URL, referrer: string, at: Date): Touch | null {
  const t: Touch = {};
  for (const k of UTM) {
    const v = url.searchParams.get(k)?.trim().slice(0, 100);
    if (v) t[k] = v;
  }
  if (!Object.keys(t).length) return null;
  t.landing = url.pathname.slice(0, 200);
  try {
    const host = referrer ? new URL(referrer).hostname : "";
    if (host && host !== url.hostname) t.referrer = host.slice(0, 100);
  } catch {
    /* no referrer */
  }
  t.at = at.toISOString();
  return t;
}

let pendingFbclid: string | null = null;
let watching = false;

// Called on every page view from the root component.
export function captureTouch(href: string = window.location.href, referrer: string = document.referrer) {
  if (typeof window === "undefined") return;
  const url = new URL(href);
  const stored = readStored();
  const touch = touchFrom(url, referrer, new Date());
  if (touch) {
    stored.first ??= touch;
    stored.last = touch;
  } else if (!stored.first && url.pathname && !/^\/(app|staff|a|activate)(\/|$)/.test(url.pathname)) {
    // A visit with no campaign is the first touch too ("direct" or a referring site), so organic sign-ups are counted.
    stored.first = { landing: url.pathname.slice(0, 200), at: new Date().toISOString() };
    try {
      const host = referrer ? new URL(referrer).hostname : "";
      if (host && host !== url.hostname) stored.first.referrer = host.slice(0, 100);
    } catch {
      /* no referrer */
    }
  }
  const fbclid = url.searchParams.get("fbclid");
  if (fbclid && /^[A-Za-z0-9_-]{1,500}$/.test(fbclid)) pendingFbclid = fbclid;
  keepAdIds(stored);
  writeStored(stored);

  const via = url.searchParams.get("via");
  if (via && /^[A-Za-z0-9_-]{2,40}$/.test(via)) {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${VIA_COOKIE}=${encodeURIComponent(via.toUpperCase())}; Max-Age=${VIA_DAYS * 86400}; Path=/; SameSite=Lax${secure}`;
  }

  if (!watching) {
    watching = true;
    onConsentChange(() => {
      const s = readStored();
      keepAdIds(s);
      writeStored(s);
    });
  }
}

function keepAdIds(s: Stored) {
  if (!pendingFbclid || !advertisingAllowed()) return;
  s.fbclid = pendingFbclid;
  s.fbc = `fb.1.${Date.now()}.${pendingFbclid}`;
  pendingFbclid = null;
}

// What the browser holds now, in the shape save_signup_attribution reads.
export function attributionPayload(): Record<string, unknown> {
  const s = readStored();
  const fbp = advertisingAllowed() ? cookie("_fbp") : null;
  return {
    first: s.first ?? null,
    last: s.last ?? s.first ?? null,
    fbclid: advertisingAllowed() ? (s.fbclid ?? null) : null,
    fbc: advertisingAllowed() ? (cookie("_fbc") ?? s.fbc ?? null) : null,
    fbp,
    via: cookie(VIA_COOKIE),
  };
}

// Once per account and browser, right after sign-in. The server keeps only the first record of a new account.
export async function saveSignupAttribution(userId: string) {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(SAVED_KEY) === userId) return;
    const { error } = await supabase.rpc("save_signup_attribution", { p: attributionPayload() });
    if (!error) window.localStorage.setItem(SAVED_KEY, userId);
  } catch {
    /* tried again at the next sign-in */
  }
}
