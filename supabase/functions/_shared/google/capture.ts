// Read-only capture of real Google responses (P0.7-01, K-34). Used by the google-capture function only, never by
// the product. It runs whatever GOOGLE_MODE says, because it never writes: every request is a GET to a Business
// Profile host, checked here before it is sent. It only ever reads the two Kabsi-owned profiles named below
// (Yawmiyati and Abou Hamze Auto Center, written consent on file 8 Oct 2026); any other location the login can see
// is counted, never named or read. Nothing personal leaves this module: account names of personal accounts, reviewer
// names, review and reply text, phone numbers and email addresses are removed before the response is returned.
import { AM, BI, io, NOTIF, PERF, PLACE_ACTIONS, V4, VERIF, waitTurn } from "./client.ts";

const HOSTS = [AM, BI, V4, PERF, NOTIF, VERIF, PLACE_ACTIONS];
export const PROFILES: Record<string, RegExp> = { yawmiyati: /yawmiyati/i, abouhamze: /abou\s*hamze/i };

export type Raw = { url: string; status: number; body: unknown };

// One GET, no retry, so the status and error Google gives are reported exactly as sent.
export async function get(url: string): Promise<Raw> {
  if (!HOSTS.some((h) => url.startsWith(`${h}/`))) throw new Error("capture: host not allowed");
  await waitTurn(null);
  const token = await io.token();
  const res = await fetch(url, { method: "GET", headers: { authorization: `Bearer ${token}` } });
  if (res.status === 429 || res.status >= 500) await io.failure().catch(() => {});
  return { url: url.split("?")[0], status: res.status, body: await res.json().catch(() => ({})) };
}

// deno-lint-ignore no-explicit-any
type Json = any;
// A phone number has a leading + or a separator inside it, or is a bare run of 7 to 11 digits inside free text
// (an owner's "call us on 70123456"). A 12-digit project number and ids in resource names are kept.
const PHONE = /\+\d[\d\s().-]{6,}\d|\b\d{2,4}[\s().-]+\d[\d\s().-]{4,}\d|\b\d{7,11}\b/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
// Resource names ("accounts/123/locations/456"), addresses of Google's own pages and timestamps are not phone
// numbers, though they are runs of digits.
const keep = (s: string) => !/\s/.test(s) && !s.includes("@") && (s.includes("/") || /^\d{4}-\d{2}-\d{2}(T|$)/.test(s));
// Always personal: review and reply text, photo addresses, phone numbers, and "admin" (in an admins list, the
// person's name or email address).
const PERSONAL_KEYS = new Set(["comment", "profilePhotoUrl", "phoneNumbers", "primaryPhone", "additionalPhones", "phoneNumber", "admin"]);
// Personal only inside these objects: a reviewer's or a person's displayName (a category's or an attribute's
// displayName is Google's own label and is kept), and an organisation's postal address (may be a home address).
const PERSONAL_IN: Record<string, Set<string>> = { reviewer: new Set(["displayName"]), organizationInfo: new Set(["address"]) };

// Removes personal data from any Google response: reviewer and person names, review and reply text, phone numbers
// and email addresses anywhere in a string.
export function redact(v: Json, parent = ""): Json {
  if (Array.isArray(v)) return v.map((x) => redact(x, parent));
  if (v && typeof v === "object") {
    const out: Json = {};
    const personalAccount = (v as Json).type === "PERSONAL";
    for (const [k, x] of Object.entries(v)) {
      const personal = PERSONAL_KEYS.has(k) || PERSONAL_IN[parent]?.has(k) || (k === "accountName" && personalAccount);
      out[k] = personal ? (x && typeof x === "object" ? "[removed]" : typeof x === "string" ? "[removed]" : x) : redact(x, k);
    }
    return out;
  }
  if (typeof v === "string") return keep(v) ? v : v.replace(EMAIL, "[email removed]").replace(PHONE, "[phone removed]");
  return v;
}

// Accounts keep their name only when it is a business group or organisation; a personal account's name is a person.
const accountView = (a: Json) => ({
  name: a.name, type: a.type, role: a.role, verificationState: a.verificationState, vettedState: a.vettedState,
  accountName: a.type === "PERSONAL" ? "[removed]" : a.accountName,
});

// Every account and the locations under each. Only the two Kabsi-owned profiles are named.
export async function inventory() {
  const acc = await get(`${AM}/accounts`);
  if (acc.status !== 200) return { accounts: acc };
  const accounts = ((acc.body as Json).accounts ?? []) as Json[];
  const out: Json[] = [];
  for (const a of accounts) {
    const loc = await get(`${BI}/${a.name}/locations?readMask=name,title&pageSize=100`);
    const list = ((loc.body as Json).locations ?? []) as Json[];
    out.push({
      account: accountView(a),
      locations_status: loc.status,
      locations_error: loc.status === 200 ? undefined : (loc.body as Json).error,
      location_count: list.length,
      kabsi_profiles: list
        .map((l) => ({ name: l.name, title: l.title, profile: Object.keys(PROFILES).find((p) => PROFILES[p].test(l.title ?? "")) }))
        .filter((l) => l.profile),
    });
  }
  return { accounts_status: acc.status, account_count: accounts.length, accounts: out };
}

// Finds one of the two Kabsi-owned profiles: the account it sits under and its location name.
export async function findProfile(profile: string): Promise<{ account: string; location: string } | null> {
  const re = PROFILES[profile];
  if (!re) throw new Error("capture: unknown profile");
  const acc = await get(`${AM}/accounts`);
  for (const a of ((acc.body as Json).accounts ?? []) as Json[]) {
    const loc = await get(`${BI}/${a.name}/locations?readMask=name,title&pageSize=100`);
    const hit = (((loc.body as Json).locations ?? []) as Json[]).find((l) => re.test(l.title ?? ""));
    if (hit) return { account: a.name, location: hit.name };
  }
  return null;
}

// One reviews list call, redacted; on failure Google's error as sent.
export async function reviews(profile: string) {
  const p = await findProfile(profile);
  if (!p) return { error: "profile not found under any account" };
  const r = await get(`${V4}/${p.account}/${p.location}/reviews?pageSize=50`);
  return { account: p.account, location: p.location, status: r.status, url: r.url, body: redact(r.body) };
}

// Every field the Business Information API returns for a location (Location resource, v1).
export const LOCATION_MASK = [
  "name", "languageCode", "storeCode", "title", "phoneNumbers", "categories", "storefrontAddress", "websiteUri",
  "regularHours", "specialHours", "serviceArea", "labels", "adWordsLocationExtensions", "latlng", "openInfo", "metadata",
  "profile", "relationshipData", "moreHours", "serviceItems",
].join(",");

const ymd = (d: Date) => ({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
const DAILY = [
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS", "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH", "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH", "BUSINESS_CONVERSATIONS", "BUSINESS_DIRECTION_REQUESTS", "CALL_CLICKS",
  "WEBSITE_CLICKS", "BUSINESS_BOOKINGS", "BUSINESS_FOOD_ORDERS", "BUSINESS_FOOD_MENU_CLICKS",
];

// The read-only v1 set for one Kabsi-owned profile (P0.7-01). Reviews, posts and media (v4) are left out while
// mybusiness.googleapis.com is not enabled for the project. Each entry is Google's response, redacted.
export async function capture(profile: string) {
  const p = await findProfile(profile);
  if (!p) return { error: "profile not found under any account" };
  const { account, location } = p;
  const end = new Date(Date.now() - 86_400_000), start = new Date(Date.now() - 31 * 86_400_000);
  const e = ymd(end), s = ymd(start);
  const day = (k: string, d: { year: number; month: number; day: number }) =>
    `dailyRange.${k}.year=${d.year}&dailyRange.${k}.month=${d.month}&dailyRange.${k}.day=${d.day}`;
  const kwStart = new Date(Date.UTC(e.year, e.month - 4, 1)), kwEnd = new Date(Date.UTC(e.year, e.month - 2, 1));
  const month = (k: string, d: Date) => `monthlyRange.${k}.year=${d.getUTCFullYear()}&monthlyRange.${k}.month=${d.getUTCMonth() + 1}`;
  const urls: Record<string, string> = {
    "accounts.list": `${AM}/accounts`,
    "accounts.invitations": `${AM}/${account}/invitations`,
    "accounts.admins": `${AM}/${account}/admins`,
    "admins.list": `${AM}/${location}/admins`,
    "locations.get": `${BI}/${location}?readMask=${LOCATION_MASK}`,
    "updates.getGoogleUpdated": `${BI}/${location}:getGoogleUpdated?readMask=${LOCATION_MASK}`,
    "attributes.get": `${BI}/${location}/attributes`,
    "attributes.metadata": `${BI}/attributes?parent=${location}&pageSize=200`,
    "performance.dailyMetrics": `${PERF}/${location}:fetchMultiDailyMetricsTimeSeries?${DAILY.map((m) => `dailyMetrics=${m}`).join("&")}&${day("startDate", s)}&${day("endDate", e)}`,
    "performance.searchKeywords": `${PERF}/${location}/searchkeywords/impressions/monthly?${month("startMonth", kwStart)}&${month("endMonth", kwEnd)}&pageSize=50`,
    "placeActions.list": `${PLACE_ACTIONS}/${location}/placeActionLinks`,
    "placeActions.typeMetadata": `${PLACE_ACTIONS}/placeActionTypeMetadata?languageCode=en&filter=${encodeURIComponent(`location=${location}`)}`,
    "verifications.list": `${VERIF}/${location}/verifications`,
    "verifications.voiceOfMerchant": `${VERIF}/${location}/VoiceOfMerchantState`,
    "notifications.get": `${NOTIF}/${account}/notificationSetting`,
  };
  const out: Record<string, { status: number; url: string; body: unknown }> = {};
  for (const [key, url] of Object.entries(urls)) {
    const r = await get(url);
    out[key] = { status: r.status, url: r.url, body: redact(r.body) };
  }
  return { profile, account, location, captured_at: new Date().toISOString(), calls: out };
}
