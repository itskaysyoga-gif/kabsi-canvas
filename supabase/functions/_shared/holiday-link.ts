// The holiday link page (/h/:token, P0.5-03, K-131): what the confirm page shows, and the one answer.
//
//   GET  ?t=TOKEN                       the holiday, the business and the state. Reads only: mail scanners open links.
//   POST { t, do: "answer", answer, open?, close?, from?, to? }
//                                       "normal" needs only the link (it publishes nothing). "closed" and "custom" are the
//                                       owner's approval of hours: the recipient signed in on the page (K-17), then the
//                                       database applies the approval policy. Once; a second POST gets the first result.
//   POST { t, do: "undo" }              cancels the approval this link made, inside its 10 seconds (K-70).
//
// No database or network import: the Deno tests drive it with stubs; api/holiday.ts wires it to Supabase.
import { hashToken } from "./email-links.ts";

export type HolidayView = {
  status: "invalid" | "expired" | "answered" | "ok";
  business?: string;
  demo?: boolean;
  location_id?: string;
  holiday?: { name: string; starts_on: string; ends_on: string; kind: string; estimated: boolean };
  answer?: string | null;
  regular_hours?: string | null;
};
export type HolidayResult = { state: string; answer: string; publication_id?: string; publish_after?: string | null; repeat?: boolean };
export type AnswerInput = { answer: string; open?: string; close?: string; from?: string; to?: string; session: string | null };

export type HolidayLinkDeps = {
  sessionUser(): Promise<string | null>;
  view(tokenHash: string): Promise<HolidayView>;
  use(tokenHash: string, input: AnswerInput): Promise<HolidayResult>;
  undo(tokenHash: string, user: string | null): Promise<unknown>;
};
export type Reply = { status: number; body: Record<string, unknown> };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const wellFormed = (t: unknown): t is string => typeof t === "string" && t.length >= 40 && t.length <= 64;
const refusal = (code: string, message: string, status: number): Reply => ({ status, body: { error: code, message } });

export async function holidayGet(t: string | null, deps: HolidayLinkDeps): Promise<Reply> {
  if (!wellFormed(t)) return { status: 404, body: { status: "invalid" } };
  const v = await deps.view(await hashToken(t));
  if (v.status === "invalid") return { status: 404, body: { status: "invalid" } };
  const session = await deps.sessionUser();
  return { status: 200, body: { ...v, signed_in: session !== null } };
}

export async function holidayPost(body: Record<string, unknown>, deps: HolidayLinkDeps): Promise<Reply> {
  if (!wellFormed(body.t)) return refusal("invalid", "This link isn't valid.", 404);
  const hash = await hashToken(body.t);
  const session = await deps.sessionUser();
  try {
    if (body.do === "undo") {
      await deps.undo(hash, session);
      return { status: 200, body: { ok: true, state: "undone" } };
    }
    if (body.do !== "answer") return refusal("not_allowed", "This link can't do that.", 400);
    const answer = body.answer === "normal" || body.answer === "closed" || body.answer === "custom" ? body.answer : null;
    if (!answer) return refusal("bad_answer", "Choose normal hours, closed or custom hours.", 400);
    const str = (v: unknown, re: RegExp) => (typeof v === "string" && re.test(v) ? v : undefined);
    const r = await deps.use(hash, {
      answer, session, open: str(body.open, TIME), close: str(body.close, TIME), from: str(body.from, DATE), to: str(body.to, DATE),
    });
    return {
      status: 200,
      body: { ok: true, state: r.state, answer: r.answer, publication: r.publication_id ?? null, publish_after: r.publish_after ?? null, repeat: r.repeat === true },
    };
  } catch (e) {
    const known = holidayRefusal(String(e instanceof Error ? e.message : e));
    if (known) return known;
    throw e;
  }
}

// Owner-facing words for what the database refuses. Null for anything unexpected (the caller reports it).
export function holidayRefusal(message: string): Reply | null {
  const known: [string, string, string, number][] = [
    ["invalid_link", "invalid", "This link isn't valid.", 404],
    ["link_expired", "expired", "This link has expired. Answer in Kabsi, under Hours.", 410],
    ["holiday_passed", "holiday_passed", "This holiday has passed, so there is nothing to change.", 410],
    ["sign_in_required", "sign_in_required", "Sign in to Kabsi to confirm this. Kabsi brings you back to this page.", 401],
    ["not_member", "not_member", "You do not have access to this business.", 403],
    ["not_allowed_to_approve", "owner_approves", "The owner approves hours. They can let managers approve them in Settings, Team.", 403],
    ["bad_times", "bad_times", "Closing time must be after opening time. To close at midnight, use 00:00.", 400],
    ["bad_dates", "bad_dates", "Check the dates. They can move a few days, never into the past.", 400],
    ["already_saved", "already_saved", "You already saved special hours for these dates. Choose different dates, or change them under Hours.", 409],
    ["bad_answer", "bad_answer", "That answer does not fit this holiday.", 400],
    ["location_not_active", "not_active", "Kabsi can't reach your Google profile right now. Nothing was sent.", 409],
    ["concierge_profile", "early_access", "Hours start once Kabsi connects to your Google profile.", 409],
    ["too_late", "too_late", "It is already on its way to Google.", 409],
    ["not_allowed", "not_allowed", "This link can't do that.", 400],
  ];
  for (const [needle, code, text, status] of known) if (message.includes(needle)) return refusal(code, text, status);
  return null;
}
