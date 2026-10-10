// The Google layer's front door (K-34). Edge Functions import from here only. Each area has a live and a mock module
// with the same wire types; this file picks one per business (a demo business is always mock, R-17) and turns
// Google's responses into the shapes the app uses. Every write here (sendReply, createLocalPost, createMedia,
// addSpecialHours, patchListing) is only ever called by the publish job in api/jobs.ts, after the owner's approval
// and claim_publication (guardrail 6, P0.1-13a and P0.1-13b).
import { type InvitationAddress, matchInvitation, type PendingBusiness } from "../invitations.ts";
import { assertNotConcierge, googleMode, modeFor, type Mode } from "./client.ts";
import * as accountsLive from "./accounts/live.ts";
import * as accountsMock from "./accounts/mock.ts";
import * as adminsLive from "./admins/live.ts";
import * as adminsMock from "./admins/mock.ts";
import * as locationsLive from "./locations/live.ts";
import * as locationsMock from "./locations/mock.ts";
import { GOOGLE_FIELD, OPEN_LABEL } from "./locations/mock.ts";
import * as updatesLive from "./updates/live.ts";
import * as updatesMock from "./updates/mock.ts";
import * as reviewsLive from "./reviews/live.ts";
import * as reviewsMock from "./reviews/mock.ts";
import * as postsLive from "./posts/live.ts";
import * as postsMock from "./posts/mock.ts";
import * as mediaLive from "./media/live.ts";
import * as mediaMock from "./media/mock.ts";
import * as performanceLive from "./performance/live.ts";
import * as performanceMock from "./performance/mock.ts";
import * as placesLive from "./places/live.ts";
import {
  type FieldValue, type GDate, type GoogleReview, type Listing, type LocalPost, type Location, type ManagedLocation, type MockSeed,
  type PostInput, PROTECTION_FIELDS, type ProtectionField, type ProtectionRead, type SkippedInvitation, type SpecialDay,
  type SpecialHourPeriod, type TimeOfDay, type WriteResult,
} from "./types.ts";

export { googleMode, refreshToken } from "./client.ts";
export { listAccountsOnce } from "./accounts/live.ts";
export { PROTECTION_FIELDS } from "./types.ts";
export type {
  FieldValue, GoogleReview, Listing, ManagedLocation, PendingBusiness, PostInput, ProtectionField, ProtectionRead, SkippedInvitation, SpecialDay,
};

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

// ─── Disconnect (K-41, K-113.2, P0.2-02): remove Kabsi's own Manager entry from one location. Kabsi's entries are the
// admins whose account is one of the accounts this login manages (the Kabsi Clients group); the owner's entries are
// never touched. Called only by the disconnect job, after the signed-in owner asked for it in Settings. The result is
// read back: "removed" only when Google no longer lists Kabsi. Google answering 403 or 404 to the list means Kabsi
// already has no access ("already_removed"). Anything else throws, and the job hands the removal to staff.
export async function removeKabsiAccess(locationId: string | null): Promise<"removed" | "already_removed"> {
  if (!locationId) return "already_removed";
  assertNotConcierge(locationId);
  const mode = modeFor(locationId);
  return await removeKabsiEntries({ ...by(mode, accountsLive, accountsMock), ...by(mode, adminsLive, adminsMock) }, locationId);
}

type AdminsApi = Pick<typeof accountsLive, "listAccounts"> & Pick<typeof adminsLive, "listLocationAdmins" | "deleteLocationAdmin">;
export async function removeKabsiEntries(api: AdminsApi, locationId: string): Promise<"removed" | "already_removed"> {
  const { accounts = [] } = await api.listAccounts();
  const mine = new Set(accounts.map((a) => a.name).filter(Boolean));
  const kabsiEntries = async () => {
    try {
      return ((await api.listLocationAdmins(locationId)).admins ?? []).filter((a) => a.account && mine.has(a.account));
    } catch (e) {
      if (/^Error: google (403|404) /.test(String(e))) return null;
      throw e;
    }
  };
  const before = await kabsiEntries();
  if (!before?.length) return "already_removed";
  const owner = before.find((a) => a.role !== "MANAGER" && a.role !== "SITE_MANAGER");
  if (owner) throw new Error(`kabsi_not_manager: Kabsi's entry is ${owner.role}; a person must hand the profile back`);
  for (const a of before) await api.deleteLocationAdmin(a.name!);
  const after = await kabsiEntries();
  if (after?.length) throw new Error("kabsi_still_listed: Google still lists Kabsi after the delete");
  return "removed";
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

// ─── Local posts. Only called by the publish job after the owner's approval (D202, P0.1-13b). The reference is the
// post's name, which the reconcile job reads back.
const POST_STATE: Record<string, WriteResult["state"]> = { LIVE: "live", REJECTED: "rejected" };
export async function createLocalPost(accountId: string, locationId: string, p: PostInput): Promise<WriteResult & { ref: string | null }> {
  assertNotConcierge(locationId);
  const body: LocalPost = { languageCode: p.languageCode, summary: p.summary, topicType: "STANDARD" };
  if (p.ctaType) body.callToAction = p.ctaType === "CALL" ? { actionType: "CALL" } : { actionType: p.ctaType, url: p.ctaUrl ?? undefined };
  const mode = modeFor(locationId);
  const created = await by(mode, postsLive, postsMock).createLocalPost(accountId, locationId, body);
  return { state: POST_STATE[created.state ?? ""] ?? "in_review", ref: created.name ?? null, response: mode === "mock" ? { mock: true, post: created } : created };
}

// Google's state for one post Kabsi created: live, in_review (Google is still checking it), rejected, or null when
// Google has no such post. Without a reference (the write got no answer), the business's posts are searched for the
// same text.
export async function localPostState(accountId: string, locationId: string, ref: string | null, summary: string): Promise<WriteResult["state"] | null> {
  assertNotConcierge(locationId);
  const api = by(modeFor(locationId), postsLive, postsMock);
  let post: LocalPost | undefined;
  if (ref) {
    post = await api.getLocalPost(ref).catch((e) => {
      if (/^Error: google 404 /.test(String(e))) return undefined;
      throw e;
    });
  } else {
    post = ((await api.listLocalPosts(accountId, locationId)).localPosts ?? []).find((x) => (x.summary ?? "").trim() === summary.trim());
  }
  return post ? (POST_STATE[post.state ?? ""] ?? "in_review") : null;
}

// ─── Special hours: adds one period, keeping the periods already on the profile (PATCH replaces the whole list).
const ymd = (d: string) => { const [year, month, day] = d.split("-").map(Number); return { year, month, day }; };
const hm = (t: string) => { const [hours, minutes] = t.split(":").map(Number); return { hours, minutes }; };

export async function addSpecialHours(locationId: string, s: SpecialDay): Promise<WriteResult> {
  assertNotConcierge(locationId);
  const mode = modeFor(locationId);
  const api = by(mode, locationsLive, locationsMock);
  const current = await api.getLocation(locationId, "specialHours");
  const periods: SpecialHourPeriod[] = [...(current.specialHours?.specialHourPeriods ?? [])];
  periods.push(specialPeriod(s));
  const patched = await api.patchLocation(locationId, "specialHours", { specialHours: { specialHourPeriods: periods } });
  return { state: "live", response: { mock: mode === "mock" || undefined, specialHours: patched.specialHours ?? null } };
}

const specialPeriod = (s: SpecialDay): SpecialHourPeriod => s.closed
  ? { startDate: ymd(s.startDate), endDate: ymd(s.endDate), closed: true }
  : { startDate: ymd(s.startDate), endDate: ymd(s.endDate), openTime: hm(s.openTime!), closeTime: hm(s.closeTime!) };

// Whether the profile shows this period now (read back after the write, and by the reconcile job).
export async function hasSpecialHours(locationId: string, s: SpecialDay): Promise<boolean> {
  assertNotConcierge(locationId);
  const current = await by(modeFor(locationId), locationsLive, locationsMock).getLocation(locationId, "specialHours");
  return showsSpecialHours(current.specialHours?.specialHourPeriods ?? [], s);
}

// Compared as plain strings ("2026-12-25 closed", "2026-12-24 09:00-13:30"): Google and the database may return the
// date and time fields in any key order.
const day = (d?: GDate) => (d ? `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}` : "");
const clock = (t?: TimeOfDay) => `${String(t?.hours ?? 0).padStart(2, "0")}:${String(t?.minutes ?? 0).padStart(2, "0")}`;
const periodKey = (p: SpecialHourPeriod) =>
  `${day(p.startDate)} ${day(p.endDate ?? p.startDate)} ${p.closed ? "closed" : `${clock(p.openTime)}-${clock(p.closeTime)}`}`;
export const showsSpecialHours = (periods: SpecialHourPeriod[], s: SpecialDay) =>
  periods.some((p) => periodKey(p) === periodKey(specialPeriod(s)));

// ─── Google Protection (K-19, P0.2-04): what customers see for each watched field, and which fields Google marks as
// its own update (hasGoogleUpdated, then getGoogleUpdated's diffMask). Read-only; put-backs go through patchListing,
// only from the publish job after the owner chose "Keep my information".
const DAYS: Record<string, string> = { MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed", THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun" };
const t2 = (t?: TimeOfDay) => `${String(t?.hours ?? 0).padStart(2, "0")}:${String(t?.minutes ?? 0).padStart(2, "0")}`;
const READ_MASK = PROTECTION_FIELDS.map((f) => GOOGLE_FIELD[f]).join(",");

// The Protection field for a Google field name or path ("latlng", "regularHours.periods"); the names publications
// stored before P0.2-04 (title, hours, categories) map too.
const OLD_NAME: Record<string, ProtectionField> = { title: "name", hours: "regular_hours", categories: "main_category" };
export function protectionField(name: string): ProtectionField | null {
  const top = name.trim().split(".")[0];
  const byGoogle = PROTECTION_FIELDS.find((f) => GOOGLE_FIELD[f] === top);
  if (byGoogle) return byGoogle;
  if (OLD_NAME[top]) return OLD_NAME[top];
  return (PROTECTION_FIELDS as readonly string[]).includes(top) ? top as ProtectionField : null;
}
const fieldsOfMask = (mask?: string) =>
  [...new Set((mask ?? "").split(",").map(protectionField).filter((f): f is ProtectionField => !!f))];

function listingOf(l: Location): Listing {
  const addr = l.storefrontAddress ?? null;
  const hours = (l.regularHours?.periods ?? []).map((p) => `${DAYS[p.openDay] ?? p.openDay} ${t2(p.openTime)} to ${t2(p.closeTime)}`).join(", ");
  const status = l.openInfo?.status ?? "";
  const pin = l.latlng?.latitude != null && l.latlng?.longitude != null
    ? `${l.latlng.latitude.toFixed(5)}, ${l.latlng.longitude.toFixed(5)}` : "";
  return {
    name: { display: l.title ?? "", raw: l.title ?? "" },
    phone: { display: l.phoneNumbers?.primaryPhone ?? "", raw: l.phoneNumbers ?? null },
    address: { display: addr ? [...(addr.addressLines ?? []), addr.locality].filter(Boolean).join(", ") : "", raw: addr },
    website: { display: l.websiteUri ?? "", raw: l.websiteUri ?? "" },
    regular_hours: { display: hours, raw: l.regularHours ?? null },
    main_category: { display: l.categories?.primaryCategory?.displayName ?? "", raw: l.categories ?? null },
    open_status: { display: OPEN_LABEL[status] ?? status, raw: l.openInfo ?? null },
    map_pin: { display: pin, raw: l.latlng ?? null },
  };
}

export async function readProtection(locationId: string, seed: MockSeed): Promise<ProtectionRead> {
  assertNotConcierge(locationId);
  if (modeFor(locationId) === "mock") {
    const listing = await locationsMock.getListing(locationId, seed);
    const updated = await updatesMock.getGoogleUpdated(locationId, READ_MASK);
    return { listing, googleUpdated: fieldsOfMask(updated.diffMask) };
  }
  const l = await locationsLive.getLocation(locationId, `${READ_MASK},metadata`);
  if (!l.metadata?.hasGoogleUpdated) return { listing: listingOf(l), googleUpdated: [] };
  // Google shows its own value for the fields in diffMask: that is what customers see.
  const updated = await updatesLive.getGoogleUpdated(locationId, READ_MASK);
  const googleUpdated = fieldsOfMask(updated.diffMask);
  const shown: Record<string, unknown> = { ...l };
  for (const f of googleUpdated) shown[GOOGLE_FIELD[f]] = (updated.location as unknown as Record<string, unknown>)[GOOGLE_FIELD[f]];
  return { listing: listingOf(shown as Location), googleUpdated };
}

// Whether Google shows the approved value again and no longer marks the field as its own update (K-19: after a
// put-back Kabsi reads getGoogleUpdated again). Read by the publish and reconcile jobs.
export async function protectionShown(locationId: string, field: string, value: string): Promise<boolean> {
  const f = protectionField(field);
  if (!f) throw new Error(`unknown Protection field ${field}`);
  if (modeFor(locationId) === "mock" && !(await locationsMock.readFields(locationId))) return false;
  const now = await readProtection(locationId, { name: "", address: null });
  return now.listing[f].display === value && !now.googleUpdated.includes(f);
}

// A put-back of the owner's approved value. raw is Google's own shape kept with the fact; a value the owner typed
// (no raw) is sent only for the fields whose shape is the text itself.
export async function patchListing(locationId: string, field: string, raw: unknown, display: string): Promise<WriteResult> {
  assertNotConcierge(locationId);
  const f = protectionField(field);
  if (!f) throw new Error(`unknown Protection field ${field}`);
  if (modeFor(locationId) === "mock") {
    await locationsMock.patchListing(locationId, f, raw ?? display);
    return { state: "live", response: { mock: true } };
  }
  const value = raw ?? (f === "name" || f === "website" ? display : f === "phone" ? { primaryPhone: display } : null);
  if (value == null) throw new Error(`no_google_value: the approved ${f} has no Google form to send`);
  const mask = GOOGLE_FIELD[f];
  const patched = await locationsLive.patchLocation(locationId, mask, { [mask]: value });
  return { state: "live", response: { [mask]: (patched as Record<string, unknown>)[mask] ?? null } };
}

// ─── Photos. sourceUrl is a short-lived signed Storage URL. Only called by the publish job after the owner's approval
// (D202, P0.1-13b); the reference is the media item's name.
export async function createMedia(accountId: string, locationId: string, sourceUrl: string, category: string): Promise<WriteResult & { ref: string | null }> {
  assertNotConcierge(locationId);
  const mode = modeFor(locationId);
  const created = await by(mode, mediaLive, mediaMock).createMedia(accountId, locationId, { mediaFormat: "PHOTO", locationAssociation: { category }, sourceUrl });
  return { state: "live", ref: created.name ?? null, response: { mock: mode === "mock" || undefined, name: created.name ?? null, googleUrl: created.googleUrl ?? null } };
}

// Whether Google has the photo Kabsi added (read by name; Google answers 404 when it does not).
export async function mediaExists(locationId: string, ref: string): Promise<boolean> {
  assertNotConcierge(locationId);
  try {
    return !!(await by(modeFor(locationId), mediaLive, mediaMock).getMedia(ref)).name;
  } catch (e) {
    if (/^Error: google 404 /.test(String(e))) return false;
    throw e;
  }
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
