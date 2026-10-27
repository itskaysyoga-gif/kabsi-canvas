// Fixtures for scripts/app-shots.mjs: an invented owner of an invented business (Rose Lane Salon, Dubai), so the
// signed-in screens can be drawn with no real account and no call to Supabase. Each area adds its own file next to
// this one (home.mjs, content.mjs, profile.mjs, settings.mjs, onboarding.mjs, staff.mjs, public.mjs) exporting
// { tables, rpc, functions }: a value, or a function (ctx) => value where ctx = { state, url, params, body }.
// A route's "state" picks another state of the same screen; each area reads ctx.state for its own states.
import * as home from "./home.mjs";
import * as content from "./content.mjs";
import * as profile from "./profile.mjs";
import * as settings from "./settings.mjs";
import * as onboarding from "./onboarding.mjs";
import * as staff from "./staff.mjs";
import * as publicPages from "./public.mjs";
import * as lead from "./lead.mjs";

export const STORAGE_KEY = "sb-ynjdqjlmdwjgbfezevxy-auth-token";
export const USER_ID = "00000000-0000-4000-8000-000000000001";
export const LOCATION_ID = "00000000-0000-4000-8000-0000000000aa";
export const ORG_ID = "00000000-0000-4000-8000-0000000000bb";

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 86_400 * 30;
const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER_ID, role: "authenticated", exp, email: "nadia@example.com", aud: "authenticated" })}.c2hvdHM`;
export const USER = {
  id: USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: "nadia@example.com",
  user_metadata: { first_name: "Nadia" },
  app_metadata: { provider: "email" },
  created_at: "2026-10-01T09:00:00Z",
};
export const SESSION = {
  access_token: jwt,
  refresh_token: "shots",
  token_type: "bearer",
  expires_in: 86_400 * 30,
  expires_at: exp,
  user: USER,
};

const days = (n) => new Date(Date.now() + n * 86_400_000).toISOString();
export const ago = (n) => days(-n);
export const ahead = days;

/** The business, active and past its first task, unless a state says otherwise. */
export const location = (state) => ({
  id: LOCATION_ID,
  name: "Rose Lane Salon",
  address: "12 Al Wasl Road, Dubai, United Arab Emirates",
  country: "AE",
  status: state === "setup" ? "onboarding" : "active",
  onboarding_step: state === "setup" ? "access" : "done",
  consent_at: ago(20),
  access_granted_at: state === "setup" ? null : ago(18),
  access_lost_at: null,
  disconnect_requested_at: null,
  access_removed_at: null,
  concierge: false,
  concierge_first_post_at: null,
  is_demo: false,
  created_at: ago(21),
  place_id: "ChIJroselanesalon000001",
  organization_id: ORG_ID,
  time_zone: "Asia/Dubai",
  first_task_done_at: state === "first-task" ? null : ago(17),
});

const role = (state) => (state === "manager" ? "manager" : state === "staff" ? "staff" : "owner");

const base = {
  tables: {
    locations: (c) => [location(c.state)],
    location_members: (c) => [{ location_id: LOCATION_ID, user_id: USER_ID, role: role(c.state) }],
    staff_users: [],
    app_settings: [],
    google_connections: (c) => [
      {
        location_id: LOCATION_ID,
        access_state: c.state === "setup" ? "pending" : "granted",
        voice_of_merchant: true,
        last_successful_sync_at: ago(0),
      },
    ],
  },
  rpc: {
    my_access: (c) => ({
      role: role(c.state),
      approve: { review_reply: true, post: true, photo: true, hours: true, profile_change: true },
      approve_high_risk: role(c.state) === "owner",
    }),
    is_staff: (c) => c.state === "staff-admin",
    entitlements: (c) => ({
      organization_id: ORG_ID,
      state: c.state === "paid" ? "active" : "trial",
      watch: true,
      draft: true,
      publish: true,
      ends_at: ahead(9),
      trial:
        c.state === "paid"
          ? null
          : { started_at: ago(5), ends_at: ahead(9), grace_ends_at: ahead(12), day: 6 },
      caps: {
        profile_fixes: { limit: 10, used: 2 },
        backlog_drafts: { limit: 50 },
        ai_generations: { limit: 200, used: 14 },
      },
      trial_used: true,
    }),
    onboarding_status: (c) => ({
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
      trial_ends_at: ahead(9),
      first_task_done: c.state !== "first-task" && c.state !== "setup",
      resume_code: "0123456789abcdef0123",
    }),
  },
  functions: {},
};

const AREAS = [base, home, content, profile, settings, onboarding, staff, publicPages, lead];

function pick(kind, name) {
  for (let i = AREAS.length - 1; i >= 0; i--) {
    const a = AREAS[i][kind];
    if (a && Object.prototype.hasOwnProperty.call(a, name)) return a[name];
  }
  return undefined;
}

/** Answers one request from the browser. */
export function answer(method, rawUrl, headers, body, state) {
  const url = new URL(rawUrl);
  const p = url.pathname;
  const ctx = { state, url, params: url.searchParams, body: body ? safeJson(body) : null, method };
  if (method === "OPTIONS") return { status: 204 };
  if (p.startsWith("/auth/v1/user")) return { body: USER };
  if (p.startsWith("/auth/v1/token")) return { body: SESSION };
  if (p.startsWith("/auth/v1/logout")) return { status: 204 };
  if (p.startsWith("/auth/v1/")) return { body: {} };

  let value;
  let key;
  if (p.startsWith("/rest/v1/rpc/")) {
    key = `rpc ${p.slice(13)}`;
    value = pick("rpc", p.slice(13));
  } else if (p.startsWith("/rest/v1/")) {
    key = `table ${p.slice(9)}`;
    value = pick("tables", p.slice(9));
    if (method !== "GET" && method !== "HEAD" && value === undefined)
      return { status: 201, body: [] };
  } else if (p.startsWith("/functions/v1/")) {
    key = `function ${method} ${p.slice(14)}`;
    value = pick("functions", `${method} ${p.slice(14)}`) ?? pick("functions", p.slice(14));
  } else if (p.startsWith("/storage/v1/")) {
    return { body: [] };
  }
  const missing = value === undefined ? key : undefined;
  let out = typeof value === "function" ? value(ctx) : value;
  if (out && typeof out === "object" && "__status" in out)
    return { status: out.__status, body: out.body, missing };
  if (out === undefined)
    out = p.startsWith("/rest/v1/") && !p.startsWith("/rest/v1/rpc/") ? [] : null;

  // PostgREST single-row answers (.single() / .maybeSingle()).
  const accept = headers["accept"] ?? "";
  if (accept.includes("vnd.pgrst.object")) {
    const rows = Array.isArray(out) ? out : [out];
    if (!rows.length || rows[0] == null)
      return {
        status: 406,
        body: {
          code: "PGRST116",
          message: "JSON object requested, multiple (or no) rows returned",
          details: "The result contains 0 rows",
        },
        missing,
      };
    return { body: rows[0], missing };
  }
  const n = Array.isArray(out) ? out.length : 1;
  return {
    body: method === "HEAD" ? undefined : out,
    headers: { "content-range": `0-${Math.max(0, n - 1)}/${n}` },
    missing,
  };
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
