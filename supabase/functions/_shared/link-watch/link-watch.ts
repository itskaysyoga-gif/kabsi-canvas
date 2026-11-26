// Link watch (PROOF-2, blueprint sections 6 and 8): the website, booking and menu links on the Google profile are checked
// every day with a 10 second limit. A failure is tried again after 30 minutes and after 2 hours; only the third failure
// in a row makes one task for the owner, one per incident. When the link loads again the task closes and the report says
// so in one line. Kabsi stores no address and no page: only the kind of link, a count and the times (K-40). The fetch goes
// through the same safe fetch as the website check (coach/safe-fetch.ts). Pure of the network and the database: both come
// in as deps, so a test drives every step.
import { type SafeFetchDeps, safeGet, UnsafeUrl } from "../coach/safe-fetch.ts";

export type LinkKind = "website" | "booking" | "menu";
export const LINK_KINDS: readonly LinkKind[] = ["website", "booking", "menu"];
export const LINK_LABEL: Record<LinkKind, string> = { website: "website link", booking: "booking link", menu: "menu link" };

/** The three tries of one incident: now, 30 minutes later, 2 hours after that. The third failure alerts. */
export const RETRY_MINUTES = [30, 120] as const;
export const FAILURES_TO_ALERT = 3;
export const CHECK_MS = 10_000;

export type Found = Partial<Record<LinkKind, string>>;

// ── Which links the listing holds.
type PlaceActionLinkLike = { uri?: string; placeActionType?: string };
type AttributeLike = { name?: string; uriValues?: { uri?: string }[] };
const BOOKING_TYPES = new Set(["APPOINTMENT", "ONLINE_APPOINTMENT", "DINING_RESERVATION"]);
const webAddress = (s: string | undefined | null): string | null => {
  const v = (s ?? "").trim();
  return /^https?:\/\//i.test(v) ? v : null;
};

/** The website, booking and menu links on the listing. Booking links are the place actions for an appointment or a table;
 *  the menu is the "menu link" attribute. A kind the listing does not have is left out: nothing to watch. */
export function extractLinks(o: { websiteUri?: string | null; placeActionLinks?: PlaceActionLinkLike[]; attributes?: AttributeLike[] }): Found {
  const out: Found = {};
  const site = webAddress(o.websiteUri);
  if (site) out.website = site;
  const booking = (o.placeActionLinks ?? []).find((l) => BOOKING_TYPES.has(String(l.placeActionType)) && webAddress(l.uri));
  if (booking) out.booking = webAddress(booking.uri)!;
  const menuAttr = (o.attributes ?? []).find((a) => /(^|\/)url_menu$/.test(String(a.name)));
  const menu = webAddress(menuAttr?.uriValues?.[0]?.uri);
  if (menu) out.menu = menu;
  return out;
}

/** APP-3: the website customers see. When Google shows its own update for the website (getGoogleUpdated's diffMask names
 *  websiteUri), that value wins over the owner's stored one, the same rule Google Protection reads by. On 2 Nov Google
 *  removed Yawmiyati's website, the profile said Missing, and the watch still checked the owner's old address. */
export function shownWebsite(own: string | null | undefined, updated: { diffMask?: string; location?: { websiteUri?: string | null } } | null): string | null {
  const mask = (updated?.diffMask ?? "").split(",").map((f) => f.trim().split(".")[0]);
  if (updated && mask.includes("websiteUri")) return updated.location?.websiteUri ?? null;
  return own ?? null;
}

/** APP-3: a link is checked only when it exists on the profile as Kabsi shows it. When the website fact was read and is
 *  empty (the Google profile screen says Missing), the website is left out, whatever the listing read returned. */
export function onlyShownLinks(found: Found, websiteFact: { display?: string | null } | null | undefined): Found {
  if (!websiteFact) return found;
  if ((websiteFact.display ?? "").trim()) return found;
  const { website: _gone, ...rest } = found;
  return rest;
}

// ── One check.
export type CheckResult = { ok: boolean; reason: "loads" | "blocked_us" | "not_found" | "server_error" | "unreachable" | "other_site" | "bad_address" };

/** Does this link load? A page that answers 401, 403 or 429 is up but refusing a robot, so it counts as up. A booking or
 *  menu link that moves to its provider's own site counts as up (that is how those tools work); the website moving to
 *  another site is a failure. A page that loads but shows an error message cannot be seen (a stated limit). */
export async function checkLink(kind: LinkKind, url: string, deps: SafeFetchDeps): Promise<CheckResult> {
  let origin: URL;
  try {
    origin = new URL(url);
  } catch {
    return { ok: false, reason: "bad_address" };
  }
  try {
    const page = await safeGet(url, origin, { ...deps, timeoutMs: deps.timeoutMs ?? CHECK_MS });
    if (page.status >= 200 && page.status < 400) return { ok: true, reason: "loads" };
    if (page.status === 401 || page.status === 403 || page.status === 429) return { ok: true, reason: "blocked_us" };
    return { ok: false, reason: page.status >= 500 ? "server_error" : "not_found" };
  } catch (e) {
    if (e instanceof UnsafeUrl) {
      // The page answered but is a file or a very large page: it is there.
      if (e.reason === "not_a_page" || e.reason === "too_big") return { ok: true, reason: "loads" };
      if (e.reason === "other_site") return kind === "website" ? { ok: false, reason: "other_site" } : { ok: true, reason: "loads" };
      if (e.reason === "no_address" || e.reason === "redirect_without_target" || e.reason === "too_many_redirects") return { ok: false, reason: "unreachable" };
      return { ok: false, reason: "bad_address" };
    }
    return { ok: false, reason: "unreachable" }; // a timeout, a refused connection, a certificate that is not valid
  }
}

// ── SITE-3: the free check's "Do your links work now?". One look, now, with a short limit: a HEAD first (cheap for the
// site), then a GET when the HEAD does not say the page loads (many sites refuse HEAD). Same safe fetch and the same rules
// as the daily watch (checkLink: public addresses only, redirects on the same site, a robot refused still counts as up).
// Anything that has not answered inside the limit is "fails". Nothing is stored.
export const NOW_MS = 4_000;
export async function linkNow(kind: LinkKind, url: string, deps: SafeFetchDeps, limitMs = NOW_MS): Promise<"loads" | "fails"> {
  const started = Date.now();
  const left = () => Math.max(0, limitMs - (Date.now() - started));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<"fails">((res) => { timer = setTimeout(() => res("fails"), limitMs); });
  const look = async (): Promise<"loads" | "fails"> => {
    const head = await checkLink(kind, url, { ...deps, timeoutMs: left(), fetch: (u, init) => deps.fetch(u, { ...init, method: "HEAD" }) });
    if (head.ok) return "loads";
    // A bad address or a private one is not tried again with a GET.
    if (head.reason === "bad_address" || left() <= 0) return "fails";
    const get = await checkLink(kind, url, { ...deps, timeoutMs: left() });
    return get.ok ? "loads" : "fails";
  };
  try {
    return await Promise.race([look().catch(() => "fails" as const), late]);
  } finally {
    clearTimeout(timer);
  }
}

// ── What is remembered about one link: counts and times, never the address.
export type LinkState = {
  failures: number;
  alerted: boolean;
  retryAt: string | null;
  firstFailedAt: string | null;
};
export const FRESH: LinkState = { failures: 0, alerted: false, retryAt: null, firstFailedAt: null };

export type Step = {
  state: LinkState;
  /** The third failure in a row, once per incident. */
  alert: boolean;
  /** The link loads again after an alert: close the task, say it once. */
  recovered: boolean;
  /** Minutes until the next try, null when none is scheduled before the next daily check. */
  retryInMinutes: number | null;
};

export function step(prev: LinkState, ok: boolean, now: Date): Step {
  if (ok) {
    return { state: { ...FRESH }, alert: false, recovered: prev.alerted, retryInMinutes: null };
  }
  const failures = prev.failures + 1;
  const retry = failures < FAILURES_TO_ALERT ? RETRY_MINUTES[failures - 1]! : null;
  const alert = failures >= FAILURES_TO_ALERT && !prev.alerted;
  return {
    state: {
      failures, alerted: prev.alerted || alert,
      retryAt: retry ? new Date(now.getTime() + retry * 60_000).toISOString() : null,
      firstFailedAt: prev.firstFailedAt ?? now.toISOString(),
    },
    alert, recovered: false, retryInMinutes: retry,
  };
}

/** A link whose next try is still in the future is left alone, so two failures never come from one afternoon's checks. */
export const due = (s: LinkState, now: Date) => !s.retryAt || Date.parse(s.retryAt) <= now.getTime();

// ── One business.
export type LinkWatchDeps = {
  /** The links on the listing now, read fresh from Google (null when the listing cannot be read). */
  links(): Promise<Found | null>;
  states(): Promise<Partial<Record<LinkKind, LinkState>>>;
  save(kind: LinkKind, s: LinkState): Promise<void>;
  /** Forget a kind the listing no longer has. */
  drop(kind: LinkKind): Promise<void>;
  fetch: SafeFetchDeps;
  retry(minutes: number): Promise<void>;
  openTask(kind: LinkKind): Promise<void>;
  /** "back": the link loads again (recorded). "removed": the listing no longer has it (the task closes, nothing is recorded). */
  closeTask(kind: LinkKind, why?: "back" | "removed"): Promise<void>;
  now(): Date;
};
export type LinkWatchResult = { checked: number; failed: number; alerted: LinkKind[]; recovered: LinkKind[]; skipped: number };

export async function watchLinks(d: LinkWatchDeps): Promise<LinkWatchResult> {
  const out: LinkWatchResult = { checked: 0, failed: 0, alerted: [], recovered: [], skipped: 0 };
  const links = await d.links();
  if (!links) return out;
  const states = await d.states();
  const now = d.now();
  let soonest: number | null = null;
  for (const kind of LINK_KINDS) {
    const url = links[kind];
    if (!url) {
      // The listing no longer has this link: forget it, and end an incident the owner was told about.
      if (states[kind]) {
        if (states[kind]!.alerted) await d.closeTask(kind, "removed");
        await d.drop(kind);
      }
      continue;
    }
    const prev = states[kind] ?? FRESH;
    if (!due(prev, now)) {
      out.skipped++;
      continue;
    }
    const result = await checkLink(kind, url, d.fetch);
    out.checked++;
    const s = step(prev, result.ok, now);
    if (!result.ok) out.failed++;
    // The task first: if it cannot be made, the state is not saved, so the next try is the third failure again.
    if (s.alert) {
      await d.openTask(kind);
      out.alerted.push(kind);
    }
    await d.save(kind, s.state);
    if (s.recovered) {
      await d.closeTask(kind);
      out.recovered.push(kind);
    }
    if (s.retryInMinutes != null) soonest = Math.min(soonest ?? Infinity, s.retryInMinutes);
  }
  if (soonest != null) await d.retry(soonest);
  return out;
}

// ── The words. Plain, one line, no address.
export function incidentTitle(kind: LinkKind): string {
  return `Your ${LINK_LABEL[kind]} on Google is not loading`;
}
export function incidentWhy(kind: LinkKind): string {
  return `Kabsi tried it 3 times today and it did not load. Customers who tap your ${LINK_LABEL[kind]} may see an error. Kabsi found it, and you fix it where the link points.`;
}
export function recoveryLine(kind: LinkKind): string {
  return `Your ${LINK_LABEL[kind]} is loading again.`;
}
