// Error tracking (Sentry) and product analytics (PostHog), loaded from their CDNs so the app
// build and lockfile stay untouched. Both keys below are public by design.
//
// Rules (docs/KABSI-PLAN.md section 2.2):
// - Session replay only on public marketing pages. Never on /app, /partner, /staff, /start,
//   /login, /a/*, /activate/*: those can show review text, names or emails.
// - Event properties carry ids, country, source, plan or channel only. Never review text,
//   reviewer names or email addresses.
// - People are identified by their Supabase user id only.
// - Consent (P0.6-01, src/lib/consent.ts): PostHog runs without cookies until a yes to statistics, stops after a no,
//   and records sessions only after a yes.

import { analyticsAllowed, analyticsPersistent, onConsentChange } from "@/lib/consent";
import { afterPaint } from "@/lib/after-paint";
import { EMAIL_PATTERN, PHONE_PATTERN, SECRET_KEYS } from "@/lib/scrub";

const SENTRY_PUBLIC_KEY = "b09a18a8ac370accf6b8e423fff77a8d";
const POSTHOG_KEY = "phc_rDzVWhoR2wSXyVHVMypztnf8YKHCszd9c9mryMv6W4mW";
// P0.6-02: PostHog goes through kabsi.co itself (vercel.json rewrites /ingest to PostHog's US hosts), so ad blockers
// that block posthog.com do not hide events. The server sends straight to PostHog (product_events).
const POSTHOG_PROXY_PATH = "/ingest";
const POSTHOG_UI_HOST = "https://us.posthog.com";
// P0.6-08 (K-118): the web build's release tag, set by vite.config.ts from the commit Vercel builds.
declare const __KABSI_RELEASE__: string;
export const SENTRY_RELEASE = typeof __KABSI_RELEASE__ === "string" ? __KABSI_RELEASE__ : "dev";

type SentryLike = {
  init?: (options: Record<string, unknown>) => void;
  captureException?: (error: unknown, context?: Record<string, unknown>) => void;
  setUser?: (user: { id: string } | null) => void;
};
type PostHogLike = {
  capture?: (event: string, properties?: Record<string, unknown>) => void;
  identify?: (id: string) => void;
  reset?: () => void;
  opt_out_capturing?: () => void;
  opt_in_capturing?: () => void;
  set_config?: (config: Record<string, unknown>) => void;
  startSessionRecording?: () => void;
  stopSessionRecording?: () => void;
};

declare global {
  interface Window {
    Sentry?: SentryLike;
    posthog?: PostHogLike;
    sentryOnLoad?: () => void;
    __kabsiStartAnalytics?: () => void;
  }
}

export { isPrivatePath } from "@/lib/private-paths";
import { isPrivatePath } from "@/lib/private-paths";

// Inline boot script: sets environment, configures Sentry before its loader runs, and installs
// the standard PostHog snippet with replay off until a public page turns it on.
const bootScript = `
(function(){
  var h = location.hostname;
  var env = /\\.vercel\\.app$/.test(h) ? "preview" : (h === "localhost" || h === "127.0.0.1") ? "local" : "production";
  window.__kabsiEnv = env;
  // Email action links carry a one-time credential in the path (/a/<token>): never send it anywhere.
  var scrub = function(u){ return typeof u === "string" ? u.replace(/\\/a\\/[^\\/?#]+/g, "/a/:token").replace(/([?&](?:t|token)=)[^&#]+/g, "$1redacted") : u; };
  // 20.5: no email address, phone number or review text in a report or an event (src/lib/scrub.ts).
  var EM = new RegExp(${JSON.stringify(EMAIL_PATTERN)}, "g"), PH = new RegExp(${JSON.stringify(PHONE_PATTERN)}, "g"), SK = ${JSON.stringify(SECRET_KEYS)};
  var pii = function(v){ return typeof v === "string" ? v.replace(EM, "[email]").replace(PH, "[phone]") : v; };
  var props = function(o){ if (!o || typeof o !== "object") return o; Object.keys(o).forEach(function(k){ if (SK.indexOf(k.toLowerCase()) >= 0) delete o[k]; else if (k.charAt(0) !== "$") o[k] = pii(o[k]); }); return o; };
  window.sentryOnLoad = function(){
    Sentry.init({ environment: env, release: ${JSON.stringify(SENTRY_RELEASE)}, sendDefaultPii: false, tracesSampleRate: 0,
      beforeSend: function(event){ if (event.user) { event.user = event.user.id ? { id: event.user.id } : undefined; }
        if (event.request && event.request.headers) { delete event.request.headers["X-Forwarded-For"]; delete event.request.cookies; }
        if (event.request) { event.request.url = scrub(event.request.url); if (event.request.headers) event.request.headers.Referer = scrub(event.request.headers.Referer); }
        if (event.transaction) event.transaction = scrub(event.transaction);
        if (event.breadcrumbs) event.breadcrumbs.forEach(function(b){ b.message = pii(b.message); if (b.data) { b.data.url = scrub(b.data.url); b.data.from = scrub(b.data.from); b.data.to = scrub(b.data.to); } });
        event.message = pii(event.message);
        if (event.exception && event.exception.values) event.exception.values.forEach(function(x){ x.value = pii(x.value); });
        props(event.extra); props(event.contexts);
        return event; },
      ignoreErrors: ["ResizeObserver loop limit exceeded", "ResizeObserver loop completed with undelivered notifications"] });
  };
  if (env === "local") return;
  // PostHog starts only after React has hydrated the page (startAnalytics in __root): anything it inserts
  // into the DOM earlier makes hydration fail (Sentry KABSI-WEB-1, 26 Sep 2026).
  window.__kabsiStartAnalytics = function(){
  if (window.__kabsiAnalyticsStarted) return; window.__kabsiAnalyticsStarted = true;
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  posthog.init(${JSON.stringify(POSTHOG_KEY)}, {
    api_host: location.origin + ${JSON.stringify(POSTHOG_PROXY_PATH)},
    ui_host: ${JSON.stringify(POSTHOG_UI_HOST)},
    autocapture: false,
    defaults: "2025-05-24",
    person_profiles: "identified_only",
    persistence: "memory",
    disable_session_recording: true,
    mask_all_text: false,
    session_recording: { maskAllInputs: true },
    property_denylist: ["$el_text"],
    disable_surveys: true,
    before_send: function(e){ if (e && e.properties) { ["$current_url","$pathname","$referrer","$initial_current_url","$initial_pathname"].forEach(function(k){ if (k in e.properties) e.properties[k] = scrub(e.properties[k]); }); props(e.properties); } return e; }
  });
  };
})();`;

export const telemetryHeadScripts = [
  { children: bootScript },
  {
    src: `https://js-de.sentry-cdn.com/${SENTRY_PUBLIC_KEY}.min.js`,
    crossOrigin: "anonymous" as const,
    async: true, // never block the first paint; sentryOnLoad initialises it when it arrives
  },
  // 20.5: Vercel Speed Insights, real visitors' Core Web Vitals, no cookies and no identifier. About 1 KB, deferred.
  { src: "/_vercel/speed-insights/script.js", defer: true },
];

// Called once from the root component after hydration. Replays and the pending user id apply after it.
let pendingUser: string | null = null;
let consentWatched = false;
let lastPath = "/";
// PostHog's script (about 95 KB compressed, 330 KB to run) loads once the page has painted and settled, not while it is
// being made ready: 1.5 seconds after load, or at the first touch (lane R, 22 Oct 2026, performance). A browser event
// sent before then waits in a short list and goes out when PostHog starts, if statistics are still allowed.
const WAIT_MS = 1500;
const waiting: Array<[string, SafeProps]> = [];
let started = false;
let cancelStart: (() => void) | null = null;
export function startAnalytics() {
  if (typeof window === "undefined" || started || cancelStart) return;
  cancelStart = afterPaint(runStart, WAIT_MS);
}
function runStart() {
  if (typeof window === "undefined") return;
  started = true;
  cancelStart = null;
  try {
    window.__kabsiStartAnalytics?.();
    flushWaiting();
    syncReplayWithPath(lastPath);
    if (!consentWatched) {
      consentWatched = true;
      onConsentChange(() => {
        applyCapture();
        syncReplayWithPath(lastPath);
      });
    }
    applyCapture();
    if (pendingUser && analyticsPersistent()) window.posthog?.identify?.(pendingUser);
  } catch {
    /* ignore */
  }
}

export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  try {
    window.Sentry?.captureException?.(error, { extra: context });
  } catch {
    /* never let reporting break the page */
  }
}

// Event names (master plan 20.1, docs/EVENTS.md, the only list): object_action, past tense, one name per action, the
// same name whether the browser or the server sends it. The browser sends only what happens in the browser. Access,
// payments, new accounts, WhatsApp, alerts and approvals are sent by the database from its own records
// (public.product_events), never from here.
export type BrowserEvent =
  | "landing_viewed"
  | "pricing_viewed"
  | "free_scan_started"
  | "free_scan_completed"
  | "review_link_created"
  | "whatsapp_button_clicked"
  | "signup_started"
  | "business_found"
  | "connect_started"
  | "profile_state_seen"
  | "setup_call_booked"
  | "weekly_report_opened";

// The server's names, listed so both sides read the same table. track() refuses them at compile time.
export type ServerEvent =
  | "signup_completed"
  | "google_access_granted"
  | "whatsapp_connected"
  | "first_alert_sent"
  | "first_yes"
  | "trial_started"
  | "checkout_started"
  | "paid"
  | "plan_changed"
  | "payment_failed"
  | "cancel_scheduled"
  | "churned"
  | "details_confirmed"
  | "reply_draft_ready"
  | "reply_approved"
  | "reply_published"
  | "backlog_cleared"
  | "profile_change_decided"
  | "photo_published"
  | "post_published"
  | "subscription_paused";

// Names from before 20.1 that some screens still call. They send nothing: the action is either a server event now
// or has no name in docs/EVENTS.md. Remove the calls as those screens change.
type RetiredEvent =
  | "business_selected"
  | "eligibility_answered"
  | "consent_given"
  | "plan_selected"
  | "draft_generated"
  | "reply_published"
  | "reply_skipped"
  | "reply_undone"
  | "post_approved"
  | "photo_approved"
  | "special_hours_approved"
  | "shield_reverted"
  | "shield_kept"
  | "card_activated"
  | "free_tool_used";
export type KabsiEvent = BrowserEvent | RetiredEvent;
const BROWSER_EVENTS: ReadonlySet<string> = new Set<BrowserEvent>([
  "landing_viewed",
  "pricing_viewed",
  "free_scan_started",
  "free_scan_completed",
  "review_link_created",
  "whatsapp_button_clicked",
  "signup_started",
  "business_found",
  "connect_started",
  "profile_state_seen",
  "setup_call_booked",
  "weekly_report_opened",
]);

// Ids, countries, labels and UTM fields only. Never review text, reviewer names or email addresses.
type SafeProps = Partial<
  Record<
    | "location_id"
    | "country"
    | "source"
    | "plan"
    | "channel"
    | "answer"
    | "route"
    | "state"
    | "page_type"
    | "category"
    | "utm_source"
    | "utm_medium"
    | "utm_campaign"
    | "utm_content",
    string
  >
>;

// Demo workspace (P0.1-06, R-17): nothing from a demo business reaches PostHog. The app and the email-link page
// pause analytics while a demo business is on screen; a real business turns it back on.
let paused = false;
export function setAnalyticsPaused(pause: boolean) {
  if (typeof window === "undefined" || pause === paused) return;
  paused = pause;
  applyCapture();
}

// Capture is on unless a demo business is on screen or the visitor said no to statistics. PostHog keeps an
// identifier (cookie and local storage) only after a yes; before that it stays in memory (P0.6-01).
let captureOn = true;
let persistent = false;
function applyCapture() {
  if (typeof window === "undefined") return;
  const want = !paused && analyticsAllowed();
  const keep = analyticsPersistent();
  try {
    if (want !== captureOn) {
      captureOn = want;
      if (want) window.posthog?.opt_in_capturing?.();
      else window.posthog?.opt_out_capturing?.();
    }
    if (keep !== persistent) {
      persistent = keep;
      window.posthog?.set_config?.({ persistence: keep ? "localStorage+cookie" : "memory" });
      if (keep && pendingUser) window.posthog?.identify?.(pendingUser);
      if (!keep) window.posthog?.reset?.();
    }
  } catch {
    /* ignore */
  }
}

function flushWaiting() {
  const list = waiting.splice(0);
  if (paused || !analyticsAllowed()) return;
  for (const [event, properties] of list) {
    try {
      window.posthog?.capture?.(event, properties);
    } catch {
      /* ignore */
    }
  }
}

export function track(event: KabsiEvent, properties: SafeProps = {}) {
  if (typeof window === "undefined" || paused || !analyticsAllowed()) return;
  if (!BROWSER_EVENTS.has(event)) return;
  if (!window.posthog) {
    // PostHog has not started yet (see startAnalytics): keep the event until it has.
    if (waiting.length < 20) waiting.push([event, properties]);
    return;
  }
  try {
    window.posthog?.capture?.(event, properties);
  } catch {
    /* ignore */
  }
}

// One landing_viewed per public page view (G-31: page_type and the UTM fields). Private pages send none.
export function pageTypeOf(path: string): string {
  if (path === "/") return "home";
  const first = path.split("/")[1] ?? "";
  const known: Record<string, string> = {
    pricing: "pricing",
    "how-it-works": "how_it_works",
    faq: "faq",
    guides: "guide",
    for: "industry",
    "google-profile-check": "tool_profile_check",
    "google-review-link": "tool_review_link",
    "get-started": "get_started",
    "setup-call": "setup_call",
    about: "about",
    security: "security",
    privacy: "legal",
    terms: "legal",
    partners: "partners",
    review: "review_page",
    meta: "meta",
  };
  return known[first] ?? "other";
}
export function trackLanding(path: string, search: string) {
  if (isPrivatePath(path)) return;
  const params = new URLSearchParams(search);
  const props: SafeProps = { page_type: pageTypeOf(path) };
  if (path.startsWith("/for/")) props.category = path.split("/")[2]?.slice(0, 40) ?? "";
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const) {
    const v = params.get(k)?.trim().slice(0, 100);
    if (v) props[k] = v;
  }
  track("landing_viewed", props);
  if (props.page_type === "pricing") track("pricing_viewed", {});
}

// The Weekly Care Report screen (G-44): sent once per report per browser session, with the business id and where it was
// opened ("app"). The email's own open is not measured here.
const reportsSeen = new Set<string>();
export function trackReportOpened(locationId: string, reportId: string) {
  const key = `${locationId}:${reportId}`;
  if (reportsSeen.has(key)) return;
  reportsSeen.add(key);
  track("weekly_report_opened", { location_id: locationId, source: "app" });
}

export function identify(userId: string | null) {
  if (typeof window === "undefined") return;
  pendingUser = userId;
  try {
    if (userId) {
      if (analyticsPersistent()) window.posthog?.identify?.(userId);
      window.Sentry?.setUser?.({ id: userId });
    } else {
      window.posthog?.reset?.();
      window.Sentry?.setUser?.(null);
    }
  } catch {
    /* ignore */
  }
}

export function syncReplayWithPath(path: string) {
  if (typeof window === "undefined") return;
  lastPath = path;
  try {
    if (isPrivatePath(path) || !analyticsPersistent()) window.posthog?.stopSessionRecording?.();
    else window.posthog?.startSessionRecording?.();
  } catch {
    /* ignore */
  }
}
