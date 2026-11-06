// A small SMTP client for Zoho over implicit TLS on port 465 (Harvey 4A part D, master plan 30.39 item 3), and the plain
// text message it sends. No library: EHLO, AUTH PLAIN, MAIL FROM, RCPT TO, DATA, QUIT. The password is a Zoho app
// password from Supabase secrets (ZOHO_SMTP_PASSWORD); it is never logged or returned in an error.

export type Line = { readLine(): Promise<string | null>; write(text: string): Promise<void>; close(): void };

/** A line reader and writer over any Deno connection. */
export function lines(conn: Deno.Conn): Line {
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  let buf = "";
  return {
    async readLine() {
      while (!buf.includes("\r\n")) {
        const chunk = new Uint8Array(4096);
        const n = await conn.read(chunk);
        if (n === null) {
          const rest = buf;
          buf = "";
          return rest || null;
        }
        buf += dec.decode(chunk.subarray(0, n));
        if (buf.length > 100_000) throw new Error("smtp: line too long");
      }
      const i = buf.indexOf("\r\n");
      const out = buf.slice(0, i);
      buf = buf.slice(i + 2);
      return out;
    },
    async write(text: string) {
      const data = enc.encode(text);
      let at = 0;
      while (at < data.length) at += await conn.write(data.subarray(at));
    },
    close() {
      try { conn.close(); } catch { /* already closed */ }
    },
  };
}

/** One reply: the code and the text of all its lines ("250-..." continues, "250 ..." ends). */
const READ_TIMEOUT_MS = 30_000;

/** A line, or an error after 30 seconds: a silent server never holds the function until the runtime kills it. */
async function readLine(io: Line): Promise<string | null> {
  let t: number | undefined;
  try {
    return await Promise.race([
      io.readLine(),
      new Promise<never>((_r, reject) => { t = setTimeout(() => reject(new SmtpError("timeout", 0)), READ_TIMEOUT_MS); }),
    ]);
  } finally {
    clearTimeout(t);
  }
}

async function reply(io: Line): Promise<{ code: number; text: string }> {
  const parts: string[] = [];
  for (;;) {
    const l = await readLine(io);
    if (l === null) throw new Error("smtp: connection closed");
    parts.push(l.slice(4));
    if (!/^\d{3}-/.test(l)) return { code: Number(l.slice(0, 3)), text: parts.join(" ") };
  }
}

export class SmtpError extends Error {
  step: string;
  code: number;
  constructor(step: string, code: number) {
    super(`smtp ${step} refused (${code})`);
    this.step = step;
    this.code = code;
  }
}

async function expect(io: Line, step: string, ok: (c: number) => boolean) {
  const r = await reply(io);
  if (!ok(r.code)) throw new SmtpError(step, r.code);
  return r;
}

/** Dot-stuffing and CRLF line ends for DATA. */
export function dataBlock(message: string): string {
  return message.replace(/\r?\n/g, "\r\n").split("\r\n").map((l) => (l.startsWith(".") ? `.${l}` : l)).join("\r\n") + "\r\n.\r\n";
}

/** Sends one message. `onAccepted` runs as soon as the server accepts the message (250 after DATA), before QUIT, so the
 *  message is recorded as sent even if the goodbye never comes. */
export async function smtpSend(io: Line, o: {
  user: string; password: string; from: string; to: string; message: string; helo?: string; onAccepted?: () => Promise<void>;
}) {
  try {
    await expect(io, "greeting", (c) => c === 220);
    await io.write(`EHLO ${o.helo ?? "getkabsi.com"}\r\n`);
    await expect(io, "ehlo", (c) => c === 250);
    await io.write(`AUTH PLAIN ${btoa(`\u0000${o.user}\u0000${o.password}`)}\r\n`);
    await expect(io, "auth", (c) => c === 235);
    await io.write(`MAIL FROM:<${o.from}>\r\n`);
    await expect(io, "mail", (c) => c === 250);
    await io.write(`RCPT TO:<${o.to}>\r\n`);
    await expect(io, "rcpt", (c) => c === 250 || c === 251);
    await io.write("DATA\r\n");
    await expect(io, "data", (c) => c === 354);
    await io.write(dataBlock(o.message));
    await expect(io, "message", (c) => c === 250);
    await o.onAccepted?.();
    await io.write("QUIT\r\n").catch(() => undefined);
    await reply(io).catch(() => undefined);
  } finally {
    io.close();
  }
}

/** Implicit TLS on 465 (Supabase refuses outbound 25 and 587). */
export async function zohoConnect(host = Deno.env.get("OUTBOUND_SMTP_HOST") ?? "smtp.zoho.com"): Promise<Line> {
  return lines(await Deno.connectTls({ hostname: host, port: 465 }));
}

// ─── the message
/** RFC 2047 for a header that is not plain ASCII. */
export function headerWord(raw: string): string {
  const text = String(raw ?? "").replace(/[\r\n]+/g, " ");
  if (/^[\x20-\x7e]*$/.test(text)) return text;
  const b = btoa(String.fromCharCode(...new TextEncoder().encode(text)));
  return `=?UTF-8?B?${b}?=`;
}

/** Quoted-printable, UTF-8, lines of at most 76 characters (RFC 2045). */
export function quotedPrintable(text: string): string {
  const out: string[] = [];
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    let enc = "";
    for (const byte of new TextEncoder().encode(line)) {
      const c = String.fromCharCode(byte);
      enc += (byte >= 33 && byte <= 126 && c !== "=") || byte === 32 ? c : `=${byte.toString(16).toUpperCase().padStart(2, "0")}`;
    }
    enc = enc.replace(/ $/, "=20");
    let rest = enc;
    while (rest.length > 76) {
      let cut = 75;
      while (/=[0-9A-F]?$/.test(rest.slice(0, cut))) cut--;
      out.push(`${rest.slice(0, cut)}=`);
      rest = rest.slice(cut);
    }
    out.push(rest);
  }
  return out.join("\r\n");
}

/** Message-IDs only, as <token> each; anything else in the value is dropped (no line breaks, no other header). */
export function idList(v: string | null | undefined): string[] {
  return [...String(v ?? "").matchAll(/<[^<>\s@]{1,200}@[^<>\s@]{1,100}>/g)].map((m) => m[0]);
}

export function newMessageId(): string {
  return `<ob.${crypto.randomUUID()}@getkabsi.com>`;
}

/** Plain text only: no HTML part, no image, no tracking; a mailto List-Unsubscribe with the subject "no thanks". */
export function buildMessage(m: {
  from: { name: string; address: string }; to: string; subject: string; body: string; messageId: string; date: Date;
  inReplyTo?: string | null; references?: string | null;
}): string {
  const h = [
    `From: ${m.from.name} <${m.from.address}>`,
    `To: <${m.to}>`,
    `Subject: ${headerWord(m.subject)}`,
    `Date: ${m.date.toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: ${m.messageId}`,
    ...(idList(m.inReplyTo).slice(-1).map((x) => `In-Reply-To: ${x}`)),
    ...(idList(m.references).length ? [`References: ${idList(m.references).slice(-10).join(" ")}`] : []),
    `List-Unsubscribe: <mailto:${m.from.address}?subject=no%20thanks>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: quoted-printable",
  ];
  if (h.some((x) => /[\r\n]/.test(x))) throw new Error("smtp: a header held a line break");
  return `${h.join("\r\n")}\r\n\r\n${quotedPrintable(m.body)}\r\n`;
}
