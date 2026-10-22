// "Confirm your details" (K-18, onboarding step 5): the six details Google shows (name, phone, hours, website, category,
// open status), each with Correct or Change. A confirmed detail becomes the owner's verified fact and the baseline Google
// Protection keeps (public.confirm_business_details, P0.2-03). Nothing here writes to Google: if the owner changes a detail,
// Protection later sees that Google differs and offers the fix through the one pipeline with the owner's approval.
// Pure functions over the facts, so the rules (what is shown, what is sent, what the database would refuse) are tested.
import { supabase } from "@/lib/supabase";

export type DetailKey =
  "name" | "phone" | "regular_hours" | "website" | "main_category" | "open_status";

export const DETAILS: {
  key: DetailKey;
  label: string;
  hint?: string;
  placeholder: string;
  max: number;
  type?: "tel" | "url";
}[] = [
  {
    key: "name",
    label: "Business name",
    placeholder: "Your business name as customers see it",
    max: 100,
  },
  { key: "phone", label: "Phone", placeholder: "+1 555 010 0100", max: 30, type: "tel" },
  {
    key: "regular_hours",
    label: "Opening hours",
    hint: "Write them the way customers should read them. You can edit them day by day in Hours.",
    placeholder: "Mon to Sat 09:00 to 18:00, Sun closed",
    max: 1000,
  },
  { key: "website", label: "Website", placeholder: "https://example.com", max: 300, type: "url" },
  { key: "main_category", label: "Main category", placeholder: "e.g. Bakery", max: 200 },
  { key: "open_status", label: "Open status", placeholder: "Open", max: 30 },
];

/** The three open statuses Google knows (the database accepts only these three for open_status). */
export const OPEN_STATUS_OPTIONS = [
  { raw: "OPEN", display: "Open" },
  { raw: "CLOSED_TEMPORARILY", display: "Closed temporarily" },
  { raw: "CLOSED_PERMANENTLY", display: "Closed permanently" },
] as const;

export type DetailValue = { display: string; raw?: unknown };
/** What the owner has said about one row: Correct (the value as shown) or Change (a value they typed). */
export type Mark = { kind: "correct" } | { kind: "change"; value: string };
export type Row = {
  key: DetailKey;
  label: string;
  /** What Google shows, as read by Kabsi, or null when it has not been read. */
  shown: DetailValue | null;
  /** The owner already confirmed this exact value. */
  confirmed: boolean;
};

type FactRow = { key: string; value: { display?: string; raw?: unknown } | null; status: string };

/** The six rows from the owner's `profile.*` facts. A row with no fact still shows, so the owner can add it. */
export function rowsFromFacts(facts: FactRow[]): Row[] {
  return DETAILS.map((d) => {
    const f = facts.find((x) => x.key === d.key) ?? null;
    const display = typeof f?.value?.display === "string" ? f.value.display.trim() : "";
    return {
      key: d.key,
      label: d.label,
      shown: display ? { display, raw: f?.value?.raw ?? null } : null,
      confirmed: f?.status === "verified" && !!display,
    };
  });
}

const PHONE = /^\+?[0-9 ()./-]{4,30}$/;
const WEBSITE = /^https?:\/\/[^\s/]+\.[^\s]+$/i;

/** The problem with a typed value, in the owner's words, mirroring what the database would refuse; null when fine. */
export function valueProblem(key: DetailKey, raw: string): string | null {
  const v = raw.trim();
  const d = DETAILS.find((x) => x.key === key)!;
  if (!v) return "Write the detail, or tap Correct to keep what Google shows.";
  if (v.length > d.max) return `Keep it to ${d.max} characters.`;
  if (key === "phone" && !PHONE.test(v)) return "That does not look like a phone number.";
  if (key === "website" && !WEBSITE.test(v)) return "The website must start with https://";
  if (key === "open_status" && !OPEN_STATUS_OPTIONS.some((o) => o.display === v || o.raw === v))
    return "Choose open, closed temporarily or closed permanently.";
  return null;
}

/** The payload of confirm_business_details: only rows the owner marked. Correct keeps the value as read; Change sends theirs. */
export function detailsPayload(
  rows: Row[],
  marks: Partial<Record<DetailKey, Mark>>,
): Record<string, DetailValue> {
  const out: Record<string, DetailValue> = {};
  for (const r of rows) {
    const m = marks[r.key];
    if (!m) continue;
    if (m.kind === "correct") {
      if (!r.shown) continue;
      out[r.key] =
        r.key === "open_status"
          ? { display: r.shown.display, raw: openRaw(r.shown) }
          : { display: r.shown.display, ...(r.shown.raw != null ? { raw: r.shown.raw } : {}) };
    } else if (!valueProblem(r.key, m.value)) {
      const v = m.value.trim();
      out[r.key] =
        r.key === "open_status"
          ? {
              display: OPEN_STATUS_OPTIONS.find((o) => o.display === v || o.raw === v)!.display,
              raw: OPEN_STATUS_OPTIONS.find((o) => o.display === v || o.raw === v)!.raw,
            }
          : { display: v };
    }
  }
  return out;
}

function openRaw(v: DetailValue): string {
  if (typeof v.raw === "string" && OPEN_STATUS_OPTIONS.some((o) => o.raw === v.raw)) return v.raw;
  return (
    OPEN_STATUS_OPTIONS.find((o) => o.display.toLowerCase() === v.display.toLowerCase())?.raw ??
    "OPEN"
  );
}

/** The label of the one yellow button, from how many rows the owner marked. */
export const continueLabel = (marked: number) =>
  marked === 0 ? "Skip for now" : "Save and see my replies";

/** Reads the owner's current `profile.*` facts through RLS (owner and manager). */
export async function loadDetailFacts(locationId: string): Promise<FactRow[]> {
  const { data, error } = await supabase
    .from("knowledge_facts")
    .select("key, value, status")
    .eq("location_id", locationId)
    .is("superseded_by", null)
    .like("slot", "profile.%")
    .in(
      "key",
      DETAILS.map((d) => d.key),
    )
    .neq("status", "rejected");
  if (error) throw new Error(error.message);
  return (data ?? []) as FactRow[];
}

/** Saves what the owner marked. The RPC is the owner's alone; it writes the facts and the `details_confirmed` audit event. */
export async function confirmDetails(
  locationId: string,
  payload: Record<string, DetailValue>,
): Promise<void> {
  const { error } = await supabase.rpc("confirm_business_details", {
    p_location: locationId,
    p_details: payload,
  });
  if (error) throw new Error(error.message);
}
