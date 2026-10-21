// The notification engine (K-46 as amended by K-57, P0.4-09). Every email Kabsi sends and every in-app notice goes
// through notify(): one outbox with dedupe and a delivery log. No channel bypasses it, and none bypasses approvals,
// because a notification only tells someone; the approval itself still happens through the one publication pipeline.
//
// For each recipient the engine
//   1. reads their preferences for the category (email: default, instant, daily digest, off; in the app: on, off),
//   2. records the event once (the notifications table; a second call with the same key and address does nothing),
//   3. shows it in the bell when the category and the person allow it,
//   4. decides the email (notify-rules.ts): send now, hold until 08:00 local after quiet hours, put in the daily
//      digest, or do not email, and
//   5. sends it through the outbox (the emails table, then Resend) or keeps it until it is due.
// releaseDue() sends what is held or digested once its time comes (the notify_due job).
//
// This file has no database or network import: api and the job wire it to the database in notify.ts, and the tests
// wire it to fakes.
import { type CategoryId, categoryOf, type Frequency, isStaffCategory, SYSTEM_CATEGORIES, SYSTEM_WHY, type SystemCategory } from "./notify-categories.ts";
import { decideEmail, digestSubject, type DigestItem, groupDigest, localParts } from "./notify-rules.ts";
import { type EmailContent, renderEmail } from "./email/template.ts";
import { emailLink, esc } from "./email-layout.ts";

export type Recipient = { email: string; userId: string | null; role?: string };

export type NotifyInput = {
  category: CategoryId | (typeof SYSTEM_CATEGORIES)[number];
  /** Names the event, once. The same key to the same address is recorded, shown and sent once. */
  key: string;
  /** The emails.kind this is logged under (staff job health groups by it). */
  kind: string;
  locationId?: string | null;
  /** Who: the owners (and the alert addresses), the owners and managers, or exact addresses. */
  to: "owners" | "members" | Recipient[];
  /** The bell and the digest line. Never review text or a reviewer's name. */
  inApp?: { title: string; body?: string; link?: string };
  /** What the email says. A function is called once per person who will really get it, with how it will be delivered:
   *  "digest" means only the item's digest fragment is used, so the builder can skip the rest (and its links). */
  content: EmailContent | ((r: Recipient, mode: Mode) => EmailContent | Promise<EmailContent>);
  replyTo?: string;
};

export type NotifyResult = {
  recipients: number; sent: number; held: number; digest: number; off: number; skipped: number; duplicate: number; failed: number; inApp: number;
};

export type Mode = "send" | "hold" | "digest";
export type EmailState = "none" | "sending" | "sent" | "held" | "digest" | "off" | "skipped" | "failed";

export type NewRow = {
  location_id: string | null; user_id: string | null; to_address: string; category: string; kind: string; dedupe_key: string;
  title: string; body: string | null; link: string | null; in_app: boolean; email_state: EmailState; email_due_at: string | null;
  email_content: EmailContent | null;
};

export type StoredItem = {
  id: string; location_id: string; user_id: string | null; to_address: string; category: string; kind: string; dedupe_key: string;
  title: string; link: string | null; email_state: "held" | "digest"; email_due_at: string; email_content: EmailContent;
};

export type Outgoing = {
  kind: string; category: string; to: string; subject: string; html: string; text: string; dedupeKey: string;
  locationId: string | null; replyTo?: string; notificationId?: string | null;
  /** Mail the owner can switch off carries the one-click unsubscribe address in its List-Unsubscribe headers. */
  unsubscribeUrl?: string | null;
};
export type Delivery = { sent: string } | { skipped: string };

export type Business = { name: string; tz: string; digestHour: number; pausedUntil: string | null };

export type Deps = {
  now(): Date;
  appUrl: string;
  recipients(locationId: string, to: "owners" | "members"): Promise<Recipient[]>;
  business(locationId: string): Promise<Business | null>;
  /** The person's stored choices at this business, keyed `${category}:${channel}`. */
  prefs(userId: string, locationId: string): Promise<Map<string, Frequency>>;
  /** The owner-approved opening hours text, or null. */
  hours(locationId: string): Promise<string | null>;
  /** Records the event. fresh is false when this key and address were recorded before; state is then the earlier state. */
  insert(row: NewRow): Promise<{ id: string; fresh: boolean; state: EmailState }>;
  update(id: string, patch: { email_state?: EmailState; email_id?: string | null; email_content?: EmailContent | null; email_due_at?: string | null }): Promise<void>;
  deliver(o: Outgoing): Promise<Delivery>;
  /** One suppression list (bounces, complaints, unsubscribes): an address on it is never sent to (K-118). */
  suppressed(address: string, category: string): Promise<boolean>;
  /** The signed unsubscribe links for this person and category: the page on kabsi.co, and the address a mail client POSTs to. */
  unsubscribeLinks(address: string, userId: string | null, locationId: string | null, category: string): Promise<{ page: string; oneClick: string }>;
  /** Held and digested emails whose time has come, oldest first. Rows without stored content are not returned. */
  listDue(now: Date, limit: number): Promise<StoredItem[]>;
  log(event: string, fields: Record<string, unknown>): void;
};

const empty = (): NotifyResult => ({ recipients: 0, sent: 0, held: 0, digest: 0, off: 0, skipped: 0, duplicate: 0, failed: 0, inApp: 0 });

const isSystem = (c: string) => (SYSTEM_CATEGORIES as readonly string[]).includes(c);

export async function runNotify(input: NotifyInput, d: Deps): Promise<NotifyResult> {
  const out = empty();
  const cat = categoryOf(input.category);
  if (!cat && !isSystem(input.category)) throw new Error(`notify: unknown category ${input.category}`);
  const now = d.now();
  const locationId = input.locationId ?? null;
  const biz = locationId ? await d.business(locationId) : null;
  const people = Array.isArray(input.to)
    ? input.to
    : locationId ? await d.recipients(locationId, input.to) : [];
  const hours = cat && locationId && cat.emailDefault === "by_hours" ? await d.hours(locationId) : null;
  const paused = !!cat?.switchable && !!biz?.pausedUntil && Date.parse(biz.pausedUntil) > now.getTime();
  const base = { kind: input.kind, category: input.category, locationId, replyTo: input.replyTo };
  let firstError: unknown = null;

  for (const person of people) {
    const to = person.email.toLowerCase();
    out.recipients++;
    try {
      // System mail (asked for just now, or to the team) and mail with no business to time it against (a
      // deleted business) have no choices and no bell: straight to the outbox. The emails table still dedupes it.
      if (!cat || !locationId) {
        const r = await send(d, base, await resolve(input.content, person, "send"), to, person.userId, `${input.key}:${to}`, null);
        if ("sent" in r) out.sent++; else out.skipped++;
        continue;
      }
      const prefs = person.userId && locationId ? await d.prefs(person.userId, locationId) : new Map<string, Frequency>();
      const emailPref = prefs.get(`${cat.id}:email`) ?? "default";
      const inAppOn = !!person.userId && !!locationId && cat.inApp && (prefs.get(`${cat.id}:in_app`) ?? "default") !== "off";
      // No business context (an invitee): nothing to time against, so it goes now unless switched off.
      const decision = biz
        ? decideEmail({ category: cat.id, pref: emailPref, now, tz: biz.tz, digestHour: biz.digestHour, hours })
        : emailPref === "off" && cat.switchable ? { mode: "off" as const } : { mode: "send" as const };

      const state: EmailState = paused ? "skipped" : decision.mode === "send" ? "sending" : decision.mode === "hold" ? "held" : decision.mode === "digest" ? "digest" : "off";
      // The event is recorded first, without its content, so a repeat call finds it and builds nothing (an approval
      // link is made only for an email that will really be sent).
      const row = await d.insert({
        location_id: locationId, user_id: person.userId, to_address: to, category: cat.id, kind: input.kind, dedupe_key: input.key,
        title: (input.inApp?.title ?? cat.label).slice(0, 200), body: input.inApp?.body?.slice(0, 500) ?? null, link: input.inApp?.link ?? null,
        in_app: inAppOn, email_state: state, email_due_at: decision.mode === "hold" || decision.mode === "digest" ? decision.until.toISOString() : null,
        email_content: null,
      });
      // Seen before: nothing more, except an email that failed and now gets another try.
      if (!row.fresh && !(row.state === "failed" && state === "sending")) { out.duplicate++; continue; }
      if (inAppOn && row.fresh) out.inApp++;
      if (state === "off") { out.off++; continue; }
      if (state === "skipped") { out.skipped++; continue; }
      const content = await resolve(input.content, person, state === "digest" ? "digest" : state === "held" ? "hold" : "send");
      if (state === "held" || state === "digest") {
        await d.update(row.id, { email_content: content });
        if (state === "held") out.held++; else out.digest++;
        continue;
      }
      try {
        const r = await send(d, base, content, to, person.userId, `${input.key}:${to}`, row.id);
        await d.update(row.id, { email_state: "sent" in r ? "sent" : "skipped" });
        if ("sent" in r) out.sent++; else out.skipped++;
      } catch (e) {
        await d.update(row.id, { email_state: "failed" });
        throw e;
      }
    } catch (e) {
      out.failed++;
      firstError ??= e;
      d.log("notify_failed", { category: input.category, key: input.key, err: String(e).slice(0, 200) });
    }
  }
  // A failed send is raised after the others went out, so a job retries (the failed row is tried again, the rest are duplicates).
  if (firstError) throw firstError;
  return out;
}

async function resolve(c: NotifyInput["content"], r: Recipient, mode: Mode): Promise<EmailContent> {
  return typeof c === "function" ? await c(r, mode) : c;
}

type Base = { kind: string; category: string; locationId: string | null; replyTo?: string | undefined };

/** Renders one email for one address and sends it through the outbox, unless the address is suppressed. */
async function send(d: Deps, b: Base, c: EmailContent, to: string, userId: string | null, dedupeKey: string, notificationId: string | null): Promise<Delivery> {
  if (await d.suppressed(to, b.category)) {
    d.log("suppressed", { category: b.category, kind: b.kind });
    return { skipped: "suppressed" };
  }
  const cat = categoryOf(b.category);
  const links = cat?.switchable ? await d.unsubscribeLinks(to, userId, b.locationId, b.category) : null;
  const { html, text } = renderEmail(c, { appUrl: d.appUrl, defaultWhy: cat?.why ?? SYSTEM_WHY[b.category as SystemCategory] ?? "You are a Kabsi customer.", unsubscribePage: links?.page ?? null, staff: isStaffCategory(b.category) });
  const unsubscribeUrl = links?.oneClick ?? null;
  return await d.deliver({
    kind: b.kind, category: b.category, to, subject: c.subject, html, text, dedupeKey, locationId: b.locationId,
    replyTo: b.replyTo, notificationId, unsubscribeUrl,
  });
}

// ─── held and digested emails come due ────────────────────────────────────────────────────────────────────────

export type ReleaseResult = { held: number; digests: number; digestItems: number; failed: number };

export async function releaseDue(d: Deps, limit = 500): Promise<ReleaseResult> {
  const now = d.now();
  const out: ReleaseResult = { held: 0, digests: 0, digestItems: 0, failed: 0 };
  const due = await d.listDue(now, limit);

  for (const item of due.filter((i) => i.email_state === "held")) {
    try {
      const base: Base = { kind: item.kind, category: item.category, locationId: item.location_id };
      const r = await send(d, base, item.email_content, item.to_address, item.user_id, `${item.dedupe_key}:${item.to_address}`, item.id);
      await d.update(item.id, { email_state: "sent" in r ? "sent" : "skipped", email_content: null });
      if ("sent" in r) out.held++;
    } catch (e) {
      out.failed++;
      d.log("release_failed", { id: item.id, err: String(e).slice(0, 200) });
    }
  }

  // One email per person per business, with everything that came due for them.
  const groups = new Map<string, StoredItem[]>();
  for (const item of due.filter((i) => i.email_state === "digest")) {
    const k = `${item.location_id}|${item.to_address}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(item);
  }
  for (const items of groups.values()) {
    const first = items[0]!;
    try {
      const biz = await d.business(first.location_id);
      if (!biz) { for (const i of items) await d.update(i.id, { email_state: "skipped", email_content: null }); continue; }
      const mail = digestEmail(biz, items, d.appUrl);
      const stamp = localParts(d.now(), biz.tz).ymd;
      const ids = items.map((i) => i.id).sort().join(",");
      const r = await sendDigest(d, first, biz, mail, shortHash(ids), stamp);
      for (const i of items) await d.update(i.id, { email_state: "sent" in r ? "sent" : "skipped", email_content: null });
      if ("sent" in r) { out.digests++; out.digestItems += items.length; }
    } catch (e) {
      out.failed++;
      d.log("digest_failed", { location: first.location_id, err: String(e).slice(0, 200) });
    }
  }
  return out;
}

async function sendDigest(d: Deps, first: StoredItem, biz: Business, mail: EmailContent, hash: string, stamp: string): Promise<Delivery> {
  const base: Base = { kind: "digest", category: first.category, locationId: first.location_id };
  return await send(d, base, mail, first.to_address, first.user_id, `digest:${first.location_id}:${first.to_address}:${stamp}:${hash}`, first.id);
}

function shortHash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** One email for the day: sections by category, each item as the fragment it made (or its title and link). */
export function digestEmail(biz: Business, items: StoredItem[], appUrl: string): EmailContent {
  const sections = groupDigest(items.map((i): DigestItem => ({
    category: i.category, title: i.title, link: i.link,
    fragmentHtml: i.email_content.digest?.html, fragmentText: i.email_content.digest?.text,
  })));
  const h2 = (s: string) => `<h2 style="margin:24px 0 8px 0;font-size:18px;line-height:1.3;font-weight:700;">${esc(s)}</h2>`;
  const rule = '<hr style="border:0;border-top:1px solid #E4E0D7;margin:20px 0;">';
  const line = (it: DigestItem) => it.fragmentHtml ??
    `<p style="margin:0 0 8px 0;">${esc(it.title)}</p>${it.link ? `<div style="margin:0;">${emailLink("Open", appUrl + it.link)}</div>` : ""}`;
  const lineText = (it: DigestItem) => it.fragmentText ?? `${it.title}${it.link ? `\n${appUrl}${it.link}` : ""}`;
  const bodyHtml = sections.map((s) => h2(`${s.count} ${s.noun}`) + s.items.map(line).join(rule)).join("");
  const text = sections.map((s) => `${s.count} ${s.noun}\n\n${s.items.map(lineText).join("\n\n---\n\n")}`).join("\n\n====\n\n");
  return {
    subject: digestSubject(biz.name, sections),
    preheader: "Everything from today in one place. Nothing is published until you approve it.",
    title: "Your daily update",
    bodyHtml: `<p style="margin:0 0 8px 0;">Here is what came up for <strong>${esc(biz.name)}</strong> since your last email.</p>${bodyHtml}`,
    text: `Here is what came up for ${biz.name} since your last email.\n\n${text}\n\nOpen Kabsi: ${appUrl}/app`,
    button: { label: "Open Kabsi", url: `${appUrl}/app` },
    why: "Kabsi groups these notices into one email a day. You can change this in Email settings.",
  };
}
