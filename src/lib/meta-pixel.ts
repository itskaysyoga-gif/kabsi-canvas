// The Meta Pixel (master plan 20.4, docs/EVENTS.md). Public pages only: never the app, /start, /staff, /login, the
// partner pages, the billing return page, the review page a business's customers see, or any token page. It loads only
// through runWhenAdvertisingAllowed (src/lib/consent.ts), so in the EU, the EEA, the UK, Switzerland, the UAE and Saudi Arabia nothing loads
// before "Accept", and anywhere "Let Kabsi measure its ads" is off it never loads. Without VITE_META_PIXEL_ID (Rashid's
// step in Meta Events Manager) nothing loads at all.
//
// Browser events: PageView, ViewContent (pricing and each industry page, Launch 1), Lead (a contact given), and the custom FreeScanStarted for the
// retargeting audience "started the scan" (26.4). CompleteRegistration, StartTrial and Subscribe go from Kabsi's servers
// through the Conversions API (supabase/functions/_shared/meta-capi.ts), because sign-up and paying happen on private
// pages. Every browser event carries an event_id, so Meta can match it with a server event of the same id. Lead and
// FreeScanCompleted also have a server copy with that id (Launch 2, serverCopy below).
import { advertisingAllowed, liveChoice, runWhenAdvertisingAllowed } from "@/lib/consent";
import { anonHeaders, supabaseUrl } from "@/lib/supabase-config";
import { isPrivatePath } from "@/lib/private-paths";
import { afterPaint } from "@/lib/after-paint";

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

const PIXEL_WAIT_MS = 5000;
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
  // Lean 1 (speed): the stub above already queues every call, so the 200 KB of Meta's script can wait for the page: 5 seconds
  // after load, or the next idle moment after the first touch. The events in the queue go out when it arrives.
  afterPaint(
    () => {
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(s);
    },
    PIXEL_WAIT_MS,
    { quiet: true },
  );
  window.fbq("init", PIXEL_ID);
}

function newEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

// Sends one event when the Pixel may run on this page; otherwise nothing. Returns the event id it used.
function send(
  kind: "track" | "trackCustom",
  name: string,
  params: Record<string, unknown> = {},
): string | null {
  if (typeof window === "undefined" || !PIXEL_ID || !pixelAllowedOn(currentPath)) return null;
  if (!advertisingAllowed()) return null;
  load();
  const eventID = newEventId();
  try {
    window.fbq?.(kind, name, params, { eventID });
  } catch {
    /* never let measurement break the page */
  }
  return eventID;
}

// Launch 2 part A (master plan 30.36 item 4): Lead and FreeScanCompleted also go from Kabsi's server through the
// Conversions API with the same event id, so Meta keeps one of the pair. Only a visitor with a stored choice is asked
// about: the server reads that stored choice (consent_records) and sends nothing without a yes there. The body holds the
// random visitor id, the event, its id, the page address without its query, Meta's own two cookies and the content name.
function cookie(name: string): string | null {
  const m = new RegExp(`(?:^|; )${name}=([^;]*)`).exec(document.cookie);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}
export function serverCopyBody(
  name: "Lead" | "FreeScanCompleted",
  eventId: string,
  visitorId: string,
  href: string,
  cookies: { fbp: string | null; fbc: string | null },
  contentName?: string,
): Record<string, unknown> {
  return {
    visitor_id: visitorId,
    event_name: name,
    event_id: eventId,
    event_source_url: href.split(/[?#]/)[0],
    fbp: cookies.fbp,
    fbc: cookies.fbc,
    ...(contentName ? { content_name: contentName } : {}),
  };
}
function serverCopy(
  name: "Lead" | "FreeScanCompleted",
  eventId: string | null,
  contentName?: string,
) {
  const visitor = liveChoice()?.visitor;
  if (!eventId || !visitor || !supabaseUrl) return;
  try {
    void fetch(`${supabaseUrl}/functions/v1/consent/meta`, {
      method: "POST",
      headers: { "content-type": "application/json", ...anonHeaders },
      body: JSON.stringify(
        serverCopyBody(
          name,
          eventId,
          visitor,
          window.location.href,
          { fbp: cookie("_fbp"), fbc: cookie("_fbc") },
          contentName,
        ),
      ),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* never let measurement break the page */
  }
}

/** The ViewContent a page sends: Pricing, and each industry page by its name (Launch 1). Null for every other page. */
export function viewContentOf(path: string): Record<string, string> | null {
  const p = path.replace(/\/+$/, "") || "/";
  if (p === "/pricing") return { content_name: "pricing" };
  const industry = /^\/for\/([a-z0-9-]+)$/.exec(p);
  return industry
    ? { content_name: `industry_${industry[1]}`, content_category: "industry" }
    : null;
}

function pageEvents(path: string) {
  send("track", "PageView");
  const vc = viewContentOf(path);
  if (vc) send("track", "ViewContent", vc);
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
  const id = send("track", name, params);
  if (name === "Lead")
    serverCopy(
      "Lead",
      id,
      typeof params["content_name"] === "string" ? params["content_name"] : undefined,
    );
}
export function pixelCustom(name: "FreeScanStarted" | "FreeScanCompleted") {
  const id = send("trackCustom", name);
  if (name === "FreeScanCompleted") serverCopy("FreeScanCompleted", id);
}
