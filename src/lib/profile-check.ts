// Client for the free Google Profile Check (P0.4-01): the profile-snapshot Edge Function, which holds the Places key,
// the limits and the cache. Public data only. Every call sends the public anon JWT (D295) and a Turnstile token.
import { anonHeaders, supabaseUrl } from "@/lib/supabase-config";
import type { CoachRow } from "@/lib/coach";

/** The exact words next to the unticked "Send me tips" box. Keep equal to TIPS_CONSENT_TEXT in
 * supabase/functions/_shared/profile-snapshot.ts (tests/profile-check.test.ts checks it): it is stored as proof (G-21). */
export const TIPS_CONSENT_TEXT = "Send me tips on managing my Google profile";

export type FoundBusiness = { place_id: string; name: string; address: string };
/** The words next to the WhatsApp tick. Keep equal to WHATSAPP_CONSENT_TEXT in
 * supabase/functions/_shared/profile-snapshot.ts (tests/profile-check.test.ts checks it): it is stored as proof (G-21). */
export const WHATSAPP_CONSENT_TEXT =
  "Send my Google Profile Check to this WhatsApp number as one message. I understand Kabsi will not message me again unless I ask.";

/** A status flag: one plain fact and what Kabsi would do. "danger" is red, "warning" is amber, "neutral" is grey (public
 * data cannot show it, so Kabsi checks it once the owner connects). Never a score. */
export type Tone = "danger" | "warning" | "neutral";
export type Flag = { tone: Tone; fact: string; action: string };
export type Snapshot = {
  place_id: string;
  name: string;
  address: string;
  category: string | null;
  rating: number | null;
  review_count: number | null;
  business_status: string | null;
  open_now: boolean | null;
  hours: string[];
  phone: string | null;
  website: string | null;
  has_photos: boolean;
  photo_count: number;
  flags: Flag[];
  /** The Profile Coach checklist (the same rows as the app); public data cannot show most of it, and says so. */
  checklist: CoachRow[];
  cached: boolean;
};

export const TONE_LABEL: Record<Tone, string> = {
  danger: "Needs fixing",
  warning: "Worth fixing",
  neutral: "After you connect",
};

/** An error with the function's code, so the screen can tell "Back soon" from "try again". */
export class CheckError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/profile-snapshot`, {
      method: "POST",
      headers: { "content-type": "application/json", ...anonHeaders },
      body: JSON.stringify(body),
    });
  } catch {
    throw new CheckError(
      "network",
      "We could not reach Kabsi. Check your connection and try again.",
    );
  }
  const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok)
    throw new CheckError(j.error ?? "failed", j.message || "That didn't work. Please try again.");
  return j as T;
}

export async function findBusinesses(query: string, turnstile: string) {
  return (await call<{ places: FoundBusiness[] }>({ action: "search", query, turnstile })).places;
}

export async function runCheck(placeId: string, turnstile: string) {
  return (await call<{ snapshot: Snapshot }>({ action: "check", place_id: placeId, turnstile }))
    .snapshot;
}

export async function emailCheck(o: {
  placeId: string;
  email: string;
  tips: boolean;
  page: "/google-profile-check" | "/get-started" | "/";
  turnstile: string;
}) {
  await call<{ ok: true }>({
    action: "email",
    place_id: o.placeId,
    email: o.email,
    tips: o.tips,
    consent_text: TIPS_CONSENT_TEXT,
    page: o.page,
    turnstile: o.turnstile,
  });
}

export async function whatsappCheck(o: {
  placeId: string;
  phone: string;
  page: "/google-profile-check" | "/get-started" | "/";
  turnstile: string;
}) {
  await call<{ ok: true }>({
    action: "whatsapp",
    place_id: o.placeId,
    phone: o.phone,
    consent: true,
    consent_text: WHATSAPP_CONSENT_TEXT,
    page: o.page,
    turnstile: o.turnstile,
  });
}
