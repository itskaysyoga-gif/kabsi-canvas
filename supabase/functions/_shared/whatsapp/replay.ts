// The WhatsApp replay harness (QA 1, master plan 30.12): the pure parts. A scenario is a list of messages from fictional
// phones (+1 212 555 01xx: the 555-0100 to 555-0199 block is reserved for fiction, and 212 keeps libphonenumber happy) with what Kabsi must do and say for each. The `whatsapp`
// function signs each message in Kapso's own format with the webhook secret and feeds it to the normal inbound path, then
// reads back what was stored, what Kabsi answered (the outbox rows, `mock_sent` for these phones) and the conversation.
// Nothing here touches the database, the network or the environment; replay-run.ts wires it, and the tests use fakes.
//
// Rules this file carries:
//   - Only phones that match REPLAY_PHONE, and whose bound businesses are all demo businesses (mock Google, R-17), run.
//   - A scenario is chosen by name. The route takes no free text, so it cannot be used to send an arbitrary message.
//   - The signature is made inside the function. The secret is never returned or logged.

export const REPLAY_PHONE = /^\+121255501\d{2}$/;

/** The fictional phones. Seeded by tests/e2e/seed/qa-whatsapp-personas.sql; each is bound only to a demo business. */
export const PHONES = {
  owner: "+12125550101", // owner of Harbour Lane Coffee (demo)
  manager: "+12125550102", // manager of Harbour Lane Coffee
  two: "+12125550103", // owner of Juniper Hair Studio and a partner: two roles
  multi: "+12125550104", // owner of Harbour Lane Coffee and Juniper Hair Studio: two businesses
  staff: "+12125550105", // staff at Harbour Lane Coffee
  billing: "+12125550106", // owner of the QA test account's business (its organisation is marked billing_test): the Creem cancel
  unknown: "+12125550199", // no role at all
  unknown2: "+12125550198",
} as const;
export const PERSONA_PHONES: string[] = Object.values(PHONES);

export type Btn = { id: string; title: string };

/** What a step may ask for. `$token` in a button id is the action token made by `prep: "action"`. */
export type Step = {
  note: string;
  phone: string;
  text?: string;
  /** Tap a button: by title on the last reply, by exact id, or by the previous reply's first button. */
  tap?: { title: string } | { id: string };
  media?: { kind: "image" | "document" | "audio" | "video"; id: string; mime: string; size?: number; voice?: boolean; filename?: string };
  /** Before the message: make an approval token for the review the QA seed prepared, kept for `$token`. */
  prep?: "action" | "action_again";
  expect: Expect;
};
export type Expect = {
  /** What the agent recorded as done (whatsapp_messages.result). */
  result?: string | RegExp;
  /** Some reply to this step matches. */
  reply?: RegExp | RegExp[];
  /** Exactly this many replies. `none` is the same as 0. */
  replies?: number;
  none?: true;
  /** The first reply starts with this head line (the role and the business, 29.7). */
  head?: string;
  /** The titles of the buttons on the last reply. */
  buttons?: string[];
  /** No reply matches any of these (privacy: another business's name, a staff command). */
  never?: RegExp[];
  /** Conversation state after the step. */
  conv?: { stopped?: boolean; handoff?: boolean; scan_code?: string | null; active_role?: string | null; open_question?: string | null; language?: string | null };
  /** The message itself is stored once. Default true. */
  stored?: boolean;
};
export type Scenario = { name: string; about: string; phones: string[]; ai: boolean; steps: Step[] };

export type Observed = {
  stored: boolean;
  result: string | null;
  replies: { id: number; kind: string; state: string; body: string; buttons: Btn[] }[];
  conv: { stopped_at: string | null; handoff_at: string | null; scan_code: string | null; active_role: string | null; open_question: { type?: string } | null; language: string | null } | null;
};

// ─── The Kapso v2 payload (channel.ts parseWebhook reads this shape).

export function kapsoPayload(o: { phoneNumberId: string; from: string; id: string; nowSeconds: number }, s: Pick<Step, "text" | "media"> & { buttonId?: string | null }) {
  const message: Record<string, unknown> = { id: o.id, from: o.from.replace(/\D/g, ""), timestamp: String(o.nowSeconds), kapso: { direction: "inbound" } };
  if (s.buttonId) {
    message.type = "interactive";
    message.interactive = { type: "button_reply", button_reply: { id: s.buttonId, title: "tap" } };
  } else if (s.media) {
    const m = s.media;
    message.type = m.kind;
    message[m.kind] = {
      id: m.id, mime_type: m.mime, ...(m.size ? { file_size: m.size } : {}), ...(m.voice ? { voice: true } : {}),
      ...(m.filename ? { filename: m.filename } : {}), ...(s.text ? { caption: s.text } : {}),
    };
  } else {
    message.type = "text";
    message.text = { body: s.text ?? "" };
  }
  return {
    event: "whatsapp.message.received",
    body: { message, conversation: { phone_number: o.from }, phone_number_id: o.phoneNumberId },
  };
}

export async function sign(secret: string, raw: Uint8Array<ArrayBuffer>): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", key, raw))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Checks.

const rx = (p: string | RegExp, s: string | null) => (typeof p === "string" ? p === s : p.test(s ?? ""));
const show = (p: string | RegExp) => (typeof p === "string" ? JSON.stringify(p) : String(p));

/** The problems with one observed step; an empty list means it passed. */
export function check(step: Step, got: Observed): string[] {
  const e = step.expect;
  const bad: string[] = [];
  if ((e.stored ?? true) !== got.stored) bad.push(got.stored ? "the message was stored but should not have been" : "the message was not stored");
  if (e.result !== undefined && !rx(e.result, got.result)) bad.push(`result ${JSON.stringify(got.result)}, wanted ${show(e.result)}`);
  const n = got.replies.length;
  if (e.none && n) bad.push(`${n} reply(ies), wanted none`);
  if (e.replies !== undefined && n !== e.replies) bad.push(`${n} reply(ies), wanted ${e.replies}`);
  for (const p of ([] as RegExp[]).concat(e.reply ?? [])) if (!got.replies.some((r) => p.test(r.body))) bad.push(`no reply matches ${p}`);
  if (e.head && !got.replies[0]?.body.startsWith(`${e.head}\n\n`)) bad.push(`first reply does not start with the head ${JSON.stringify(e.head)}`);
  if (e.buttons) {
    const last = got.replies[got.replies.length - 1];
    const titles = (last?.buttons ?? []).map((b) => b.title);
    if (JSON.stringify(titles) !== JSON.stringify(e.buttons)) bad.push(`buttons ${JSON.stringify(titles)}, wanted ${JSON.stringify(e.buttons)}`);
  }
  for (const p of e.never ?? []) if (got.replies.some((r) => p.test(r.body))) bad.push(`a reply matches ${p}, which must never appear`);
  // Every reply to a fictional phone is recorded as mock_sent: nothing leaves Kabsi (R-17).
  for (const r of got.replies) if (r.state !== "mock_sent") bad.push(`reply ${r.id} is ${r.state}, wanted mock_sent`);
  // The house rules for anything Kabsi says.
  for (const r of got.replies) if (/[–—!]/.test(r.body)) bad.push(`reply ${r.id} has a dash or an exclamation mark`);
  if (e.conv) {
    const c = got.conv;
    if (e.conv.stopped !== undefined && !!c?.stopped_at !== e.conv.stopped) bad.push(`stopped is ${!!c?.stopped_at}, wanted ${e.conv.stopped}`);
    if (e.conv.handoff !== undefined && !!c?.handoff_at !== e.conv.handoff) bad.push(`handoff is ${!!c?.handoff_at}, wanted ${e.conv.handoff}`);
    if (e.conv.scan_code !== undefined && (c?.scan_code ?? null) !== e.conv.scan_code) bad.push(`scan_code ${c?.scan_code ?? null}, wanted ${e.conv.scan_code}`);
    if (e.conv.active_role !== undefined && (c?.active_role ?? null) !== e.conv.active_role) bad.push(`active_role ${c?.active_role ?? null}, wanted ${e.conv.active_role}`);
    if (e.conv.open_question !== undefined && (c?.open_question?.type ?? null) !== e.conv.open_question) bad.push(`open_question ${c?.open_question?.type ?? null}, wanted ${e.conv.open_question}`);
    if (e.conv.language !== undefined && (c?.language ?? null) !== e.conv.language) bad.push(`language ${c?.language ?? null}, wanted ${e.conv.language}`);
  }
  return bad;
}

/** Which button a tap means, from the last reply's buttons and the action token. */
export function tapId(tap: NonNullable<Step["tap"]>, last: Btn[], token: string | null): string | null {
  if ("id" in tap) return token ? tap.id.replaceAll("$token", token) : tap.id.includes("$token") ? null : tap.id;
  return last.find((b) => b.title === tap.title)?.id ?? null;
}

/** The guard for a replay: every phone is fictional, and a phone bound to a business is bound only to demo ones (or to the QA test account's). */
export function phoneProblem(phones: string[], bound: { phone: string; location_id: string | null; is_demo: boolean | null; billing_test?: boolean | null }[]): string | null {
  for (const p of phones) if (!REPLAY_PHONE.test(p)) return `${p} is not a fictional +1 212 555 01xx number`;
  for (const b of bound) {
    if (!REPLAY_PHONE.test(b.phone)) return `${b.phone} is not a fictional +1 212 555 01xx number`;
    // A demo business (mock Google, R-17), or the QA test account's business whose organisation staff marked billing_test for the Creem test.
    if (b.location_id && !b.is_demo && !b.billing_test) return `${b.phone} is bound to a business that is not a demo business`;
  }
  return null;
}

// ─── The scenarios.

const HL = "Harbour Lane Coffee";
const JU = "Juniper Hair Studio";
const OWNER_HEAD = `${HL} (owner)`;
const nothing = (...names: string[]) => names.map((n) => new RegExp(n, "i"));

/** 13b phone test script, steps 3 to 11 (steps 1 and 2 are the staff code and `status`: see `staff_two_roles`). */
const OWNER_SCRIPT: Step[] = [
  { note: "13b 4: stats", phone: PHONES.owner, text: "stats", expect: { result: /^stats/, head: OWNER_HEAD, reply: /Harbour Lane Coffee, the last 7 days: \d+ new/, replies: 1 } },
  { note: "13b 5: review link", phone: PHONES.owner, text: "review link", expect: { result: /^(review_link|no_review_link)$/, head: OWNER_HEAD, reply: /review link|no review link yet/ } },
  { note: "13b 6: the scan code from the website", phone: PHONES.owner, text: "Hi Kabsi, my scan code is KAB-7Q4M2X9P", expect: { result: "scan_code", reply: /Thanks, I have your scan KAB-7Q4M2X9P/, conv: { scan_code: "KAB-7Q4M2X9P" } } },
  // V3: a voice note is transcribed when the provider key is set; the replay audio is silence, so either way no words come back.
  { note: "13b 7: a short voice note", phone: PHONES.owner, media: { kind: "audio", id: "replay-voice-5s", mime: "audio/ogg; codecs=opus", size: 20_000, voice: true }, expect: { result: /^voice_(not_configured|failed|empty)$/, reply: /not switched on yet|could not hear that clearly/ } },
  { note: "13b 8: a photo of the shop", phone: PHONES.owner, media: { kind: "image", id: "replay-photo", mime: "image/jpeg", size: 7000 }, expect: { result: "photo", reply: /Photo received.*Kabsi is getting it ready/s } },
  { note: "13b 9: upgrade (a demo business has no paid plan)", phone: PHONES.owner, text: "upgrade", expect: { result: "billing_no_plan", reply: /has no paid plan right now/ } },
  { note: "13b 10: talk to a person", phone: PHONES.owner, text: "talk to a person", expect: { result: "handoff", reply: /the same working day/, conv: { handoff: true } } },
];

export const SCENARIOS: Record<string, Scenario> = {
  owner_script: {
    name: "owner_script", about: "The 13b phone test script as an owner, steps 4 to 10", phones: [PHONES.owner], ai: false, steps: OWNER_SCRIPT,
  },
  owner_stop: {
    name: "owner_stop", about: "13b step 11: STOP gives one confirmation, then nothing", phones: [PHONES.owner], ai: false, steps: [
      { note: "STOP", phone: PHONES.owner, text: "STOP", expect: { result: "stopped", reply: /WhatsApp messages are stopped\./, replies: 1, conv: { stopped: true } } },
      { note: "stats after STOP gets no reply", phone: PHONES.owner, text: "stats", expect: { result: "stopped_ignored", none: true } },
    ],
  },
  two_roles: {
    name: "two_roles", about: "A phone that is an owner and a partner is asked once which one a message is for (29.7, 13b step 3)", phones: [PHONES.two], ai: false, steps: [
      { note: "help asks which role", phone: PHONES.two, text: "help", expect: { result: "which_role", reply: /^\*❓ Business or partner tools\?\*$/, buttons: ["My business", "Partner tools"], conv: { open_question: "role" } } },
      { note: "tap My business: the question that waited is answered, headed", phone: PHONES.two, tap: { title: "My business" }, expect: { result: "help", reply: /^\*\u{1F4CB} You can send\*\n/u, conv: { active_role: "business", open_question: null } } },
      { note: "stats is headed with the business and the role", phone: PHONES.two, text: "stats", expect: { result: /^stats/, head: `${JU} (owner)`, reply: /Juniper Hair Studio, the last 7 days/, never: nothing("Harbour Lane") } },
      { note: "a partner tool is not an owner tool", phone: PHONES.two, text: "payout", expect: { result: /^(partner_stub|partner_refused|free|unclear)/, never: nothing("Harbour Lane") } },
    ],
  },
  two_businesses: {
    name: "two_businesses", about: "An owner of two businesses is asked which one, then it is remembered", phones: [PHONES.multi], ai: false, steps: [
      { note: "stats asks which business", phone: PHONES.multi, text: "stats", expect: { result: "which_business", reply: /Which business\?/, buttons: [HL, JU], conv: { open_question: "business" } } },
      { note: "tap Juniper", phone: PHONES.multi, tap: { title: JU }, expect: { reply: /Juniper Hair Studio, the last 7 days/, never: nothing("Harbour Lane") } },
    ],
  },
  manager_staff: {
    name: "manager_staff", about: "A manager cannot touch billing; staff can only send photos and ask for a person", phones: [PHONES.manager, PHONES.staff], ai: false, steps: [
      { note: "manager: stats", phone: PHONES.manager, text: "stats", expect: { result: /^stats/, head: `${HL} (manager)` } },
      { note: "manager: billing is owner only", phone: PHONES.manager, text: "upgrade", expect: { result: "billing_owner_only", reply: /Only the owner can change the plan and billing/ } },
      { note: "staff: stats is not for staff", phone: PHONES.staff, text: "stats", expect: { result: "not_for_staff", reply: /As staff you can send photos and news here/ } },
      { note: "staff: help", phone: PHONES.staff, text: "help", expect: { result: "help", reply: /^\*\u{1F4CB} You can send\*\n\nphotos here for the owner to approve\n/u } },
    ],
  },
  unknown_phone: {
    name: "unknown_phone", about: "A phone Kabsi does not know: the welcome, prices, the scan code, nothing of any business", phones: [PHONES.unknown], ai: false, steps: [
      // The welcome goes on a phone's first message only; a replay phone has written before, so it gets the short menu.
      { note: "hello is the welcome of 24.8, or the menu after the first message", phone: PHONES.unknown, text: "Hello", expect: { result: /^(greeting|help)$/, reply: /Did you just scan your business on kabsi\.co|I am Nora, Kabsi's assistant/ } },
      { note: "prices", phone: PHONES.unknown, text: "prices", expect: { result: "prices", reply: /one plan: 29 US dollars a month per location.*A card is needed to start/s } },
      { note: "stats needs an account and shows no business", phone: PHONES.unknown, text: "stats", expect: { result: "needs_account", reply: /needs a Kabsi account/, never: nothing("Harbour Lane", "Juniper") } },
      { note: "a staff command is never revealed", phone: PHONES.unknown, text: "status", expect: { result: /^(greeting|unclear|free|nora)/, never: nothing("Jobs failed", "Kabsi staff") } },
      { note: "the scan code", phone: PHONES.unknown, text: "Hi Kabsi, my scan code is KAB-2M9Q4X7P", expect: { result: "scan_code", reply: /KAB-2M9Q4X7P/, conv: { scan_code: "KAB-2M9Q4X7P" } } },
      { note: "talk to a person", phone: PHONES.unknown, text: "talk to a person", expect: { result: "handoff", reply: /within one working day/ } },
      { note: "STOP", phone: PHONES.unknown, text: "STOP", expect: { result: "stopped", reply: /WhatsApp messages are stopped\./, conv: { stopped: true } } },
      { note: "silence after STOP", phone: PHONES.unknown, text: "hello", expect: { result: "stopped_ignored", none: true } },
    ],
  },
  // PILOT-READY (R-165 item 4): launch checklist lines 16 to 18 (docs/progress/archive/2026-11-24-gate2-phone-test.md), run as the
  // owner of the demo business, so Rashid's phone is needed only for line 19 (real delivery). Voice notes carry their words
  // inside the replay audio (replay-media.ts), so no paid transcription is called. Each step is one checklist item.
  launch_16_18: {
    name: "launch_16_18", about: "Checklist lines 16 to 18: the seven typed sentences, the five new tools, the seven as voice notes, a voice yes, the limits, STOP and START", phones: [PHONES.owner, PHONES.staff], ai: false, steps: [
      // Line 16, typed.
      { note: "16.1 What needs my attention?", phone: PHONES.owner, text: "What needs my attention?", expect: { result: /^care_waiting/, reply: /Waiting for you|Nothing is waiting/ } },
      { note: "16.2 open the reply that is ready (number 2 of the list)", phone: PHONES.owner, text: "2", expect: { reply: /./ } },
      // The rewrite is read by the intent model, which the replay does not run (no paid call): the replay answers the off-topic line. Rashid's phone tests it.
      { note: "16.2 Make this reply more professional (needs the intent model: not tested here)", phone: PHONES.owner, text: "Make this reply more professional", expect: { reply: /./ } },
      { note: "16.3 Change my opening hours on Saturday", phone: PHONES.owner, text: "Change my opening hours on Saturday", expect: { result: "care_week_no_times", reply: /What are your new hours on Saturdays\?/ } },
      // FIX-3: the fixtures reset gives the demo business a weekly regular_hours fact, so the whole week is shown back with Approve.
      { note: "16.3 the times", phone: PHONES.owner, text: "10am to 4pm", expect: { result: "care_week_shown", reply: /New weekly hours for Google[\s\S]*Saturday[\s\S]*Your week on Google after this change[\s\S]*after you tap Approve/, buttons: ["Approve"] } },
      { note: "16.4 A photo with Post this", phone: PHONES.owner, media: { kind: "image", id: "replay-photo", mime: "image/jpeg", size: 7000 }, text: "Post this", expect: { result: "photo_post_shown", reply: /Post with your photo/ } },
      { note: "16.5 How many reviews did I receive this month?", phone: PHONES.owner, text: "How many reviews did I receive this month?", expect: { result: /^stats/, reply: /the last 30 days: \d+ new reviews/ } },
      { note: "16.6 Show me everything you did this week", phone: PHONES.owner, text: "Show me everything you did this week", expect: { result: "care_done", reply: /Your week from/ } },
      { note: "16.7 Send me my review QR code", phone: PHONES.owner, text: "Send me my review QR code", expect: { result: "qr_image", reply: /your review QR code/ } },
      { note: "16.8 stats", phone: PHONES.owner, text: "stats", expect: { result: /^stats/, reply: /the last 7 days/ } },
      { note: "16.8 monthly report", phone: PHONES.owner, text: "monthly report", expect: { result: /^care_monthly/, reply: /Your monthly report|monthly report/i } },
      { note: "16.8 feedback", phone: PHONES.owner, text: "feedback", expect: { result: "care_feedback", reply: /What customers mention/ } },
      { note: "16.8 profile health", phone: PHONES.owner, text: "profile health", expect: { result: "care_profile_health", reply: /Your profile/ } },
      { note: "16.8 how do I compare", phone: PHONES.owner, text: "how do I compare", expect: { result: /^care_competitors/, reply: /Nearby businesses|No nearby businesses picked/ } },
      // Line 17: the seven again as voice notes. Every reply opens with what Kabsi heard (the hours one last: it leaves a question open).
      ...[1, 4, 5, 6, 7].map((n): Step => ({
        note: `17.${n} voice note ${n}`, phone: PHONES.owner,
        media: { kind: "audio", id: `replay-say-${n}`, mime: "audio/ogg; codecs=opus", size: 20_000, voice: true },
        expect: { reply: /^> I heard: / },
      })),
      { note: "17.2 open a reply to rewrite", phone: PHONES.owner, text: "2", expect: { reply: /./ } },
      { note: "17.2 voice note 2", phone: PHONES.owner, media: { kind: "audio", id: "replay-say-2", mime: "audio/ogg; codecs=opus", size: 20_000, voice: true }, expect: { reply: /^> I heard: Make this reply more professional/ } },
      { note: "17.3 voice note 3", phone: PHONES.owner, media: { kind: "audio", id: "replay-say-3", mime: "audio/ogg; codecs=opus", size: 20_000, voice: true }, expect: { result: "care_week_no_times", reply: /^> I heard: Change my opening hours on Saturday/ } },
      { note: "17.3 the times by voice are not taken as words either way: type them", phone: PHONES.owner, text: "10am to 4pm", expect: { reply: /Saturday|does not have your hours yet/ } },
      // The yes: with a reply open for approval, a voice yes approves nothing.
      { note: "17.8 open the reply again", phone: PHONES.owner, text: "waiting", expect: { result: /^care_waiting/ } },
      { note: "17.8 number 2", phone: PHONES.owner, text: "2", expect: { reply: /./ } },
      { note: "17.8 a voice yes approves nothing", phone: PHONES.owner, media: { kind: "audio", id: "replay-say-yes", mime: "audio/ogg; codecs=opus", size: 20_000, voice: true }, expect: { reply: /^> I heard: yes/, never: [/Approved for/, /goes to Google in 10 seconds/] } },
      // Line 18: the limits.
      { note: "18.1 off-topic", phone: PHONES.owner, text: "Write me a poem about coffee", expect: { result: "off_topic", reply: /Kabsi cannot help with that.*talk to a person.*hello@kabsi\.co/s } },
      { note: "18.2 the name change is refused with the guide", phone: PHONES.owner, text: "Change my business name to Harbour Lane Cafe", expect: { result: "care_guide", reply: /does not change that from a chat/, never: [/Approve/] } },
      { note: "18.3 the owner gets a card", phone: PHONES.owner, prep: "action", text: "help", expect: { result: "help" } },
      { note: "18.3 the staff phone taps the owner's Approve", phone: PHONES.staff, tap: { id: "a:$token" }, expect: { reply: /./, never: [/Approved for/] } },
      { note: "18.3 the staff phone types yes", phone: PHONES.staff, text: "yes", expect: { never: [/Approved for/] } },
      { note: "18.4 STOP", phone: PHONES.owner, text: "STOP", expect: { result: "stopped", reply: /WhatsApp messages are stopped\./, replies: 1, conv: { stopped: true } } },
      { note: "18.4 nothing after STOP", phone: PHONES.owner, text: "stats", expect: { result: "stopped_ignored", none: true } },
      { note: "18.4 START turns messages back on", phone: PHONES.owner, text: "START", expect: { result: "started", reply: /Welcome back/, conv: { stopped: false } } },
    ],
  },
  voice_limits: {
    name: "voice_limits", about: "A voice note over the size limit and one over the time limit are refused with the kind line (28.3)", phones: [PHONES.owner], ai: false, steps: [
      { note: "over 10 MB", phone: PHONES.owner, media: { kind: "audio", id: "replay-voice-big", mime: "audio/ogg; codecs=opus", size: 11 * 1024 * 1024, voice: true }, expect: { result: "voice_too_big", reply: /Please keep voice notes under 3 minutes/ } },
      { note: "over 3 minutes", phone: PHONES.owner, media: { kind: "audio", id: "replay-voice-200s", mime: "audio/ogg; codecs=opus", size: 60_000, voice: true }, expect: { result: "voice_too_long", reply: /Please keep voice notes under 3 minutes/ } },
    ],
  },
  old_card: {
    name: "old_card", about: "A button tap on an old card: a made-up token, and a card already used (25.5)", phones: [PHONES.owner], ai: false, steps: [
      { note: "a token Kabsi never made", phone: PHONES.owner, tap: { id: "a:replayreplayreplayreplay00" }, expect: { result: "stale_button", reply: /already handled[\s\S]*Nothing changed/ } },
      { note: "Approve on a fresh card", phone: PHONES.owner, prep: "action", tap: { id: "a:$token" }, expect: { result: "approved", reply: /Approved[\s\S]*Harbour Lane Coffee[\s\S]*It goes to Google in 10 seconds/, buttons: ["Undo"] } },
      { note: "Approve again on the same old card", phone: PHONES.owner, tap: { id: "a:$token" }, expect: { reply: /already handled|no longer yours/ } },
      { note: "Undo inside the 10 seconds", phone: PHONES.owner, tap: { id: "u:$token" }, expect: { result: /^(undone|too_late)$/ } },
      // Undo twice is answered the same way both times: nothing can be sent by the second tap (live finding of 25 Oct, kept as the rule).
      { note: "Undo again on the same card: the same answer, nothing sent", phone: PHONES.owner, tap: { id: "u:$token" }, expect: { result: /^(undone|undo:.*|too_late)$/, reply: /Undone[\s\S]*Nothing was sent|already handled|cannot be undone/ } },
    ],
  },
  stranger_card: {
    name: "stranger_card", about: "Someone else's card is not theirs to approve", phones: [PHONES.owner, PHONES.manager], ai: false, steps: [
      { note: "owner gets a card", phone: PHONES.owner, prep: "action", text: "help", expect: { result: "help" } },
      { note: "an unknown phone taps the owner's card", phone: PHONES.unknown2, tap: { id: "a:$token" }, expect: { result: "not_yours", reply: /No longer yours to approve/i } },
    ],
  },
  billing_cancel: {
    name: "billing_cancel", about: "The QA test account cancels its Creem test plan from WhatsApp: ask, Confirm, done (10.2.10)", phones: [PHONES.billing], ai: false, steps: [
      { note: "plan: the status line", phone: PHONES.billing, text: "plan", expect: { result: "billing_status", reply: /Kabsi QA Cafe is on .*\./, never: nothing("Harbour Lane") } },
      { note: "cancel asks first", phone: PHONES.billing, text: "cancel", expect: { result: "billing_cancel_ask", reply: /Cancel your plan\? It ends on/, buttons: ["Confirm"] } },
      { note: "tap Confirm", phone: PHONES.billing, tap: { title: "Confirm" }, expect: { result: "billing_cancelled", reply: /Done\. Your plan ends on/, buttons: ["Keep my plan"] } },
    ],
  },
  // Item 7: ten Nora conversations on the real model. Free text goes to the intent router (Haiku); the answers are the
  // fixed lines of the role. They are judged afterwards (scripts/eval/judge.ts) against the facts file. "Talk to a person" comes
  // last for each phone: after it the chat is quiet for a day on purpose (24 hours, 9.3).
  nora_live: {
    name: "nora_live", about: "Ten questions from people Kabsi does not know, answered on the real router model", phones: [PHONES.unknown, PHONES.unknown2], ai: true, steps: [
      "how much does kabsi cost",
      "what does kabsi do for my restaurant",
      "do I have to give you my google password",
      "can kabsi post replies without asking me",
      "I run a hair salon, is there a free trial",
      "how do I become a partner",
      "will you get me more reviews",
      "what happens to my reviews if I cancel",
      "is it free",
      "can I talk to a real person",
    ].map((text, i): Step => ({ note: `nora ${i + 1}`, phone: i % 2 ? PHONES.unknown2 : PHONES.unknown, text, expect: { replies: 1, never: nothing("Harbour Lane", "Juniper", "Jobs failed") } })),
  },
};

/** The 13b script's first three steps need a staff user, which a fictional phone must not have. They run as the owner and
 *  partner pair above; the staff code binding itself is covered by the 141-case suite and by Rashid's real run of 25 Oct. */
export const SCENARIO_NAMES = Object.keys(SCENARIOS);
