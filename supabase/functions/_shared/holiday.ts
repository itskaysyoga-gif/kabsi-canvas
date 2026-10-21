// The holiday hours concierge, the sending half (P0.5-03, K-131). The detector in the database (private.detect_holidays)
// opens a question five days before a holiday; this makes the email for each one that has not gone out: a link that
// belongs to that question only, valid until the holiday is over, and the three answers as links to the confirm page.
// The raw link exists only in the email; the database keeps its hash. Pure of the database and the network: the deps
// are passed in, so a Deno test drives it without credentials. WhatsApp (P0.8-03) will send the same question with
// quick replies; until that card has merged the email is the path.
import * as copy from "./email/copy.ts";

export type HolidayAsk = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  kind: string;
  estimated: boolean;
  business: string;
};

export type HolidayAskDeps = {
  /** public.holiday_prompts_to_send */
  toSend(locationId: string): Promise<HolidayAsk[]>;
  /** public.mark_holiday_prompt_sent: stores the hash and the last day, and that the email went out. */
  markSent(promptId: string, tokenHash: string, expires: Date): Promise<void>;
  notify(input: {
    category: "approval_needed";
    kind: "holiday_hours";
    key: string;
    locationId: string;
    to: "owners";
    inApp: { title: string; link: string };
    content: ReturnType<typeof copy.holidayHoursAsk>;
  }): Promise<unknown>;
  sha256(text: string): Promise<string>;
  random(): Uint8Array;
  now(): Date;
  appUrl: string;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const parts = (d: string) => d.split("-").map(Number) as [number, number, number];
const longDay = (d: string) => {
  const [y, m, day] = parts(d);
  return `${DAYS[new Date(Date.UTC(y, m - 1, day)).getUTCDay()]} ${day} ${MONTHS[m - 1]}`;
};
const shortDay = (d: string) => `${parts(d)[2]} ${MONTHS[parts(d)[1] - 1]}`;

/** "Friday 25 December", or "8 February to 8 March" for a run of days. */
export function whenWords(startsOn: string, endsOn: string): string {
  return startsOn === endsOn ? longDay(startsOn) : `${shortDay(startsOn)} to ${shortDay(endsOn)}`;
}

/** 32 random bytes as URL-safe text, like the review links (D103). */
export function newToken(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The link works until the end of the day after the holiday, and never longer than a week from now. */
export function linkExpiry(endsOn: string, now: Date): Date {
  const [y, m, d] = parts(endsOn);
  const day = new Date(Date.UTC(y, m - 1, d + 2));
  const week = new Date(now.getTime() + 7 * 86_400_000);
  return day < week ? day : week;
}

export async function sendHolidayAsks(locationId: string, deps: HolidayAskDeps): Promise<number> {
  let sent = 0;
  for (const ask of await deps.toSend(locationId)) {
    const token = newToken(deps.random());
    const hash = await deps.sha256(token);
    await deps.markSent(ask.id, hash, linkExpiry(ask.ends_on, deps.now()));
    const page = `${deps.appUrl}/h/${token}`;
    const content = copy.holidayHoursAsk({
      business: ask.business, holiday: ask.name, when: whenWords(ask.starts_on, ask.ends_on), estimated: ask.estimated, ramadan: ask.kind === "ramadan",
      links: { choose: page, normal: `${page}?a=normal`, closed: `${page}?a=closed`, custom: `${page}?a=custom` },
    }, deps.appUrl);
    await deps.notify({
      category: "approval_needed", kind: "holiday_hours", key: `holiday:${ask.id}:${hash.slice(0, 8)}`, locationId, to: "owners",
      inApp: { title: `Your hours for ${ask.name}`, link: "/app/hours" }, content,
    });
    sent++;
  }
  return sent;
}
