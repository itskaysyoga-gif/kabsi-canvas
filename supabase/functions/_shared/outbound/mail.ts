// Reading the Zoho inbox (Harvey 4A part E): a read-only IMAP client over TLS on port 993 (EXAMINE, so nothing is marked
// read; BODY.PEEK, so no flag changes) and a small MIME parser for the parts Outbound needs. The app password comes from
// Supabase secrets (ZOHO_SMTP_PASSWORD, the same app password) and is never logged.

import { withoutBlocks } from "./rules.ts";

// ─── MIME
export type Parsed = {
  headers: Record<string, string>; from: string; subject: string; messageId: string; inReplyTo: string; references: string;
  contentType: string; text: string; raw: string;
};

function decodeWords(v: string): string {
  return v.replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi, (_m, cs: string, enc: string, data: string) => {
    try {
      const bytes = enc.toLowerCase() === "b"
        ? Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
        : qpBytes(data.replace(/_/g, " "));
      return new TextDecoder(/utf-?8/i.test(cs) ? "utf-8" : "latin1").decode(bytes);
    } catch {
      return data;
    }
  });
}

function qpBytes(s: string): Uint8Array {
  const out: number[] = [];
  const t = s.replace(/=\r?\n/g, "");
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "=" && /^[0-9a-f]{2}$/i.test(t.slice(i + 1, i + 3))) {
      out.push(parseInt(t.slice(i + 1, i + 3), 16));
      i += 2;
    } else out.push(t.charCodeAt(i) & 0xff);
  }
  return new Uint8Array(out);
}

export function headersOf(block: string): Record<string, string> {
  const h: Record<string, string> = {};
  for (const line of block.replace(/\r\n/g, "\n").replace(/\n[ \t]+/g, " ").split("\n")) {
    const i = line.indexOf(":");
    if (i <= 0) continue;
    const k = line.slice(0, i).trim().toLowerCase();
    const v = decodeWords(line.slice(i + 1).trim());
    h[k] = h[k] ? `${h[k]} ${v}` : v;
  }
  return h;
}

function split(raw: string): [string, string] {
  const t = raw.replace(/\r\n/g, "\n");
  const i = t.indexOf("\n\n");
  return i < 0 ? [t, ""] : [t.slice(0, i), t.slice(i + 2)];
}

function decodeBody(body: string, h: Record<string, string>): string {
  const enc = (h["content-transfer-encoding"] ?? "").toLowerCase();
  const cs = /charset="?([^";\s]+)/i.exec(h["content-type"] ?? "")?.[1] ?? "utf-8";
  const dec = new TextDecoder(/utf-?8|us-ascii/i.test(cs) ? "utf-8" : "latin1");
  try {
    if (enc === "base64") return dec.decode(Uint8Array.from(atob(body.replace(/\s+/g, "")), (c) => c.charCodeAt(0)));
    if (enc === "quoted-printable") return dec.decode(qpBytes(body));
  } catch { /* fall through */ }
  return body;
}

/** The first text/plain part (else text/html as text), searched through nested multiparts. */
function plainText(raw: string, depth = 0): string {
  const [head, body] = split(raw);
  const h = headersOf(head);
  const type = (h["content-type"] ?? "text/plain").toLowerCase();
  if (type.startsWith("multipart/") && depth < 5) {
    const b = /boundary="?([^";]+)"?/i.exec(h["content-type"] ?? "")?.[1];
    if (!b) return "";
    const parts = body.split(`--${b}`).slice(1).filter((p) => !p.startsWith("--"));
    const texts = parts.map((p) => ({ p: p.replace(/^\r?\n/, ""), t: (headersOf(split(p.replace(/^\r?\n/, ""))[0])["content-type"] ?? "text/plain").toLowerCase() }));
    const plain = texts.find((x) => x.t.startsWith("text/plain")) ?? texts.find((x) => x.t.startsWith("multipart/"));
    if (plain) return plainText(plain.p, depth + 1);
    const html = texts.find((x) => x.t.startsWith("text/html"));
    return html ? plainText(html.p, depth + 1) : "";
  }
  const text = decodeBody(body, h);
  return type.startsWith("text/html")
    ? withoutBlocks(text).replace(/<br\s*\/?>|<\/(p|div)>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/[ \t]+/g, " ")
    : text;
}

export function parseMessage(raw: string): Parsed {
  const [head] = split(raw);
  const h = headersOf(head);
  const addr = /<([^<>\s]+@[^<>\s]+)>/.exec(h["from"] ?? "")?.[1] ?? (h["from"] ?? "").trim();
  return {
    headers: h, from: addr.toLowerCase(), subject: h["subject"] ?? "", messageId: (h["message-id"] ?? "").trim(),
    inReplyTo: h["in-reply-to"] ?? "", references: h["references"] ?? "", contentType: h["content-type"] ?? "",
    text: plainText(raw).replace(/\r\n/g, "\n"), raw,
  };
}

/** Our Message-IDs referenced anywhere in a message (headers for a reply, the returned headers inside a bounce). */
export function ourIds(text: string): string[] {
  return [...new Set([...String(text ?? "").matchAll(/<ob\.[0-9a-f-]{36}@getkabsi\.com>/gi)].map((m) => m[0].toLowerCase()))];
}

// ─── IMAP
export type ByteIo = { read(): Promise<Uint8Array | null>; write(text: string): Promise<void>; close(): void };

export function byteIo(conn: Deno.Conn): ByteIo {
  return {
    async read() {
      const b = new Uint8Array(16384);
      const n = await conn.read(b);
      return n === null ? null : b.subarray(0, n);
    },
    async write(text: string) {
      const d = new TextEncoder().encode(text);
      let at = 0;
      while (at < d.length) at += await conn.write(d.subarray(at));
    },
    close() {
      try { conn.close(); } catch { /* closed */ }
    },
  };
}

const MAX_MESSAGE = 300_000;

export class Imap {
  private buf = new Uint8Array(0);
  private n = 0;
  private io: ByteIo;
  constructor(io: ByteIo) {
    this.io = io;
  }

  private async fill(): Promise<boolean> {
    const c = await this.io.read();
    if (!c) return false;
    const next = new Uint8Array(this.buf.length + c.length);
    next.set(this.buf);
    next.set(c, this.buf.length);
    this.buf = next;
    if (this.buf.length > 5_000_000) throw new Error("imap: response too large");
    return true;
  }
  private async line(): Promise<string> {
    for (;;) {
      const i = this.buf.findIndex((b, k) => b === 13 && this.buf[k + 1] === 10);
      if (i >= 0) {
        const l = new TextDecoder("latin1").decode(this.buf.subarray(0, i));
        this.buf = this.buf.subarray(i + 2);
        return l;
      }
      if (!(await this.fill())) throw new Error("imap: connection closed");
    }
  }
  private async bytes(count: number): Promise<Uint8Array> {
    while (this.buf.length < count) if (!(await this.fill())) throw new Error("imap: connection closed");
    const out = this.buf.subarray(0, count);
    this.buf = this.buf.subarray(count);
    return out;
  }

  /** Send a command; return the untagged lines (with any literal joined in) and refuse a NO or BAD. */
  async cmd(text: string, quiet = text): Promise<{ lines: string[]; literals: Uint8Array[] }> {
    const tag = `a${++this.n}`;
    await this.io.write(`${tag} ${text}\r\n`);
    const lines: string[] = [];
    const literals: Uint8Array[] = [];
    for (;;) {
      let l = await this.line();
      const lit = /\{(\d+)\}$/.exec(l);
      if (lit) {
        literals.push(await this.bytes(Number(lit[1])));
        l += await this.line();
      }
      if (l.startsWith(`${tag} `)) {
        if (!/^\S+ OK/i.test(l)) throw new Error(`imap: ${quiet.split(" ")[0]} refused`);
        return { lines, literals };
      }
      lines.push(l);
    }
  }

  async greet() {
    const l = await this.line();
    if (!/^\* (OK|PREAUTH)/i.test(l)) throw new Error("imap: no greeting");
  }
  close() {
    this.io.close();
  }
}

const quote = (s: string) => `"${s.replace(/["\\]/g, (c) => `\\${c}`)}"`;

/** New messages since the last UID seen (or the last 2 days on the first run), read only, at most 30 a call. */
export async function fetchNew(io: ByteIo, o: { user: string; password: string; lastUid: number | null; validity: string | null; since: Date }) {
  const c = new Imap(io);
  try {
    await c.greet();
    await c.cmd(`LOGIN ${quote(o.user)} ${quote(o.password)}`, "LOGIN");
    const sel = await c.cmd("EXAMINE INBOX");
    const validity = sel.lines.map((l) => /UIDVALIDITY (\d+)/i.exec(l)?.[1]).find(Boolean) ?? null;
    const fresh = !o.lastUid || validity !== o.validity;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const since = `${o.since.getUTCDate()}-${months[o.since.getUTCMonth()]}-${o.since.getUTCFullYear()}`;
    const search = await c.cmd(fresh ? `UID SEARCH SINCE ${since}` : `UID SEARCH UID ${o.lastUid! + 1}:*`);
    const uids = search.lines.flatMap((l) => (/^\* SEARCH/i.test(l) ? l.slice(8).trim().split(/\s+/).map(Number) : []))
      .filter((u) => Number.isFinite(u) && u > 0 && (fresh || u > o.lastUid!)).sort((a, b) => a - b).slice(0, 30);
    const messages: { uid: number; raw: string }[] = [];
    for (const uid of uids) {
      const f = await c.cmd(`UID FETCH ${uid} (BODY.PEEK[]<0.${MAX_MESSAGE}>)`);
      const lit = f.literals[0];
      if (lit) messages.push({ uid, raw: new TextDecoder("utf-8", { fatal: false }).decode(lit) });
    }
    await c.cmd("LOGOUT").catch(() => undefined);
    return { validity, messages, lastUid: uids.length ? uids[uids.length - 1] : (fresh ? 0 : o.lastUid) };
  } finally {
    c.close();
  }
}

export async function zohoImap(host = Deno.env.get("OUTBOUND_IMAP_HOST") ?? "imap.zoho.com"): Promise<ByteIo> {
  return byteIo(await Deno.connectTls({ hostname: host, port: 993 }));
}
