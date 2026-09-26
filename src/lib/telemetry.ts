// Error tracking (Sentry) and product analytics (PostHog), loaded from their CDNs so the app
// bundle and lockfile stay untouched. Both keys below are public by design.
//
// Rules (KABSI-SPEC D219):
// - Session replay only on public marketing pages. Never on /app, /partner, /staff, /start,
//   /login, /a/*, /activate/* — those can show review text, names or emails.
// - Event properties carry ids, country, source, plan or channel only. Never review text,
//   reviewer names or email addresses.
// - People are identified by their Supabase user id only.

const SENTRY_PUBLIC_KEY = "b09a18a8ac370accf6b8e423fff77a8d";
const POSTHOG_KEY = "phc_rDzVWhoR2wSXyVHVMypztnf8YKHCszd9c9mryMv6W4mW";
const POSTHOG_HOST = "https://us.i.posthog.com";

type SentryLike = {
  init?: (options: Record<string, unknown>) => void;
  captureException?: (error: unknown, context?: Record<string, unknown>) => void;
  setUser?: (user: { id: string } | null) => void;
};
type PostHogLike = {
  capture?: (event: string, properties?: Record<string, unknown>) => void;
  identify?: (id: string) => void;
  reset?: () => void;
  startSessionRecording?: () => void;
  stopSessionRecording?: () => void;
};

declare global {
  interface Window {
    Sentry?: SentryLike;
    posthog?: PostHogLike;
    sentryOnLoad?: () => void;
  }
}

const PRIVATE_PATHS = [
  /^\/app(\/|$)/,
  /^\/partner(\/|$)/,
  /^\/staff(\/|$)/,
  /^\/start(\/|$)/,
  /^\/login(\/|$)/,
  /^\/a\//,
  /^\/activate\//,
];

export function isPrivatePath(path: string) {
  return PRIVATE_PATHS.some((pattern) => pattern.test(path));
}

// Inline boot script: sets environment, configures Sentry before its loader runs, and installs
// the standard PostHog snippet with replay off until a public page turns it on.
const bootScript = `
(function(){
  var h = location.hostname;
  var env = /lovable\\.(app|dev)$/.test(h) ? "preview" : (h === "localhost" || h === "127.0.0.1") ? "local" : "production";
  window.__kabsiEnv = env;
  window.sentryOnLoad = function(){
    Sentry.init({ environment: env, sendDefaultPii: false, tracesSampleRate: 0,
      ignoreErrors: ["ResizeObserver loop limit exceeded", "ResizeObserver loop completed with undelivered notifications"] });
  };
  if (env === "local") return;
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  posthog.init(${JSON.stringify(POSTHOG_KEY)}, {
    api_host: ${JSON.stringify(POSTHOG_HOST)},
    defaults: "2025-05-24",
    person_profiles: "identified_only",
    disable_session_recording: true,
    mask_all_text: false,
    session_recording: { maskAllInputs: true },
    property_denylist: ["$el_text"]
  });
})();`;

export const telemetryHeadScripts = [
  { children: bootScript },
  {
    src: `https://js-de.sentry-cdn.com/${SENTRY_PUBLIC_KEY}.min.js`,
    crossOrigin: "anonymous" as const,
    async: true, // never block the first paint; sentryOnLoad initialises it when it arrives
  },
];

export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  try {
    window.Sentry?.captureException?.(error, { extra: context });
  } catch {
    /* never let reporting break the page */
  }
}

// Event names and allowed properties come from KABSI-SPEC §8.
export type KabsiEvent =
  | "signup_started"
  | "business_selected"
  | "consent_given"
  | "access_granted"
  | "plan_selected"
  | "payment_recorded"
  | "draft_generated"
  | "draft_edited"
  | "reply_approved"
  | "reply_published"
  | "reply_skipped"
  | "post_approved"
  | "photo_approved"
  | "special_hours_approved"
  | "shield_alert_sent"
  | "shield_reverted"
  | "shield_kept"
  | "card_activated"
  | "partner_invited"
  | "partner_location_activated"
  | "lead_submitted";

type SafeProps = Partial<
  Record<"location_id" | "partner_id" | "country" | "source" | "plan" | "channel", string>
>;

export function track(event: KabsiEvent, properties: SafeProps = {}) {
  if (typeof window === "undefined") return;
  try {
    window.posthog?.capture?.(event, properties);
  } catch {
    /* ignore */
  }
}

export function identify(userId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (userId) {
      window.posthog?.identify?.(userId);
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
  try {
    if (isPrivatePath(path)) window.posthog?.stopSessionRecording?.();
    else window.posthog?.startSessionRecording?.();
  } catch {
    /* ignore */
  }
}
