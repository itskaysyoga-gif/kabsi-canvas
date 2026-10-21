// The website match check (P0.8-09, K-136.9): does the owner's own public website say the same as the Google profile?
// It reads the home page and at most two more pages of the same site (contact, about, hours), asks the site's robots.txt
// first, and compares four things: the name, the phone number, the address and the opening times. For each it answers match,
// mismatch (the page clearly says something else) or unknown (the page does not say). Only that answer is kept, never the
// page's text. Pure of the network: the fetch goes through safe-fetch.ts and its deps.
import { allowedByRobots, type Page, safeGet, type SafeFetchDeps, UnsafeUrl } from "./safe-fetch.ts";

export type Verdict = "match" | "mismatch" | "unknown";
export type SiteFound = { name: Verdict; phone: Verdict; address: Verdict; hours: Verdict };
export type SiteProfile = { website: string; name: string; phone: string; address: string; hours: string };
export type SiteResult =
  | { state: "checked"; pages: number; found: SiteFound }
  | { state: "blocked"; reason: string }
  | { state: "unreachable" };

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export function pageText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");
}

/** The names a page gives itself: og:site_name, the name in its LocalBusiness data, the page title's parts. */
export function declaredNames(html: string): string[] {
  const out: string[] = [];
  const og = /<meta[^>]+property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i.exec(html) ?? /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i.exec(html);
  if (og?.[1]) out.push(og[1]);
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (v: unknown) => {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object") {
          const o = v as Record<string, unknown>;
          if (typeof o.name === "string" && /business|store|restaurant|salon|shop|cafe|organization|service|dentist|clinic|hotel/i.test(String(o["@type"] ?? ""))) out.push(o.name);
          Object.values(o).forEach(walk);
        }
      };
      walk(JSON.parse(m[1]!));
    } catch { /* a page's broken data says nothing */ }
  }
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  if (title) out.push(...pageText(title).split(/\s[|\-–—:]\s|[|]/).map((s) => s.trim()).filter(Boolean));
  return out.map(norm).filter((n) => n.length >= 3);
}

export function compareName(name: string, text: string, declared: string[]): Verdict {
  const n = norm(name);
  if (!n) return "unknown";
  if (norm(text).includes(n)) return "match";
  if (declared.some((d) => d.includes(n) || n.includes(d))) return "match";
  // The page names itself and it is not this business.
  return declared.length ? "mismatch" : "unknown";
}

const digits = (s: string) => s.replace(/\D/g, "");
export function comparePhone(profilePhone: string, text: string): Verdict {
  const mine = digits(profilePhone);
  if (mine.length < 6) return "unknown";
  const tail = mine.slice(-8);
  const found = [...text.matchAll(/\+?\d[\d\s().-]{6,}\d/g)].map((m) => digits(m[0])).filter((d) => d.length >= 8 && d.length <= 15);
  if (!found.length) return "unknown";
  return found.some((d) => d.endsWith(tail)) ? "match" : "mismatch";
}

const STREET = /\b\d{1,5}\s+[A-Za-z][A-Za-z .'-]{2,40}?\s+(?:street|st|road|rd|avenue|ave|lane|ln|boulevard|blvd|drive|dr|way|court|ct|place|pl)\b/gi;
export function compareAddress(address: string, text: string): Verdict {
  const line = norm(address.split(",")[0] ?? "");
  if (!line) return "unknown";
  const plain = norm(text);
  if (plain.includes(line)) return "match";
  const streets = [...text.matchAll(STREET)].map((m) => norm(m[0]));
  return streets.length && !streets.some((s) => s.includes(line) || line.includes(s)) ? "mismatch" : "unknown";
}

/** Times as 24 hour "HH:MM" from "9am", "9:30 pm", "17:00". */
export function timesIn(s: string): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi)) {
    let h = Number(m[1]) % 12;
    if (m[3]!.toLowerCase() === "pm") h += 12;
    if (Number(m[1]) <= 12) out.push(`${String(h).padStart(2, "0")}:${m[2] ?? "00"}`);
  }
  for (const m of s.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b(?!\s*(?:am|pm))/gi)) out.push(`${m[1]!.padStart(2, "0")}:${m[2]}`);
  return [...new Set(out)];
}
export function compareHours(hours: string, text: string): Verdict {
  const mine = new Set(timesIn(hours));
  const theirs = timesIn(text);
  if (!mine.size || theirs.length < 2) return "unknown";
  return theirs.some((t) => mine.has(t)) ? "match" : "mismatch";
}

/** Combine what several pages say about one thing: any match is a match; a mismatch only when nothing matched. */
const combine = (v: Verdict[]): Verdict => (v.includes("match") ? "match" : v.includes("mismatch") ? "mismatch" : "unknown");

const LINK = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
export function moreLinks(html: string, home: URL): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(LINK)) {
    try {
      const u = new URL(m[1]!, home);
      const hint = `${u.pathname} ${pageText(m[2]!)}`;
      if (/contact|about|hours|location|visit|find-us/i.test(hint) && u.origin === home.origin && u.pathname !== home.pathname && !out.includes(u.toString())) out.push(u.toString());
    } catch { /* not a link */ }
  }
  return out.slice(0, 2);
}

export async function checkWebsite(p: SiteProfile, deps: SafeFetchDeps): Promise<SiteResult> {
  let home: URL;
  try {
    home = new URL(p.website);
  } catch {
    return { state: "blocked", reason: "not_a_link" };
  }
  try {
    // robots.txt first: a site that asks not to be read is not read.
    let robots = "";
    try {
      const r = await safeGet(new URL("/robots.txt", home).toString(), home, deps, "text");
      if (r.status === 200) robots = r.text;
    } catch (e) {
      if (e instanceof UnsafeUrl && e.reason !== "not_text") throw e;
    }
    const allowed = (u: string) => allowedByRobots(robots, new URL(u).pathname + new URL(u).search);
    if (!allowed(home.toString())) return { state: "blocked", reason: "robots" };
    const first = await safeGet(home.toString(), home, deps);
    if (first.status < 200 || first.status >= 300) return { state: "unreachable" };
    const pages: Page[] = [first];
    for (const link of moreLinks(first.text, new URL(first.url)).filter(allowed)) {
      try {
        const next = await safeGet(link, home, deps);
        if (next.status >= 200 && next.status < 300) pages.push(next);
      } catch (e) {
        if (e instanceof UnsafeUrl && e.reason !== "not_a_page" && e.reason !== "too_big") throw e;
      }
    }
    const texts = pages.map((pg) => ({ text: pageText(pg.text), declared: declaredNames(pg.text) }));
    const all = texts.map((t) => t.text).join(" ");
    return {
      state: "checked", pages: pages.length,
      found: {
        name: combine(texts.map((t) => compareName(p.name, t.text, t.declared))),
        phone: comparePhone(p.phone, all),
        address: compareAddress(p.address, all),
        hours: compareHours(p.hours, all),
      },
    };
  } catch (e) {
    if (e instanceof UnsafeUrl) return { state: "blocked", reason: e.reason };
    return { state: "unreachable" };
  }
}
