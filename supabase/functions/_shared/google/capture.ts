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
// A phone number has a leading + or a separator inside it; a bare run of digits (a project number, an id) is kept.
const PHONE = /\+\d[\d\s().-]{6,}\d|\b\d{2,4}[\s().-]+\d[\d\s().-]{4,}\d/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
// Resource names ("accounts/123/locations/456"), addresses of Google's own pages and timestamps are not phone
// numbers, though they are runs of digits.
const keep = (s: string) => !/\s/.test(s) && !s.includes("@") && (s.includes("/") || /^\d{4}-\d{2}-\d{2}(T|$)/.test(s));
const PERSONAL_KEYS = new Set(["displayName", "profilePhotoUrl", "comment", "phoneNumbers", "primaryPhone", "additionalPhones"]);

// Removes personal data from any Google response: reviewer and person names, review and reply text, phone numbers
// and email addresses anywhere in a string.
export function redact(v: Json): Json {
  if (Array.isArray(v)) return v.map(redact);
  if (v && typeof v === "object") {
    const out: Json = {};
    for (const [k, x] of Object.entries(v)) {
      if (PERSONAL_KEYS.has(k)) out[k] = typeof x === "string" ? "[removed]" : x && typeof x === "object" ? "[removed]" : x;
      else out[k] = redact(x);
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
