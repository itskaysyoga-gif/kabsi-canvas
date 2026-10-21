// The Profile Coach (P0.8-09, K-136): the checklist of what a complete Google profile has. Essentials sees it (what is
// missing and why); the changes themselves are Pro and arrive with part B. The titles are the same as the free Profile
// Check shows (supabase/functions/_shared/coach/catalog.ts; tests/coach.test.ts keeps the two equal).
import { functionCall } from "@/lib/reviews";
import { supabase } from "@/lib/supabase";

export type CoachItemId =
  | "description"
  | "categories"
  | "services"
  | "attributes"
  | "photos"
  | "service_area"
  | "website_tracking"
  | "website_match";
export type CoachStatus = "done" | "todo" | "unknown" | "later";
export type CoachCatalogItem = { id: CoachItemId; title: string; why: string };
/** What the database adds to an item: a number it read, or what the item waits for. */
export type CoachDetail = {
  length?: number;
  count?: number;
  waits?: string;
  question?: boolean;
  example?: boolean;
  mismatches?: string[];
  checked_at?: string;
  exterior?: number;
  interior?: number;
  team?: number;
  work?: number;
  products?: number;
  total?: number;
};
const PHOTO_KINDS = [
  ["exterior", "the outside"],
  ["interior", "the inside"],
  ["team", "your team"],
  ["work", "your work"],
  ["products", "what you sell"],
] as const;
export type CoachRow = CoachCatalogItem & { status: CoachStatus; detail?: CoachDetail | undefined };

export const COACH_ITEMS: readonly CoachCatalogItem[] = [
  {
    id: "description",
    title: "Profile description",
    why: "It tells customers what you do. Google allows 750 characters and shows the first 250 first.",
  },
  {
    id: "categories",
    title: "More categories",
    why: "Extra categories help Google show you for more of what you do. The main category changes only when you sign in and approve it.",
  },
  {
    id: "services",
    title: "Services and products",
    why: "Customers search for what you sell, so list it from what you told Kabsi about your business.",
  },
  {
    id: "attributes",
    title: "Profile details",
    why: "Details such as payment options and accessibility help customers decide. Kabsi never suggests anything about who you are or who owns the business.",
  },
  {
    id: "photos",
    title: "Photos of each kind",
    why: "People look for the outside, the inside, your team, your work and what you sell. Kabsi counts the photos you add through Kabsi.",
  },
  {
    id: "service_area",
    title: "Service area",
    why: "If customers do not visit you, Google can hide your address and show the areas you serve instead. Kabsi asks you first and you sign in to approve it.",
  },
  {
    id: "website_tracking",
    title: "Visits from Google to your website",
    why: "A small tag on your website link shows how many visits come from your Google profile.",
  },
  {
    id: "website_match",
    title: "Website matches your profile",
    why: "Your website and your Google profile should say the same name, phone number, address and opening times.",
  },
];

export const STATUS_LABEL: Record<CoachStatus, string> = {
  done: "Done",
  todo: "To do",
  unknown: "Not checked yet",
  later: "Later",
};

/** What the checklist adds to a row, in words: a number Kabsi read, or what the row waits for. */
export function detailLine(row: CoachRow): string | null {
  const d: CoachDetail = row.detail ?? {};
  if (row.status === "todo" && row.id === "description")
    return typeof d.length === "number" && d.length > 0
      ? `Your description is ${d.length} characters.`
      : "You have no description yet.";
  if (row.status === "todo" && row.id === "categories") return "You have no extra categories.";
  if (row.status === "todo" && row.id === "attributes")
    return "None of your profile details are set.";
  if (row.status === "todo" && row.id === "services")
    return "Kabsi has no services or products from you yet.";
  if (row.status === "todo" && row.id === "website_tracking")
    return "Your website link has no tag yet.";
  if (row.status === "todo" && row.id === "website_match" && d.mismatches?.length)
    return `Your website says something different about: ${d.mismatches.join(", ")}.`;
  if (row.status === "later" && d.waits === "website")
    return "Add a website to your profile first.";
  if (row.status === "later" && d.waits === "photo_engine") return "Coming with photo management.";
  if (row.status === "todo" && row.id === "photos") {
    const missing = PHOTO_KINDS.filter(([k]) => !((d[k] ?? 0) > 0)).map(([, label]) => label);
    if (!missing.length) return null;
    const list =
      missing.length === 1
        ? missing[0]
        : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;
    return `No photo yet of ${list}.`;
  }
  if (row.status === "unknown" && d.question === true)
    return "Tell Kabsi if customers do not visit you.";
  return null;
}

export type Coach = {
  locked: boolean;
  plan: "none" | "essentials" | "pro";
  pro: boolean;
  concierge?: boolean;
  read_at?: string | null;
  source?: "mock" | "live" | null;
  items: { id: CoachItemId; status: CoachStatus; detail?: CoachDetail }[];
};

export async function loadCoach(locationId: string): Promise<Coach> {
  const { data, error } = await supabase.rpc("coach_checklist", { p_location: locationId });
  if (error) throw new Error(error.message);
  return data as Coach;
}

/** The catalog in order with each item's status; an item the database did not return is not checked yet. */
export function coachRows(coach: Coach): CoachRow[] {
  return COACH_ITEMS.map((i) => {
    const got = coach.items.find((x) => x.id === i.id);
    return { ...i, status: got?.status ?? "unknown", detail: got?.detail };
  });
}

// The Pro actions (part B): the coach Edge function asks for Pro again, so hiding a button is never the only lock.
export type CoachAction =
  | "snippet"
  | "website_tag"
  | "website_tag_apply"
  | "categories"
  | "categories_apply"
  | "website_check"
  | "description";

export const coachCall = <T>(
  locationId: string,
  action: CoachAction,
  extra: Record<string, unknown> = {},
) => functionCall<T>("coach", { do: action, location_id: locationId, ...extra });

export type Verdict = "match" | "mismatch" | "unknown";
export const VERDICT_LABEL: Record<Verdict, string> = {
  match: "Matches",
  mismatch: "Different",
  unknown: "Not shown on the page",
};
export const FIELD_LABEL: Record<"name" | "phone" | "address" | "hours", string> = {
  name: "Business name",
  phone: "Phone number",
  address: "Address",
  hours: "Opening times",
};
