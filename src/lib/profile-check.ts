// Client for the free Google Profile Check (P0.4-01): the profile-snapshot Edge Function, which holds the Places key,
// the limits and the cache. Public data only. Every call sends the public anon JWT (D295) and a Turnstile token.
import { anonHeaders, supabaseUrl } from "@/lib/supabase-config";
import type { CoachRow } from "@/lib/coach";

/** The exact words next to the unticked "Send me tips" box. Keep equal to TIPS_CONSENT_TEXT in
 * supabase/functions/_shared/profile-snapshot.ts (tests/profile-check.test.ts checks it): it is stored as proof (G-21). */
export const TIPS_CONSENT_TEXT = "Send me tips on managing my Google profile";

/** One match of the search (with its category) or one suggestion while typing (name and short address only). */
export type FoundBusiness = {
  place_id: string;
  name: string;
  address: string;
  category?: string | null;
};
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
  /** Scan 2 (master plan 30.29): the town, which the free check's AI question names. Missing from older answers. */
  area?: string | null;
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
    /** The HTTP status when the function answered; a 4xx is about the visitor's input, not Kabsi's side. */
    public status?: number,
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
    throw new CheckError(
      j.error ?? "failed",
      j.message || "That didn't work. Please try again.",
      res.status,
    );
  return j as T;
}

export async function findBusinesses(query: string, turnstile: string) {
  return (await call<{ places: FoundBusiness[] }>({ action: "search", query, turnstile })).places;
}

/** `sessionToken` is the one the suggestions used: Place Details with it ends the Autocomplete session (Check 2). */
export async function runCheck(placeId: string, turnstile: string, sessionToken?: string) {
  return (
    await call<{ snapshot: Snapshot }>({
      action: "check",
      place_id: placeId,
      ...(sessionToken ? { session_token: sessionToken } : {}),
      turnstile,
    })
  ).snapshot;
}

/** A new Autocomplete session token (a version 4 UUID). One typing session uses one; picking a place ends it. */
export const newSessionToken = () => crypto.randomUUID();

export type Suggested = {
  suggestions: FoundBusiness[];
  /** False when the server will not suggest (the daily cap, a limit, a Google error): the box becomes a plain search. */
  available: boolean;
  /** A signed pass the next calls send instead of a Turnstile token (a Turnstile token works once). */
  pass?: string;
  /** The pass had run out (15 minutes) or did not fit: ask again with a fresh bot check. */
  challengeFailed?: boolean;
};

/**
 * Check 2: suggestions while the visitor types, through Kabsi's own function (the Places key never reaches the browser).
 * The first call of a typing session carries a Turnstile token; later calls carry the pass it returned. Any failure is
 * `available: false`, never an error on screen.
 */
export async function suggestBusinesses(
  o: {
    query: string;
    sessionToken: string;
    turnstile?: string | undefined;
    pass?: string | undefined;
  },
  signal?: AbortSignal,
): Promise<Suggested> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/profile-snapshot`, {
      method: "POST",
      headers: { "content-type": "application/json", ...anonHeaders },
      body: JSON.stringify({
        action: "suggest",
        query: o.query,
        session_token: o.sessionToken,
        ...(o.pass ? { pass: o.pass } : {}),
        ...(o.turnstile ? { turnstile: o.turnstile } : {}),
      }),
      ...(signal ? { signal } : {}),
    });
    if (!res.ok) {
      const e = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        suggestions: [],
        available: false,
        ...(e.error === "challenge_failed" ? { challengeFailed: true } : {}),
      };
    }
    const j = (await res.json()) as Partial<Suggested>;
    return {
      suggestions: Array.isArray(j.suggestions) ? j.suggestions.slice(0, 5) : [],
      available: j.available === true,
      ...(typeof j.pass === "string" ? { pass: j.pass } : {}),
    };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    return { suggestions: [], available: false };
  }
}

/* ---------- Scan 3 (master plan 30.34 item 2): one Turnstile pass per search session ---------- */

/** One Turnstile token for the pass, before the first suggestion (and the function is warm by then). */
export async function getSuggestPass(turnstile: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/profile-snapshot`, {
      method: "POST",
      headers: { "content-type": "application/json", ...anonHeaders },
      body: JSON.stringify({ action: "pass", turnstile }),
    });
    if (!res.ok) return undefined;
    const j = (await res.json()) as { pass?: unknown };
    return typeof j.pass === "string" ? j.pass : undefined;
  } catch {
    return undefined;
  }
}

export async function emailCheck(o: {
  placeId: string;
  email: string;
  tips: boolean;
  page: "/google-profile-check" | "/get-started" | "/";
  turnstile: string;
  /** Scan 2 (30.29 item B): the free check's code, so the report sent is the report shown. */
  code?: string | null;
}) {
  await call<{ ok: true }>({
    action: "email",
    ...(o.code ? { code: o.code } : {}),
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
  code?: string | null;
}) {
  await call<{ ok: true }>({
    action: "whatsapp",
    ...(o.code ? { code: o.code } : {}),
    place_id: o.placeId,
    phone: o.phone,
    consent: true,
    consent_text: WHATSAPP_CONSENT_TEXT,
    page: o.page,
    turnstile: o.turnstile,
  });
}
