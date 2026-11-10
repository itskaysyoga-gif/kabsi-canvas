// Onboarding 1 (master plan 30.48, R-145): the two optional questions every new business is asked in signed-in onboarding,
// after its business is chosen, and can change later in About your business. The words are in docs/COPY.md section 73.
// Pure helpers plus two calls: a membership-checked function that saves (the browser never writes the table) and a read
// of the business's own row (the same policy as its other fields: a member or staff, nobody else). Nothing is sent
// because of an answer.
import { supabase } from "@/lib/supabase";

export const TRACKING_CHOICES = [
  ["booking_app", "A booking app"],
  ["chats", "WhatsApp or Instagram chats"],
  ["notebook", "A notebook or diary"],
  ["memory", "Memory"],
  ["other", "Something else"],
] as const;
export type TrackingChoice = (typeof TRACKING_CHOICES)[number][0];
export const TRACKING_VALUES: readonly string[] = TRACKING_CHOICES.map(([v]) => v);

export const Q_TRACKING = "How do you keep track of client requests today?";
export const Q_EARLY = "Want early access to new WhatsApp tools for your business?";
export const APP_NAME_LABEL = "Name of the app (optional)";
export const APP_NAME_MAX = 80;

/** What the owner has chosen. `early` is true for Yes, false for No, null for not answered. */
export type RequestAnswers = {
  tracking: TrackingChoice | null;
  app: string;
  early: boolean | null;
};
export const NO_ANSWERS: RequestAnswers = { tracking: null, app: "", early: null };

/** The columns of a business's row that hold the answers. */
export type AnswersRow = {
  request_tracking: string | null;
  request_tracking_app: string | null;
  early_access_whatsapp: boolean | null;
  onboarding_questions_at?: string | null;
};
export const ANSWER_COLUMNS =
  "request_tracking, request_tracking_app, early_access_whatsapp, onboarding_questions_at";

export function answersFromRow(row: AnswersRow | null | undefined): RequestAnswers {
  const tracking = row?.request_tracking;
  return {
    tracking: tracking && TRACKING_VALUES.includes(tracking) ? (tracking as TrackingChoice) : null,
    app: row?.request_tracking_app ?? "",
    early: row?.early_access_whatsapp ?? null,
  };
}

/**
 * What is sent: the app name only goes with "A booking app", trimmed and cut at 80 characters (the database holds the
 * same rule), and an empty name is no name.
 */
export function cleanAnswers(a: RequestAnswers): {
  p_tracking: TrackingChoice | null;
  p_app: string | null;
  p_early: boolean | null;
} {
  const app =
    a.tracking === "booking_app" ? Array.from(a.app.trim()).slice(0, APP_NAME_MAX).join("") : "";
  return { p_tracking: a.tracking, p_app: app || null, p_early: a.early };
}

export const hasAnswer = (a: RequestAnswers) => a.tracking !== null || a.early !== null;
export const sameAnswers = (a: RequestAnswers, b: RequestAnswers) => {
  const x = cleanAnswers(a);
  const y = cleanAnswers(b);
  return x.p_tracking === y.p_tracking && x.p_app === y.p_app && x.p_early === y.p_early;
};

/** Saves both answers (a null removes that answer) and marks the questions as done, so onboarding does not ask again. */
export async function saveRequestAnswers(locationId: string, a: RequestAnswers) {
  const { error } = await supabase.rpc("save_request_answers", {
    p_location: locationId,
    ...cleanAnswers(a),
  });
  if (error) throw new Error(error.message);
}

/** "Skip": nothing is saved, the questions are marked as done. */
export const skipRequestAnswers = (locationId: string) =>
  saveRequestAnswers(locationId, NO_ANSWERS);

export async function loadRequestAnswers(locationId: string): Promise<RequestAnswers> {
  const { data, error } = await supabase
    .from("locations")
    .select(ANSWER_COLUMNS)
    .eq("id", locationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return answersFromRow(data as AnswersRow | null);
}

// ── Staff: counts only (Gate 3's evidence, master plan 30.48) ───────────────────────────────────────────────────────────────

export type Gate3Verdict = "collecting" | "open" | "off" | "between";
export type StaffRequestAnswers = {
  generated_at: string;
  businesses: number;
  answered_any: number;
  tracking: Record<"answered" | TrackingChoice, number>;
  early_access: { answered: number; yes: number; no: number };
  gate3: { first_ten_answered: number; first_ten_qualifying: number; verdict: Gate3Verdict };
  qualifying: {
    position: number;
    business: string;
    answered_on: string;
    keeps_requests: "chats" | "notebook" | "memory";
    in_first_ten: boolean;
  }[];
};

export async function loadStaffRequestAnswers(): Promise<StaffRequestAnswers> {
  const { data, error } = await supabase.rpc("staff_request_answers" as never);
  if (error) throw new Error((error as { message: string }).message);
  return data as unknown as StaffRequestAnswers;
}

/** The one line the staff page shows for Gate 3. A rule of the master plan, said once. */
export function gate3Line(g: StaffRequestAnswers["gate3"]): string {
  const head = `Of the first 10 businesses that answered (${g.first_ten_answered} so far): ${g.first_ten_qualifying} keep requests in chats, a notebook or memory and said yes.`;
  const rule = "3 or more opens the next step. Fewer than 2 keeps it off.";
  if (g.verdict === "open") return `${head} ${rule} It is open.`;
  if (g.verdict === "off") return `${head} ${rule} It stays off.`;
  if (g.verdict === "between") return `${head} ${rule} Two is neither: lane R decides.`;
  return `${head} ${rule} Still collecting.`;
}

export const CHOICE_LABEL: Record<string, string> = Object.fromEntries(TRACKING_CHOICES);
