// scripts/app-shots fixtures for onboarding (/start and the resume link /start/resume/CODE). Values or (ctx) => value;
// ctx.state is the route's state. The states start with "ob-" and change only what onboarding reads; every other state
// gets the same answer as before (the base onboarding_status from fixtures.mjs, re-created here, and profile.mjs's
// task list). Invented business (Rose Lane Salon), invented numbers.
import * as profile from "./profile.mjs";

const LOCATION_ID = "00000000-0000-4000-8000-0000000000aa";
const day = (n) => new Date(Date.now() + n * 86_400_000).toISOString();
const ago = (n) => day(-n);
const ob = (c) => typeof c.state === "string" && c.state.startsWith("ob-");

/** The base answer (fixtures.mjs), for every state that is not onboarding's. */
const baseStatus = (c) => ({
  location_id: LOCATION_ID,
  business: "Rose Lane Salon",
  time_zone: "Asia/Dubai",
  is_demo: false,
  check: { code: "RLS2345A", term: "hair salon" },
  confirmed: true,
  whatsapp: true,
  setup_ok: true,
  keyword: "hair salon",
  consent: true,
  accepted: c.state !== "setup",
  checked: c.state !== "setup",
  trial_ends_at: day(9),
  first_task_done: c.state !== "first-task" && c.state !== "setup",
  resume_code: "0123456789abcdef0123",
});

// Each onboarding state, as onboarding_status answers it.
const STAGE = {
  "ob-check": { confirmed: false, whatsapp: false, setup_ok: false, consent: false },
  "ob-confirm": { check: null, confirmed: false, whatsapp: false, setup_ok: false, consent: false },
  "ob-wa-off": { whatsapp: false, setup_ok: false, consent: false },
  "ob-wa-wait": { whatsapp: false, setup_ok: false, consent: false },
  "ob-wa-notyet": { whatsapp: false, setup_ok: false, consent: false },
  "ob-wa-done": { whatsapp: true, setup_ok: false, consent: false },
  "ob-consent": { consent: false },
  "ob-invite": {},
  "ob-accepted": { accepted: true },
  "ob-checked": { accepted: true, checked: true, trial_ends_at: day(14) },
  "ob-first-task": { accepted: true, checked: true, trial_ends_at: day(13) },
  "ob-rest": { accepted: true, checked: true, trial_ends_at: day(13) },
  "ob-done": { accepted: true, checked: true, first_task_done: true },
  "ob-resume": {},
};

const status = (c) => ({
  ...baseStatus(c),
  accepted: false,
  checked: false,
  first_task_done: false,
  trial_ends_at: null,
  ...(STAGE[c.state] ?? {}),
});

export const tables = {
  google_connections: (c) => [
    {
      location_id: LOCATION_ID,
      access_state:
        c.state === "setup" || (ob(c) && !(STAGE[c.state] ?? {}).accepted) ? "pending" : "granted",
      voice_of_merchant: true,
      last_successful_sync_at: ago(0),
    },
  ],
};

export const rpc = {
  onboarding_status: (c) => (ob(c) ? status(c) : baseStatus(c)),
  confirm_business: null,
  claim_free_check: true,
  save_consent: "00000000-0000-4000-8000-0000000000c1",
  set_onboarding_step: null,
  whatsapp_status: (c) =>
    c.state === "ob-wa-done"
      ? { state: "active", phone_last4: "4821", review_alerts: true, digest_optin: false }
      : c.state === "ob-wa-wait"
        ? { state: "pending" }
        : { state: "none" },
  whatsapp_connect_start: () => ({ code: "418220", expires_at: day(1 / 48) }),
  list_tasks: (c) => {
    if (c.state === "ob-first-task" || c.state === "ob-rest")
      return {
        tasks: [
          {
            id: "t-first",
            kind: "review_reply",
            priority: "urgent",
            title: "Maya R. left 5 stars and has no reply yet",
            why: "'Lovely blow dry, and they fitted me in on a busy Saturday.' Reply ready.",
            recommendation: null,
            path: "/app/reviews",
            evidence: {},
            created_at: ago(0),
          },
        ],
        snoozed: 0,
      };
    const v = profile.rpc.list_tasks;
    return typeof v === "function" ? v(c) : v;
  },
};

export const functions = {
  // GET /api/resume?code=: the signed-in member's next step, or not_found for a wrong or foreign code.
  "GET api/resume": (c) =>
    c.params.get("code") === "0123456789abcdef0123"
      ? {
          location_id: LOCATION_ID,
          business: "Rose Lane Salon",
          stage: "access",
          access: "invite_pending",
          path: "/start/manager",
        }
      : { __status: 404, body: { error: "not_found", message: "That link is not right." } },
};
