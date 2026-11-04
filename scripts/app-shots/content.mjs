import { existsSync } from "node:fs";
// scripts/app-shots fixtures for this area (see fixtures.mjs). Values or (ctx) => value; ctx.state is the route's state.
// Posts and photos (/app/posts, /app/photos) for the invented Rose Lane Salon. States: "posts-empty" (no post yet);
// the base "first-task" (the photo ask and the team link wait for the first task) and "staff" (a staff member's
// photo screen). The publications for these kinds are answered through profile.mjs's publications table.
const day = (n) => new Date(Date.now() + n * 86_400_000).toISOString();
const ago = (n) => day(-n);

const post = (o) => ({
  owner_input: "",
  cta_type: null,
  cta_url: null,
  source: "auto",
  topic_type: "STANDARD",
  event_title: null,
  start_date: null,
  end_date: null,
  start_time: null,
  end_time: null,
  offer_terms: null,
  coupon_code: null,
  redeem_url: null,
  photo_id: null,
  publish_at: null,
  created_at: ago(2),
  updated_at: ago(2),
  ...o,
});

// Posts in this month: one ready, one sent, one on Google, one that did not go through.
const POSTS = [
  post({
    id: "post-ready",
    state: "draft",
    body: "New this week at Rose Lane Salon: a gloss treatment that adds shine in 20 minutes. Ask for it with any cut or colour.",
    cta_type: "BOOK",
    publish_at: day(0.05),
  }),
  post({
    id: "post-sent",
    state: "posted",
    body: "Saturday blow dry and treatment, booked together, from 9 in the morning.",
    publish_at: ago(0.3),
  }),
  post({
    id: "post-live",
    state: "posted",
    source: "owner",
    topic_type: "EVENT",
    event_title: "Late opening on Thursdays",
    body: "We now stay open until 21:00 every Thursday, so you can come after work.",
    publish_at: ago(5),
  }),
  post({
    id: "post-failed",
    state: "failed",
    topic_type: "OFFER",
    event_title: null,
    body: "This week only: a free fringe trim with every colour appointment.",
    publish_at: ago(3),
  }),
];

const photo = (o) => ({
  storage_path: `loc/${o.id}.jpg`,
  thumb_path: `loc/${o.id}_s.jpg`,
  kind: "photo",
  category: "AT_WORK",
  suitable: true,
  suitability_note: null,
  issues: [],
  width: 1600,
  height: 1067,
  source: "app",
  created_at: ago(1),
  ...o,
});
const PHOTOS = [
  photo({ id: "ph-ready", state: "draft", category: null }),
  // Photos 2: a phone screenshot gets the note and is left out of Approve all.
  photo({
    id: "ph-shot",
    state: "draft",
    category: null,
    suitable: false,
    suitability_note:
      "This looks like a screenshot. Google asks for photos of your business itself: the outside, inside, your team, your work.",
    width: 1103,
    height: 2400,
  }),
  photo({ id: "ph-checking", state: "checking", thumb_path: null }),
  photo({ id: "ph-live", state: "posted", category: "AT_WORK", created_at: ago(4) }),
  photo({
    id: "ph-sent",
    state: "posted",
    category: "TEAMS",
    source: "staff_link",
    created_at: ago(2),
  }),
  photo({ id: "ph-removing", state: "removing", category: "INTERIOR", created_at: ago(6) }),
  photo({ id: "ph-removed", state: "removed", category: "EXTERIOR", created_at: ago(7) }),
  photo({
    id: "ph-failed",
    state: "failed",
    category: "EXTERIOR",
    width: 600,
    height: 400,
    created_at: ago(5),
  }),
];

/** Photos 2: the picture served for a photo's small copy or full file (scripts/app-shots.mjs). Real photos from the
 * site's own assets; SHOTS_PHOTO_DIR (a folder of <id>.jpg and <id>_s.jpg) replaces them, for the speed measurement. */
const ASSET = {
  "ph-ready": "cafe-counter",
  "ph-shot": "phone-reading",
  "ph-live": "barber-cut",
  "ph-sent": "nail-technician",
  "ph-removing": "bakery-counter",
  "ph-removed": "bakery-window",
  "ph-failed": "auto-garage",
};
export function photoFile(path) {
  const name = path.split("/").pop() ?? "";
  const dir = process.env.SHOTS_PHOTO_DIR;
  if (dir && existsSync(`${dir}/${name}`)) return `${dir}/${name}`;
  const id = name.replace(/(_s)?\.jpg$/, "");
  const small = name.endsWith("_s.jpg");
  return ASSET[id] ? `src/assets/photos/${ASSET[id]}-${small ? 800 : 1600}.webp` : null;
}

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

/** Publications for posts and photos (answered through profile.mjs's publications table). */
export function contentPublications() {
  return [
    pub("p-post-sent", "local_post", "post-sent", "verifying", { at: ago(0.3) }),
    pub("p-post-live", "local_post", "post-live", "verified", {
      at: ago(5),
      response: { searchUrl: "https://local.google.com/place?id=1&use=posts&lpsid=example" },
    }),
    pub("p-post-failed", "local_post", "post-failed", "rejected", { at: ago(3) }),
    pub("p-ph-live", "photo", "ph-live", "verified", { at: ago(4) }),
    pub("p-ph-failed", "photo", "ph-failed", "failed", { at: ago(5) }),
    pub("p-ph-sent", "photo", "ph-sent", "verified", { at: ago(2) }),
    pub("p-ph-removing", "photo", "ph-removing", "verified", { at: ago(6) }),
    pub("p-ph-rm-removing", "photo_removal", "ph-removing", "publishing", { at: ago(0.05) }),
    pub("p-ph-removed", "photo", "ph-removed", "verified", { at: ago(7) }),
    pub("p-ph-rm-removed", "photo_removal", "ph-removed", "verified", { at: ago(1) }),
    // A removal Google refused: the photo is still on Google.
    pub("p-ph-rm-sent", "photo_removal", "ph-sent", "rejected", { at: ago(0.5) }),
  ];
}

export const tables = {
  gbp_posts: (c) => (c.state === "posts-empty" ? [] : POSTS),
  photos: (c) => {
    const select = c.params.get("select") ?? "";
    // The post form asks for photos it can attach (id and path only).
    if (select.replace(/\s/g, "") === "id,storage_path") return [];
    if (c.state === "first-task") return [];
    if (c.state === "staff") return [photo({ id: "ph-staff", state: "checking" })];
    return PHOTOS;
  },
};

export const rpc = {
  photo_link_status: () => ({ active: true, created_at: ago(9), uploads: 3, last_used_at: ago(2) }),
  get_place_link: () => null,
};

export const functions = {
  // Photos 2: Remove from Google answers like the content function (an approval with its 10 second undo).
  "POST content": (c) =>
    c.body?.do === "photo_remove"
      ? {
          ok: true,
          state: "approved",
          publication: "p-ph-rm-new",
          publish_after: new Date(Date.now() + 10_000).toISOString(),
          created: true,
        }
      : undefined,
};
