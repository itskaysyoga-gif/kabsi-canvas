// Harvey's data/register.csv (kabsi-harvey, read only) and the choice of the next day's candidates (Harvey 4A part B,
// master plan 30.39). Pure: the caller fetches the file and the pages. Companies House comes from the register itself
// (30.39 item 12): Harvey reads Companies House's free monthly Basic Company Data file (Open Government Licence) and
// writes company_status and company_status_date (the file's date); there is no Companies House API key.
import { INDUSTRY_ORDER, KIND_WORDS, nameOk, ownDomain } from "./rules.ts";

/** RFC 4180 CSV: quoted fields, doubled quotes, newlines inside quotes. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const s = String(text ?? "").replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x !== "")) rows.push(row);
  const [head, ...rest] = rows;
  if (!head) return [];
  return rest.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

export type Candidate = {
  company_id: string; business_name: string; industry: string; country: string; city: string; website: string;
  email: string; email_page_url: string; company_type: string; company_number: string;
  company_status: string; company_status_date: string;
};

/** The Basic Company Data file a UK status is read from may be at most this many days old (30.39 item 12). */
export const COMPANY_FILE_MAX_DAYS = 40;

/** A real calendar date written YYYY-MM-DD, as days since 1970, else null. */
function dayNumber(d: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const t = Date.parse(`${d}T00:00:00Z`);
  if (!Number.isFinite(t) || new Date(t).toISOString().slice(0, 10) !== d) return null;
  return t / 86_400_000;
}

/** Why Harvey's register does not show this UK company as Active on a file at most 40 days old, or null. Only the
 *  file's exact "Active" counts: "Active - Proposal to Strike off", "Dissolved", "Liquidation" and the rest do not.
 *  The check stays because PECR lets Kabsi email limited companies and LLPs without prior consent, but not sole
 *  traders or partnerships. `today` is the London date, YYYY-MM-DD. */
export function companyRefusal(r: Record<string, string>, today: string): string | null {
  const status = String(r.company_status ?? "").trim().toLowerCase();
  const file = dayNumber(String(r.company_status_date ?? "").trim());
  const now = dayNumber(today);
  if (!status || file === null || now === null) return "no_company_status";
  if (file > now) return "company_status_date_ahead";
  if (now - file > COMPANY_FILE_MAX_DAYS) return "company_status_stale";
  if (status !== "active") return "company_not_active";
  return null;
}

/** Why a register row cannot be a candidate, or null. Suppression and the page are checked later. */
export function rowRefusal(r: Record<string, string>, openCountries: readonly string[], today: string): string | null {
  if (!openCountries.includes(r.country)) return "country_closed";
  if (!KIND_WORDS[r.industry]) return "industry";
  if (!nameOk(r.business_name)) return "name";
  if (!r.city || r.city.length > 60) return "city";
  if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/.test(r.email)) return "email";
  if (!ownDomain(r.email, r.website)) return "not_own_domain";
  if (!/^https?:\/\//i.test(r.email_page_url)) return "no_source_page";
  if (r.country === "GB") {
    if (r.company_type !== "registered company") return "not_registered_company";
    if (!/^[A-Z0-9]{8}$/i.test(r.company_number)) return "no_company_number";
    // Limited partnerships (LP England and Wales, SL Scotland, NL Northern Ireland) are partnerships, not companies:
    // PECR's exemption covers limited companies and LLPs only (LLP numbers start OC, SO or NC and stay allowed).
    if (/^(LP|SL|NL)/i.test(r.company_number)) return "limited_partnership";
    const company = companyRefusal(r, today);
    if (company) return company;
  }
  return null;
}

/** Salons and barbers first, then the Founding 25 mix, then Harvey's quality score, then the register's order. */
export function ordered(rows: Record<string, string>[]): Record<string, string>[] {
  const rank = (i: string) => {
    const k = INDUSTRY_ORDER.indexOf(i);
    return k < 0 ? 99 : k;
  };
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => rank(a.r.industry) - rank(b.r.industry) || Number(b.r.quality_score || 0) - Number(a.r.quality_score || 0) || a.i - b.i)
    .map((x) => x.r);
}

export function toCandidate(r: Record<string, string>): Candidate {
  return {
    company_id: r.company_id, business_name: r.business_name.trim(), industry: r.industry, country: r.country, city: r.city.trim(),
    website: r.website, email: r.email.trim().toLowerCase(), email_page_url: r.email_page_url, company_type: r.company_type,
    company_number: r.company_number.toUpperCase(), company_status: String(r.company_status ?? "").trim().toLowerCase(),
    company_status_date: String(r.company_status_date ?? "").trim(),
  };
}
