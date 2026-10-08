// The old Lovable address. Email links sent before the move point here, so while Lovable still serves this host the
// build published there answers every path with a 301 to the same path on kabsi.co (task P0.1-03). On Vercel the host
// never matches, so the check does nothing there.
export const LEGACY_HOST = "kabsi-app.lovable.app";
export const LEGACY_REDIRECT_ORIGIN = "https://kabsi.co";

// On since kabsi.co is served by Vercel (DNS checked 8 Oct 2026). It only does anything on the Lovable host, after the
// last Publish of this code in Lovable.
export const LEGACY_REDIRECT_ENABLED = true;

/** Where a request for the legacy host should go, or null when it should be served as normal. */
export function legacyRedirectTarget(requestUrl: string, enabled = LEGACY_REDIRECT_ENABLED) {
  if (!enabled) return null;
  const url = new URL(requestUrl);
  if (url.hostname !== LEGACY_HOST) return null;
  return `${LEGACY_REDIRECT_ORIGIN}${url.pathname}${url.search}`;
}
