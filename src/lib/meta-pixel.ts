// The Meta Pixel (master plan 20.4, docs/EVENTS.md). Public pages only: never the app, /start, /staff, /login, the
// partner pages, the billing return page, the review page a business's customers see, or any token page. It loads only
// through runWhenAdvertisingAllowed (src/lib/consent.ts), so in the EU, the EEA, the UK and Switzerland nothing loads
// before "Accept", and anywhere "Let Kabsi measure its ads" is off it never loads. Without VITE_META_PIXEL_ID (Rashid's
// step in Meta Events Manager) nothing loads at all.
//
// Browser events: PageView, ViewContent (pricing), Lead (free scan completed), and the custom FreeScanStarted for the
// retargeting audience "started the scan" (26.4). CompleteRegistration, StartTrial and Subscribe go from Kabsi's servers
// through the Conversions API (supabase/functions/_shared/meta-capi.ts), because sign-up and paying happen on private
// pages. Every browser event carries an event_id, so Meta can match it with a server event of the same id.
import { advertisingAllowed, runWhenAdvertisingAllowed } from "@/lib/consent";
import { isPrivatePath } from "@/lib/private-paths";

const PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID ?? "").trim();

// Pages a public visitor never sees as Kabsi marketing. isPrivatePath covers /app, /partner, /staff, /start, /login,
// /a/ and /activate/.
const NO_PIXEL = [
  /^\/h\//,
  /^\/u\//,
  /^\/unsubscribe(\/|$)/,
  /^\/review\//,
  /^\/billing(\/|$)/,
  /^\/api\//,
];
export function pixelAllowedOn(path: string): boolean {
  return !isPrivatePath(path) && !NO_PIXEL.some((p) => p.test(path));
}

export type PixelEvent = "PageView" | "ViewContent" | "Lead";
type Fbq = ((...args: unknown[]) => void) & {
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: unknown;
  callMethod?: (...a: unknown[]) => void;
};
declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let loaded = false;
let waiting = false;
let currentPath = "/";

function load() {
  if (loaded || typeof window === "undefined" || !PIXEL_ID) return;
  if (!pixelAllowedOn(currentPath)) return;
  loaded = true;
  // Meta's standard base code, without the noscript image.
  const q: unknown[] = [];
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else q.push(args);
  } as Fbq;
  fbq.queue = q;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq ??= fbq;
  window._fbq ??= window.fbq;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  window.fbq("init", PIXEL_ID);
}

function newEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

// Sends one event when the Pixel may run on this page; otherwise nothing.
function send(kind: "track" | "trackCustom", name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !PIXEL_ID || !pixelAllowedOn(currentPath)) return;
  if (!advertisingAllowed()) return;
  load();
  try {
    window.fbq?.(kind, name, params, { eventID: newEventId() });
  } catch {
    /* never let measurement break the page */
  }
}

function pageEvents(path: string) {
  send("track", "PageView");
  if (path === "/pricing") send("track", "ViewContent", { content_name: "pricing" });
}

// Called on every page view from the root component. The first allowed public page loads the Pixel, at once or the
// moment the visitor's choice allows it.
export function pixelPageView(path: string) {
  if (typeof window === "undefined" || !PIXEL_ID) return;
  currentPath = path;
  if (!pixelAllowedOn(path)) return;
  if (advertisingAllowed()) return pageEvents(path);
  if (waiting) return;
  waiting = true;
  runWhenAdvertisingAllowed(() => {
    waiting = false;
    if (pixelAllowedOn(currentPath)) pageEvents(currentPath);
  });
}

export function pixelEvent(name: PixelEvent, params: Record<string, unknown> = {}) {
  send("track", name, params);
}
export function pixelCustom(name: "FreeScanStarted") {
  send("trackCustom", name);
}
