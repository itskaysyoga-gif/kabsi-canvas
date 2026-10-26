// The public site's calls to Kabsi's Edge Functions (Web 2): the real Founding 25 and Founding Partner counts, the two
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

export async function loadFoundingPlaces(): Promise<FoundingPlaces | null> {
  try {
    const v = await call<unknown>("programs/founding", { method: "GET" });
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

/** One fetch per page view for all the banners on it (GET programs/founding is cached 5 minutes at the edge). */
let foundingOnce: Promise<FoundingPlaces | null> | null = null;
export function useFoundingPlaces(): FoundingPlaces | null {
  const [v, setV] = useState<FoundingPlaces | null>(null);
  useEffect(() => {
    let live = true;
    foundingOnce ??= loadFoundingPlaces();
    void foundingOnce.then((r) => {
      if (live) setV(r);
      if (!r) foundingOnce = null;
    });
    return () => {
      live = false;
    };
  }, []);
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

export type FoundingApplication = {
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

export type PartnerKind =
  "creator" | "agency" | "accountant" | "reseller" | "business_group" | "other";
export type PartnerApplication = {
  name: string;
  email: string;
  kind: PartnerKind;
  terms: true;
  turnstile: string;
};
export const applyPartner = (a: PartnerApplication) =>
  call<{ ok: true }>("programs/partners", { method: "POST", body: JSON.stringify(a) });

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
    competitors?: string[];
  } | null;
  map:
    | {
        state: "done";
        nearby: { cards: NearbyCard[]; top3: number; points: number; count_line: string } | null;
        top3: number;
        points: number;
        dots: { row: number; col: number; rank: number | null }[];
      }
    | { state: "mapping" | "failed"; line: string | null };
  whatsapp_text?: string;
  created_at?: string;
};
export type StartedCheck = FreeCheck | { state: "waitlist" };

export function startFreeCheck(o: {
  name: string;
  address: string | null;
  place_id: string;
  country: string;
  term: string | null;
  industry: string | null;
  turnstile: string;
}) {
  return call<StartedCheck>("visibility/check", { method: "POST", body: JSON.stringify(o) });
}

export function getFreeCheck(code: string) {
  return call<FreeCheck>(`visibility/check?code=${encodeURIComponent(code)}`, { method: "GET" });
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
