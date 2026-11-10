// RB-T (master plan 30.50 item 8): every row of the request book scenario matrix (rb-t.matrix.ts) run through the real
// agent on the fake world, for the salon, gym and garage packs. No database, no Kapso and no model call: the extraction
// and the router are fakes that answer what each row says. Customers are fictional.
import assert from "node:assert/strict";
import { receive } from "./agent.ts";
import { enquiryKind, getPack, kabsiQuestion } from "./book.ts";
import { type SigninDb } from "./signin.ts";
import { msg, PHONES, USERS, World } from "./world.test-helpers.ts";
import { FIXTURES, ROWS, type Row, type Step } from "./rb-t.matrix.ts";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const SALON = id(11), GYM = id(12), GARAGE = id(13);
const ME = PHONES.rashid;
const HOUSE = /[‒-―−！!]/;
const CLAIM = /\b(booked|available|availability)\b/i;

/** Rashid's phone: staff tools, Yawmiyati, and the three test businesses (demo) with the request book on. */
function phoneWorld(): World {
  const w = new World();
  for (const [bid, name] of [[SALON, "Kabsi Test Salon"], [GYM, "Kabsi Test Gym"], [GARAGE, "Kabsi Test Garage"]] as const) {
    w.biz.push({ id: bid, name, tz: "Asia/Dubai", country: "AE", pro: false, members: { [USERS.rashid]: "owner" }, demo: true });
  }
  w.bookSetting = "on";
  w.packs.set(SALON, { pack: "salon", version: 1, state: "test" });
  w.packs.set(GYM, { pack: "gym", version: 1, state: "test" });
  w.packs.set(GARAGE, { pack: "garage", version: 1, state: "test" });
  return w;
}

/** The sign-in side, as Signup 1's own test fakes it: one live code. */
function fakeSignin(): SigninDb {
  return {
    allow: async () => true,
    claim: async (code) => (code === "AB23CD" ? { result: "asked", id: "11111111-2222-4333-8444-555555555555", device: { browser: "Chrome", os: "Windows" }, city: "London" } : { result: "unknown" }),
    confirm: async () => ({ result: "unknown" }),
    signOut: async () => ({ result: "unknown" }),
  };
}

const LOC: Record<string, string> = { salon: SALON, gym: GYM, garage: GARAGE };

function lastButtons(w: World): { id: string; title: string }[] {
  const o = w.outbox.filter((x) => x.phone === ME).at(-1);
  return ((o?.buttons ?? []) as { id: string; title: string }[]);
}

let lastTap: string | null = null;
/** The buttons on the reply to each step of the row being run. */
let stepButtons: { id: string; title: string }[][] = [];
async function step(w: World, st: Step, at: string): Promise<string> {
  if (st.wait) w.now += st.wait * 60_000;
  const deps = { ...w.deps(), signin: fakeSignin() };
  if (st.send !== undefined) {
    if (st.quotes) w.extractMap[st.send] = JSON.stringify({ fields: st.quotes, said: { agreed: null, already_arranged: null } });
    if (st.route) w.aiMap[st.send] = JSON.stringify({ tool: st.route[0], args: st.route[1] ?? {}, lang: "en" });
    return await receive(deps, msg(w, ME, { text: st.send, forwarded: st.fwd }));
  }
  // "again": the button tapped last, tapped once more (an old button in the chat).
  const on = st.from ? stepButtons[st.from - 1] ?? [] : lastButtons(w);
  const b = st.tap === "again" && lastTap ? { id: lastTap } : on.find((x) => x.title === st.tap);
  assert.ok(b, `${at}: no button "${st.tap}" on the last message (${lastButtons(w).map((x) => x.title).join(", ")})`);
  lastTap = b.id;
  return await receive(deps, msg(w, ME, { button: b.id }));
}

async function runRow(r: Row): Promise<void> {
  const w = phoneWorld();
  if (!r.fresh) {
    // Working on the row's business: the role, then the business by its place in the list.
    w.conversation(ME).active_role = "business";
    w.conversation(ME).active_location_id = LOC[r.pack]!;
  }
  for (const [i, st] of (r.before ?? []).entries()) assert.equal(await step(w, st, `${r.id} before ${i + 1}`), st.result, `${r.id} before ${i + 1}`);
  const sentBefore = w.sent.length;
  const calls0 = w.aiCalls + w.extractCalls.length + w.noraCalls.length;
  stepButtons = [];
  const requests0 = w.requests.filter((q) => q.location === LOC[r.pack]).length;
  for (const [i, st] of r.steps.entries()) {
    const at = `${r.id} step ${i + 1} (${st.send ?? `tap ${st.tap}`})`;
    const got = await step(w, st, at);
    const reply = w.repliesTo(ME).at(-1);
    stepButtons.push(lastButtons(w));
    if (Deno.env.get("RBT_SHOW")) console.log(`${at} -> ${got}\n${reply?.body}\n[${lastButtons(w).map((x) => x.title).join(", ")}]`);
    assert.equal(got, st.result, `${at}: result ${got}. Reply: ${reply?.body}`);
    if (st.title) {
      const first = (reply?.body ?? "").split("\n")[0]!;
      assert.ok(first === `*${st.title}*` || first.startsWith(`*${st.title}* · `), `${at}: first line "${first}", expected *${st.title}*`);
    }
    if (st.says) assert.ok((reply?.body ?? "").includes(st.says) || (reply?.rows ?? []).join("\n").includes(st.says), `${at}: says "${st.says}". Reply: ${reply?.body}`);
    if (st.buttons) assert.deepEqual(lastButtons(w).map((b) => b.title), st.buttons, `${at}: buttons`);
  }
  for (const s of w.sent.slice(sentBefore).filter((x) => x.to === ME)) {
    const all = [s.body, s.footer ?? "", ...(s.rows ?? []), ...s.buttons].join("\n");
    assert.doesNotMatch(all, HOUSE, `${r.id}: a dash or an exclamation mark in "${all}"`);
    assert.doesNotMatch(all, CLAIM, `${r.id}: a claim word in "${all}"`);
    assert.ok(s.buttons.length <= 3, `${r.id}: more than 3 buttons`);
  }
  if (r.requests !== undefined) {
    assert.equal(w.requests.filter((q) => q.location === LOC[r.pack]).length - requests0, r.requests, `${r.id}: requests written`);
  }
  if (r.calls !== undefined) {
    assert.equal(w.aiCalls + w.extractCalls.length + w.noraCalls.length - calls0, r.calls, `${r.id}: model calls`);
  }
}

for (const r of ROWS) {
  Deno.test({ name: `RB-T ${r.id} ${r.area}: ${r.scenario}`, ignore: !!r.later, fn: () => runRow(r) });
}

Deno.test("RB-T: one row per scenario per pack, every id unique, the three packs the same scenarios", () => {
  const ids = new Set(ROWS.map((r) => r.id));
  assert.equal(ids.size, ROWS.length);
  const by = (p: string) => ROWS.filter((r) => r.pack === p).map((r) => r.scenario);
  assert.deepEqual(by("gym"), by("salon"));
  assert.deepEqual(by("garage"), by("salon"));
  assert.ok(Object.keys(FIXTURES).length === 3);
});

// ─── R-150 item 8: the Kabsi question check and the enquiry kind, phrase by phrase (pure, no model).

Deno.test("RB-T: a question about the account, data, privacy, price, plan, bill, login or Kabsi is Kabsi's; the business's own is not", () => {
  const salon = getPack("salon", 1)!, gym = getPack("gym", 1)!, garage = getPack("garage", 1)!;
  const kabsi = ["Is my data safe?", "is my data safe", "How much does Kabsi cost?", "How do I log in on my laptop?", "Can I delete my account and my data?",
    "Why was I charged twice this month?", "what plan am I on", "Who can see my customers' data?", "Is Kabsi secure?", "how do I change my password",
    "Where is my invoice?", "can I upgrade to pro?", "is my card saved", "Does Kabsi keep my clients' phone numbers private?"];
  for (const p of [salon, gym, garage]) for (const t of kabsi) assert.ok(kabsiQuestion(t, p), `${p.id}: ${t}`);
  const theirs: [string, typeof salon][] = [["how much is a manicure", salon], ["how much is a membership?", gym], ["what's the price of a pilates class", gym],
    ["how much for brakes?", garage], ["is the free trial still on?", gym], ["Maya asked about the price", gym], ["what's open", salon], ["is it any good", salon],
    ["how are my reviews doing?", salon], ["can you post our new menu?", salon], ["what time do we open on Friday?", garage], ["Sarah wants highlights", salon],
    // Review: questions about a named customer stay the book's (or the router's), never Nora's.
    ["Can you book Maya in at 3pm tomorrow? she will pay by card", salon], ["Can you sign in Maya for Friday 6pm?", gym],
    ["Can Maya come tomorrow at 5 and pay by card?", gym], ["Did Maya ask about the price?", salon], ["Did Maya ask about the price?", garage],
    ["Did Sara get her receipt?", salon]];
  for (const [t, p] of theirs) assert.ok(!kabsiQuestion(t, p), `${p.id}: ${t}`);
  // Where the pack has no such word, the trial and the price are Kabsi's.
  assert.ok(kabsiQuestion("is the free trial still on?", salon));
  assert.ok(kabsiQuestion("how much is it?", salon));
});

Deno.test("RB-T: asked about or a price makes an enquiry where the usual kind is an appointment or a job; the gym is unchanged", () => {
  const salon = getPack("salon", 1)!, gym = getPack("gym", 1)!, garage = getPack("garage", 1)!;
  for (const t of ["Dina asked about a keratin price", "Rana enquired about lashes", "Hala wants to know how much a facial is", "Nour asked if we do balayage"]) {
    assert.equal(enquiryKind(t, salon), "enquiry", t);
  }
  assert.equal(enquiryKind("Karim asked about a clutch price", garage), "enquiry");
  assert.equal(enquiryKind("Tom wants a quote for tyres", garage), "enquiry");
  for (const t of ["Sarah wants highlights Thursday", "Lina asked for a trim Friday 3pm", "Book Sarah for highlights", "Maya wants a haircut Tuesday 5pm, price 30"]) {
    assert.equal(enquiryKind(t, salon), null, t);
  }
  assert.equal(enquiryKind("Ali's Corolla brake job tomorrow 9am, quote 200", garage), null);
  assert.equal(enquiryKind("Ali Corolla brakes tomorrow 10am", garage), null);
  assert.equal(enquiryKind("Maya asked about a trial", gym), null, "the gym's usual kind is already an enquiry");
});

Deno.test("RB-T: at a business with the book off (Yawmiyati), Is my data safe? goes the way it went before, through the router", async () => {
  const w = phoneWorld();
  w.conversation(ME).active_role = "business";
  w.conversation(ME).active_location_id = "00000000-0000-4000-8000-000000000005";
  const text = "Is my data safe?";
  w.aiMap[text] = JSON.stringify({ tool: "question", args: { text }, lang: "en" });
  assert.equal(await receive(w.deps(), msg(w, ME, { text })), "nora");
  assert.equal(w.aiCalls, 1, "the router is asked, as before");
  assert.equal(w.noraCalls.length, 1);
});

// ─── Rashid's phone script for 16 Nov (docs/kabsi-3/phone-script-2026-11-16.md), run end to end on one fake world. The
// phone starts as Rashid's does after "reset test": staff tools and four businesses, none chosen.
const salonQ = (n: string | null, s: string | null, w: string | null) => ({ customer_name: n, phone: null, service: s, when: w, stylist: null });
const gymQ = (n: string | null, s: string | null, w: string | null) => ({ customer_name: n, phone: null, interest: s, when: w, goal: null });
const PHONE_SCRIPT: (Step & { n?: number })[] = [
  { send: "switch", result: "which_role" }, { tap: "My business", result: "which_business" }, { send: "3", result: "business_set" },
  { n: 1, send: "Book Sarah for highlights Thursday 3pm", quotes: salonQ("Sarah", "highlights", "Thursday 3pm"), result: "request_proposed", title: "📅 New appointment", buttons: ["Save", "Change"] },
  { n: 2, tap: "Save", result: "request_saved", title: "✅ Appointment 1 saved", buttons: ["Undo"] },
  { n: 3, send: "Sarah confirmed Thursday 3pm", result: "request_confirmed", buttons: ["Undo"] },
  { n: 4, send: "not highlights, a trim", result: "request_corrected", title: "✅ Appointment 1 corrected", buttons: ["Undo"] },
  { n: 5, send: "Dina asked about a keratin price", quotes: salonQ("Dina", "keratin", null), result: "request_proposed", title: "💬 New enquiry" },
  { tap: "Save", result: "request_saved", title: "✅ Enquiry 2 saved" },
  { n: 6, send: "Dina booked keratin Thursday 11am", result: "request_converted", buttons: ["Undo"] },
  { n: 7, send: "what's open", result: "request_open", title: "📋 2 open" },
  { n: 8, send: "Is my data safe?", result: "nora" },
  { n: 9, send: "write me a poem", result: "off_topic", title: "❓ Kabsi cannot help with that" },
  { n: 10, send: "#1", result: "request_summary", title: "📅 Appointment 1" },
  { n: 11, send: "switch", result: "which_role" }, { tap: "My business", result: "which_business" }, { send: "2", result: "business_set" },
  { n: 12, send: "Maya asked about a trial", quotes: gymQ("Maya", "a trial", null), result: "request_proposed", title: "💬 New enquiry" },
  { tap: "Save", result: "request_saved", title: "✅ Enquiry 1 saved" },
  { n: 13, send: "Maya booked a trial Thursday 6pm", result: "request_converted", buttons: ["Undo"] },
  { n: 14, send: "who asked about a trial this week", result: "request_asked" },
  { n: 15, send: "Omar asked about personal training", quotes: gymQ("Omar", "personal training", null), result: "request_proposed", title: "💬 New enquiry" },
  { tap: "Save", result: "request_saved", title: "✅ Enquiry 3 saved" },
  { send: "cancel 3", result: "request_status_ask", title: "❓ Close Enquiry 3?", buttons: ["Yes", "No"] },
  { tap: "Yes", result: "request_status_acknowledged", says: "Status: Not joining" },
  { n: 16, send: "switch", result: "which_role" }, { tap: "My business", result: "which_business" }, { send: "1", result: "business_set" },
  { n: 17, send: "Ali Corolla brakes squeaking tomorrow 10am", quotes: { customer_name: "Ali", phone: null, problem: "brakes squeaking", when: "tomorrow 10am", car: "Corolla", registration: null },
    result: "request_proposed", title: "🔧 New job" },
  { tap: "Save", result: "request_saved", title: "✅ Job 1 saved" },
  { n: 18, send: "1 ready", result: "request_status_ask", title: "❓ Mark Job 1 anyway?", buttons: ["Yes", "No"] },
  { tap: "Yes", result: "request_status_acknowledged", says: "Status: Ready" },
  { n: 19, send: "1 collected", result: "request_status", title: "✅ Job 1 is now Collected" },
  { send: "reopen 1", result: "request_status_ask", title: "❓ Reopen Job 1?", buttons: ["Yes", "No"] },
  { tap: "Yes", result: "request_status_acknowledged", says: "Status: Ready" },
  { n: 20, send: "STOP", result: "stopped" }, { send: "START", result: "started" },
];

Deno.test("RB-T: the 20-message phone script for 16 Nov runs end to end, with no wrong save", async () => {
  const w = phoneWorld();
  for (const [i, st] of PHONE_SCRIPT.entries()) {
    const at = `script ${i + 1} (${st.send ?? `tap ${st.tap}`})`;
    const got = await step(w, st, at);
    const reply = w.repliesTo(ME).at(-1);
    if (Deno.env.get("RBT_SHOW")) console.log(`${at} -> ${got}\n${reply?.body}\n[${lastButtons(w).map((x) => x.title).join(", ")}] ${reply?.footer ?? ""} ${(reply?.rows ?? []).join(" | ")}`);
    assert.equal(got, st.result, `${at}: ${got}. Reply: ${reply?.body}`);
    if (st.title) assert.ok((reply?.body ?? "").split("\n")[0]!.startsWith(`*${st.title}*`), `${at}: ${reply?.body}`);
    if (st.says) assert.ok((reply?.body ?? "").includes(st.says), `${at}: ${reply?.body}`);
    if (st.buttons) assert.deepEqual(lastButtons(w).map((b) => b.title), st.buttons, at);
  }
  // Exactly the requests the script saved: two at the salon (Sarah, Dina's enquiry) plus Dina's appointment, three at the gym
  // plus Maya's visit, one job at the garage. Nothing at Yawmiyati.
  assert.equal(w.requests.filter((q) => q.location === SALON).length, 3);
  assert.equal(w.requests.filter((q) => q.location === GYM).length, 3);
  assert.equal(w.requests.filter((q) => q.location === GARAGE).length, 1);
  assert.equal(new Set(PHONE_SCRIPT.filter((s) => s.n).map((s) => s.n)).size, 20);
});
