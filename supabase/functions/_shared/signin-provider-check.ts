// Signup 1 (master plan 30.50 item 3d): the daily check that Google sign-in is switched on in Supabase Auth. It reads Auth's
// public settings (GET /auth/v1/settings, the same answer the sign-in panel reads to hide "Continue with Google"). When the
// Google provider is off, or the settings cannot be read, one staff alert on WhatsApp (R-64) and one email to hello@kabsi.co,
// once a day. Read only: nothing is changed in Auth. Pure apart from its deps.

export const PROVIDER_KIND = "signin_provider_off";
export const PROVIDER_EMAIL_KIND = "signin_provider_email";

export type ProviderState = "on" | "off" | "unread";

/** Auth's settings answer to the Google provider's state. */
export function googleState(body: unknown): ProviderState {
  const ext = (body && typeof body === "object" ? (body as { external?: unknown }).external : null) as Record<string, unknown> | null;
  if (!ext || typeof ext !== "object" || !("google" in ext)) return "unread";
  return ext.google === true ? "on" : "off";
}

export type ProviderCheckDeps = {
  read(): Promise<unknown>;
  emit(a: { kind: string; channel: "alerts"; title: string; body: string; dedupe: string }): Promise<void>;
  email(m: { key: string; subject: string; preheader: string; title: string; text: string; html: string }): Promise<void>;
  now(): Date;
};

export async function runProviderCheck(d: ProviderCheckDeps): Promise<{ google: ProviderState; alerted: boolean }> {
  const day = d.now().toISOString().slice(0, 10);
  let google: ProviderState;
  try {
    google = googleState(await d.read());
  } catch {
    google = "unread";
  }
  if (google === "on") return { google, alerted: false };
  const problem = google === "off"
    ? "Google sign-in is switched off in Supabase Auth, so the log in page hides Continue with Google"
    : "Supabase Auth's settings could not be read, so Kabsi cannot tell whether Google sign-in works";
  const fix = "Turn on the Google provider in Supabase, Authentication, Sign In / Providers, and keep https://kabsi.co/** in the redirect URLs.";
  await d.emit({ kind: PROVIDER_KIND, channel: "alerts", title: "Sign-in check found 1 item: Google sign-in", body: `${problem}. ${fix}`, dedupe: `${PROVIDER_KIND}:${day}` });
  const text = `The daily sign-in check found that ${problem.charAt(0).toLowerCase()}${problem.slice(1)}. ${fix} Owners can still sign in with WhatsApp or the email code.`;
  await d.email({
    key: `${PROVIDER_EMAIL_KIND}:${day}`, subject: "Kabsi Google sign-in is off", preheader: "Owners can still use WhatsApp or the email code.",
    title: "Google sign-in", text, html: `<p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`,
  });
  return { google, alerted: true };
}
