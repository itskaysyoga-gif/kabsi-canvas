// Harvey's data/register.csv (kabsi-harvey, read only) and the choice of the next day's candidates (Harvey 4A part B,
// master plan 30.39). Pure: the caller fetches the file, checks Companies House and the pages.
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
};

/** Why a register row cannot be a candidate, or null. Companies House, suppression and the page are checked later. */
export function rowRefusal(r: Record<string, string>, openCountries: readonly string[]): string | null {
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
    company_number: r.company_number.toUpperCase(),
  };
}
