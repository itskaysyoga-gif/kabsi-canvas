// Outbound's deliverability gate (OUTBOUND-3, master plan 30.39 item 8): the send path refuses to run until SPF, DKIM
// (selector zmail, a 2048-bit key) and DMARC for getkabsi.com read correctly. Read over DNS over HTTPS (Cloudflare, then
// Google), so it works inside the Edge runtime. Pure parsing below; the network is one injectable fetcher.

export const MAIL_DOMAIN = "getkabsi.com";
export const DKIM_SELECTOR = "zmail";
export const DKIM_MIN_BITS = 2048;

export type DnsResult = { ok: boolean; spf: boolean; dkim: boolean; dmarc: boolean; dkim_bits: number | null; problem: string | null };
export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/** One TXT record's text: its quoted strings joined (a long DKIM key comes split in two or more). */
export function txtText(data: string): string {
  const parts = [...String(data ?? "").matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\\(.)/g, "$1"));
  return parts.length ? parts.join("") : String(data ?? "");
}

/** The tags of a DKIM or DMARC record (k=v; k=v), keys lower-cased. */
export function tags(record: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of record.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
  }
  return out;
}

/** SPF: exactly one v=spf1 record, Zoho included, ending in ~all or -all. */
export function spfOk(records: string[]): boolean {
  const spf = records.filter((r) => /^v=spf1(\s|$)/i.test(r.trim()));
  if (spf.length !== 1) return false;
  const r = spf[0].toLowerCase();
  return /\binclude:(zoho|zohomail)\.(com|eu|in|com\.au|jp|com\.cn|sa|ca)\b/.test(r) && /\s[-~]all\s*$/.test(r);
}

/** DMARC: exactly one v=DMARC1 record with a policy of none, quarantine or reject. */
export function dmarcOk(records: string[]): boolean {
  const d = records.filter((r) => /^v=DMARC1\s*(;|$)/i.test(r.trim()));
  if (d.length !== 1) return false;
  return /^(none|quarantine|reject)$/i.test(tags(d[0]).p ?? "");
}

/** DKIM: one v=DKIM1 record, RSA, whose public key has at least 2048 bits. Returns the key's bits, or null. */
export async function dkimBits(records: string[]): Promise<number | null> {
  const d = records.filter((r) => /(^|;)\s*v=DKIM1\s*(;|$)/i.test(r) || /(^|;)\s*p=/i.test(r));
  if (d.length !== 1) return null;
  const t = tags(d[0]);
  if (t.v && t.v.toUpperCase() !== "DKIM1") return null;
  if (t.k && t.k.toLowerCase() !== "rsa") return null;
  const p = String(t.p ?? "").replace(/\s+/g, "");
  if (!p || !/^[A-Za-z0-9+/]+={0,2}$/.test(p)) return null;
  try {
    const der = Uint8Array.from(atob(p), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("spki", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, true, ["verify"]);
    return (key.algorithm as RsaHashedKeyAlgorithm).modulusLength ?? null;
  } catch {
    return null;
  }
}

const RESOLVERS = ["https://cloudflare-dns.com/dns-query", "https://dns.google/resolve"];

/** The TXT records of a name, or null when no resolver answered. */
export async function txt(name: string, fetcher: Fetcher = fetch): Promise<string[] | null> {
  for (const base of RESOLVERS) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8_000);
    try {
      const res = await fetcher(`${base}?name=${encodeURIComponent(name)}&type=TXT`, { headers: { accept: "application/dns-json" }, signal: ctl.signal });
      if (!res.ok) continue;
      const j = await res.json() as { Status?: number; Answer?: { type: number; data: string }[] };
      if (j.Status !== 0 && j.Status !== 3) continue;
      return (j.Answer ?? []).filter((a) => a.type === 16).map((a) => txtText(a.data));
    } catch {
      continue;
    } finally {
      clearTimeout(t);
    }
  }
  return null;
}

export async function checkDns(fetcher: Fetcher = fetch): Promise<DnsResult> {
  const [root, dkim, dmarc] = await Promise.all([
    txt(MAIL_DOMAIN, fetcher), txt(`${DKIM_SELECTOR}._domainkey.${MAIL_DOMAIN}`, fetcher), txt(`_dmarc.${MAIL_DOMAIN}`, fetcher),
  ]);
  if (!root || !dkim || !dmarc) return { ok: false, spf: false, dkim: false, dmarc: false, dkim_bits: null, problem: "dns_unreadable" };
  const bits = await dkimBits(dkim);
  const r = { spf: spfOk(root), dkim: bits !== null && bits >= DKIM_MIN_BITS, dmarc: dmarcOk(dmarc), dkim_bits: bits };
  const problem = !r.spf ? "spf" : !r.dkim ? (bits === null ? "dkim_missing" : "dkim_too_short") : !r.dmarc ? "dmarc" : null;
  return { ok: !problem, ...r, problem };
}
