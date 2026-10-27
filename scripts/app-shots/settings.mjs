// scripts/app-shots fixtures for Where you show up, Reports, Settings, Business Knowledge, Team and Plan (see fixtures.mjs).
// Values or (ctx) => value; ctx.state is the route's state. Everything here is invented (Rose Lane Salon, Dubai).
// States read here: "first-task" (base: the held back parts), "first-check" (no finished scan yet), "empty" (no report),
// "manager" (base), and for the plan "paid", "failed", "cancelled".
// Only `location` comes from fixtures.mjs, and only inside a function: fixtures.mjs imports this file, so its constants are
// not ready while this module loads.
import { location } from "./fixtures.mjs";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const ahead = (n) => new Date(Date.now() + n * 86_400_000).toISOString();
const ago = (n) => ahead(-n);

const SCAN_ID = "00000000-0000-4000-8000-0000000000c1";
const day = (n) => ago(n).slice(0, 10);

// 7 by 7 ranks, row by row; 0 is not in the first 20. 15 of 49 places in the first 3.
// prettier-ignore
const RANKS = [
  5, 4, 3, 6, 9, 12, 15,
  4, 2, 2, 3, 6, 11, 14,
  6, 2, 1, 1, 3, 8, 10,
  7, 3, 1, 2, 4, 9, 13,
  9, 4, 2, 1, 3, 7, 12,
  13, 8, 3, 4, 6, 10, 16,
  17, 0, 0, 8, 11, 15, 0,
];

const NEARBY = {
  cards: [
    {
      kind: "home",
      row: 3,
      col: 3,
      place: "Near your salon",
      name: null,
      rank: 2,
      position: "2nd",
      first: "Juniper Hair Studio",
      firstIsYou: false,
    },
    {
      kind: "away",
      row: 3,
      col: 6,
      place: "Near Al Wasl Park",
      name: "Al Wasl Park",
      rank: 13,
      position: "13th",
      first: "Lark Salon",
      firstIsYou: false,
    },
    {
      kind: "away",
      row: 6,
      col: 1,
      place: "About 2 km south west of your salon",
      name: null,
      rank: null,
      position: "not in the first 20",
      first: "Juniper Hair Studio",
      firstIsYou: false,
    },
  ],
  top3: 15,
  points: 49,
  count_line: "In the first 3 at 15 of 49 places Kabsi checked.",
  keyword: "hair salon",
  note: "Sample Google Maps results, not customer counts.",
};

const scans = (c) => {
  if (c.state === "first-check")
    return [
      {
        id: SCAN_ID,
        keyword: "hair salon",
        state: "queued",
        done_at: null,
        created_at: ago(0),
        nearby: null,
      },
    ];
  return [
    {
      id: SCAN_ID,
      keyword: "hair salon",
      state: "done",
      done_at: ago(2),
      created_at: ago(2),
      nearby: NEARBY,
    },
  ];
};

const points = RANKS.map((r, i) => ({ row: Math.floor(i / 7), col: i % 7, rank: r || null }));

const AI_RUN = {
  id: "00000000-0000-4000-8000-0000000000d1",
  provider: "chatgpt",
  run_at: ago(6),
  named: true,
  sources: [
    { domain: "google.com", title: "Rose Lane Salon on Google Maps" },
    { domain: "roselanesalon.example", title: "Rose Lane Salon" },
  ],
  ai_visibility_prompts: {
    text: "where can i get a good blow dry in jumeirah",
    cadence: "monthly",
  },
};

// Two snapshots 25 days apart: Juniper Hair Studio gained 14 reviews, the salon 6 (Competitor Watch speaks).
const SNAPSHOTS = [
  { key: "self", is_self: true, name: "Rose Lane Salon", reviews: 112, taken_on: day(26) },
  { key: "cid:1", is_self: false, name: "Juniper Hair Studio", reviews: 203, taken_on: day(26) },
  { key: "cid:2", is_self: false, name: "Lark Salon", reviews: 88, taken_on: day(26) },
  { key: "self", is_self: true, name: "Rose Lane Salon", reviews: 118, taken_on: day(1) },
  { key: "cid:1", is_self: false, name: "Juniper Hair Studio", reviews: 217, taken_on: day(1) },
  { key: "cid:2", is_self: false, name: "Lark Salon", reviews: 90, taken_on: day(1) },
];

const pair = (t, l, change) => ({ this: t, last: l, change });

const receipt = (o = {}) => ({
  v: 3,
  did: [
    { key: "replies", label: "Replies sent to Google", count: 4 },
    { key: "posts", label: "Posts sent to Google", count: 1 },
    { key: "hours", label: "Hours updated", count: 1 },
  ],
  did_total: 6,
  updates: 2,
  waiting: {
    count: 1,
    items: [{ title: "A reply to Maya R. is ready for your yes", path: "/app/reviews" }],
  },
  next_step: { title: "Add 3 photos of your work", path: "/app/photos" },
  google: {
    example: false,
    from: day(8),
    to: day(2),
    views: pair(412, 380, "8% more"),
    website_clicks: pair(19, 22, "14% fewer"),
    calls: pair(11, 9, "22% more"),
    directions: pair(17, 17, "no change"),
    lines: [],
  },
  growth: { new_reviews: 3, link_opens: 9, by: { message: 5, qr: 3, tag: 1 }, line: "" },
  ai: null,
  competitor: null,
  whatsapp: "",
  ...o,
});

const report = (id, from, to, week, rec) => ({
  id,
  week_of: week,
  data: {
    period: { from, to },
    rating: 4.7,
    rating_count: 118,
    rating_change: 0,
    rating_drop: false,
    new_reviews: 3,
    new_avg: 4.7,
    replied: 3,
    waiting: 1,
    taps: { total: 9, nfc: 1, qr: 3, message: 5 },
    receipt: rec,
  },
});

const reports = (c) =>
  c.state === "empty"
    ? []
    : [
        report(
          "r3",
          "19 Oct",
          "26 Oct",
          day(1),
          receipt({ competitor: "Juniper Hair Studio got 14 reviews this month. You got 6." }),
        ),
        report(
          "r2",
          "12 Oct",
          "19 Oct",
          day(8),
          receipt({
            did: [{ key: "replies", label: "Replies sent to Google", count: 2 }],
            waiting: { count: 0, items: [] },
          }),
        ),
        report("r1", "5 Oct", "12 Oct", day(15), receipt({ did: [], google: null })),
      ];

const billing = (c) => {
  const base = {
    plan: "pro",
    period: "month",
    units: 0,
    mode: "live",
    founding: true,
    current_period_end: ahead(24),
    cancel_at_period_end: false,
    payment_failed: false,
    grace_ends_at: null,
    ended_at: null,
    data_kept_until: null,
  };
  if (c.state === "paid") return { ...base, state: "active" };
  if (c.state === "failed")
    return { ...base, state: "past_due", payment_failed: true, grace_ends_at: ahead(6) };
  if (c.state === "cancelled") return { ...base, state: "active", cancel_at_period_end: true };
  return null;
};

const paidStates = ["paid", "failed", "cancelled"];

export const tables = {
  // The base row plus the email settings this area reads (a superset, harmless for other screens).
  locations: (c) => [
    {
      ...location(c.state),
      alert_emails: [],
      digest_hour: 18,
      emails_paused_until: null,
      deletion_requested_at: null,
    },
  ],
  visibility_scans: scans,
  visibility_points: points,
  visibility_keywords: [{ id: "k1", keyword: "hair salon", cadence: "monthly" }],
  ai_visibility_runs: [AI_RUN],
  ai_visibility_answers: [
    {
      answer:
        "Rose Lane Salon on Al Wasl Road is known for blow dries and takes walk-ins on weekdays. Juniper Hair Studio is also nearby and is often booked a few days ahead.",
    },
  ],
  ai_visibility_prompts: [
    {
      id: "p1",
      text: "where can i get a good blow dry in jumeirah",
      kind: "suggested",
      cadence: "monthly",
    },
    { id: "p2", text: "best hair salon in jumeirah", kind: "suggested", cadence: "monthly" },
    {
      id: "p3",
      text: "hair salon near al wasl road open late",
      kind: "suggested",
      cadence: "monthly",
    },
  ],
  competitor_snapshots: SNAPSHOTS,
  weekly_reports: reports,
  knowledge_facts: [
    {
      id: "f1",
      slot: "card.signature",
      key: "signature",
      value: { text: "Nadia, Rose Lane Salon" },
      status: "verified",
      source: "owner",
      review_after: ahead(150),
      confirmed_at: ago(20),
    },
    {
      id: "f2",
      slot: "card.tone",
      key: "tone",
      value: { text: "warm" },
      status: "verified",
      source: "owner",
      review_after: ahead(150),
      confirmed_at: ago(20),
    },
    {
      id: "f3",
      slot: "card.about",
      key: "about",
      value: { text: "A small salon on Al Wasl Road for cuts, colour and blow dries." },
      status: "verified",
      source: "owner",
      review_after: ahead(150),
      confirmed_at: ago(20),
    },
    {
      id: "f4",
      slot: "card.parking",
      key: "parking",
      value: { text: "Free parking behind the building." },
      status: "needs_confirmation",
      source: "google",
      review_after: null,
      confirmed_at: null,
    },
  ],
  knowledge_confirms: [],
  plans: (c) =>
    paidStates.includes(c.state)
      ? [
          {
            id: "pl1",
            kind: "pro_monthly",
            status: "active",
            starts_at: ago(6),
            ends_at: ahead(24),
          },
        ]
      : [{ id: "pl0", kind: "trial", status: "active", starts_at: ago(5), ends_at: ahead(9) }],
  payments: (c) =>
    paidStates.includes(c.state)
      ? [{ id: "pay1", plan_id: "pl1", item: "pro_monthly", amount_usd: 39, created_at: ago(6) }]
      : [],
};

export const rpc = {
  my_notification_prefs: [{ category: "trial", channel: "email", frequency: "off" }],
  list_team: {
    members: [
      { user_id: USER_ID, email: "nadia@example.com", role: "owner", you: true },
      {
        user_id: "00000000-0000-4000-8000-000000000002",
        email: "omar.k@example.com",
        role: "manager",
        you: false,
      },
      {
        user_id: "00000000-0000-4000-8000-000000000003",
        email: "lina.s@example.com",
        role: "staff",
        you: false,
      },
    ],
    invites: [
      {
        id: "i1",
        email: "sara.m@example.com",
        role: "staff",
        created_at: ago(1),
        expires_at: ahead(6),
      },
    ],
    policies: {
      review_reply: "owner_and_managers",
      post: "owner_and_managers",
      photo: "owner_and_managers",
      hours: "owner_and_managers",
      profile_change: "owner_and_managers",
    },
  },
  plan_summary: (c) => {
    const b = billing(c);
    return {
      tier: b ? "pro" : "trial",
      v2: true,
      plan: b
        ? { kind: "pro_monthly", starts_at: ago(6), ends_at: ahead(24), last_day: ahead(23) }
        : { kind: "trial", starts_at: ago(5), ends_at: ahead(9), last_day: ahead(8) },
      queued: [],
      paid_waiting: false,
      trial_used: true,
      trial_days: 14,
      checkout_open: true,
      entitlements: { state: b ? "paid" : "trial", plan: "pro", billing: b, ends_at: ahead(9) },
    };
  },
};

export const functions = {
  "POST insights": {
    available: true,
    example: false,
    pro: true,
    summary: {
      headline: "More people called you this month than last month.",
      interactions: { this: 96, last: 88 },
      tiles: [
        { key: "calls", label: "Calls", this: 31, last: 26, change: "19% more" },
        { key: "directions", label: "Direction requests", this: 44, last: 45, change: "2% fewer" },
        { key: "website_clicks", label: "Website clicks", this: 21, last: 17, change: "24% more" },
        {
          key: "views",
          label: "Times your profile was seen",
          this: 1180,
          last: 1090,
          change: "8% more",
        },
      ],
      daily: Array.from({ length: 26 }, (_, i) => ({
        date: `${i + 1} Oct`,
        calls: [1, 2, 0, 1, 3][i % 5],
        website_clicks: [0, 1, 1, 2, 0][i % 5],
        directions: [2, 1, 3, 1, 2][i % 5],
        views: 40 + ((i * 7) % 15),
      })),
      periods: { kind: "month_so_far", this_label: "October", last_label: "September" },
    },
    terms: {
      month_label: "September",
      items: [
        { term: "hair salon jumeirah", count: 64, fewer_than: null },
        { term: "blow dry near me", count: 31, fewer_than: null },
        { term: "rose lane salon", count: null, fewer_than: 15 },
      ],
    },
  },
};
