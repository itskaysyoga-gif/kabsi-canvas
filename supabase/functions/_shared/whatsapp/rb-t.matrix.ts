// RB-T (master plan 30.50 item 8): the request book scenario matrix. One row per scenario per pack (salon, gym, garage),
// each a short conversation on Rashid's phone (staff tools and four businesses) with the expected result code and the
// expected reply in the Look 2 style (the marker and bold title of the first block, and the buttons). Pure data: no
// imports, so the same rows drive the fake-world test (rb-t.test.ts) and the document (docs/kabsi-3/scenario-matrix.md,
// written by `matrixMarkdown`, checked by tests/rb-t-matrix.test.ts). Customers are fictional.
//
// The fake world's clock: Monday 26 Oct 2026, 19:00 in Dubai. "Thursday" is Thu 29 Oct, "tomorrow" Tue 27 Oct.
// `quotes` are what a model that quotes correctly would quote for the message (the fake extraction); `route` is what the
// fake router answers when the message reaches it. A step with neither makes no model call.

export type PackId = "salon" | "gym" | "garage";
export type Quotes = Record<string, string | null>;
export type Step = {
  /** Typed words. */
  send?: string;
  /** Tap the button with this title on the last message ("again": the button tapped last, once more). */
  tap?: string;
  /** With `tap`: the button is on the reply to this step of the row (1-based), not on the last message. */
  from?: number;
  /** Sent as a forwarded message. */
  fwd?: true;
  /** The fake extraction answer for this message (field key to the quoted words). */
  quotes?: Quotes;
  /** The fake router's answer for this message: a tool and its arguments. */
  route?: [string, Record<string, string>?];
  /** Minutes that pass before this step. */
  wait?: number;
  /** The result code expected. */
  result: string;
  /** The first line expected, without the stars and without " · business": marker and title. */
  title?: string;
  /** Words the reply must hold. */
  says?: string;
  /** The buttons expected, in order (titles). */
  buttons?: string[];
};
export type Row = {
  id: string;
  pack: PackId;
  area: string;
  scenario: string;
  /** Steps run first and checked only for their result code (a saved request, an enquiry). */
  before?: Step[];
  steps: Step[];
  /** Requests at the business after the row (open and closed), when the row says. */
  requests?: number;
  /** Model calls the row may make in its steps (router plus extraction plus Nora); undefined means not counted. */
  calls?: number;
  /** The phone starts with no role and no business chosen (otherwise it is working on the row's business). */
  fresh?: true;
  /** Not yet right: the LATER row that carries it. The test skips the row and the totals count it as not passing. */
  later?: string;
};

type Fixture = {
  pack: PackId;
  list: number;
  kind: string; // the default kind's word
  mark: string; // the default kind's marker
  name: string;
  /** A full request in the pack's words, and its quotes. */
  cap: string;
  capQ: Quotes;
  /** The same customer, the same service, another day (a duplicate). */
  dup: string;
  dupQ: Quotes;
  /** A second message that revises the waiting proposal, and its quotes. */
  rev: string;
  revQ: Quotes;
  /** The open statuses to walk, with the typed words, the result, the title and whether Kabsi asks first. */
  moves: Step[];
  /** A move that skips a step or ends the request: asked first. */
  skip: { say: string; title: string };
  /** A status change by name (after `wait` minutes). */
  byName: { say: string; title: string; wait?: number };
  /** A correction of the last request touched: from, to, the title after it. */
  correct: { say: string; title: string };
  correctNo: string;
  /** An enquiry at this business, and its quotes. */
  enq: string;
  enqQ: Quotes;
  enqName: string;
  /** The enquiry becoming the business's other kind. */
  convert: string;
  convertKind: string;
  /** A new request of the other kind when there is no enquiry. */
  bookedNew: string;
  bookedNewQ: Quotes;
  bookedNewTitle: string;
  /** Who asked about a service. */
  asked: string;
  /** Typos: a day, a month, a time word, a service, a name. */
  tDay: { text: string; q: Quotes; says: string };
  tMonth: { text: string; q: Quotes; says: string };
  tTime: { text: string; q: Quotes; says: string };
  tSvc: { text: string; q: Quotes; says: string };
  tName: { text: string; q: Quotes; says: string };
  vague: { text: string; q: Quotes; says: string };
  noTime: { text: string; q: Quotes };
  noName: { text: string; q: Quotes };
  arabic: { text: string; q: Quotes };
  written: { text: string; q: Quotes; says: string };
  mixed: { text: string; q: Quotes; says: string };
  /** The confirmation by name with a time, and by number after a time is set. */
  confirm: string;
};

const salonQ = (n: string | null, s: string | null, w: string | null, extra: Quotes = {}): Quotes =>
  ({ customer_name: n, phone: null, service: s, when: w, stylist: null, ...extra });
const gymQ = (n: string | null, s: string | null, w: string | null, extra: Quotes = {}): Quotes =>
  ({ customer_name: n, phone: null, interest: s, when: w, goal: null, ...extra });
const garageQ = (n: string | null, s: string | null, w: string | null, extra: Quotes = {}): Quotes =>
  ({ customer_name: n, phone: null, problem: s, when: w, car: null, registration: null, ...extra });

export const FIXTURES: Record<PackId, Fixture> = {
  salon: {
    pack: "salon", list: 3, kind: "Appointment", mark: "📅", name: "Sarah",
    cap: "Book Sarah for highlights Thursday 3pm", capQ: salonQ("Sarah", "highlights", "Thursday 3pm"),
    dup: "Book Sarah for highlights Friday 4pm", dupQ: salonQ("Sarah", "highlights", "Friday 4pm"),
    rev: "make it Friday 4pm", revQ: salonQ(null, null, "Friday 4pm"),
    // The appointment is Thursday 3pm: three days on, it has come, so "came in" applies without a question.
    moves: [{ wait: 4320, send: "1 came in", result: "request_status", title: "✅ Appointment 1 updated", says: "Status: Came in", buttons: ["Undo"] }],
    skip: { say: "cancel 1", title: "❓ Close Appointment 1?" },
    byName: { say: "Sarah came in", title: "✅ Appointment 1 updated", wait: 4320 },
    correct: { say: "not highlights, a trim", title: "✅ Appointment 1 corrected" },
    correctNo: "not pedicure, a facial",
    enq: "Dina asked about a keratin price", enqQ: salonQ("Dina", "keratin", null), enqName: "Dina",
    convert: "Dina booked keratin Thursday 11am", convertKind: "Appointment",
    bookedNew: "Hala booked a facial Thursday 11am", bookedNewQ: salonQ("Hala", "a facial", "Thursday 11am"), bookedNewTitle: "📅 New appointment",
    asked: "who asked about keratin this week",
    tDay: { text: "Book Lina for a manicure thrsday 3pm", q: salonQ("Lina", "a manicure", "thrsday 3pm"), says: "Thu 29 Oct 15:00" },
    tMonth: { text: "Book Lina for a manicure 3 Novmber 3pm", q: salonQ("Lina", "a manicure", "3 Novmber 3pm"), says: "Tue 3 Nov 15:00" },
    tTime: { text: "Lina manicure tmrw agternoon", q: salonQ("Lina", "manicure", "tmrw agternoon"), says: "Tomorrow afternoon" },
    tSvc: { text: "Lina manicur Thursday 3pm", q: salonQ("Lina", "manicur", "Thursday 3pm"), says: "Service: Manicure" },
    tName: { text: "Sarha highlights Thursday 3pm", q: salonQ("Sarha", "highlights", "Thursday 3pm"), says: "Name: Sarha" },
    vague: { text: "Rana trim sometime next week", q: salonQ("Rana", "trim", "sometime next week"), says: "When:" },
    noTime: { text: "Rana trim", q: salonQ("Rana", "trim", null) },
    noName: { text: "a client wants a trim Thursday 3pm", q: salonQ(null, "a trim", "Thursday 3pm") },
    arabic: { text: "سارة صبغة الخميس بعد الظهر", q: salonQ("سارة", "صبغة", "الخميس بعد الظهر") },
    written: { text: "Rima bedha highlights bukra l 3", q: salonQ("Rima", "highlights", "bukra l 3"), says: "Service: Highlights" },
    mixed: { text: "Sarah ba3d bukra highlights l 3", q: salonQ("Sarah", "highlights", "ba3d bukra highlights l 3"), says: "Service: Highlights" },
    confirm: "Sarah confirmed Thursday 3pm",
  },
  gym: {
    pack: "gym", list: 2, kind: "Enquiry", mark: "💬", name: "Maya",
    cap: "Maya asked about a trial", capQ: gymQ("Maya", "a trial", null),
    dup: "Maya asked about a trial again", dupQ: gymQ("Maya", "a trial", null),
    rev: "she wants pilates", revQ: gymQ(null, "pilates", null),
    moves: [{ send: "1 contacted", result: "request_status", title: "✅ Enquiry 1 is now Contacted", buttons: ["Undo"] }],
    skip: { say: "1 lost", title: "❓ Close Enquiry 1?" },
    byName: { say: "Maya contacted", title: "✅ Enquiry 1 is now Contacted" },
    correct: { say: "not trial, a tour", title: "✅ Enquiry 1 corrected" },
    correctNo: "not yoga, spin",
    enq: "Omar asked about personal training", enqQ: gymQ("Omar", "personal training", null), enqName: "Omar",
    convert: "Omar booked a tour Thursday 11am", convertKind: "Visit",
    bookedNew: "Sam booked a tour Thursday 11am", bookedNewQ: gymQ("Sam", "a tour", "Thursday 11am"), bookedNewTitle: "📅 New visit",
    asked: "who asked about a trial this week",
    tDay: { text: "Hana wants a tour thrsday 5pm", q: gymQ("Hana", "a tour", "thrsday 5pm"), says: "Thu 29 Oct 17:00" },
    tMonth: { text: "Hana wants a tour 3 Novmber 5pm", q: gymQ("Hana", "a tour", "3 Novmber 5pm"), says: "Tue 3 Nov 17:00" },
    tTime: { text: "Hana wants a tour tmrw agternoon", q: gymQ("Hana", "a tour", "tmrw agternoon"), says: "Tomorrow afternoon" },
    tSvc: { text: "Hana asked about pilatess", q: gymQ("Hana", "pilatess", null), says: "Asked about: Class" },
    tName: { text: "Mya asked about a trial", q: gymQ("Mya", "a trial", null), says: "Name: Mya" },
    vague: { text: "Hana wants a tour sometime next week", q: gymQ("Hana", "a tour", "sometime next week"), says: "When:" },
    noTime: { text: "Hana asked about membership", q: gymQ("Hana", "membership", null) },
    noName: { text: "someone asked about a trial", q: gymQ(null, "a trial", null) },
    arabic: { text: "مايا سألت عن التجربة المجانية", q: gymQ("مايا", "التجربة المجانية", null) },
    written: { text: "3ali bedo yeshterek membership", q: gymQ("3ali", "membership", null), says: "Asked about: Membership" },
    mixed: { text: "Maya bedha trial Thursday 5pm", q: gymQ("Maya", "trial", "Thursday 5pm"), says: "Asked about: Trial" },
    confirm: "Maya confirmed Thursday 5pm",
  },
  garage: {
    pack: "garage", list: 1, kind: "Job", mark: "🔧", name: "Ali",
    cap: "Ali Corolla brakes squeaking tomorrow 10am", capQ: garageQ("Ali", "brakes squeaking", "tomorrow 10am", { car: "Corolla" }),
    dup: "Ali Corolla brakes Thursday 10am", dupQ: garageQ("Ali", "brakes", "Thursday 10am", { car: "Corolla" }),
    rev: "make it Thursday 9am", revQ: garageQ(null, null, "Thursday 9am"),
    moves: [
      { send: "1 here", result: "request_status", title: "✅ Job 1 updated", says: "Status: In the shop", buttons: ["Undo"] },
      { send: "1 ready", result: "request_status", title: "✅ Job 1 is now Ready", buttons: ["Undo"] },
      { send: "1 collected", result: "request_status", title: "✅ Job 1 is now Collected", buttons: ["Undo"] },
    ],
    skip: { say: "1 ready", title: "❓ Mark Job 1 anyway?" },
    byName: { say: "Ali's car is here", title: "✅ Job 1 updated" },
    correct: { say: "not Corolla, Civic", title: "✅ Job 1 corrected" },
    correctNo: "not tyres, a battery",
    enq: "Karim asked about a clutch price", enqQ: garageQ("Karim", "clutch", null), enqName: "Karim",
    convert: "Karim booked a clutch Thursday 11am", convertKind: "Job",
    bookedNew: "Sam booked an oil change Thursday 11am", bookedNewQ: garageQ("Sam", "an oil change", "Thursday 11am"), bookedNewTitle: "🔧 New job",
    asked: "who asked about a clutch this week",
    tDay: { text: "Sam Golf oil change thrsday 9am", q: garageQ("Sam", "oil change", "thrsday 9am", { car: "Golf" }), says: "Thu 29 Oct 09:00" },
    tMonth: { text: "Sam Golf oil change 3 Novmber 9am", q: garageQ("Sam", "oil change", "3 Novmber 9am", { car: "Golf" }), says: "Tue 3 Nov 09:00" },
    tTime: { text: "Sam Golf oil change tmrw mornng", q: garageQ("Sam", "oil change", "tmrw mornng", { car: "Golf" }), says: "Tomorrow morning" },
    tSvc: { text: "Sam Golf suspensoin Thursday 9am", q: garageQ("Sam", "suspensoin", "Thursday 9am", { car: "Golf" }), says: "Work needed: Suspension" },
    tName: { text: "Aly Corolla brakes Thursday 9am", q: garageQ("Aly", "brakes", "Thursday 9am", { car: "Corolla" }), says: "Name: Aly" },
    vague: { text: "Sam Golf oil change sometime next week", q: garageQ("Sam", "oil change", "sometime next week", { car: "Golf" }), says: "When:" },
    noTime: { text: "Sam Golf oil change", q: garageQ("Sam", "oil change", null, { car: "Golf" }) },
    noName: { text: "a customer wants brakes done Thursday 9am", q: garageQ(null, "brakes", "Thursday 9am") },
    arabic: { text: "علي كورولا فرامل بكرة الساعة ١٠", q: garageQ("علي", "فرامل", "بكرة الساعة ١٠", { car: "كورولا" }) },
    written: { text: "3ali korolla frem bukra l 10", q: garageQ("3ali", "frem", "bukra l 10", { car: "korolla" }), says: "Work needed: Brakes" },
    mixed: { text: "Ali's Civic, ghayyer zeit w filter, ba3d el dohr", q: garageQ("Ali", "zeit w filter", "ba3d el dohr", { car: "Civic" }), says: "Work needed: Oil change" },
    confirm: "Ali confirmed tomorrow 10am",
  },
};

const PACKS: PackId[] = ["salon", "gym", "garage"];

/** The steps that save the pack's full request (request 1). */
const saved = (f: Fixture): Step[] => [
  { send: f.cap, quotes: f.capQ, result: "request_proposed" },
  { tap: "Save", result: "request_saved" },
];
/** The steps that save an enquiry. */
const enquiry = (f: Fixture): Step[] => [
  { send: f.enq, quotes: f.enqQ, result: "request_proposed" },
  { tap: "Save", result: "request_saved" },
];

type Scenario = { area: string; scenario: string; make: (f: Fixture) => Omit<Row, "id" | "pack" | "area" | "scenario"> };

const S: Scenario[] = [
  // ── Tools: capture, find, list open, update, correct, summarize.
  { area: "Capture", scenario: "A full request, read by code, one extraction call, no router", make: (f) => ({
    steps: [{ send: f.cap, quotes: f.capQ, result: "request_proposed", title: `${f.mark} New ${f.kind.toLowerCase()}`, buttons: ["Save", "Change"] }],
    requests: 0, calls: 1 }) },
  { area: "Capture", scenario: "Save saves it once; the old Save again is already handled", make: (f) => ({
    steps: [...saved(f).slice(0, 1), { tap: "Save", result: "request_saved", title: `✅ ${f.kind} 1 saved`, buttons: ["Undo"] },
      { tap: "again", result: "request_already_saved" }], requests: 1 }) },
  { area: "Capture", scenario: "Typed save works like the button", make: (f) => ({
    steps: [{ send: f.cap, quotes: f.capQ, result: "request_proposed" }, { send: "save", result: "request_saved" }], requests: 1 }) },
  { area: "Capture", scenario: "Change, then the new words revise the waiting proposal", make: (f) => ({
    steps: [{ send: f.cap, quotes: f.capQ, result: "request_proposed" }, { tap: "Change", result: "request_change" },
      { send: f.rev, quotes: f.revQ, result: "request_revised", title: `${f.mark} New ${f.kind.toLowerCase()}` }, { tap: "Save", result: "request_saved" }],
    requests: 1 }) },
  { area: "Capture", scenario: "No to a waiting proposal drops it; nothing saved", make: (f) => ({
    steps: [{ send: f.cap, quotes: f.capQ, result: "request_proposed" }, { send: "no", result: "request_dropped" }], requests: 0 }) },
  { area: "Capture", scenario: "Missing name: the proposal asks for it, Save stays off until it is given", make: (f) => ({
    steps: [{ send: f.noName.text, quotes: f.noName.q, result: "request_proposed", says: "Still needed: Name" }], requests: 0 }) },
  { area: "Find", scenario: "Find by number: the request in full, no model", make: (f) => ({
    before: saved(f), steps: [{ send: "1", result: "request_summary", title: `${f.mark} ${f.kind} 1` }], calls: 0 }) },
  { area: "Find", scenario: "Find by #number", make: (f) => ({
    before: saved(f), steps: [{ send: "#1", result: "request_summary", title: `${f.mark} ${f.kind} 1` }], calls: 0 }) },
  { area: "Find", scenario: "Find by name, through the router's find tool", make: (f) => ({
    before: saved(f), steps: [{ send: `find ${f.name}`, route: ["request_find", { query: f.name }], result: "request_find" }] }) },
  { area: "Find", scenario: "A number with no request", make: (f) => ({
    before: saved(f), steps: [{ send: "7", result: "request_summary", says: "not found" }], calls: 0 }) },
  { area: "List open", scenario: "What's open: a list message, no model", make: (f) => ({
    before: saved(f), steps: [{ send: "what's open", result: "request_open", title: "📋 1 open" }], calls: 0 }) },
  { area: "List open", scenario: "What's open with nothing open", make: () => ({
    steps: [{ send: "what's open", result: "request_open", says: "Nothing" }], calls: 0 }) },
  { area: "List open", scenario: "What's unconfirmed", make: (f) => ({
    before: saved(f), steps: [{ send: "what's unconfirmed", result: "request_unconfirmed" }], calls: 0 }) },
  { area: "List open", scenario: "Who asked about a service this week", make: (f) => ({
    before: enquiry(f), steps: [{ send: f.asked, result: "request_asked" }], calls: 0 }) },
  { area: "Update", scenario: "Each open status in order by number, each with Undo", make: (f) => ({
    before: saved(f), steps: f.moves, calls: 0 }) },
  { area: "Update", scenario: "A status change by name", make: (f) => ({
    before: saved(f), steps: [{ wait: f.byName.wait, send: f.byName.say, result: "request_status", title: f.byName.title }], calls: 0 }) },
  { area: "Update", scenario: "A skipped step or an ending is asked first; yes applies it", make: (f) => ({
    before: saved(f), steps: [{ send: f.skip.say, result: "request_status_ask", title: f.skip.title, buttons: ["Yes", "No"] },
      { send: "yes", result: "request_status_acknowledged" }], calls: 0 }) },
  { area: "Update", scenario: "The question before a change, answered no: nothing changes", make: (f) => ({
    before: saved(f), steps: [{ send: f.skip.say, result: "request_status_ask" }, { send: "no", result: "request_ask_no" }], calls: 0 }) },
  { area: "Update", scenario: "Cancel by number asks first", make: (f) => ({
    before: saved(f), steps: [{ send: "cancel 1", result: "request_status_ask", buttons: ["Yes", "No"] }, { tap: "Yes", result: "request_status_acknowledged" }],
    calls: 0 }) },
  { area: "Update", scenario: "Several in one message", make: (f) => ({
    before: [...saved(f), { send: f.dup.replace(f.name, "Rana"), quotes: { ...f.dupQ, customer_name: "Rana" }, result: "request_proposed" },
      { tap: "Save", result: "request_saved" }],
    steps: [{ wait: f.pack === "salon" ? 8640 : undefined, send: `${f.moves[0]!.send!.replace(/^1 /, "")} 1 2`, result: "request_status_many" }], calls: 0 }) },
  { area: "Update", scenario: "No show after the time has passed", make: (f) => ({
    before: f.pack === "gym" ? [...enquiry(f), { send: f.convert, result: "request_converted" }] : saved(f),
    steps: [{ wait: 4320, send: `no show ${f.pack === "gym" ? 2 : 1}`, result: "request_status", says: f.pack === "salon" ? "Status: No show" : "Status: Did not come",
      buttons: ["Undo"] }], calls: 0 }) },
  { area: "Update", scenario: "Reopen a closed request: asked first, back to where it was", make: (f) => ({
    before: [...saved(f), ...(f.pack === "garage" ? f.moves : [{ send: f.skip.say, result: "request_status_ask" }, { send: "yes", result: "request_status_acknowledged" }])],
    steps: [{ send: "reopen 1", result: "request_status_ask", title: `❓ Reopen ${f.kind} 1?`, buttons: ["Yes", "No"] },
      { tap: "Yes", result: "request_status_acknowledged", says: f.pack === "garage" ? "Status: Ready" : f.pack === "gym" ? "Status: Not contacted" : "Status: Requested" }],
    calls: 0 }) },
  { area: "Update", scenario: "Reopen a request that is still open changes nothing", make: (f) => ({
    before: saved(f), steps: [{ send: "reopen 1", result: "request_status_refused", says: "is not closed" }], calls: 0 }) },
  { area: "Correct", scenario: "Not X, Y on the request touched last: before and after, Undo", make: (f) => ({
    before: saved(f), steps: [{ send: f.correct.say, result: "request_corrected", title: f.correct.title, buttons: ["Undo"] }], calls: 0 }) },
  { area: "Correct", scenario: "Not X, Y with a number", make: (f) => ({
    before: saved(f), steps: [{ send: `1 ${f.correct.say}`, result: "request_corrected", title: f.correct.title }], calls: 0 }) },
  { area: "Correct", scenario: "A correction of words that are not on the request", make: (f) => ({
    before: saved(f), steps: [{ send: f.correctNo, result: "request_correct_not_found" }], calls: 0 }) },
  { area: "Summarize", scenario: "The summary after changes shows the latest facts", make: (f) => ({
    before: saved(f), steps: [{ send: f.correct.say, result: "request_corrected" }, { send: "1", result: "request_summary", title: `${f.mark} ${f.kind} 1` }],
    calls: 0 }) },
  // ── Confirmations, both orders.
  { area: "Confirm", scenario: "The customer confirmed, with a time: one tap sets the time and records it", make: (f) => ({
    before: saved(f), steps: f.pack === "garage"
      ? [{ send: f.confirm, result: "request_confirm_refused:not_appointment", title: "❓ Not an appointment" }]
      : f.pack === "gym"
      ? [{ send: f.confirm, result: "request_confirm_refused:not_appointment", title: "❓ Not an appointment" }]
      : [{ send: f.confirm, result: "request_confirmed", buttons: ["Undo"] }],
    calls: 0 }) },
  { area: "Confirm", scenario: "The time first, then the confirmation by number", make: (f) => ({
    before: f.pack === "gym" ? [...enquiry(f), { send: f.convert, result: "request_converted" }] : saved(f),
    steps: f.pack === "garage"
      ? [{ send: "confirmed 1", result: "request_confirm_refused:not_appointment" }]
      : [{ send: `confirmed ${f.pack === "gym" ? 2 : 1}`, result: "request_confirmed", buttons: ["Undo"] }],
    calls: 0 }) },
  { area: "Confirm", scenario: "Confirmed with no time on the request and none said", make: (f) => ({
    before: [{ send: f.noTime.text, quotes: f.noTime.q, result: "request_proposed" }, { tap: "Save", result: "request_saved" }],
    steps: f.pack === "salon" ? [{ send: "confirmed 1", result: "request_confirm_refused:time_required", title: "❓ Enter a time first" }]
      : [{ send: "confirmed 1", result: "request_confirm_refused:not_appointment" }],
    calls: 0 }) },
  // ── Convert.
  { area: "Convert", scenario: "An enquiry booked: it closes as converted and a linked request starts", make: (f) => ({
    before: enquiry(f), steps: [{ send: f.convert, result: "request_converted", buttons: ["Undo"] }], calls: 0 }) },
  { area: "Convert", scenario: "Booked with no enquiry for that name: a new request of the other kind", make: (f) => ({
    steps: [{ send: f.bookedNew, quotes: f.bookedNewQ, result: "request_proposed", title: f.bookedNewTitle }, { tap: "Save", result: "request_saved" }],
    requests: 1, calls: 1 }) },
  { area: "Convert", scenario: "Undo of a conversion restores the enquiry", make: (f) => ({
    before: [...enquiry(f), { send: f.convert, result: "request_converted" }], steps: [{ send: "undo", result: "request_undone" }], calls: 0 }) },
  // ── Undo and its limits.
  { area: "Undo", scenario: "Undo inside 10 minutes", make: (f) => ({
    before: saved(f), steps: [f.moves[0]!, { tap: "Undo", result: "request_undone", title: "↩️ Undone" }], calls: 0 }) },
  { area: "Undo", scenario: "Typed undo", make: (f) => ({
    before: saved(f), steps: [f.moves[0]!, { send: "undo", result: "request_undone" }], calls: 0 }) },
  { area: "Undo", scenario: "Undo after 10 minutes is refused", make: (f) => ({
    before: saved(f), steps: [f.moves[0]!, { wait: 11, tap: "Undo", result: "request_undo_refused:window_passed" }],
    calls: 0 }) },
  { area: "Undo", scenario: "The same Undo tapped twice undoes once", make: (f) => ({
    before: saved(f), steps: [f.moves[0]!, { tap: "Undo", result: "request_undone" }, { tap: "again", result: "request_undo_refused:already_undone", title: "↩️ Already undone" }], calls: 0 }) },
  { area: "Undo", scenario: "Undo of the save removes the request", make: (f) => ({
    steps: [...saved(f), { tap: "Undo", result: "request_undone" }], calls: 1 }) },
  { area: "Undo", scenario: "Undo of an older change, after a newer one, is refused", make: (f) => ({
    before: saved(f), steps: [{ send: f.correct.say, result: "request_corrected" }, f.moves[0]!,
      { tap: "Undo", from: 1, result: "request_undo_refused:not_latest" }], calls: 0 }) },
  // ── Duplicates.
  { area: "Duplicates", scenario: "The same name and service again: update or add", make: (f) => ({
    before: saved(f), steps: [{ send: f.dup, quotes: f.dupQ, result: "request_duplicate", buttons: ["Update #1", "Add new"] }] }) },
  { area: "Duplicates", scenario: "Update #1 puts the new time on #1; still one request", make: (f) => ({
    before: saved(f), steps: [{ send: f.dup, quotes: f.dupQ, result: "request_duplicate" }, { tap: "Update #1", result: f.pack === "gym" ? "request_update_same" : "request_updated" }],
    requests: 0 }) },
  { area: "Duplicates", scenario: "Add new saves a second request", make: (f) => ({
    before: saved(f), steps: [{ send: f.dup, quotes: f.dupQ, result: "request_duplicate" }, { tap: "Add new", result: "request_saved" }], requests: 1 }) },
  { area: "Duplicates", scenario: "The same name and service more than 7 days later is a new request", make: (f) => ({
    before: saved(f), steps: [{ wait: 8 * 1440, send: f.dup, quotes: f.dupQ, result: "request_proposed", buttons: ["Save", "Change"] }] }) },
  // ── Typos.
  { area: "Typos", scenario: "A day misspelled", make: (f) => ({ steps: [{ send: f.tDay.text, quotes: f.tDay.q, result: "request_proposed", says: f.tDay.says }] }) },
  { area: "Typos", scenario: "A month misspelled", make: (f) => ({ steps: [{ send: f.tMonth.text, quotes: f.tMonth.q, result: "request_proposed", says: f.tMonth.says }] }) },
  { area: "Typos", scenario: "Time words misspelled", make: (f) => ({ steps: [{ send: f.tTime.text, quotes: f.tTime.q, result: "request_proposed", says: f.tTime.says }] }) },
  { area: "Typos", scenario: "A service misspelled", make: (f) => ({ steps: [{ send: f.tSvc.text, quotes: f.tSvc.q, result: "request_proposed", says: f.tSvc.says }] }) },
  { area: "Typos", scenario: "A name misspelled is kept as written, never matched", make: (f) => ({
    steps: [{ send: f.tName.text, quotes: f.tName.q, result: "request_proposed", says: f.tName.says }] }) },
  // ── Vague and missing times.
  { area: "Times", scenario: "A vague time is kept as words, no hour invented", make: (f) => ({
    steps: [{ send: f.vague.text, quotes: f.vague.q, result: "request_proposed", says: f.vague.says }] }) },
  { area: "Times", scenario: "No time at all: no When line, Save still works", make: (f) => ({
    steps: [{ send: f.noTime.text, quotes: f.noTime.q, result: "request_proposed" }, { tap: "Save", result: "request_saved" }], requests: 1 }) },
  // ── Languages.
  { area: "Languages", scenario: "Arabic script: through the router to the one extraction, name as written", make: (f) => ({
    steps: [{ send: f.arabic.text, route: ["request_new"], quotes: f.arabic.q, result: "request_proposed", says: `Name: ${f.arabic.q.customer_name}` }] }) },
  { area: "Languages", scenario: "Written-out Arabic: read by code, digits in the name are not a phone", make: (f) => ({
    steps: [{ send: f.written.text, quotes: f.written.q, result: "request_proposed", says: f.written.says }] }) },
  { area: "Languages", scenario: "Mixed English and written-out Arabic", make: (f) => ({
    steps: [{ send: f.mixed.text, quotes: f.mixed.q, result: "request_proposed", says: f.mixed.says }] }) },
  // ── Guarded words.
  { area: "Guarded words", scenario: "STOP wins even with a proposal waiting; START comes back", make: (f) => ({
    steps: [{ send: f.cap, quotes: f.capQ, result: "request_proposed" }, { send: "STOP", result: "stopped" }, { send: "START", result: "started" }],
    requests: 0 }) },
  { area: "Guarded words", scenario: "Yes with nothing waiting keeps its meaning", make: () => ({ steps: [{ send: "yes", result: "yes_nothing", title: "📋 Nothing is waiting" }], requests: 0 }) },
  { area: "Guarded words", scenario: "Yes while a proposal waits saves it, never an approval elsewhere", make: (f) => ({
    steps: [{ send: f.cap, quotes: f.capQ, result: "request_proposed" }, { send: "yes", result: "request_saved" }], requests: 1 }) },
  { area: "Guarded words", scenario: "closed alone stays hours; closed with a number is the request", make: (f) => ({
    before: saved(f), steps: [{ send: "closed 1", result: "request_ref_closed" }, { send: "closed", result: "hours_no_day", title: "🕒 Which day, and what hours?" }], calls: 0 }) },
  { area: "Guarded words", scenario: "post alone stays a Google post; post with a number is the request", make: (f) => ({
    before: saved(f), steps: [{ send: "post", result: "post_ask" }, { send: "post 1", result: "request_ref_post" }], calls: 0 }) },
  { area: "Guarded words", scenario: "cancel alone stays billing", make: () => ({ steps: [{ send: "cancel", result: "billing_stub" }], requests: 0, calls: 0 }) },
  { area: "Guarded words", scenario: "A bare number is the request", make: (f) => ({ before: saved(f), steps: [{ send: "1", result: "request_summary" }], calls: 0 }) },
  { area: "Guarded words", scenario: "Kabsi sign in CODE goes to sign-in, never the book", make: () => ({
    steps: [{ send: "Kabsi sign in AB23CD", result: "signin_asked" }], requests: 0, calls: 0 }) },
  // ── Several businesses, forwards, off topic, questions for Nora.
  { area: "Phone with several businesses", scenario: "Nothing chosen yet: the role and business questions hold the request, then it is read", make: (f) => ({
    fresh: true, steps: [{ send: f.cap, quotes: f.capQ, result: "which_role" }, { tap: "My business", result: "which_business" },
      { send: String(f.list), result: "request_proposed" }], requests: 0 }) },
  { area: "Phone with several businesses", scenario: "A request at one business is never seen at another", make: (f) => ({
    before: saved(f), steps: [{ send: "switch", result: "which_role" }, { tap: "My business", result: "which_business" },
      { send: String(f.list === 1 ? 2 : 1), result: "business_set" }, { send: "1", result: "request_summary", says: "not found" }] }) },
  { area: "Forwarded", scenario: "A forwarded request is not read by the book", make: (f) => ({
    steps: [{ send: f.cap, fwd: true, result: "off_topic" }], requests: 0 }) },
  { area: "Forwarded", scenario: "A forwarded yes never saves a waiting proposal", make: (f) => ({
    steps: [{ send: f.cap, quotes: f.capQ, result: "request_proposed" }, { send: "Yes", fwd: true, result: "forwarded_yes" }], requests: 0 }) },
  { area: "Off topic", scenario: "A general assistant ask gets the fixed line, no model", make: () => ({
    steps: [{ send: "write me a poem", result: "off_topic", title: "❓ Kabsi cannot help with that" }], calls: 0 }) },
  { area: "Off topic", scenario: "Something unclear the router places nowhere gets the fixed line", make: () => ({
    steps: [{ send: "is it any good", route: ["question", { text: "is it any good" }], result: "off_topic" }], calls: 1 }) },
  { area: "Questions for Nora", scenario: "Is my data safe? goes to Nora, read by code", make: () => ({
    steps: [{ send: "Is my data safe?", result: "nora" }], calls: 1 }) },
  { area: "Questions for Nora", scenario: "A question about the price of Kabsi goes to Nora", make: () => ({
    steps: [{ send: "How much does Kabsi cost?", result: "nora" }], calls: 1 }) },
  { area: "Questions for Nora", scenario: "A question about logging in goes to Nora", make: () => ({
    steps: [{ send: "How do I log in on my laptop?", result: "nora" }], calls: 1 }) },
  { area: "Questions for Nora", scenario: "A question about my account or privacy goes to Nora", make: () => ({
    steps: [{ send: "Can I delete my account and my data?", result: "nora" }], calls: 1 }) },
  { area: "Questions for Nora", scenario: "A question about the bill or the plan goes to Nora", make: () => ({
    steps: [{ send: "Why was I charged twice this month?", result: "nora" }], calls: 1 }) },
  { area: "Questions for Nora", scenario: "A customer asking the business a price stays the book's", make: (f) => ({
    steps: [{ send: f.enq, quotes: f.enqQ, result: "request_proposed" }], calls: 1 }) },
];

export const ROWS: Row[] = S.flatMap((s, i) => PACKS.map((p): Row => ({
  id: `S${String(i + 1).padStart(2, "0")}-${p}`, pack: p, area: s.area, scenario: s.scenario, ...s.make(FIXTURES[p]),
})));

// ── The document.

// The document keeps Arabic script out, as engineering-reference.md does: the rows hold it, the document names it.
const ARABIC = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]+(?:[\s\u0660-\u0669]+[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff\u0660-\u0669]+)*/g;
const cell = (s: string) =>
  s.replace(ARABIC, "(Arabic script, see the row)").replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\n/g, " ");
function stepText(st: Step): string {
  const what = st.tap ? `tap ${st.tap}` : `${st.fwd ? "forwarded " : ""}"${st.send ?? ""}"`;
  const wait = st.wait ? `after ${st.wait} min, ` : "";
  const model = st.route ? " (router)" : "";
  return `${wait}${what}${model}`;
}
function expectText(st: Step): string {
  const parts = [`\`${st.result}\``];
  if (st.title) parts.push(`*${st.title}*`);
  if (st.says) parts.push(`says "${st.says}"`);
  if (st.buttons?.length) parts.push(`[${st.buttons.join(", ")}]`);
  return parts.join(" ");
}

/** The matrix as markdown. The test checks the file in docs/kabsi-3/ is exactly this. */
export function matrixMarkdown(rows: Row[] = ROWS): string {
  // A row passes when CI runs it green (rb-t.test.ts fails CI otherwise); a row with a LATER id is skipped and counted open.
  const totals = Object.fromEntries(PACKS.map((p) => [p, {
    pass: rows.filter((r) => r.pack === p && !r.later).length, fail: rows.filter((r) => r.pack === p && r.later).length,
  }])) as Record<PackId, { pass: number; fail: number }>;
  const out: string[] = [];
  out.push("# Request book scenario matrix (RB-T)");
  out.push("");
  out.push("Master plan 30.50 item 8. Written from `supabase/functions/_shared/whatsapp/rb-t.matrix.ts`; `rb-t.test.ts` runs every row on the fake world (no model call: the extraction and the router are fakes that answer what the row says) and `tests/rb-t-matrix.test.ts` checks this file matches the rows. Do not edit by hand: change the rows and run `deno run -A scripts/request-eval/matrix-doc.ts`.");
  out.push("");
  out.push("The phone is Rashid's (staff tools and four businesses: 1 Kabsi Test Garage, 2 Kabsi Test Gym, 3 Kabsi Test Salon, 4 Yawmiyati), working on the row's business. The clock is Monday 26 Oct 2026, 19:00 in Dubai. Customers are fictional. \"Before\" steps set the scene and are checked only for their result code. \"(router)\" marks a message that reaches the router; every other message is read by code. The expected reply is the result code, then the first line of the Look 2 reply (marker and bold title, without the business) where the row checks it, then words it must hold and its buttons.");
  out.push("");
  out.push("Every row also checks: no reply has an em dash, an en dash or an exclamation mark; no reply says booked or available; at most 3 buttons; no request is written unless a step saved it (the request count where the row gives it); model calls as counted where the row gives it.");
  out.push("");
  out.push("## Totals");
  out.push("");
  out.push("| Pack | Rows | Pass on the fake world | Open (in docs/LATER.md) |");
  out.push("|---|---|---|---|");
  for (const p of PACKS) out.push(`| ${p} | ${rows.filter((r) => r.pack === p).length} | ${totals[p].pass} | ${totals[p].fail} |`);
  out.push("");
  let area = "";
  for (const r of rows) {
    if (r.area !== area) {
      area = r.area;
      out.push(`## ${area}`);
      out.push("");
      out.push("| Id | Scenario | Before | Send | Expected |");
      out.push("|---|---|---|---|---|");
    }
    const before = r.before?.length ? r.before.map(stepText).join("; ") : "";
    const sends = r.steps.map(stepText).join("<br>");
    const exp = r.steps.map(expectText).join("<br>") + (r.requests !== undefined ? `<br>requests: ${r.requests}` : "");
    const scenario = r.later ? `${r.scenario} (open: ${r.later})` : r.scenario;
    out.push(`| ${r.id} | ${cell(scenario)} | ${cell(before)} | ${cell(sends)} | ${cell(exp)} |`);
    const next = rows[rows.indexOf(r) + 1];
    if (!next || next.area !== area) out.push("");
  }
  return out.join("\n");
}
