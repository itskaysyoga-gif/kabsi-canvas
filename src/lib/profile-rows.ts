// The Google Profile screen's rows (K-18, K-19, P0.3-11): one row per field Google Protection watches, with what Google
// shows, what the owner approved, a status and when it was last checked. Pure functions over the owner's confirmed facts
// (knowledge_facts) and Google Protection's change events (profile_changes), so the statuses are tested in
// tests/profile-rows.test.ts. Nothing here reads Google or writes anything.
import { fieldLabel } from "@/lib/profile-fields";

/** The fields of K-19, in the order owners think of them. `fact` is the Business Knowledge key; `field` the change event's. */
export const WATCHED: { key: string; label: string; fields: string[]; hint?: string }[] = [
  { key: "name", label: "Business name", fields: ["name"] },
  { key: "main_category", label: "Main category", fields: ["main_category", "categories"] },
  { key: "phone", label: "Phone", fields: ["phone"] },
  { key: "website", label: "Website", fields: ["website"] },
  { key: "address", label: "Address", fields: ["address", "map_pin"] },
  { key: "service_area", label: "Service area", fields: ["service_area"] },
  { key: "regular_hours", label: "Opening hours", fields: ["regular_hours"] },
  { key: "special_hours", label: "Special hours", fields: ["special_hours"], hint: "Set in Hours" },
  { key: "description", label: "Description", fields: ["description"] },
  { key: "open_status", label: "Open status", fields: ["open_status"] },
  { key: "attributes", label: "Attributes", fields: ["attributes"] },
  { key: "verification", label: "Verification", fields: ["verification"] },
];

export type Value = { display?: string } | null;
export type Fact = { key: string; value: Value; status: string };
export type Change = {
  id: string;
  field: string;
  previous_value: Value;
  previous_fact_id: string | null;
  google_value: Value;
  source: string;
  status: string;
  explanation: string | null;
  recommend: string | null;
  recommend_reason: string | null;
  support_requested_at: string | null;
  detected_at: string;
};

export const OPEN_STATUSES = ["detected", "awaiting_review"];

export type RowTone = "green" | "amber" | "red" | "grey";
export type ProfileRow = {
  key: string;
  label: string;
  hint: string | null;
  /** What Google shows now, or null when Kabsi has not read it. */
  google: string | null;
  /** What the owner approved, or "Not yet confirmed by you" when they have not, or null when there is nothing to approve. */
  approved: string | null;
  confirmed: boolean;
  status: string;
  tone: RowTone;
  /** The open change for this field, if any (its card has the two decisions). */
  change: Change | null;
};

const show = (v: Value) =>
  v && typeof v.display === "string" && v.display.trim() ? v.display : null;
export const NOT_CONFIRMED = "Not yet confirmed by you";

/** The row for one watched field. `changes` is every change event of the business, newest first. */
export function profileRow(
  w: (typeof WATCHED)[number],
  facts: Fact[],
  changes: Change[],
): ProfileRow {
  const fact = facts.find((f) => f.key === w.key) ?? null;
  const mine = changes.filter((c) => w.fields.includes(c.field));
  const open = mine.find((c) => OPEN_STATUSES.includes(c.status)) ?? null;
  const latest = mine[0] ?? null;
  const confirmed = fact?.status === "verified";
  const base = { key: w.key, label: w.label, hint: w.hint ?? null, confirmed, change: open };

  if (open) {
    return {
      ...base,
      google: show(open.google_value) ?? "(empty)",
      approved: open.previous_fact_id ? (show(open.previous_value) ?? "(empty)") : NOT_CONFIRMED,
      status: "Differs on Google",
      tone: "amber",
    };
  }
  const known = fact ? show(fact.value) : null;
  if (latest?.status === "rejected") {
    return {
      ...base,
      google: known,
      approved: known,
      status: "Your information is on its way to Google",
      tone: "grey",
    };
  }
  if (latest?.status === "failed") {
    return {
      ...base,
      google: show(latest.google_value) ?? known,
      approved: known,
      status: "Google did not take your information",
      tone: "red",
    };
  }
  if (!fact) {
    return { ...base, google: null, approved: null, status: "Not read yet", tone: "grey" };
  }
  if (!confirmed) {
    return {
      ...base,
      google: known,
      approved: NOT_CONFIRMED,
      status: "Needs your OK",
      tone: "amber",
    };
  }
  return {
    ...base,
    google: known,
    approved: known,
    status: "Matches what you approved",
    tone: "green",
  };
}

export const profileRows = (facts: Fact[], changes: Change[]) =>
  WATCHED.map((w) => profileRow(w, facts, changes));

/** The Protection status line (K-19): "Google Protection: on, last check 09:14", or why it is not running. */
export function protectionLine(i: {
  running: boolean;
  checkedAt: string | null;
  now?: number;
}): string {
  if (!i.running) return "Google Protection: paused. Kabsi can't reach your Google profile.";
  if (!i.checkedAt) return "Google Protection: on. The first check comes within a few minutes.";
  const when = new Date(i.checkedAt);
  const now = new Date(i.now ?? Date.now());
  const time =
    when.toDateString() === now.toDateString()
      ? when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
      : when.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `Google Protection: on, last check ${time}`;
}

export const rowLabel = fieldLabel;
