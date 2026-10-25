// The one sender (master plan 9.1 point 4, 9.5). Every WhatsApp message Kabsi sends goes through here:
//   - reply(): an answer to what the person just wrote. At once, inside the window their message opened, not counted.
//   - notify(): a message Kabsi starts (an alert, a digest, a staff alert). Queued in whatsapp_outbox, then sent now or
//     later under policy.ts (6 a day, quiet hours, 15-minute batching, digests, the window and its templates).
//   - flush(): the tick sends what is due; several waiting messages for one phone go as one digest.
// Live sends go only to phones the database allows (Kabsi's test phones and the staff phone until launch); every other
// send uses the mock sender, which records and calls nobody. Database calls and senders are deps, so tests use fakes.
import type { Button } from "./channel.ts";
import type { Sender } from "./deliver.ts";
import { decide, digestBody, type DigestItem, inWindow, type SendState } from "./policy.ts";
import { ref, type TemplateRef } from "./templates.ts";

export type OutRow = {
  id: number; phone: string; user_id: string | null; location_id: string | null; kind: string; body: string;
  buttons: Button[]; template: TemplateRef | null; urgent: boolean; state: string; due_at: string; attempts: number;
  /** 13b part 2: an image that goes with the message, by reference (the map of one finished grid). */
  media?: OutMedia | null;
};
export type OutMedia = { map_scan: string };
export type NewRow = {
  phone: string; userId: string | null; locationId: string | null; kind: string; body: string; buttons?: Button[];
  template?: TemplateRef | null; urgent?: boolean; dedupe?: string | null; dueAt?: Date; media?: OutMedia | null;
};

export interface OutDb {
  state(phone: string): Promise<SendState>;
  add(r: NewRow): Promise<number | null>;
  mark(ids: number[], state: string, o?: { providerId?: string | null; error?: string | null; dueAt?: Date | null }): Promise<void>;
  claim(limit: number): Promise<OutRow[]>;
  get(phone: string, ids: number[]): Promise<OutRow[]>;
  release(phone: string): Promise<number>;
  setQuestion(phone: string, q: unknown): Promise<void>;
}
export type Out = {
  db: OutDb; live: Sender; mock: Sender; now: () => Date;
  /** The map PNG of one finished grid (the visibility function draws it); null when it cannot be drawn. */
  mapPng?: (scanId: string) => Promise<Uint8Array | null>;
};

// A held message waits for the person to write (release() makes it due); it is dropped with the outbox after 30 days.
const HELD_UNTIL = (now: Date) => new Date(now.getTime() + 30 * 86_400_000);
const senderFor = (o: Out, s: SendState) => (s.live_ok && o.live.live ? o.live : o.mock);
const doneState = (sender: Sender) => (sender.live ? "sent" : "mock_sent");

/** An answer inside the window the person just opened. Recorded after it went, so the person never waits on the log. */
export async function reply(o: Out, s: SendState, phone: string, body: string, buttons?: Button[], meta: { userId?: string | null; locationId?: string | null } = {}): Promise<string> {
  const sender = senderFor(o, s);
  let providerId: string | null = null;
  let state = doneState(sender);
  let error: string | null = null;
  try {
    const r = buttons?.length ? await sender.buttons(phone, body, buttons.slice(0, 3)) : await sender.text(phone, body);
    providerId = r.id;
  } catch (e) {
    state = "failed";
    error = String((e as Error)?.message ?? e).slice(0, 300);
  }
  const id = await o.db.add({ phone, userId: meta.userId ?? null, locationId: meta.locationId ?? null, kind: "reply", body, buttons });
  if (id) await o.db.mark([id], state, { providerId, error });
  return state;
}

/** A message Kabsi starts: queued once (by its dedupe key), sent now if the rules allow, else when they do. */
export async function notify(o: Out, r: NewRow): Promise<string> {
  // Queued a few minutes ahead, so the tick never sends it while this call does; if this call dies, the tick sends it.
  const id = await o.db.add({ ...r, dueAt: new Date(o.now().getTime() + 5 * 60_000) });
  if (!id) return "duplicate";
  const s = await o.db.state(r.phone);
  const d = decide(s, o.now(), !!r.urgent);
  if (d.at === "never") {
    await o.db.mark([id], "dropped", { error: d.why });
    return "dropped";
  }
  if (d.at === "later") {
    await o.db.mark([id], "queued", { dueAt: d.due, error: d.why });
    return `queued:${d.why}`;
  }
  return await sendRow(o, s, { id, phone: r.phone, user_id: r.userId, location_id: r.locationId, kind: r.kind, body: r.body,
    buttons: r.buttons ?? [], template: r.template ?? null, urgent: !!r.urgent, state: "sending", due_at: o.now().toISOString(), attempts: 0,
    media: r.media ?? null });
}

/** A message with its image when it has one; without the image (or a sender that cannot send one) the text alone. */
async function sendBody(o: Out, sender: Sender, row: OutRow) {
  if (row.media?.map_scan && sender.image && o.mapPng) {
    const png = await o.mapPng(row.media.map_scan).catch(() => null);
    if (png?.length) return await sender.image(row.phone, png, row.body, (row.buttons ?? []).slice(0, 3));
  }
  return row.buttons?.length ? await sender.buttons(row.phone, row.body, row.buttons.slice(0, 3)) : await sender.text(row.phone, row.body);
}

/** One row: inside the window as written; outside it only its template; without a template it waits for the person. */
async function sendRow(o: Out, s: SendState, row: OutRow): Promise<string> {
  const now = o.now();
  const sender = senderFor(o, s);
  try {
    if (inWindow(s, now)) {
      const r = await sendBody(o, sender, row);
      await o.db.mark([row.id], doneState(sender), { providerId: r.id });
      return doneState(sender);
    }
    if (row.template?.name) {
      const r = await sender.template(row.phone, row.template.name, row.template.params);
      // The full message waits for the reply that opens the window.
      await o.db.mark([row.id], "held", { providerId: r.id, error: "outside_window", dueAt: HELD_UNTIL(now) });
      return "template";
    }
    await o.db.mark([row.id], "held", { error: "outside_window", dueAt: HELD_UNTIL(now) });
    return "held";
  } catch (e) {
    const retry = row.attempts < 2;
    await o.db.mark([row.id], retry ? "queued" : "failed", {
      error: `send: ${String((e as Error)?.message ?? e)}`.slice(0, 300), dueAt: retry ? new Date(now.getTime() + 60_000 * (row.attempts + 1)) : null,
    });
    return "failed";
  }
}

/** The tick: due messages, by phone. Urgent ones one by one; the rest one at a time, or as one digest when several wait. */
export async function flush(o: Out, limit = 50): Promise<Record<string, number>> {
  const rows = await o.db.claim(limit);
  const byPhone = new Map<string, OutRow[]>();
  for (const r of rows) byPhone.set(r.phone, [...(byPhone.get(r.phone) ?? []), r]);
  const out: Record<string, number> = {};
  const count = (k: string) => (out[k] = (out[k] ?? 0) + 1);
  for (const [phone, list] of byPhone) {
    const s = await o.db.state(phone);
    for (const r of list.filter((x) => x.urgent)) count(await sendRow(o, s, r));
    const rest = list.filter((x) => !x.urgent);
    if (!rest.length) continue;
    // Held rows come back only when the window opened (release); their decision is the window, not the cap.
    const released = rest.filter((x) => x.state === "held");
    const queued = rest.filter((x) => x.state !== "held");
    for (const r of released) count(await sendRow(o, s, r));
    if (!queued.length) continue;
    const d = decide(s, o.now(), false);
    if (d.at === "never") {
      await o.db.mark(queued.map((x) => x.id), "dropped", { error: d.why });
      count("dropped");
      continue;
    }
    if (d.at === "later") {
      await o.db.mark(queued.map((x) => x.id), "queued", { dueAt: d.due, error: d.why });
      count(`queued:${d.why}`);
      continue;
    }
    if (queued.length === 1) {
      count(await sendRow(o, s, queued[0]));
      continue;
    }
    count(await sendDigest(o, s, phone, queued));
  }
  return out;
}

async function sendDigest(o: Out, s: SendState, phone: string, rows: OutRow[]): Promise<string> {
  const items: DigestItem[] = rows.map((r) => ({ id: r.id, kind: r.kind, body: r.body, business: null }));
  const body = digestBody(items);
  const business = (rows.find((r) => /^[^:\n]{1,80}:/.test(r.body))?.body.split(":")[0] ?? "Kabsi").trim();
  const id = await o.db.add({ phone, userId: rows[0].user_id, locationId: rows[0].location_id, kind: "digest", body,
    template: ref("updates_waiting", { business, count: String(rows.length) }) });
  await o.db.mark(rows.map((r) => r.id), "digested");
  await o.db.setQuestion(phone, { type: "digest", ids: rows.map((r) => r.id) });
  if (!id) return "digest_duplicate";
  const res = await sendRow(o, s, { id, phone, user_id: rows[0].user_id, location_id: rows[0].location_id, kind: "digest", body, buttons: [],
    template: ref("updates_waiting", { business, count: String(rows.length) }), urgent: false, state: "sending", due_at: o.now().toISOString(), attempts: 0 });
  return res === "template" || res === "held" ? res : "digest";
}
