// profile-snapshot: the free Google Profile Check (P0.4-01; K-91, K-100, K-62, K-82, G-16, G-24, G-27).
// Public data only, never the Business Profile API. The Edge Function (profile-snapshot/index.ts) is a thin wrapper;
// the logic lives here so the Deno tests can run it with a stubbed Places host and no network.
//
//   POST { action: "search", query, turnstile }                       -> { places: [{ place_id, name, address }] }
//   POST { action: "check", place_id, turnstile }                     -> { snapshot }
//   POST { action: "email", place_id, email, tips, consent_text, page, turnstile } -> { ok: true }
//   POST { action: "whatsapp", place_id, phone, consent, consent_text, page, turnstile } -> { ok: true }
//     Only while Kabsi has a WhatsApp number (WHATSAPP_NUMBER). One message, after a ticked opt-in whose words are
//     recorded; no follow-up sequence. The number is used to send and is not stored, only its hash.
//
// Limits (K-100, G-16): Turnstile on every call; 10 requests a minute per visitor; 3 checks a day per visitor (the
// fourth is refused); 20 searches an hour per visitor; the Places kill switch (the daily cap, "Back soon") and the
// 24 hour cache both live in the Google layer. A visitor is a salted hash of the IP, never the IP itself.
// Every Places request carries a field mask and none asks for reviews (tests hold that).
import type { Place } from "./google/types.ts";
import type { PlacesResult } from "./google/places/live.ts";
import type { EmailContent } from "./email/template.ts";
import { type CoachRow, freeChecklist } from "./coach/catalog.ts";
import { FREE_TOOL_BUSY } from "./free-tool-busy.ts";

export const TIPS_CONSENT_TEXT = "Send me tips on managing my Google profile";
/** The words next to the WhatsApp tick. Keep equal to WHATSAPP_CONSENT_TEXT in src/lib/profile-check.ts (a test checks it). */
export const WHATSAPP_CONSENT_TEXT = "Send my Google Profile Check to this WhatsApp number as one message. I understand Kabsi will not message me again unless I ask.";
/** The Meta-approved template for the one message (submitted in the WhatsApp go-live session, 13b). */
export const WHATSAPP_CHECK_TEMPLATE_ENV = "KAPSO_TEMPLATE_PROFILE_CHECK";
const PHONE_RE = /^\+[1-9]\d{7,14}$/;
/** "+1 (201) 555-0100" becomes "+12015550100"; anything without a country code, or not 8 to 15 digits, is refused. */
export function normalizePhone(v: string): string | null {
  const t = v.trim().replace(/[\s().-]/g, "");
  return PHONE_RE.test(t) ? t : null;
}
export const CHECK_PAGES = ["/", "/google-profile-check", "/get-started"];
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,200}$/;
export const LIMITS = { perMinute: 10, checksPerDay: 3, searchesPerHour: 20, emailsPerHour: 5, whatsappPerHour: 3, whatsappPerNumberPerDay: 1 };

// A status flag (lane R, 22 Oct 2026): one plain fact about what Google shows, and what Kabsi would do about it. The tone
// maps to the design tokens' states: "danger" is red (a real problem), "warning" is amber (needs attention), "neutral"
// is grey (Google's public data cannot show it, so Kabsi checks it once the owner connects). Never a score, a ranking, a
// statistic or a claim about lost customers.
export type Tone = "danger" | "warning" | "neutral";
export type Flag = { tone: Tone; fact: string; action: string };
export type Snapshot = {
  place_id: string; name: string; address: string; category: string | null;
  rating: number | null; review_count: number | null; business_status: string | null;
  open_now: boolean | null; hours: string[]; phone: string | null; website: string | null;
  has_photos: boolean; photo_count: number; flags: Flag[]; checklist: CoachRow[]; cached: boolean;
};

const ORDER: Record<Tone, number> = { danger: 0, warning: 1, neutral: 2 };

// Only facts the public Places data holds become danger or warning flags. It has no review replies, holiday hours, posts
// or photo dates (K-82), so those three say so in a neutral flag and promise only what Kabsi does after the owner
// connects. Nothing here asks Places for reviews (the field mask holds that, and tests check it).
export function flags(s: Omit<Snapshot, "flags" | "checklist" | "cached">): Flag[] {
  const out: Flag[] = [];
  if (s.business_status === "CLOSED_PERMANENTLY") {
    out.push({ tone: "danger", fact: "Google shows this business as permanently closed.", action: "If that is wrong, Kabsi shows you the steps to ask Google to correct it." });
  } else if (s.business_status === "CLOSED_TEMPORARILY") {
    out.push({ tone: "danger", fact: "Google shows this business as temporarily closed.", action: "If you are open, Kabsi prepares the update for you to approve." });
  }
  if (s.hours.length === 0) {
    out.push({ tone: "danger", fact: "No opening hours are shown on Google.", action: "Kabsi asks you for your hours and prepares them for you to approve." });
  }
  if (!s.phone) out.push({ tone: "warning", fact: "No phone number is shown on Google.", action: "Kabsi asks you to confirm it and prepares the change for you to approve." });
  if (!s.website) out.push({ tone: "warning", fact: "No website is shown on Google.", action: "Kabsi asks you to confirm the address and prepares the change for you to approve." });
  if (!s.category) out.push({ tone: "warning", fact: "No category is shown on Google.", action: "Kabsi suggests the closest category for you to approve." });
  if (!s.has_photos) out.push({ tone: "warning", fact: "Google shows no photos for this business.", action: "Kabsi asks for photos from your phone and prepares them for you to approve." });
  if (s.review_count !== null && s.review_count < 10) {
    out.push({
      tone: "warning",
      fact: s.review_count === 0 ? "There are no reviews yet." : `There ${s.review_count === 1 ? "is 1 review" : `are ${s.review_count} reviews`} so far.`,
      action: "Kabsi gives you a review link and QR code that make it easy for every customer to leave one.",
    });
  }
  // Google's public data does not show these, so they are never reported as a count or a problem.
  out.push({ tone: "neutral", fact: "Google does not show the public which reviews have a reply.", action: "Once you connect, Kabsi counts the reviews with no reply and prepares one for each. You approve every reply." });
  out.push({ tone: "neutral", fact: "Google does not show the public whether holiday hours are set.", action: "Once you connect, Kabsi asks about each holiday and prepares special hours for you to approve." });
  out.push({ tone: "neutral", fact: "Google does not show the public when photos and posts were added.", action: "Once you connect, Kabsi reads them and prepares a weekly post and photo ideas for you to approve." });
  return out.map((f, i) => ({ f, i })).sort((a, b) => ORDER[a.f.tone] - ORDER[b.f.tone] || a.i - b.i).map((x) => x.f);
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
  // The Profile Coach checklist (P0.8-09): the same rows the owner sees in the app; what public data cannot show says so.
  return { ...base, flags: flags(base), checklist: freeChecklist(base), cached };
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
  /** True while Kabsi has a WhatsApp number (the one setting). The WhatsApp action answers 503 without it. */
  whatsappOn: boolean;
  /** Records the opt-in (hash of the number, the words, the page) and returns the row id. */
  saveWhatsapp: (row: { phone_hash: string; place_id: string; consent_text: string; page: string }) => Promise<string>;
  /** Sends the one template message. "sent" only when it really went out; the mock and a missing template are not "sent". */
  sendWhatsapp: (o: { to: string; params: [string, string] }) => Promise<{ state: "sent" | "mock_sent" | "held" | "failed"; id?: string; error?: string }>;
  markWhatsapp: (id: string, r: { state: string; id?: string; error?: string }) => Promise<void>;
  /** The notification engine (category direct: the visitor just asked for this email). */
  sendEmail: (o: { kind: string; to: string; dedupeKey: string; content: EmailContent }) => Promise<unknown>;
  captureError: (fn: string, e: unknown) => Promise<void>;
  appUrl: string;
  cors: Record<string, string>;
  esc: (s: string) => string;
};

const LABEL: Record<Tone, string> = { danger: "Needs fixing", warning: "Worth fixing", neutral: "After you connect" };

export function checkEmail(d: Pick<Deps, "esc" | "appUrl">, s: Snapshot, tips: boolean): EmailContent {
  const rows = s.flags.map((f) =>
    `<p style="margin:0 0 12px 0;"><strong>${d.esc(LABEL[f.tone])}: ${d.esc(f.fact)}</strong><br>${d.esc(f.action)}</p>`
  ).join("");
  const facts = [
    s.rating !== null ? `Rating ${s.rating}` : null,
    s.review_count !== null ? `${s.review_count} reviews` : null,
    s.category,
  ].filter(Boolean).join(" · ");
  const content = {
    preheader: "What customers see on Google, and what needs fixing.",
    title: "Your Google Profile Check",
    bodyHtml: `<p style="margin:0 0 16px 0;"><strong>${d.esc(s.name)}</strong><br>${d.esc(s.address)}${facts ? `<br>${d.esc(facts)}` : ""}</p>${rows}` +
      `<p style="margin:16px 0 0 0;">Kabsi can take care of these. You approve each one.</p>`,
    button: { label: "Start your free trial", url: `${d.appUrl}/get-started` },
    note: `This check uses public information from Google Maps, as it was when you asked. It is not a score.${tips ? " You asked for tips, so we may send a few. Reply stop at any time." : ""}`,
  };
  const text = [
    "Your Google Profile Check", "", s.name, s.address, facts, "",
    ...s.flags.map((f) => `${LABEL[f.tone]}: ${f.fact}\n${f.action}\n`),
    "Kabsi can take care of these. You approve each one.", `Start your free trial: ${d.appUrl}/get-started`,
  ].filter((l) => l !== null).join("\n");
  return { subject: `${s.name}: your Google Profile Check`, ...content, text };
}

/**
 * The one WhatsApp message, as template parameters. A parameter is a single line (WhatsApp refuses new lines in one), so
 * the facts are joined with spaces. Only the facts that need attention are listed; the actions are Kabsi's to explain
 * after the visitor signs up, and the template's own words say the approval stays with the owner.
 */
export function whatsappParams(s: Snapshot): [string, string] {
  const todo = s.flags.filter((f) => f.tone !== "neutral").map((f) => f.fact.replace(/\s+/g, " ").trim());
  const line = todo.length
    ? `${todo.length === 1 ? "1 thing to look at" : `${todo.length} things to look at`}: ${todo.join(" ")}`
    : "Nothing needs fixing in what Google shows the public.";
  return [s.name.replace(/\s+/g, " ").trim().slice(0, 120), line.slice(0, 900)];
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
        if (r.backSoon) return fail("back_soon", FREE_TOOL_BUSY, 503);
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
          return fail("back_soon", FREE_TOOL_BUSY, 503);
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

      if (action === "whatsapp") {
        if (!d.whatsappOn) return fail("whatsapp_off", "Sending the check to WhatsApp isn't available yet. Use email instead.", 503);
        const placeId = str(b.place_id);
        const phone = normalizePhone(str(b.phone));
        const page = str(b.page);
        if (!PLACE_ID_RE.test(placeId)) return fail("bad_place", "Pick your business from the list.");
        if (!phone) return fail("bad_phone", "Enter your WhatsApp number with the country code, for example +1 201 555 0100.");
        // The tick is the opt-in: it must be true and the words must be the ones the screen showed.
        if (b.consent !== true) return fail("no_consent", "Tick the box to say you want the check on WhatsApp.");
        if (str(b.consent_text) !== WHATSAPP_CONSENT_TEXT || !CHECK_PAGES.includes(page)) {
          return fail("bad_input", "Something went wrong. Please reload the page and try again.");
        }
        const phoneHash = (await d.sha256Hex(`wa:${phone}`)).slice(0, 40);
        if (!(await d.rateLimit(`snapshot:wa:${visitor}`, LIMITS.whatsappPerHour, 3600, { failClosed: true }))) {
          return fail("rate_limited", "That is a lot of requests. Try again in an hour.", 429);
        }
        // One message to a number a day, so nobody can use the form to message someone else's phone more than once.
        if (!(await d.rateLimit(`snapshot:wa-number:${phoneHash}`, LIMITS.whatsappPerNumberPerDay, 86400, { failClosed: true }))) {
          return fail("number_limit", "We already sent a check to this number today.", 429);
        }
        // Built from the 24 hour cache: no Places request, nothing taken from the day's cap.
        const place = await d.getCachedSnapshot(placeId);
        if (!place) return fail("expired", "This check has expired. Run it again, then ask for WhatsApp.", 410);
        const rowId = await d.saveWhatsapp({ phone_hash: phoneHash, place_id: placeId, consent_text: WHATSAPP_CONSENT_TEXT, page });
        const r = await d.sendWhatsapp({ to: phone, params: whatsappParams(buildSnapshot(placeId, place, true)) });
        await d.markWhatsapp(rowId, r);
        if (r.state !== "sent") {
          return fail("whatsapp_off", "We could not send it on WhatsApp. Use email instead.", 503);
        }
        return reply({ ok: true });
      }

      return fail("bad_action", "Something went wrong. Please try again.");
    } catch (e) {
      await d.captureError("profile-snapshot", e);
      return fail("failed", "That didn't work. Please try again.", 502);
    }
  };
}
