// The Google layer's front door (K-34). Edge Functions import from here only. Each area has a live and a mock module
// with the same wire types; this file picks one per business (a demo business is always mock, R-17) and turns
// Google's responses into the shapes the app uses. Every write here is only ever called after the owner's
// approval, from the publication paths (guardrail 6).
import { type InvitationAddress, matchInvitation, type PendingBusiness } from "../invitations.ts";
import { assertNotConcierge, googleMode, modeFor, type Mode } from "./client.ts";
import * as accountsLive from "./accounts/live.ts";
import * as accountsMock from "./accounts/mock.ts";
import * as locationsLive from "./locations/live.ts";
import * as locationsMock from "./locations/mock.ts";
import * as reviewsLive from "./reviews/live.ts";
import * as reviewsMock from "./reviews/mock.ts";
import * as postsLive from "./posts/live.ts";
import * as postsMock from "./posts/mock.ts";
import * as mediaLive from "./media/live.ts";
import * as mediaMock from "./media/mock.ts";
import * as performanceLive from "./performance/live.ts";
import * as performanceMock from "./performance/mock.ts";
import * as placesLive from "./places/live.ts";
import type {
  FieldValue, GoogleReview, Listing, LocalPost, ManagedLocation, MockSeed, PostInput, ShieldField, SkippedInvitation, SpecialDay,
  SpecialHourPeriod, TimeOfDay, WriteResult,
} from "./types.ts";

export { googleMode, refreshToken } from "./client.ts";
export { listAccountsOnce } from "./accounts/live.ts";
export { SHIELD_FIELDS } from "./types.ts";
export type { FieldValue, GoogleReview, Listing, ManagedLocation, PendingBusiness, PostInput, ShieldField, SkippedInvitation, SpecialDay };

const by = <L, M>(mode: Mode, live: L, mock: M): L | M => (mode === "mock" ? mock : live);

// ─── Accounts: accept Manager invitations and list the locations Kabsi manages.
// D270 vetting (_shared/invitations.ts): an invitation is accepted only when it is a Manager invitation for a
// location and exactly one consented business matches its name and address or city. Anything else is left
// pending and reported. Owners invite Kabsi's business group (D293); invitations show up under every account this
// login can see (the organization, the business group, the personal account), so all of them are listed.
export async function acceptInvitationsAndListLocations(pending: PendingBusiness[] = []): Promise<{ accepted: number; skipped: SkippedInvitation[]; locations: ManagedLocation[] }> {
  const mode = googleMode();
  const accounts = by(mode, accountsLive, accountsMock);
  const locations = by(mode, locationsLive, locationsMock);
  const { accounts: list = [] } = await accounts.listAccounts();
  let accepted = 0;
  const skipped: SkippedInvitation[] = [];
  for (const acct of list) {
    const { invitations = [] } = await accounts.listInvitations(acct.name);
    for (const inv of invitations) {
      const locName = inv.targetLocation?.locationName ?? "";
      if (inv.targetType && inv.targetType !== "LOCATIONS_ONLY" && !inv.targetLocation) { skipped.push({ invitation: inv.name, reason: "not a location invitation", location: locName }); continue; }
      if (inv.role && inv.role !== "MANAGER") { skipped.push({ invitation: inv.name, reason: `role ${inv.role}, not MANAGER`, location: locName }); continue; }
      const match = matchInvitation(locName, inv.targetLocation?.address as InvitationAddress, pending);
      if (!match.ok) { skipped.push({ invitation: inv.name, reason: match.reason, location: locName }); continue; }
      await accounts.acceptInvitation(inv.name);
      accepted++;
    }
  }
  const { accounts: after = [] } = await accounts.listAccounts();
  const managed: ManagedLocation[] = [];
  for (const acct of after) {
    let pageToken = "";
    do {
      const data = await locations.listLocations(acct.name, "name,title,metadata", pageToken);
      for (const loc of data.locations ?? []) {
        managed.push({ accountId: acct.name, locationId: loc.name, placeId: loc.metadata?.placeId ?? null, title: loc.title ?? "" });
      }
      pageToken = data.nextPageToken ?? "";
    } while (pageToken);
  }
  return { accepted, skipped, locations: managed };
}

// ─── Reviews
const RATING: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

export async function listReviews(accountId: string, locationId: string, max = 50): Promise<GoogleReview[]> {
  assertNotConcierge(locationId);
  const mode = modeFor(locationId);
  const api = by(mode, reviewsLive, reviewsMock);
  // Google pages 50 at a time; the mock answers everything up to max in one page, as before.
  const pageSize = mode === "mock" ? max : 50;
  const out: GoogleReview[] = [];
  let pageToken = "";
  do {
    const data = await api.listReviews(accountId, locationId, pageSize, pageToken);
    for (const r of data.reviews ?? []) {
      out.push({
        reviewId: r.reviewId ?? String(r.name).split("/").pop()!, reviewer: r.reviewer?.displayName ?? "A customer",
        rating: RATING[r.starRating ?? ""] ?? 0, comment: r.comment ?? null, createTime: r.createTime!,
        updateTime: r.updateTime ?? null, reply: r.reviewReply?.comment ?? null,
      });
    }
    pageToken = out.length < max ? (data.nextPageToken ?? "") : "";
  } while (pageToken);
  return out;
}

// Writes the exact approved text (D202). Only ever called by the publish job after claim_publication (P0.1-13a);
// what Google shows afterwards is read with readReply, never assumed.
export async function sendReply(accountId: string, locationId: string, reviewId: string, text: string): Promise<{ ref: string; response: unknown }> {
  assertNotConcierge(locationId);
  const name = `${accountId}/${locationId}/reviews/${reviewId}`;
  const mode = modeFor(locationId);
  const reply = await by(mode, reviewsLive, reviewsMock).updateReply(name, text);
  return { ref: name, response: mode === "mock" ? { mock: true, reply } : { reply } };
}

// The reply Google shows now for one review, or null (none yet, or still held while Google checks it, K-116.1).
export async function readReply(accountId: string, locationId: string, reviewId: string): Promise<string | null> {
  assertNotConcierge(locationId);
  const name = `${accountId}/${locationId}/reviews/${reviewId}`;
  const review = await by(modeFor(locationId), reviewsLive, reviewsMock).getReview(name);
  return review.reviewReply?.comment ?? null;
}

// ─── Local posts. Only called after the owner's approval (D202).
export async function createLocalPost(accountId: string, locationId: string, p: PostInput): Promise<WriteResult> {
  assertNotConcierge(locationId);
  if (modeFor(locationId) === "mock") return { state: "live", response: { mock: true } };
  const body: LocalPost = { languageCode: p.languageCode, summary: p.summary, topicType: "STANDARD" };
  if (p.ctaType) body.callToAction = p.ctaType === "CALL" ? { actionType: "CALL" } : { actionType: p.ctaType, url: p.ctaUrl ?? undefined };
  const created = await postsLive.createLocalPost(accountId, locationId, body);
  const state = created.state === "LIVE" ? "live" : created.state === "REJECTED" ? "rejected" : "in_review";
  return { state, response: created };
}

// ─── Special hours: adds one period, keeping the periods already on the profile (PATCH replaces the whole list).
const ymd = (d: string) => { const [year, month, day] = d.split("-").map(Number); return { year, month, day }; };
const hm = (t: string) => { const [hours, minutes] = t.split(":").map(Number); return { hours, minutes }; };

export async function addSpecialHours(locationId: string, s: SpecialDay): Promise<WriteResult> {
  assertNotConcierge(locationId);
  if (modeFor(locationId) === "mock") return { state: "live", response: { mock: true } };
  const current = await locationsLive.getLocation(locationId, "specialHours");
  const periods: SpecialHourPeriod[] = [...(current.specialHours?.specialHourPeriods ?? [])];
  periods.push(s.closed
    ? { startDate: ymd(s.startDate), endDate: ymd(s.endDate), closed: true }
    : { startDate: ymd(s.startDate), endDate: ymd(s.endDate), openTime: hm(s.openTime!), closeTime: hm(s.closeTime!) });
  const patched = await locationsLive.patchLocation(locationId, "specialHours", { specialHours: { specialHourPeriods: periods } });
  return { state: "live", response: { specialHours: patched.specialHours ?? null } };
}

// ─── Google Protection (D218): read the listing, and put one field back after the owner's approval.
const DAYS: Record<string, string> = { MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed", THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun" };
const t2 = (t?: TimeOfDay) => `${String(t?.hours ?? 0).padStart(2, "0")}:${String(t?.minutes ?? 0).padStart(2, "0")}`;

export async function getListing(locationId: string, seed: MockSeed): Promise<Listing> {
  assertNotConcierge(locationId);
  if (modeFor(locationId) === "mock") return locationsMock.getListing(locationId, seed);
  const l = await locationsLive.getLocation(locationId, "title,phoneNumbers,storefrontAddress,websiteUri,regularHours,categories");
  const addr = l.storefrontAddress ?? null;
  const hours = (l.regularHours?.periods ?? []).map((p) => `${DAYS[p.openDay] ?? p.openDay} ${t2(p.openTime)} to ${t2(p.closeTime)}`).join(", ");
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
export async function patchListing(locationId: string, field: ShieldField, raw: unknown): Promise<WriteResult> {
  assertNotConcierge(locationId);
  if (modeFor(locationId) === "mock") {
    await locationsMock.patchListing(locationId, field, raw);
    return { state: "live", response: { mock: true } };
  }
  const mask = MASK[field];
  const patched = await locationsLive.patchLocation(locationId, mask, { [mask]: raw });
  return { state: "live", response: { [mask]: (patched as Record<string, unknown>)[mask] ?? null } };
}

// ─── Photos. sourceUrl is a short-lived signed Storage URL. Only after owner approval (D202).
export async function createMedia(accountId: string, locationId: string, sourceUrl: string, category: string): Promise<WriteResult> {
  assertNotConcierge(locationId);
  if (modeFor(locationId) === "mock") return { state: "live", response: { mock: true } };
  const created = await mediaLive.createMedia(accountId, locationId, { mediaFormat: "PHOTO", locationAssociation: { category }, sourceUrl });
  return { state: "live", response: { name: created.name ?? null, googleUrl: created.googleUrl ?? null } };
}

// ─── Search terms people used to find the profile, for post keywords (read only). The mock has none.
export async function searchKeywords(locationId: string): Promise<{ keyword: string; count: number }[]> {
  assertNotConcierge(locationId);
  const api = by(modeFor(locationId), performanceLive, performanceMock);
  const end = new Date(), start = new Date(end.getFullYear(), end.getMonth() - 3, 1);
  const ym = (d: Date) => ({ year: d.getFullYear(), month: d.getMonth() + 1 });
  const data = await api.searchKeywordsMonthly(locationId, ym(start), ym(end));
  return (data.searchKeywordsCounts ?? [])
    .map((r) => ({ keyword: String(r.searchKeyword ?? "").trim(), count: Number(r.insightsValue?.value ?? r.insightsValue?.threshold ?? 0) }))
    .filter((r) => r.keyword)
    .sort((a, b) => b.count - a.count);
}

// ─── Places API (New), on PLACES_API_KEY (works before the Business Profile grant).
export { getPlace, searchText, type PlacesResult } from "./places/live.ts";

// Category and area of a place.
export async function placeCategory(placeId: string) {
  const key = Deno.env.get("PLACES_API_KEY");
  if (!key) return null;
  const { ok, status, data } = await placesLive.getPlace(key, placeId, "primaryType,primaryTypeDisplayName,types,addressComponents");
  if (!ok) throw new Error(`places ${status}: ${JSON.stringify(data).slice(0, 200)}`);
  const comps = data.addressComponents ?? [];
  const pick = (t: string) => comps.find((c) => c.types?.includes(t))?.longText ?? null;
  // Some places have no primaryType: fall back to the first specific type ("meal_delivery" becomes "meal delivery").
  const generic = ["point_of_interest", "establishment", "store", "food"];
  const type = data.primaryType ?? (data.types ?? []).find((t) => !generic.includes(t)) ?? null;
  return {
    category: type,
    category_label: data.primaryTypeDisplayName?.text ?? (type ? type.replace(/_/g, " ") : null),
    area: pick("neighborhood") ?? pick("sublocality_level_1") ?? pick("sublocality") ?? pick("locality") ?? pick("administrative_area_level_2"),
  };
}
