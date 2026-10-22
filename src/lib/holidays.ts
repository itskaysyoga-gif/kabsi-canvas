// The holiday hours concierge on the screens (P0.5-03, K-131). Five days before a public holiday Kabsi asks: normal
// hours, closed, or custom hours. The answer is the approval. Two doors lead to the same database rule: the Hours screen
// (signed in, through the content function) and the link in the email (/h/<token>). Nothing here decides anything:
// the database checks the answer, the dates and who may approve hours.
import { anonHeaders, sessionFetch, supabase, supabaseUrl } from "@/lib/supabase";
import { contentCall } from "@/lib/reviews";

export type HolidayAnswer = "normal" | "closed" | "custom";
export type HolidayInfo = {
  name: string;
  starts_on: string;
  ends_on: string;
  kind: "public" | "islamic" | "ramadan" | string;
  estimated: boolean;
};
export type HolidayPrompt = HolidayInfo & { id: string };
export type HolidayCalendar = { prompts: HolidayPrompt[]; upcoming: HolidayInfo[] };

/** What the owner chose on the form. Dates are local days ("2026-12-25"), times are "HH:MM". */
export type AnswerFields = { open?: string; close?: string; from?: string; to?: string };

export async function loadHolidayCalendar(locationId: string): Promise<HolidayCalendar> {
  const { data, error } = await supabase.rpc("holiday_calendar", {
    p_location: locationId,
    p_days: 400,
  });
  if (error) throw new Error(error.message);
  return data as HolidayCalendar;
}

export async function answerHoliday(
  promptId: string,
  answer: HolidayAnswer,
  fields: AnswerFields = {},
) {
  return contentCall<{
    ok: true;
    state: string;
    answer: string;
    publication: string | null;
    repeat: boolean;
  }>({ do: "holiday_answer", prompt_id: promptId, answer, ...fields });
}

// ── The email link page ────────────────────────────────────────────────────────────────────────────────────────
export type HolidayLinkView = {
  status: "invalid" | "expired" | "answered" | "ok";
  business?: string;
  demo?: boolean;
  holiday?: HolidayInfo;
  answer?: HolidayAnswer | null;
  regular_hours?: string | null;
  signed_in?: boolean;
};
export type HolidayLinkResult = {
  ok: true;
  state: string;
  answer: HolidayAnswer;
  publication: string | null;
  publish_after: string | null;
  repeat: boolean;
};
export class HolidayLinkError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

// The page sends the signed-in session when there is one ("closed" and "custom" need the member, K-17); otherwise the
// anon key (D295), and the link alone is the credential for "normal hours".
async function linkFetch(query: string, body?: Record<string, unknown>) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const auth = token ? { authorization: `Bearer ${token}` } : {};
  return sessionFetch(`${supabaseUrl}/functions/v1/api/holiday${query}`, {
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
    headers: { "content-type": "application/json", ...anonHeaders, ...auth },
  });
}

async function read<T>(res: Response): Promise<T> {
  const j = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!res.ok)
    throw new HolidayLinkError(
      j.error ?? "failed",
      j.message || "Something went wrong. Nothing was changed.",
    );
  return j;
}

export async function loadHolidayLink(token: string): Promise<HolidayLinkView> {
  const res = await linkFetch(`?t=${encodeURIComponent(token)}`);
  if (res.status === 404) return { status: "invalid" };
  return read<HolidayLinkView>(res);
}
export async function answerHolidayLink(
  token: string,
  answer: HolidayAnswer,
  fields: AnswerFields = {},
) {
  return read<HolidayLinkResult>(
    await linkFetch("", { t: token, do: "answer", answer, ...fields }),
  );
}
export async function undoHolidayLink(token: string) {
  return read<{ ok: true; state: string }>(await linkFetch("", { t: token, do: "undo" }));
}

// ── Words ──────────────────────────────────────────────────────────────────────────────────────────────────────
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const parts = (d: string) => d.split("-").map(Number) as [number, number, number];
export const longDay = (d: string) => {
  const [y, m, day] = parts(d);
  return `${DAYS[new Date(Date.UTC(y, m - 1, day)).getUTCDay()]} ${day} ${MONTHS[m - 1]}`;
};
const shortDay = (d: string) => `${parts(d)[2]} ${MONTHS[parts(d)[1] - 1]}`;

/** "Friday 25 December", or "8 February to 8 March". Same words as the email. */
export const whenWords = (startsOn: string, endsOn: string) =>
  startsOn === endsOn ? longDay(startsOn) : `${shortDay(startsOn)} to ${shortDay(endsOn)}`;

/** The days a moon-dependent holiday can be moved by, either way (the database allows the same). */
export const MOVE_DAYS = 3;
export const addDays = (date: string, n: number) => {
  const [y, m, d] = parts(date);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
};

/** null when the form can be sent, else a sentence. The same rules as the database. */
export function checkAnswer(
  holiday: HolidayInfo,
  answer: HolidayAnswer,
  f: { open: string; close: string; from: string; to: string },
  today: string,
): string | null {
  if (answer === "normal") return null;
  if (!f.from || !f.to || f.to < f.from) return "Check the dates.";
  if (f.to < today) return "These dates are in the past.";
  if (f.from < addDays(holiday.starts_on, -MOVE_DAYS) || f.to > addDays(holiday.ends_on, MOVE_DAYS))
    return `The days can move up to ${MOVE_DAYS} days either way.`;
  if (answer === "custom") {
    if (!/^\d{2}:\d{2}$/.test(f.open) || !/^\d{2}:\d{2}$/.test(f.close))
      return "Add an opening and a closing time.";
    if (f.close <= f.open && f.close !== "00:00")
      return "Closing time must be after opening time. To close at midnight, use 00:00.";
  }
  return null;
}

/** What Google will show, in words, for the read-back before the owner confirms. */
export function readBack(
  holiday: HolidayInfo,
  answer: HolidayAnswer,
  f: { open: string; close: string; from: string; to: string },
): string {
  if (answer === "normal")
    return `Your normal opening hours stay as they are on ${whenWords(holiday.starts_on, holiday.ends_on)}.`;
  const days = whenWords(f.from, f.to);
  return answer === "closed"
    ? `${days}: Closed`
    : `${days}: ${f.open} to ${f.close === "00:00" ? "midnight" : f.close}`;
}
