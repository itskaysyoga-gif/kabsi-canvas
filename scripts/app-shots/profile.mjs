// scripts/app-shots fixtures for this area (see fixtures.mjs). Values or (ctx) => value; ctx.state is the route's state.
// Google profile: Profile watch (/app/shield), Hours (/app/hours) and Profile Coach (/app/coach), for the invented
// Rose Lane Salon. States: "profile-none" (nothing changed, nothing to fix, no warning), "profile-reading" (Kabsi has
// read nothing yet). Every number and name here is made up.
import * as home from "./home.mjs";
import { contentPublications } from "./content.mjs";

const day = (n) => new Date(Date.now() + n * 86_400_000).toISOString();
const ago = (n) => day(-n);
const date = (n) => day(n).slice(0, 10);
const v = (display, raw) => (raw ? { display, raw } : { display });

// The week as Google stores it, so the week editor opens on it.
const period = (d, o, c) => ({
  openDay: d,
  closeDay: d,
  openTime: { hours: o },
  closeTime: { hours: c },
});
const WEEK = {
  periods: [
    period("TUESDAY", 10, 20),
    period("WEDNESDAY", 10, 20),
    period("THURSDAY", 10, 21),
    period("FRIDAY", 14, 21),
    period("SATURDAY", 9, 21),
    period("SUNDAY", 10, 20),
  ],
};
const WEEK_TEXT =
  "Monday closed, Tuesday 10:00 to 20:00, Wednesday 10:00 to 20:00, Thursday 10:00 to 21:00, Friday 14:00 to 21:00, Saturday 09:00 to 21:00, Sunday 10:00 to 20:00";

const fact = (key, display, status = "verified", raw) => ({
  key,
  slot: `profile.${key}`,
  value: v(display, raw),
  status,
});
const FACTS = [
  fact("name", "Rose Lane Salon"),
  fact("main_category", "Hair salon"),
  fact("phone", "+971 4 555 0142"),
  fact("website", "https://roselanesalon.example"),
  fact("address", "12 Al Wasl Road, Dubai"),
  fact("regular_hours", WEEK_TEXT, "verified", WEEK),
  fact("description", ""),
  fact("open_status", "Open"),
  fact("attributes", "Card payments, Wheelchair access", "needs_confirmation"),
];

const reading = (c) => c.state === "profile-reading";
const none = (c) => c.state === "profile-none" || reading(c);

const change = (o) => ({
  previous_fact_id: "f-phone",
  source: "google_update",
  explanation: null,
  recommend: null,
  recommend_reason: null,
  support_requested_at: null,
  ...o,
});
const CHANGES = [
  change({
    id: "chg-phone",
    field: "phone",
    previous_value: v("+971 4 555 0142"),
    google_value: v("+971 4 555 0199"),
    status: "detected",
    detected_at: ago(1),
  }),
  change({
    id: "chg-website",
    field: "website",
    previous_value: v("https://roselanesalon.example"),
    google_value: v("https://roselane-salon.example"),
    status: "rejected",
    detected_at: ago(6),
  }),
  change({
    id: "chg-hours",
    field: "regular_hours",
    previous_value: v("Friday 14:00 to 21:00"),
    google_value: v("Friday closed"),
    status: "corrected",
    detected_at: ago(12),
  }),
];

const task = (id, kind, title, why, path) => ({
  id,
  kind,
  priority: "recommended",
  title,
  why,
  recommendation: null,
  path,
  evidence: {},
  created_at: ago(2),
});

const SPECIAL = [
  {
    id: "sh-national",
    start_date: date(35),
    end_date: date(36),
    closed: true,
    open_time: null,
    close_time: null,
    reason: "National Day",
    state: "publishing",
  },
  {
    id: "sh-late",
    start_date: date(9),
    end_date: date(9),
    closed: false,
    open_time: "10:00",
    close_time: "23:00",
    reason: "Late opening",
    state: "posted",
  },
];

const pub = (id, target_type, target_id, state, o = {}) => ({
  id,
  target_type,
  target_id,
  state,
  payload: o.payload ?? null,
  google_response: o.response ?? null,
  approved_at: o.at ?? ago(1),
  updated_at: o.at ?? ago(1),
});

const MINE = ["listing_revert", "special_hours"];
const CONTENT = ["local_post", "local_post_removal", "photo"];
/**
 * The publications table: a call filtered to profile or content kinds is answered here (content's list is in
 * content.mjs); any other call (Home's "Done lately") goes to home.mjs, so this file does not take over its answers.
 */
function publications(c) {
  const kinds = (c.params.get("target_type") ?? "")
    .replace(/^in\.\(|\)$/g, "")
    .split(",")
    .filter(Boolean);
  const ours = kinds.length > 0 && kinds.every((k) => MINE.includes(k) || CONTENT.includes(k));
  if (!ours) {
    const h = home.tables?.publications;
    return typeof h === "function" ? h(c) : (h ?? []);
  }
  const all = [
    pub("p-revert", "listing_revert", "chg-website", "verifying", { at: ago(5) }),
    pub("p-national", "special_hours", "sh-national", "verifying", { at: ago(0.2) }),
    pub("p-late", "special_hours", "sh-late", "verified", { at: ago(3) }),
    ...contentPublications(c),
  ];
  return all.filter((p) => kinds.includes(p.target_type));
}

export const tables = {
  profile_changes: (c) => (none(c) ? [] : CHANGES),
  knowledge_facts: (c) => {
    if (reading(c)) return [];
    const slot = c.params.get("slot") ?? "";
    if (slot === "eq.profile.regular_hours")
      return FACTS.filter((f) => f.key === "regular_hours").map((f) => ({ value: f.value }));
    return FACTS;
  },
  special_hours: SPECIAL,
  publications,
};

export const rpc = {
  // The real approval keys (src/lib/team.ts ApprovalKind) next to the base file's, so the decisions show.
  my_access: (c) => {
    const role = c.state === "manager" ? "manager" : c.state === "staff" ? "staff" : "owner";
    const yes = role !== "staff";
    return {
      role,
      approve: {
        reply: yes,
        post: yes,
        photo: yes,
        hours: yes,
        profile: yes,
        review_reply: yes,
        profile_change: yes,
      },
      approve_high_risk: role === "owner",
    };
  },
  list_tasks: (c) => ({
    tasks: none(c)
      ? []
      : [
          task(
            "t-booking",
            "profile_gap",
            "Add your booking link",
            "Customers who want to book look for it first. Send it on WhatsApp and Kabsi adds it after your yes.",
            "/app/knowledge",
          ),
          task(
            "t-photos",
            "profile_gap",
            "Add 3 photos of your work",
            "Send them on WhatsApp. Kabsi gets them ready and asks before posting.",
            "/app/photos",
          ),
        ],
    snoozed: 0,
  }),
  holiday_calendar: () => ({
    prompts: [
      {
        id: "hp-commemoration",
        name: "Commemoration Day",
        starts_on: date(4),
        ends_on: date(4),
        kind: "public",
        estimated: false,
      },
    ],
    upcoming: [
      {
        name: "Commemoration Day",
        starts_on: date(4),
        ends_on: date(4),
        kind: "public",
        estimated: false,
      },
      {
        name: "National Day",
        starts_on: date(35),
        ends_on: date(36),
        kind: "public",
        estimated: false,
      },
    ],
  }),
  coach_checklist: () => ({
    locked: false,
    plan: "essentials",
    pro: false,
    source: "live",
    read_at: ago(0.1),
    items: [
      { id: "description", status: "todo", detail: { length: 0 } },
      { id: "categories", status: "todo" },
      { id: "services", status: "done" },
      { id: "attributes", status: "done" },
      {
        id: "photos",
        status: "todo",
        detail: { exterior: 2, interior: 3, team: 0, work: 4, products: 0 },
      },
      { id: "service_area", status: "unknown", detail: { question: true } },
      { id: "website_tracking", status: "todo" },
      { id: "website_match", status: "later", detail: { waits: "website" } },
    ],
  }),
};

export const functions = {};
