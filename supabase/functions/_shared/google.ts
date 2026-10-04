import { admin } from "./kabsi.ts";
import { matchInvitation, type PendingBusiness } from "./invitations.ts";
import { isConciergeLocationId } from "./concierge.ts";

// Google Business Profile access as hello@kabsi.co (one central Manager account, SPEC D203).
// GOOGLE_MODE=mock (default until the GBP API grant) simulates Google so every flow is testable.
// GOOGLE_MODE=live uses GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN.
// Live mode is written against the documented APIs but is unverified until access is granted.

// A concierge business has no Google location: a person does the Google steps by hand (Q07). Any call that would
// reach Google, or the mock, for one of those ids is a bug, so it fails loudly before touching anything.
function assertNotConcierge(locationId: string | null | undefined) {
  if (isConciergeLocationId(locationId)) throw new Error("concierge_location");
}

export const googleMode = () => (Deno.env.get("GOOGLE_MODE") === "live" ? "live" : "mock");

let cached: { token: string; exp: number } | null = null;
async function accessToken() {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      refresh_token: Deno.env.get("GOOGLE_REFRESH_TOKEN") ?? "",
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`google token ${res.status}: ${data.error ?? ""}`);
  cached = { token: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

// Retries with truncated exponential backoff and full jitter (base 500 ms, cap 8 s, 4 tries):
// always on 429 (Google didn't process the call); on 5xx only for GET/PUT/PATCH, because a POST
// (new post, new photo) may have gone through and must not be sent twice.
const RETRIES = 4;
async function g(url: string, init: RequestInit = {}) {
  const method = (init.method ?? "GET").toUpperCase();
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { ...init, headers: { authorization: `Bearer ${await accessToken()}`, "content-type": "application/json", ...(init.headers ?? {}) } });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
    const retryable = res.status === 429 || (res.status >= 500 && method !== "POST");
    if (!retryable || attempt >= RETRIES - 1) {
      throw new Error(`google ${res.status} ${url.split("?")[0]}: ${JSON.stringify(data).slice(0, 300)}`);
    }
    const wait = Math.random() * Math.min(8000, 500 * 2 ** attempt);
    await new Promise((r) => setTimeout(r, wait));
  }
}

const AM = "https://mybusinessaccountmanagement.googleapis.com/v1";
const BI = "https://mybusinessbusinessinformation.googleapis.com/v1";

export type ManagedLocation = { accountId: string; locationId: string; placeId: string | null; title: string };

// D270 vetting: see _shared/invitations.ts. An invitation is accepted only when it is a Manager invitation for a
// location and exactly one consented business matches its name and address or city. Anything else is left
// pending and reported.
export type { PendingBusiness };
export type SkippedInvitation = { invitation: string; reason: string; location: string };

// Owners invite Kabsi's business group (D293). Invitations show up under every account this login can see
// (the organization, the business group, the personal account), so all of them are listed.
export async function acceptInvitationsAndListLocations(pending: PendingBusiness[] = []): Promise<{ accepted: number; skipped: SkippedInvitation[]; locations: ManagedLocation[] }> {
  const { accounts = [] } = await g(`${AM}/accounts`);
  let accepted = 0;
  const skipped: SkippedInvitation[] = [];
  for (const acct of accounts) {
    const { invitations = [] } = await g(`${AM}/${acct.name}/invitations`);
    for (const inv of invitations) {
      const locName: string = inv.targetLocation?.locationName ?? "";
      if (inv.targetType && inv.targetType !== "LOCATIONS_ONLY" && !inv.targetLocation) { skipped.push({ invitation: inv.name, reason: "not a location invitation", location: locName }); continue; }
      if (inv.role && inv.role !== "MANAGER") { skipped.push({ invitation: inv.name, reason: `role ${inv.role}, not MANAGER`, location: locName }); continue; }
      const match = matchInvitation(locName, inv.targetLocation?.address, pending);
      if (!match.ok) { skipped.push({ invitation: inv.name, reason: match.reason, location: locName }); continue; }
      await g(`${AM}/${inv.name}:accept`, { method: "POST", body: "{}" });
      accepted++;
    }
  }
  const { accounts: after = [] } = await g(`${AM}/accounts`);
  const locations: ManagedLocation[] = [];
  for (const acct of after) {
    let pageToken = "";
    do {
      const data = await g(`${BI}/${acct.name}/locations?readMask=name,title,metadata&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ""}`);
      for (const loc of data.locations ?? []) {
        locations.push({ accountId: acct.name, locationId: loc.name, placeId: loc.metadata?.placeId ?? null, title: loc.title ?? "" });
      }
      pageToken = data.nextPageToken ?? "";
    } while (pageToken);
  }
  return { accepted, skipped, locations };
}

// ─── Reviews (mock reads/writes public.mock_google_reviews; live uses the v4 reviews API)

export type GoogleReview = {
  reviewId: string; reviewer: string; rating: number; comment: string | null;
  createTime: string; updateTime: string | null; reply: string | null;
};
const RATING: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
const V4 = "https://mybusiness.googleapis.com/v4";

export async function listReviews(accountId: string, locationId: string, max = 50): Promise<GoogleReview[]> {
  assertNotConcierge(locationId);
  if (googleMode() === "mock") {
    const { data, error } = await admin().from("mock_google_reviews").select("*")
      .eq("google_location_id", locationId).order("create_time", { ascending: false }).limit(max);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      reviewId: r.review_id, reviewer: r.reviewer_name, rating: r.star_rating, comment: r.comment,
      createTime: r.create_time, updateTime: r.reply_update_time, reply: r.reply_comment,
    }));
  }
  const out: GoogleReview[] = [];
  let pageToken = "";
  do {
    const data = await g(`${V4}/${accountId}/${locationId}/reviews?pageSize=50&orderBy=updateTime%20desc${pageToken ? `&pageToken=${pageToken}` : ""}`);
    for (const r of data.reviews ?? []) {
      out.push({
        reviewId: r.reviewId ?? String(r.name).split("/").pop(), reviewer: r.reviewer?.displayName ?? "A customer",
        rating: RATING[r.starRating] ?? 0, comment: r.comment ?? null, createTime: r.createTime,
        updateTime: r.updateTime ?? null, reply: r.reviewReply?.comment ?? null,
      });
    }
    pageToken = out.length < max ? (data.nextPageToken ?? "") : "";
  } while (pageToken);
  return out;
}

// Writes the exact approved text, then reads it back. Only ever called by publish() after approval (D202).
export async function putReply(accountId: string, locationId: string, reviewId: string, text: string) {
  assertNotConcierge(locationId);
  if (googleMode() === "mock") {
    const { error } = await admin().from("mock_google_reviews")
      .update({ reply_comment: text, reply_update_time: new Date().toISOString() }).eq("review_id", reviewId);
    if (error) throw error;
    return { state: "live" as const, response: { mock: true } };
  }
  const name = `${accountId}/${locationId}/reviews/${reviewId}`;
  const put = await g(`${V4}/${name}/reply`, { method: "PUT", body: JSON.stringify({ comment: text }) });
  // Read back: Google may hold a reply for moderation or reject it.
  const back = await g(`${V4}/${name}`);
  const state = back.reviewReply?.comment === text ? "live" as const : "in_review" as const;
  return { state, response: { put, reply: back.reviewReply ?? null } };
}

// ─── Local posts and special hours (Phase 6). Only called after the owner's approval (D202).
export type PostInput = { summary: string; languageCode: string; ctaType?: string | null; ctaUrl?: string | null };

export async function createLocalPost(accountId: string, locationId: string, p: PostInput) {
  assertNotConcierge(locationId);
  if (googleMode() === "mock") return { state: "live" as const, response: { mock: true } };
  const body: Record<string, unknown> = { languageCode: p.languageCode, summary: p.summary, topicType: "STANDARD" };
  if (p.ctaType) body.callToAction = p.ctaType === "CALL" ? { actionType: "CALL" } : { actionType: p.ctaType, url: p.ctaUrl };
  const created = await g(`${V4}/${accountId}/${locationId}/localPosts`, { method: "POST", body: JSON.stringify(body) });
  const state = created.state === "LIVE" ? "live" as const : created.state === "REJECTED" ? "rejected" as const : "in_review" as const;
  return { state, response: created };
}

export type SpecialDay = { startDate: string; endDate: string; closed: boolean; openTime?: string | null; closeTime?: string | null };
const ymd = (d: string) => { const [year, month, day] = d.split("-").map(Number); return { year, month, day }; };
const hm = (t: string) => { const [hours, minutes] = t.split(":").map(Number); return { hours, minutes }; };

// Adds one special-hours period, keeping the periods already on the profile (PATCH replaces the whole list).
export async function addSpecialHours(locationId: string, s: SpecialDay) {
  assertNotConcierge(locationId);
  if (googleMode() === "mock") return { state: "live" as const, response: { mock: true } };
  const current = await g(`${BI}/${locationId}?readMask=specialHours`);
  const periods = [...(current.specialHours?.specialHourPeriods ?? [])];
  periods.push(s.closed
    ? { startDate: ymd(s.startDate), endDate: ymd(s.endDate), closed: true }
    : { startDate: ymd(s.startDate), endDate: ymd(s.endDate), openTime: hm(s.openTime!), closeTime: hm(s.closeTime!) });
  const patched = await g(`${BI}/${locationId}?updateMask=specialHours`, { method: "PATCH", body: JSON.stringify({ specialHours: { specialHourPeriods: periods } }) });
  return { state: "live" as const, response: { specialHours: patched.specialHours ?? null } };
}

// ─── Google Protection (Phase 7, D218): read the listing, and put one field back after the owner's approval.
export const SHIELD_FIELDS = ["title", "phone", "address", "website", "hours", "categories"] as const;
export type ShieldField = typeof SHIELD_FIELDS[number];
export type FieldValue = { display: string; raw: unknown };
export type Listing = Record<ShieldField, FieldValue>;

const DAYS: Record<string, string> = { MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed", THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun" };
const t2 = (t?: { hours?: number; minutes?: number }) => `${String(t?.hours ?? 0).padStart(2, "0")}:${String(t?.minutes ?? 0).padStart(2, "0")}`;

type MockSeed = { name: string; address: string | null; phone?: string; hours?: string };
export async function getListing(locationId: string, seed: MockSeed): Promise<Listing> {
  assertNotConcierge(locationId);
  if (googleMode() === "mock") {
    const db = admin();
    let { data } = await db.from("mock_listings").select("fields").eq("google_location_id", locationId).maybeSingle();
    if (!data) {
      const fields = { title: seed.name, phone: seed.phone || "+1 (555) 010-0100", address: seed.address ?? "", website: "", hours: seed.hours || "Mon–Sun 09:00–18:00", categories: "Restaurant" };
      await db.from("mock_listings").insert({ google_location_id: locationId, fields });
      data = { fields };
    }
    const f = data.fields as Record<string, string>;
    return Object.fromEntries(SHIELD_FIELDS.map((k) => [k, { display: String(f[k] ?? ""), raw: String(f[k] ?? "") }])) as Listing;
  }
  const l = await g(`${BI}/${locationId}?readMask=title,phoneNumbers,storefrontAddress,websiteUri,regularHours,categories`);
  const addr = l.storefrontAddress ?? null;
  const hours = (l.regularHours?.periods ?? []).map((p: { openDay: string; openTime?: object; closeTime?: object }) => `${DAYS[p.openDay] ?? p.openDay} ${t2(p.openTime)}–${t2(p.closeTime)}`).join(", ");
  return {
    title: { display: l.title ?? "", raw: l.title ?? "" },
    phone: { display: l.phoneNumbers?.primaryPhone ?? "", raw: l.phoneNumbers ?? null },
    address: { display: addr ? [...(addr.addressLines ?? []), addr.locality].filter(Boolean).join(", ") : "", raw: addr },
    website: { display: l.websiteUri ?? "", raw: l.websiteUri ?? "" },
    hours: { display: hours, raw: l.regularHours ?? null },
    categories: { display: l.categories?.primaryCategory?.displayName ?? "", raw: l.categories ?? null },
  };
}

const MASK: Record<ShieldField, string> = { title: "title", phone: "phoneNumbers", address: "storefrontAddress", website: "websiteUri", hours: "regularHours", categories: "categories" };
export async function patchListing(locationId: string, field: ShieldField, raw: unknown) {
  assertNotConcierge(locationId);
  if (googleMode() === "mock") {
    const db = admin();
    const { data } = await db.from("mock_listings").select("fields").eq("google_location_id", locationId).single();
    const fields = { ...(data!.fields as Record<string, unknown>), [field]: raw };
    await db.from("mock_listings").update({ fields, updated_at: new Date().toISOString() }).eq("google_location_id", locationId);
    return { state: "live" as const, response: { mock: true } };
  }
  const mask = MASK[field];
  const patched = await g(`${BI}/${locationId}?updateMask=${mask}`, { method: "PATCH", body: JSON.stringify({ [mask]: raw }) });
  return { state: "live" as const, response: { [mask]: patched[mask] ?? null } };
}

// ─── Photos (Phase 6b). sourceUrl is a short-lived signed Storage URL. Only after owner approval (D202).
export async function createMedia(accountId: string, locationId: string, sourceUrl: string, category: string) {
  assertNotConcierge(locationId);
  if (googleMode() === "mock") return { state: "live" as const, response: { mock: true } };
  const created = await g(`${V4}/${accountId}/${locationId}/media`, {
    method: "POST", body: JSON.stringify({ mediaFormat: "PHOTO", locationAssociation: { category }, sourceUrl }),
  });
  return { state: "live" as const, response: { name: created.name ?? null, googleUrl: created.googleUrl ?? null } };
}

// ─── Keyword sources for posts (read-only).
// Search terms people used to find the profile (Business Profile Performance API). Live only: mock has none.
export async function searchKeywords(locationId: string): Promise<{ keyword: string; count: number }[]> {
  assertNotConcierge(locationId);
  if (googleMode() === "mock") return [];
  const end = new Date(), start = new Date(end.getFullYear(), end.getMonth() - 3, 1);
  const m = (d: Date, k: string) => `monthlyRange.${k}.year=${d.getFullYear()}&monthlyRange.${k}.month=${d.getMonth() + 1}`;
  const data = await g(`https://businessprofileperformance.googleapis.com/v1/${locationId}/searchkeywords/impressions/monthly?${m(start, "startMonth")}&${m(end, "endMonth")}&pageSize=50`);
  type Row = { searchKeyword?: string; insightsValue?: { value?: string; threshold?: string } };
  return ((data.searchKeywordsCounts ?? []) as Row[])
    .map((r) => ({ keyword: String(r.searchKeyword ?? "").trim(), count: Number(r.insightsValue?.value ?? r.insightsValue?.threshold ?? 0) }))
    .filter((r) => r.keyword)
    .sort((a, b) => b.count - a.count);
}

// Category and area from the public Places API (works before the GBP API grant).
export async function placeCategory(placeId: string) {
  const key = Deno.env.get("PLACES_API_KEY");
  if (!key) return null;
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { "x-goog-api-key": key, "x-goog-fieldmask": "primaryType,primaryTypeDisplayName,types,addressComponents" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`places ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  type Comp = { longText?: string; types?: string[] };
  const comps = (data.addressComponents ?? []) as Comp[];
  const pick = (t: string) => comps.find((c) => c.types?.includes(t))?.longText ?? null;
  // Some places have no primaryType: fall back to the first specific type ("meal_delivery" → "meal delivery").
  const generic = ["point_of_interest", "establishment", "store", "food"];
  const type = (data.primaryType as string | undefined) ?? ((data.types ?? []) as string[]).find((t) => !generic.includes(t)) ?? null;
  return {
    category: type,
    category_label: (data.primaryTypeDisplayName?.text as string | undefined) ?? (type ? type.replace(/_/g, " ") : null),
    area: pick("neighborhood") ?? pick("sublocality_level_1") ?? pick("sublocality") ?? pick("locality") ?? pick("administrative_area_level_2"),
  };
}
