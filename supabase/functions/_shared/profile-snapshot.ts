// profile-snapshot: the free Google Profile Check (P0.4-01; K-91, K-100, K-62, K-82, G-16, G-24, G-27).
// Public data only, never the Business Profile API. The Edge Function (profile-snapshot/index.ts) is a thin wrapper;
// the logic lives here so the Deno tests can run it with a stubbed Places host and no network.
//
//   POST { action: "search", query, turnstile }                       -> { places: [{ place_id, name, address }] }
//   POST { action: "check", place_id, turnstile }                     -> { snapshot }
//   POST { action: "email", place_id, email, tips, consent_text, page, turnstile } -> { ok: true }
//
// Limits (K-100, G-16): Turnstile on every call; 10 requests a minute per visitor; 3 checks a day per visitor (the
// fourth is refused); 20 searches an hour per visitor; the Places kill switch (the daily cap, "Back soon") and the
// 24 hour cache both live in the Google layer. A visitor is a salted hash of the IP, never the IP itself.
// Every Places request carries a field mask and none asks for reviews (tests hold that).
import type { Place } from "./google/types.ts";
import type { PlacesResult } from "./google/places/live.ts";
import type { EmailContent } from "./email/template.ts";

export const TIPS_CONSENT_TEXT = "Send me tips on managing my Google profile";
export const CHECK_PAGES = ["/google-profile-check", "/get-started"];
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,200}$/;
export const LIMITS = { perMinute: 10, checksPerDay: 3, searchesPerHour: 20, emailsPerHour: 5 };

export type Level = "urgent" | "recommended" | "nice";
export type Finding = { level: Level; title: string; detail: string };
export type Snapshot = {
  place_id: string; name: string; address: string; category: string | null;
  rating: number | null; review_count: number | null; business_status: string | null;
  open_now: boolean | null; hours: string[]; phone: string | null; website: string | null;
  has_photos: boolean; photo_count: number; findings: Finding[]; cached: boolean;
};

const ORDER: Record<Level, number> = { urgent: 0, recommended: 1, nice: 2 };

// Three to five plain findings from public data only. Labels, never a score, never a ranking (design review, "Free tools").
// Google's public data has no review replies, description, posts or photo dates (K-82), so the items that depend on
// them say so and promise only what Kabsi does once the owner connects.
export function findings(s: Omit<Snapshot, "findings" | "cached">): Finding[] {
  const out: Finding[] = [];
  if (s.business_status === "CLOSED_PERMANENTLY") {
    out.push({ level: "urgent", title: "Google shows your business as permanently closed", detail: "Customers who see this will not visit. If it is wrong, it needs fixing with Google quickly." });
  } else if (s.business_status === "CLOSED_TEMPORARILY") {
    out.push({ level: "urgent", title: "Google shows your business as temporarily closed", detail: "If you are open, customers are being told you are not." });
  }
  if (s.hours.length === 0) {
    out.push({ level: "urgent", title: "Your opening hours are missing", detail: "Customers cannot tell when you are open." });
  }
  if (!s.phone) out.push({ level: "recommended", title: "No phone number on your listing", detail: "Customers who want to call have nothing to tap." });
  if (!s.website) out.push({ level: "recommended", title: "No website on your listing", detail: "Customers who want to know more have nowhere to go from Google." });
  if (!s.has_photos) out.push({ level: "recommended", title: "No photos yet", detail: "Photos let customers see the place before they visit." });
  if (s.review_count !== null && s.review_count < 10) {
    out.push({
      level: "recommended",
      title: s.review_count === 0 ? "No reviews yet" : `Only ${s.review_count} ${s.review_count === 1 ? "review" : "reviews"} so far`,
      detail: "Kabsi gives you a review link and QR code that make it easy for every customer to leave one.",
    });
  }
  out.push({
    level: "recommended", title: "Replies to your reviews",
    detail: "Google's public data does not show your replies. Once you connect, Kabsi prepares a reply for every new review and you approve each one.",
  });
  out.push({
    level: "nice", title: "Fresh photos",
    detail: "Google's public data does not show photo dates. Once you connect, Kabsi reminds you when it is time for new ones.",
  });
  out.push({
    level: "nice", title: "Posts to keep your profile fresh",
    detail: "Kabsi prepares short posts for you to approve.",
  });
  return out.map((f, i) => ({ f, i })).sort((a, b) => ORDER[a.f.level] - ORDER[b.f.level] || a.i - b.i).map((x) => x.f).slice(0, 5);
}

export function buildSnapshot(placeId: string, p: Place, cached: boolean): Snapshot {
  const base = {
    place_id: placeId,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? "",
    category: p.primaryTypeDisplayName?.text ?? null,
    rating: typeof p.rating === "number" ? p.rating : null,
    review_count: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
    business_status: p.businessStatus ?? null,
    open_now: typeof p.currentOpeningHours?.openNow === "boolean" ? p.currentOpeningHours.openNow : null,
    hours: (p.regularOpeningHours?.weekdayDescriptions ?? []).filter((h) => typeof h === "string").slice(0, 7),
    phone: p.nationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    has_photos: (p.photos?.length ?? 0) > 0,
    photo_count: Math.min(p.photos?.length ?? 0, 10),
  };
  return { ...base, findings: findings(base), cached };
}

export type Deps = {
  env: (name: string) => string | undefined;
  ip: (req: Request) => string;
  today: () => string;
  sha256Hex: (text: string) => Promise<string>;
  rateLimit: (key: string, max: number, windowSeconds: number, opts?: { failClosed?: boolean }) => Promise<boolean>;
  giveBack: (key: string) => Promise<void>;
  verifyTurnstile: (token: string | undefined, ip?: string) => Promise<boolean>;
  searchText: (key: string, q: string, max: number, mask: string) => Promise<PlacesResult<{ places?: Place[] }>>;
  getSnapshotPlace: (key: string, placeId: string) => Promise<PlacesResult<Place>>;
  getCachedSnapshot: (placeId: string) => Promise<Place | null>;
  saveEmail: (row: { email: string; place_id: string; tips_opt_in: boolean; consent_text: string; page: string }) => Promise<void>;
  /** The notification engine (category direct: the visitor just asked for this email). */
  sendEmail: (o: { kind: string; to: string; dedupeKey: string; content: EmailContent }) => Promise<unknown>;
  captureError: (fn: string, e: unknown) => Promise<void>;
  appUrl: string;
  cors: Record<string, string>;
  esc: (s: string) => string;
};

const LABEL: Record<Level, string> = { urgent: "Urgent", recommended: "Recommended", nice: "Nice to have" };

export function checkEmail(d: Pick<Deps, "esc" | "appUrl">, s: Snapshot, tips: boolean): EmailContent {
  const rows = s.findings.map((f) =>
    `<p style="margin:0 0 12px 0;"><strong>${d.esc(LABEL[f.level])}: ${d.esc(f.title)}</strong><br>${d.esc(f.detail)}</p>`
  ).join("");
  const facts = [
    s.rating !== null ? `Rating ${s.rating}` : null,
    s.review_count !== null ? `${s.review_count} reviews` : null,
    s.category,
  ].filter(Boolean).join(" · ");
  const content = {
    preheader: "What customers see on Google, and what Kabsi can take care of.",
    title: "Your Google Profile Check",
    bodyHtml: `<p style="margin:0 0 16px 0;"><strong>${d.esc(s.name)}</strong><br>${d.esc(s.address)}${facts ? `<br>${d.esc(facts)}` : ""}</p>${rows}` +
      `<p style="margin:16px 0 0 0;">Kabsi can take care of these. You approve each one.</p>`,
    button: { label: "Start your free trial", url: `${d.appUrl}/get-started` },
    note: `This check uses public information from Google Maps, as it was when you asked. It is not a score.${tips ? " You asked for tips, so we may send a few. Reply stop at any time." : ""}`,
  };
  const text = [
    "Your Google Profile Check", "", s.name, s.address, facts, "",
    ...s.findings.map((f) => `${LABEL[f.level]}: ${f.title}\n${f.detail}\n`),
    "Kabsi can take care of these. You approve each one.", `Start your free trial: ${d.appUrl}/get-started`,
  ].filter((l) => l !== null).join("\n");
  return { subject: `${s.name}: your Google Profile Check`, ...content, text };
}

export function makeHandler(d: Deps) {
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...d.cors, "content-type": "application/json" } });
  const fail = (code: string, message: string, status = 400) => reply({ error: code, message }, status);

  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: d.cors });
    if (req.method !== "POST") return fail("method_not_allowed", "Use POST.", 405);

    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" ? v : "");
    const ip = d.ip(req);
    const visitor = (await d.sha256Hex(`${d.env("SUPABASE_URL")}:${d.today()}:${ip}`)).slice(0, 24);

    // Paid lookups: if the limiter breaks, block instead of removing the limit (D266).
    if (!(await d.rateLimit(`snapshot:min:${visitor}`, LIMITS.perMinute, 60, { failClosed: true }))) {
      return fail("rate_limited", "That is a lot of requests. Wait a minute and try again.", 429);
    }
    if (!(await d.verifyTurnstile(str(b.turnstile) || undefined, ip))) {
      return fail("challenge_failed", "Please complete the check and try again.", 400);
    }
    const action = str(b.action);

    try {
      if (action === "search") {
        const key = d.env("PLACES_API_KEY");
        if (!key) return fail("not_configured", "The check isn't available right now.", 503);
        const q = str(b.query).trim();
        if (q.length < 2 || q.length > 120) return fail("bad_query", "Type your business name and city.");
        if (!(await d.rateLimit(`snapshot:search:${visitor}`, LIMITS.searchesPerHour, 3600, { failClosed: true }))) {
          return fail("rate_limited", "That is a lot of searches. Try again in an hour.", 429);
        }
        const r = await d.searchText(key, q, 5, "places.id,places.displayName,places.formattedAddress");
        if (r.backSoon) return fail("back_soon", "Back soon. The free check is paused for today. Please try again tomorrow.", 503);
        if (!r.ok) throw new Error(`places ${r.status}`);
        return reply({
          places: (r.data.places ?? []).map((p) => ({
            place_id: p.id as string, name: p.displayName?.text ?? "", address: p.formattedAddress ?? "",
          })).filter((p) => PLACE_ID_RE.test(p.place_id)),
        });
      }

      if (action === "check") {
        const key = d.env("PLACES_API_KEY");
        if (!key) return fail("not_configured", "The check isn't available right now.", 503);
        const placeId = str(b.place_id);
        if (!PLACE_ID_RE.test(placeId)) return fail("bad_place", "Pick your business from the list.");
        // Counted before Places is asked; the fourth check in a day stops here.
        const quotaKey = `snapshot:check:${visitor}`;
        if (!(await d.rateLimit(quotaKey, LIMITS.checksPerDay, 86400, { failClosed: true }))) {
          return fail("daily_limit", "You have used your 3 free checks for today. Please come back tomorrow.", 429);
        }
        const r = await d.getSnapshotPlace(key, placeId);
        if (r.backSoon) {
          await d.giveBack(quotaKey).catch(() => {});
          return fail("back_soon", "Back soon. The free check is paused for today. Please try again tomorrow.", 503);
        }
        if (!r.ok) {
          await d.giveBack(quotaKey).catch(() => {});
          if (r.status === 404) return fail("not_found", "We could not find that business. Search again.", 404);
          throw new Error(`places ${r.status}`);
        }
        return reply({ snapshot: buildSnapshot(placeId, r.data, r.cached === true) });
      }

      if (action === "email") {
        const placeId = str(b.place_id);
        const email = str(b.email).trim().toLowerCase().slice(0, 254);
        const page = str(b.page);
        if (!PLACE_ID_RE.test(placeId)) return fail("bad_place", "Pick your business from the list.");
        if (!EMAIL_RE.test(email)) return fail("bad_email", "That email address doesn't look right.");
        if (typeof b.tips !== "boolean") return fail("bad_input", "Something went wrong. Please try again.");
        if (str(b.consent_text) !== TIPS_CONSENT_TEXT || !CHECK_PAGES.includes(page)) {
          return fail("bad_input", "Something went wrong. Please reload the page and try again.");
        }
        if (!(await d.rateLimit(`snapshot:email:${visitor}`, LIMITS.emailsPerHour, 3600, { failClosed: true }))) {
          return fail("rate_limited", "That is a lot of emails. Try again in an hour.", 429);
        }
        // The email is built from the 24 hour cache: no Places request, nothing taken from the day's cap.
        const place = await d.getCachedSnapshot(placeId);
        if (!place) return fail("expired", "This check has expired. Run it again, then ask for the email.", 410);
        await d.saveEmail({ email, place_id: placeId, tips_opt_in: b.tips, consent_text: TIPS_CONSENT_TEXT, page });
        const mail = checkEmail(d, buildSnapshot(placeId, place, true), b.tips);
        const dedupeKey = `profile_check:${(await d.sha256Hex(`${email}|${placeId}|${d.today()}`)).slice(0, 40)}`;
        await d.sendEmail({ kind: "profile_check", to: email, dedupeKey, content: mail });
        return reply({ ok: true });
      }

      return fail("bad_action", "Something went wrong. Please try again.");
    } catch (e) {
      await d.captureError("profile-snapshot", e);
      return fail("failed", "That didn't work. Please try again.", 502);
    }
  };
}
