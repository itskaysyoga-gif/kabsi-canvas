// The Profile Coach's checklist (P0.8-09, K-136): what a complete Google profile has, in the order Kabsi shows it. One list
// for the app and for the free Profile Check, so both show the same rows. src/lib/coach.ts holds the same titles for the
// browser; tests/coach.test.ts fails when the two drift. No keywords in the business name is a rule of every item (K-112).
// Plain words only: no score and no points (K-07).
export type CoachItemId = "description" | "categories" | "services" | "attributes" | "photos" | "service_area" | "website_tracking";
// done: nothing to do. todo: missing. unknown: Kabsi has not read it from a live profile yet, so it says nothing.
// later: waits for something else.
export type CoachStatus = "done" | "todo" | "unknown" | "later";
export type CoachItem = { id: CoachItemId; title: string; why: string };

export const COACH_ITEMS: readonly CoachItem[] = [
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
    why: "People look for the outside, the inside, your team, your work and what you sell. Kabsi counts them once photos are managed here.",
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
];

export type CoachRow = CoachItem & { status: CoachStatus };

// The free Profile Check sees only what Google shows the public: the website link and the number of photos. Everything
// else says it is checked once the owner connects, and asserts nothing (K-82).
export function freeChecklist(s: { website: string | null; photo_count: number }): CoachRow[] {
  return COACH_ITEMS.map((i) => {
    let status: CoachStatus = "unknown";
    if (i.id === "website_tracking") status = !s.website ? "later" : /utm_source=/i.test(s.website) ? "done" : "todo";
    if (i.id === "photos") status = "later";
    return { ...i, status };
  });
}
