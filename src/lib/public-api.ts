// The public site's calls to Kabsi's Edge Functions (Web 2): the Founding 25 count (private since Founding 1) and the Founding Partner counts, the two
// applications, and the free check. Every call sends the public anon JWT (D295); every write carries a Turnstile token.
// Nothing here invents a number: a count that does not load stays null and the page shows no number.
import { useEffect, useState } from "react";
import { anonHeaders, supabaseUrl } from "@/lib/supabase-config";

export type FoundingTrade = "beauty_hair" | "food" | "health" | "other";
export type FoundingPlaces = {
  total: number;
  left: number;
  open_to_any: boolean;
  by_trade: Record<FoundingTrade, { cap: number; taken: number }>;
};
export type PartnerPlaces = { founding_total: number; founding_left: number };

/** An error with the function's code and its plain message, so a form can show it under the right field. */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

const TRY_AGAIN = "Something went wrong. Please try again in a minute.";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...anonHeaders, ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError("network", "We could not reach Kabsi. Check your connection and try again.");
  }
  const j = (await res.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
    field?: string;
  };
  if (!res.ok) throw new ApiError(j.error ?? "failed", j.message || TRY_AGAIN, j.field);
  return j as T;
}

const isPlaces = (v: unknown): v is FoundingPlaces =>
  !!v &&
  typeof (v as FoundingPlaces).left === "number" &&
  typeof (v as FoundingPlaces).total === "number";

/**
 * Founding 1 (R-151): the Founding 25 count, asked on kabsi.co's own address with the private invite slug. Without the
 * current slug the answer is 404 and no number shows. Never cached (src/lib/founding-count.ts).
 */
export const FOUNDING_COUNT_PATH = "/api/founding-count";

export async function loadFoundingPlaces(slug: string): Promise<FoundingPlaces | null> {
  try {
    // The slug rides in a header, not the address, so no request log records it (Founding 1 review).
    const res = await fetch(FOUNDING_COUNT_PATH, {
      cache: "no-store",
      headers: { "x-founding-invite": slug },
    });
    if (!res.ok) return null;
    const v = (await res.json()) as unknown;
    return isPlaces(v) ? v : null;
  } catch {
    return null;
  }
}

export async function loadPartnerPlaces(): Promise<PartnerPlaces | null> {
  try {
    const v = await call<PartnerPlaces>("programs/partners", { method: "GET" });
    return typeof v.founding_left === "number" ? v : null;
  } catch {
    return null;
  }
}

/** The count for the invited page: one fetch per page view, nothing while it is unknown. */
export function useFoundingPlaces(slug: string): FoundingPlaces | null {
  const [v, setV] = useState<FoundingPlaces | null>(null);
  useEffect(() => {
    let live = true;
    void loadFoundingPlaces(slug).then((r) => {
      if (live) setV(r);
    });
    return () => {
      live = false;
    };
  }, [slug]);
  return v;
}

export function usePartnerPlaces(): PartnerPlaces | null {
  const [v, setV] = useState<PartnerPlaces | null>(null);
  useEffect(() => {
    let live = true;
    void loadPartnerPlaces().then((r) => live && setV(r));
    return () => {
      live = false;
    };
  }, []);
  return v;
}

/** The words the founding applicant ticks, one for each case study choice, shown on the form and stored by the server as
 * proof. Kept equal to FOUNDING_CONSENT in supabase/functions/_shared/programs.ts by tests/programs.test.ts. */
export const FOUNDING_CONSENT = {
  anonymous:
    "I agree to a 2-minute check-in with Kabsi every two weeks, and to Kabsi writing a case study that does not name my business. " +
    "I approve the final text before it is published.",
  named:
    "I agree to a 2-minute check-in with Kabsi every two weeks, and to Kabsi writing a case study that names my business. " +
    "I approve the final text before it is published.",
} as const;

export type FoundingApplication = {
  /** The private invite slug from the address (Founding 1): the server refuses an application without the current one. */
  invite: string;
  business_name: string;
  country: "AE" | "GB" | "US";
  trade: FoundingTrade;
  business_kind: string;
  whatsapp: string;
  why_now: string;
  case_study: "named" | "anonymous";
  checkin_consent: true;
  turnstile: string;
};
export const applyFounding = (a: FoundingApplication) =>
  call<{ ok: true }>("programs/founding", { method: "POST", body: JSON.stringify(a) });

/* ---------- The free check (V4, POST and GET /visibility/check) ---------- */

export type NearbyCard = {
  kind: "home" | "away";
  row: number;
  col: number;
  place: string;
  name: string | null;
  rank: number | null;
  position: string;
  first: string | null;
  firstIsYou: boolean;
  /** Scan 2: the business that came first has a name not in Latin letters ("another business came first"). */
  first_hidden?: boolean;
};
export type FreeCheck = {
  code: string;
  business: string;
  term: string;
  fast: {
    rank: number | null;
    line: string;
    competitors: { name: string; rating: number | null; reviews: number | null }[];
  };
  ai: {
    named: boolean;
    line: string | null;
    label: string;
    provider?: string;
    /** Scan 3: the model that answered and how many named businesses could not be matched to the area. */
    model?: string | null;
    named_other?: number | null;
    /** Scan 2 (30.29): what was asked and when. Null on a check from before Scan 2. */
    question?: string | null;
    question_line?: string | null;
    asked_line?: string | null;
    asked_at?: string | null;
    sources?: { domain: string; title: string }[];
    sources_line?: string | null;
    /** AI Answers 1: which fact ChatGPT gave differently from the Google profile, and its own sentence. */
    accuracy?: { fact: string; sentence: string; line: string } | null;
  } | null;
  map:
    | {
        state: "done";
        nearby: { cards: NearbyCard[]; top3: number; points: number; count_line: string } | null;
        top3: number;
        points: number;
        dots: { row: number; col: number; rank: number | null }[];
        /** Scan 3: the businesses that came up at the most of the 49 points, with how many. */
        rivals?: { name: string; places: number }[];
      }
    | { state: "mapping" | "failed"; line: string | null };
  whatsapp_text?: string;
  created_at?: string;
};
/** Go live 1 (30.28): "unavailable" when the provider refused or a cap is reached; the page then leaves the nearby and AI parts out. */
export type StartedCheck = FreeCheck | { state: "waitlist" } | { state: "unavailable" };

export function startFreeCheck(o: {
  name: string;
  address: string | null;
  place_id: string;
  country: string;
  /** Scan 2: the town from the profile check; the server reads it from the address when it is missing. */
  city: string | null;
  term: string | null;
  industry: string | null;
  turnstile: string;
}) {
  return call<StartedCheck>("visibility/check", { method: "POST", body: JSON.stringify(o) });
}

/** "Save my place" while the free check is closed (UX 1): an email or a WhatsApp number, told once when it opens. */
export function joinWaitlist(o: {
  business: string;
  country: string | null;
  place_id: string | null;
  term: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_consent: boolean;
  tips: boolean;
  page: string;
  turnstile: string;
}) {
  return call<{ ok: true }>("visibility/waitlist", { method: "POST", body: JSON.stringify(o) });
}

export function getFreeCheck(code: string) {
  // Sec 2: the code in the POST body, never in a query string.
  return call<FreeCheck>("visibility/check/result", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

/** The country of a Google address, from its last part ("Dubai, United Arab Emirates" is AE). Null when unknown. */
const COUNTRY_NAMES: Record<string, string> = {
  "united arab emirates": "AE",
  uae: "AE",
  "united kingdom": "GB",
  uk: "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "northern ireland": "GB",
  "united states": "US",
  usa: "US",
  "saudi arabia": "SA",
  lebanon: "LB",
  qatar: "QA",
  kuwait: "KW",
  bahrain: "BH",
  oman: "OM",
  egypt: "EG",
  jordan: "JO",
  ireland: "IE",
  france: "FR",
  germany: "DE",
  spain: "ES",
  italy: "IT",
  netherlands: "NL",
  canada: "CA",
  australia: "AU",
};
export function countryOfAddress(address: string | null | undefined): string | null {
  const last = (address ?? "").split(",").pop()?.trim().toLowerCase().replace(/[0-9]/g, "").trim();
  if (!last) return null;
  if (COUNTRY_NAMES[last]) return COUNTRY_NAMES[last]!;
  // "Dubai - United Arab Emirates", "NY 10001, USA"
  for (const [name, cc] of Object.entries(COUNTRY_NAMES)) if (last.endsWith(name)) return cc;
  return null;
}

/** The founding price places left (the first 30 paying businesses, session 10): Pricing only, never invented. */
export async function loadFoundingPriceLeft(): Promise<number | null> {
  try {
    const v = await call<{ left?: unknown }>("billing-creem/founding", { method: "GET" });
    return typeof v.left === "number" ? v.left : null;
  } catch {
    return null;
  }
}

/** Partners 2: one visit through a partner link (?via=P-CODE), counted once per visit; the answer is never shown. */
export async function countPartnerVisit(code: string): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/functions/v1/programs/partner/visit`, {
      method: "POST",
      headers: { "content-type": "application/json", ...anonHeaders },
      body: JSON.stringify({ code }),
      keepalive: true,
    });
  } catch {
    /* a visit that is not counted changes nothing for the visitor */
  }
}
