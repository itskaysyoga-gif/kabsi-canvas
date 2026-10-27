// scripts/app-shots fixtures for Home, Reviews and Get reviews (see fixtures.mjs). Values or (ctx) => value; ctx.state is
// the route's state. Invented people and plain small numbers; nothing here is a real customer.
//   (none)        an active owner with three things waiting, replies in every task state
//   setup         access not checked yet (base fixtures)
//   first-task    access checked, first task not done (base fixtures)
//   empty         nothing waits, no reviews, no publications
//   error         list_tasks and the reviews read answer 500
//   staff         the staff role (base fixtures)
// fixtures.mjs imports this file, so its helpers are repeated here (an import back would run before they exist).
const LOCATION_ID = "00000000-0000-4000-8000-0000000000aa";
const ago = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const R = {
  maya: id(101),
  omar: id(102),
  lina: id(103),
  sam: id(104),
  priya: id(105),
  jon: id(106),
};
const fail = { __status: 500, body: { message: "fixture error", code: "XX000" } };

const review = (o) => ({
  location_id: LOCATION_ID,
  language: "en",
  risk: "low",
  risk_reasons: [],
  existing_reply: null,
  reply_state: null,
  reply_state_reason: null,
  is_backlog: false,
  content_purged_at: null,
  reply_drafts: [],
  ...o,
});

const REVIEWS = [
  review({
    id: R.maya,
    reviewer_name: "Maya R.",
    star_rating: 5,
    comment: "Lovely cut and colour, and they were on time. I will be back next month.",
    state: "drafted",
    review_created_at: ago(0.2),
    reply_drafts: [
      {
        body: "Thank you, Maya. We are glad the cut and colour worked for you, and we look forward to seeing you next month.",
        safety_ok: true,
        version: 1,
      },
    ],
  }),
  review({
    id: R.omar,
    reviewer_name: "Omar K.",
    star_rating: 1,
    comment: "The dye burned my scalp and nobody checked on me afterwards.",
    state: "blocked",
    risk: "high",
    risk_reasons: ["health_safety", "low_rating"],
    review_created_at: ago(1),
  }),
  review({
    id: R.jon,
    reviewer_name: "Jon P.",
    star_rating: 2,
    comment: "Waited 40 minutes past my booking time.",
    state: "drafted",
    risk: "medium",
    risk_reasons: ["complaint"],
    reply_state: "rejected",
    review_created_at: ago(3),
    reply_drafts: [
      {
        body: "Thank you for telling us, Jon. We are sorry about the wait and have changed how we book afternoon slots.",
        safety_ok: true,
        version: 2,
      },
    ],
  }),
  review({
    id: R.lina,
    reviewer_name: "Lina S.",
    star_rating: 5,
    comment: "Always a calm visit.",
    state: "publishing",
    review_created_at: ago(2),
  }),
  review({
    id: R.sam,
    reviewer_name: "Sam T.",
    star_rating: 4,
    comment: "Good blow dry, friendly team.",
    state: "posted",
    review_created_at: ago(4),
  }),
  review({
    id: R.priya,
    reviewer_name: "Priya N.",
    star_rating: 5,
    comment: "Best balayage I have had in Dubai.",
    state: "posted",
    review_created_at: ago(6),
  }),
];

const pub = (n, target_type, target_id, state, text, days) => ({
  id: id(200 + n),
  location_id: LOCATION_ID,
  target_type,
  target_id,
  state,
  payload: { text },
  google_response: null,
  approved_at: ago(days),
  updated_at: ago(days),
  created_at: ago(days),
});

const PUBS = [
  pub(
    1,
    "review_reply",
    R.lina,
    "approved",
    "Thank you, Lina. We are glad your visits feel calm.",
    0.001,
  ),
  pub(
    2,
    "review_reply",
    R.sam,
    "published",
    "Thank you, Sam. The team will be happy to read this.",
    0.5,
  ),
  pub(3, "local_post", id(301), "verified", "New this week: gloss treatments, 45 minutes.", 1),
  pub(
    4,
    "review_reply",
    R.jon,
    "failed",
    "Thank you for telling us, Jon. We are sorry about the wait.",
    3,
  ),
  pub(
    5,
    "review_reply",
    R.priya,
    "verified",
    "Thank you, Priya. We loved working on your balayage.",
    5,
  ),
  pub(6, "photo", id(302), "published", null, 2),
];

/** The PostgREST filters this area's reads use: target_type eq/in, state in. */
function filterPubs(params) {
  let rows = PUBS;
  const tt = params.get("target_type");
  if (tt?.startsWith("eq.")) rows = rows.filter((r) => r.target_type === tt.slice(3));
  if (tt?.startsWith("in.(")) {
    const set = tt.slice(4, -1).split(",");
    rows = rows.filter((r) => set.includes(r.target_type));
  }
  const st = params.get("state");
  if (st?.startsWith("in.(")) {
    const set = st.slice(4, -1).split(",");
    rows = rows.filter((r) => set.includes(r.state));
  }
  return rows;
}

const task = (n, o) => ({
  id: id(400 + n),
  priority: "recommended",
  why: "",
  recommendation: null,
  evidence: {},
  created_at: ago(n / 10),
  ...o,
});

const TASKS = [
  task(1, {
    kind: "review_reply",
    title: "Reply to Maya R.",
    path: "/app/reviews",
    evidence: { review_id: R.maya, risk: "low" },
  }),
  task(2, {
    kind: "profile_change",
    priority: "urgent",
    title: "Google shows a new phone number for Rose Lane Salon.",
    why: "Someone suggested a new number on Google yesterday. Kabsi changed nothing.",
    path: "/app/shield",
    evidence: { profile_change_id: id(501) },
  }),
  task(3, {
    kind: "post",
    title: "This week's post is ready",
    path: "/app/posts",
    evidence: { post_id: id(601) },
  }),
  task(4, {
    kind: "hours_confirm",
    title: "Check your hours for the public holiday",
    path: "/app/hours",
  }),
];

const CARDS = [
  {
    code: "KQA234",
    kind: "link",
    status: "active",
    label: null,
    activated_at: ago(15),
    page_mode: "direct",
  },
  {
    code: "NFC7HK",
    kind: "nfc",
    status: "active",
    label: "Counter",
    activated_at: ago(10),
    page_mode: "direct",
  },
];
const TAPS = [0.5, 1, 2, 3, 5, 8, 12].map((d, i) => ({
  code: i % 3 ? "KQA234" : "NFC7HK",
  source: i % 2 ? "qr" : "message",
  created_at: ago(d),
}));

const empty = (c) => c.state === "empty";

export const tables = {
  reviews: (c) => {
    if (c.state === "error") return fail;
    if (empty(c)) return [];
    // Review Growth's count of new reviews this month (a HEAD request).
    if (c.method === "HEAD") return REVIEWS.slice(0, 4);
    return REVIEWS;
  },
  publications: (c) => (empty(c) ? [] : filterPubs(c.params)),
  reply_drafts: (c) =>
    empty(c) ? [] : REVIEWS.flatMap((r) => r.reply_drafts.map((d) => ({ review_id: r.id, ...d }))),
  profile_changes: [
    {
      id: id(501),
      field: "phone",
      previous_value: { display: "+971 4 555 0142" },
      previous_fact_id: id(502),
      google_value: { display: "+971 4 555 0199" },
    },
  ],
  gbp_posts: [
    {
      id: id(601),
      body: "This week at Rose Lane Salon: gloss treatments that take 45 minutes. Book on WhatsApp or call us.",
    },
  ],
  taps: (c) => (empty(c) ? [] : TAPS),
  cards: (c) => (empty(c) ? [] : CARDS),
  weekly_reports: [{ week_of: ago(2) }],
  tasks: (c) => (empty(c) ? [] : TASKS.slice(0, 1)),
};

export const rpc = {
  list_tasks: (c) =>
    c.state === "error"
      ? fail
      : { tasks: empty(c) || c.state === "setup" ? [] : TASKS, snoozed: 0 },
  list_my_notifications: { unread: 1, items: [] },
  list_review_reports: [],
  activity_feed: [],
  // The base fixture names the approvals "reply", "post"; the website reads my_access's keys (review_reply, post,
  // photo, profile_change, hours), so the approve buttons only show with these.
  my_access: (c) => {
    const role = c.state === "manager" ? "manager" : c.state === "staff" ? "staff" : "owner";
    const yes = role !== "staff";
    return {
      role,
      approve: {
        review_reply: yes,
        post: yes,
        photo: yes,
        profile_change: role === "owner",
        hours: yes,
      },
      approve_high_risk: role === "owner",
    };
  },
};

export const functions = {};
