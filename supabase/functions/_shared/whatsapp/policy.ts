// The sending rules of the one sender (master plan 9.4, 9.5, 18.2). Pure: given what the database says about a phone,
// when may a business-started message go, and how. Replies to a message the person just sent are not business-started:
// they go at once, inside the 24-hour window that message opened, and do not count against the cap.
//   - At most 6 business-started messages per phone per local day; more wait for the next morning's digest.
//   - Events within 15 minutes of the last one are batched: they wait until 15 minutes after it, then go together.
//   - Quiet hours 21:00 to 08:00 in the phone's time zone; urgent messages (identity-field changes, Google needs action)
//     go at once, day or night, and are never capped.
//   - When the number's quality drops to Medium or worse, only digests go (one a day at 08:00), urgent ones still at once.
//   - WhatsApp charges for service conversations after 1,000 a month per number, so batching into digests is the default
//     shape wherever more than one thing is waiting.
//   - Inside the window: a normal message with buttons. Outside it: only an approved utility template; without one the
//     message is held until the person writes (which opens the window).
//   - Until launch only Kabsi's own test phones and the staff phone get a live message; everyone else gets the mock.

export const DAILY_CAP = 6;
export const BATCH_MINUTES = 15;
export const QUIET_FROM = 21;
export const QUIET_TO = 8;

export type SendState = {
  time_zone: string;
  sent_today: number;
  last_sent_at: string | null;
  window_expires_at: string | null;
  stopped: boolean;
  live_ok: boolean;
  digest_only: boolean;
};

export type Decision = { at: "now" } | { at: "later"; due: Date; why: "quiet" | "cap" | "batch" | "digest_only" } | { at: "never"; why: "stopped" };

/** The local hour (0 to 23) and the UTC instant of the next 08:00 in a time zone. */
export function localHour(now: Date, tz: string): number {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: safeTz(tz), hour: "2-digit", hourCycle: "h23" }).format(now));
  return Number.isFinite(h) ? h % 24 : now.getUTCHours();
}
export function next0800(now: Date, tz: string): Date {
  // Walk forward in 15-minute steps to the first local 08:00 after now (at most 24 hours; handles DST without a library).
  const start = new Date(Math.ceil(now.getTime() / 900_000) * 900_000);
  for (let t = start.getTime(); t <= now.getTime() + 25 * 3600_000; t += 900_000) {
    const d = new Date(t);
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: safeTz(tz), hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
    if (parts === "08:00" && t > now.getTime()) return d;
  }
  return new Date(now.getTime() + 24 * 3600_000);
}
function safeTz(tz: string): string {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

export const inQuietHours = (now: Date, tz: string) => {
  const h = localHour(now, tz);
  return h >= QUIET_FROM || h < QUIET_TO;
};

export const inWindow = (s: Pick<SendState, "window_expires_at">, now: Date) =>
  !!s.window_expires_at && new Date(s.window_expires_at).getTime() > now.getTime();

/** When a business-started message may go. */
export function decide(s: SendState, now: Date, urgent: boolean): Decision {
  if (s.stopped) return { at: "never", why: "stopped" };
  if (urgent) return { at: "now" };
  if (inQuietHours(now, s.time_zone)) return { at: "later", due: next0800(now, s.time_zone), why: "quiet" };
  if (s.digest_only) return { at: "later", due: next0800(now, s.time_zone), why: "digest_only" };
  if (s.sent_today >= DAILY_CAP) return { at: "later", due: next0800(now, s.time_zone), why: "cap" };
  if (s.last_sent_at) {
    const until = new Date(new Date(s.last_sent_at).getTime() + BATCH_MINUTES * 60_000);
    if (until.getTime() > now.getTime()) return { at: "later", due: until, why: "batch" };
  }
  return { at: "now" };
}

export type DigestItem = { id: number; kind: string; body: string; business: string | null };

/** Several waiting messages for one phone become one: a numbered list of first lines, each opened by its number. */
export function digestBody(items: DigestItem[]): string {
  const lines = items.slice(0, 9).map((it, i) => `${i + 1}. ${firstLine(it.body)}`);
  const more = items.length > 9 ? `\n\nAnd ${items.length - 9} more in Kabsi.` : "";
  return `Kabsi has ${items.length} updates for you:\n\n${lines.join("\n")}${more}\n\nReply with a number to see one.`;
}
const firstLine = (body: string) => {
  const l = body.split("\n").find((x) => x.trim()) ?? body;
  return l.length > 120 ? `${l.slice(0, 117).trimEnd()}...` : l;
};
