// The WhatsApp conversation suite (master plan 9.7, 29.7, 25.5, 18.2, 24.8, 28.1, 28.3): at least 100 scripted
// conversations in English, Spanish and Arabic, one business and several, owner, manager, staff, partner, staff_admin,
// prospects and unknown phones, plus privacy, rate-limit, quiet-hour, window and failure cases. All run on the fake world
// (no database, no Kapso, no model call) and every reply is checked for the house rules and for business data that is
// not the phone's own.
import assert from "node:assert/strict";
import { receive } from "./agent.ts";
import type { Media } from "./channel.ts";
import { flush, notify } from "./outbox.ts";
import { needsActionBody, caseOf } from "./google-action.ts";
import { ref } from "./templates.ts";
import { BIZ, msg, NOW0, PHONES, PNID, type SentMsg, World } from "./world.test-helpers.ts";

type Step = {
  from: string; text?: string; button?: string | ((w: World) => string); media?: Media; contacts?: { name: string | null; phones: string[] }[];
  referral?: Record<string, string>; id?: string; ts?: number; pnid?: string;
  expect: string | RegExp; reply?: RegExp; none?: true; buttons?: string[]; head?: RegExp; ai?: number;
};
type Case = { name: string; lang?: "en" | "es" | "ar"; tags?: string[]; setup?: (w: World) => void; steps: Step[]; check?: (w: World) => void };

const jpeg = (n = 64) => { const b = new Uint8Array(n); b.set([0xff, 0xd8, 0xff, 0xe0]); return b; };
const ftyp = (brand: string) => new TextEncoder().encode(`\0\0\0\x18ftyp${brand}\0\0\0\0mif1${brand}......`);
const ogg = (seconds: number) => {
  const page = new Uint8Array(40);
  page.set([0x4f, 0x67, 0x67, 0x53, 0, 4]);
  let g = BigInt(Math.round(seconds * 48_000));
  for (let j = 0; j < 8; j++) { page[6 + j] = Number(g & 0xffn); g >>= 8n; }
  return page;
};
const img = (id: string): Media => ({ kind: "image", id, mime: "image/jpeg", filename: null, size: 2000, voice: false });
const doc = (id: string, mime: string, filename: string): Media => ({ kind: "document", id, mime, filename, size: 2000, voice: false });
const voice = (id: string, size = 20_000): Media => ({ kind: "audio", id, mime: "audio/ogg; codecs=opus", filename: null, size, voice: true });
const tool = (t: string, args: Record<string, string> = {}, lang = "en") => JSON.stringify({ tool: t, args, lang });

const CASES: Case[] = [
  // ─── Unknown phones and prospects (9.2, 24.8, 29.7).
  { name: "unknown: hello gets the welcome of 24.8", tags: ["unknown"], steps: [{ from: PHONES.unknown, text: "Hello", expect: "greeting", reply: /Did you just scan your business on kabsi\.co/ }] },
  { name: "unknown: the prefilled scan code is picked up", tags: ["unknown", "prospect"], steps: [{ from: PHONES.unknown, text: "Hi Kabsi, my scan code is KAB-7Q4M2X9P", expect: "scan_code", reply: /KAB-7Q4M2X9P/ }],
    check: (w) => { assert.equal(w.conversation(PHONES.unknown).scan_code, "KAB-7Q4M2X9P"); assert.ok(w.prospects.has(PHONES.unknown)); } },
  { name: "prospect: send the full map answers while the map is made (V1 stub)", tags: ["prospect"], steps: [
    { from: PHONES.unknown, text: "my scan code is KAB-7Q4M2X9P", expect: "scan_code" },
    { from: PHONES.unknown, text: "Send the full map to my WhatsApp", expect: "map_pending", reply: /comes here as soon as it is ready/ }] },
  { name: "unknown: send the full map without a code asks for it", tags: ["unknown"], steps: [{ from: PHONES.unknown, text: "send the full map", expect: "map_no_code", reply: /business name or the code/ }] },
  { name: "unknown: prices", tags: ["unknown"], steps: [{ from: PHONES.unknown, text: "prices", expect: "prices", reply: /19 US dollars.*39 US dollars/s }] },
  { name: "unknown: start free", tags: ["unknown"], steps: [{ from: PHONES.unknown, text: "start free", expect: "trial", reply: /kabsi\.co\/get-started/ }] },
  { name: "unknown: partner program", tags: ["unknown"], steps: [{ from: PHONES.unknown, text: "partner", expect: "partner_program", reply: /25 percent/ }] },
  { name: "unknown: talk to a person", tags: ["unknown"], steps: [{ from: PHONES.unknown, text: "talk to a person", expect: "handoff", reply: /within one business day/ }],
    check: (w) => assert.equal(w.handoffs.length, 1) },
  { name: "unknown: stats needs an account and shows no business data", tags: ["unknown", "privacy"], steps: [{ from: PHONES.unknown, text: "stats", expect: "needs_account" }] },
  { name: "unknown: someone else's Approve button is no longer theirs", tags: ["unknown", "privacy", "25.5"], steps: [
    { from: PHONES.unknown, button: (w) => `a:${w.alert(PHONES.owner, BIZ.harbour)}`, expect: "not_yours", reply: /no longer yours to approve/ }],
    check: (w) => assert.equal(w.calls.filter((c) => c.startsWith("approve")).length, 0) },
  { name: "unknown: a staff command is never revealed", tags: ["unknown", "privacy"], steps: [{ from: PHONES.unknown, text: "status", expect: /^(greeting|unclear)/ }],
    check: (w) => assert.doesNotMatch(w.sent.map((s) => s.body).join(" "), /Jobs failed/) },
  { name: "unknown: a business name runs the scan inside WhatsApp (stub until V1)", tags: ["unknown"], setup: (w) => (w.aiMap["Harbour Lane Coffee"] = tool("scan", { name: "Harbour Lane Coffee" })),
    steps: [{ from: PHONES.unknown, text: "Harbour Lane Coffee", expect: "scan_stub", reply: /run the scan for Harbour Lane Coffee/, ai: 1 }] },
  { name: "unknown: the Click-to-WhatsApp referral is kept on the conversation", tags: ["unknown", "20.3"], steps: [
    { from: PHONES.unknown, text: "Hello", referral: { ctwa_clid: "ARAkLk", source_id: "120208", source_type: "ad" }, expect: "greeting" },
    { from: PHONES.unknown, text: "prices", referral: { ctwa_clid: "BBB", source_id: "120209", source_type: "ad" }, expect: "prices" }],
    check: (w) => { const c = w.conversation(PHONES.unknown); assert.equal((c.referral_first as Record<string, string>).ctwa_clid, "ARAkLk"); assert.equal((c.referral_last as Record<string, string>).source_id, "120209"); } },
  { name: "unknown: a partner code is kept", tags: ["unknown", "29.4"], steps: [{ from: PHONES.unknown, text: "Hi, Code P-SARA", expect: "partner_code", reply: /30 days/ }],
    check: (w) => assert.equal(w.conversation(PHONES.unknown).partner_code, "P-SARA") },
  { name: "unknown: STOP, then nothing", tags: ["unknown", "9.5"], steps: [
    { from: PHONES.unknown, text: "STOP", expect: "stopped", reply: /no more WhatsApp messages/ },
    { from: PHONES.unknown, text: "hello", expect: "stopped_ignored", none: true }] },
  { name: "unknown: START after STOP", tags: ["unknown", "9.5"], steps: [
    { from: PHONES.unknown, text: "stop", expect: "stopped" }, { from: PHONES.unknown, text: "START", expect: "started" }] },
  { name: "unknown: Spanish hello gets the Spanish welcome", lang: "es", tags: ["unknown"], steps: [{ from: PHONES.unknown2, text: "Hola", expect: "greeting", reply: /Bienvenido a Kabsi/ }] },
  { name: "unknown: Spanish prices", lang: "es", tags: ["unknown"], steps: [{ from: PHONES.unknown2, text: "precios", expect: "prices" }] },
  { name: "unknown: Spanish STOP (baja)", lang: "es", tags: ["unknown", "9.5"], steps: [{ from: PHONES.unknown2, text: "baja", expect: "stopped", reply: /No recibirás más mensajes/ }] },
  { name: "unknown: Spanish talk to a person", lang: "es", tags: ["unknown"], steps: [{ from: PHONES.unknown2, text: "hablar con una persona", expect: "handoff", reply: /Una persona de Kabsi/ }] },
  { name: "unknown: Spanish help", lang: "es", tags: ["unknown"], steps: [{ from: PHONES.unknown2, text: "ayuda", expect: "help", reply: /Soy Nora/ }] },
  { name: "unknown: Arabic hello gets the Arabic welcome", lang: "ar", tags: ["unknown"], steps: [{ from: PHONES.unknown3, text: "مرحبا", expect: "greeting", reply: /كبسي/ }] },
  { name: "unknown: Arabic STOP", lang: "ar", tags: ["unknown", "9.5"], steps: [{ from: PHONES.unknown3, text: "توقف", expect: "stopped", reply: /لن تصلك رسائل/ }] },
  { name: "unknown: Arabic prices", lang: "ar", tags: ["unknown"], steps: [{ from: PHONES.unknown3, text: "الأسعار", expect: "prices" }] },
  { name: "unknown: Arabic talk to a person", lang: "ar", tags: ["unknown"], steps: [{ from: PHONES.unknown3, text: "التحدث مع شخص", expect: "handoff", reply: /سيرد عليك شخص/ }] },
  { name: "unknown: Arabic help", lang: "ar", tags: ["unknown"], steps: [{ from: PHONES.unknown3, text: "مساعدة", expect: "help", reply: /نورا/ }] },
  { name: "unknown: a photo needs an account", tags: ["unknown"], steps: [{ from: PHONES.unknown, media: img("m-u1"), expect: "needs_account" }], check: (w) => assert.equal(w.photos.length, 0) },
  { name: "unknown: abuse gets one notice, then silence", tags: ["unknown", "9.3"], steps: [
    { from: PHONES.unknown, text: "you stupid bot", expect: "abuse_notice", reply: /will not reply/ },
    { from: PHONES.unknown, text: "stupid bot", expect: "abuse_ignored", none: true }] },
  { name: "unknown: a wrong code", tags: ["unknown", "9.2"], steps: [{ from: PHONES.unknown, text: "KABSI 000000", expect: "bad_code", reply: /did not work/ }] },
  { name: "unknown: help meets Nora as Kabsi's assistant", tags: ["unknown"], steps: [{ from: PHONES.unknown, text: "help", expect: "help", reply: /I am Nora/ }] },
  { name: "unknown: free text with the model off gets the welcome", tags: ["unknown", "failure"], setup: (w) => (w.aiMap = {}), steps: [{ from: PHONES.unknown, text: "what is this", expect: /greeting|unclear/ }] },

  // ─── Binding (9.2).
  { name: "owner binds a phone with the one-time code; Scout is asked for the first map (28.5 stub)", tags: ["owner", "9.2", "28.5"],
    setup: (w) => { w.users[0].phone = null; w.users[0].optin = "none"; },
    steps: [{ from: "+12125550199", text: "KABSI 123456", expect: "verified", reply: /Kabsi is connected/ }],
    check: (w) => { assert.deepEqual(w.firstMaps, [BIZ.harbour]); assert.equal(w.users[0].phone, "+12125550199"); } },
  { name: "a code for a phone already in use elsewhere is refused", tags: ["9.2", "privacy"], steps: [{ from: PHONES.manager, text: "123456", expect: "phone_in_use" }] },
  { name: "a code is one-time: the second use fails", tags: ["9.2"], setup: (w) => { w.users[0].phone = null; w.users[0].optin = "none"; },
    steps: [{ from: "+12125550199", text: "KABSI 123456", expect: "verified" }, { from: "+12125550198", text: "KABSI 123456", expect: "bad_code" }] },
  { name: "staff code binds the staff phone as staff_admin", tags: ["staff_admin", "29.7"], steps: [
    { from: PHONES.newStaff, text: "STAFF ABCD2345", expect: "staff_admin", reply: /staff phone/ },
    { from: PHONES.newStaff, text: "status", expect: "staff_status", head: /^Kabsi staff/ }] },
  { name: "an unknown staff code is refused", tags: ["staff_admin"], steps: [{ from: PHONES.unknown, text: "STAFF ZZZZ9999", expect: "bad_code" }] },
  { name: "a staff code from a person who is no longer staff is refused", tags: ["staff_admin", "privacy"], setup: (w) => w.staffUsers.delete("00000000-0000-4000-8000-000000000108"),
    steps: [{ from: PHONES.newStaff, text: "STAFF ABCD2345", expect: "bad_code" }] },

  // ─── Owner, one business (9.3).
  { name: "owner: stats, headed with business and role", tags: ["owner"], steps: [{ from: PHONES.owner, text: "stats", expect: "stats", head: /^Harbour Lane Coffee \(owner\)/, reply: /last 7 days/, ai: 0 }] },
  { name: "owner: this month", tags: ["owner"], steps: [{ from: PHONES.owner, text: "this month", expect: "stats", reply: /last 30 days/ }] },
  { name: "owner: review link", tags: ["owner"], steps: [{ from: PHONES.owner, text: "review link", expect: "review_link", reply: /kabsi\.co\/review\/ABC234/ }] },
  { name: "owner: QR", tags: ["owner"], steps: [{ from: PHONES.owner, text: "QR", expect: "qr", reply: /QR card/ }] },
  { name: "owner: no review link yet", tags: ["owner"], steps: [{ from: PHONES.plain, text: "review link", expect: "no_review_link", reply: /Corner Deli has no review link/ }] },
  { name: "owner: Approve names the business and offers Undo, with no AI call", tags: ["owner", "25.5", "speed"], steps: [
    { from: PHONES.owner, button: (w) => `a:${w.alert(PHONES.owner, BIZ.harbour)}`, expect: "approved", reply: /Approved for Harbour Lane Coffee/, buttons: ["Undo"], ai: 0 }] },
  { name: "owner: Approve twice publishes once", tags: ["owner", "9.3"], steps: [
    { from: PHONES.owner, button: "a:tok00000000000000000001", expect: "approved" },
    { from: PHONES.owner, button: "a:tok00000000000000000001", expect: "repeat", reply: /already handled/ }],
    setup: (w) => void w.alert(PHONES.owner, BIZ.harbour) },
  { name: "owner: Undo in time", tags: ["owner", "9.3"], setup: (w) => void w.alert(PHONES.owner, BIZ.harbour), steps: [
    { from: PHONES.owner, button: "a:tok00000000000000000001", expect: "approved" },
    { from: PHONES.owner, button: "u:tok00000000000000000001", expect: "undone", reply: /Nothing was sent/ }] },
  { name: "owner: Undo too late", tags: ["owner", "9.3"], setup: (w) => { void w.alert(PHONES.owner, BIZ.harbour); w.tooLate = true; }, steps: [
    { from: PHONES.owner, button: "a:tok00000000000000000001", expect: "approved" },
    { from: PHONES.owner, button: "u:tok00000000000000000001", expect: "too_late" }] },
  { name: "owner: an old button whose item changed changes nothing", tags: ["owner", "25.5"], setup: (w) => { w.alert(PHONES.owner, BIZ.harbour); w.actions.get("tok00000000000000000001")!.stale = true; },
    steps: [{ from: PHONES.owner, button: "a:tok00000000000000000001", expect: /^refused:not_draft/, reply: /already handled/ }] },
  { name: "owner: a button id Kabsi never made", tags: ["owner", "25.5"], steps: [{ from: PHONES.owner, button: "a:abcdefghijklmnopqrstuvwx", expect: "stale_button", reply: /already handled/ }] },
  { name: "owner: typed yes with one item approves it", tags: ["owner", "25.5"], setup: (w) => void w.alert(PHONES.owner, BIZ.harbour), steps: [{ from: PHONES.owner, text: "yes", expect: "approved" }] },
  { name: "owner: typed yes with two items asks Which one, then the pick approves", tags: ["owner", "25.5"],
    setup: (w) => { w.alert(PHONES.owner, BIZ.harbour); w.alert(PHONES.owner, BIZ.harbour, "post_alert"); },
    steps: [
      { from: PHONES.owner, text: "Yes", expect: "which_one", reply: /Which one/, buttons: ["Reply: Harbour Lane", "Post: Harbour Lane C"] },
      { from: PHONES.owner, button: "w:tok00000000000000000002", expect: "approved" }] },
  { name: "owner: typed yes with nothing waiting", tags: ["owner"], steps: [{ from: PHONES.owner, text: "ok", expect: "yes_nothing" }] },
  { name: "owner: no", tags: ["owner"], steps: [{ from: PHONES.owner, text: "no", expect: "no" }] },
  { name: "owner: exact reply is shown back for a Yes, nothing goes to Google before it", tags: ["owner", "9.3", "25.5"],
    setup: (w) => (w.conversation(PHONES.owner).last_task = { type: "review", review_id: "r-harbour-1", location_id: BIZ.harbour }),
    steps: [{ from: PHONES.owner, text: "reply: Thank you so much for coming in, see you soon.", expect: "shown_for_yes", reply: /Harbour Lane Coffee: Kabsi will post this reply on Google after your yes/, buttons: ["Approve", "Edit in app"] }],
    check: (w) => assert.equal(w.calls.filter((c) => c.startsWith("approve")).length, 0) },
  { name: "owner: exact reply with no recent review asks which", tags: ["owner"], steps: [{ from: PHONES.owner, text: "reply: Thanks a lot", expect: "no_review" }] },
  { name: "owner: an exact reply to a high-risk review is approved only in the app", tags: ["owner", "9.3"],
    setup: (w) => (w.conversation(PHONES.owner).last_task = { type: "review", review_id: "r-harbour-high", location_id: BIZ.harbour }),
    steps: [{ from: PHONES.owner, text: "reply: We are sorry to hear this.", expect: "show_refused:high_risk", reply: /approved only in Kabsi/ }] },
  { name: "owner: make it shorter goes to the intent router, then the new draft for a Yes", tags: ["owner", "9.3"],
    setup: (w) => { w.conversation(PHONES.owner).last_task = { type: "review", review_id: "r-harbour-1", location_id: BIZ.harbour }; w.aiMap["make it shorter"] = tool("edit_draft", { instruction: "make it shorter" }); },
    steps: [{ from: PHONES.owner, text: "make it shorter", expect: "shown_for_yes", reply: /here is the new draft/, ai: 1 }],
    check: (w) => assert.ok(w.calls.includes("edit:r-harbour-1:make it shorter")) },
  { name: "owner: a photo sent as an image goes to Photos (Pro)", tags: ["owner", "18.3"], steps: [{ from: PHONES.owner, media: img("m1"), expect: "photo", reply: /checking the photo/ }],
    check: (w) => assert.equal(w.photos.length, 1) },
  { name: "owner: a HEIC photo sent as a document", tags: ["owner", "18.3"], setup: (w) => w.mediaBytes.set("m-heic", ftyp("heic")),
    steps: [{ from: PHONES.owner, media: doc("m-heic", "image/heic", "IMG_0001.HEIC"), expect: "photo" }] },
  { name: "owner: a PNG sent as a document", tags: ["owner", "18.3"], setup: (w) => w.mediaBytes.set("m-png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])),
    steps: [{ from: PHONES.owner, media: doc("m-png", "image/png", "menu.png"), expect: "photo" }] },
  { name: "owner: a WebP sent as a document", tags: ["owner", "18.3"], setup: (w) => w.mediaBytes.set("m-webp", new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ")),
    steps: [{ from: PHONES.owner, media: doc("m-webp", "image/webp", "dish.webp"), expect: "photo" }] },
  { name: "owner: an unreadable file is answered with Please send it as a photo", tags: ["owner", "18.3"], setup: (w) => w.mediaBytes.set("m-pdf", new TextEncoder().encode("%PDF-1.7 ...")),
    steps: [{ from: PHONES.owner, media: doc("m-pdf", "image/jpeg", "photo.jpg"), expect: "photo_unreadable", reply: /^Harbour Lane Coffee \(owner\)\n\nPlease send it as a photo\.$/ }] },
  { name: "owner: a PDF document is refused", tags: ["owner", "18.3"], steps: [{ from: PHONES.owner, media: doc("m-pdf2", "application/pdf", "menu.pdf"), expect: "file_refused", reply: /Please send it as a photo/ }] },
  { name: "owner on Essentials: photos need Pro", tags: ["owner"], steps: [{ from: PHONES.plain, media: img("m2"), expect: "photo_pro" }] },
  { name: "owner: a voice note is kept until transcription", tags: ["owner", "28.3"], setup: (w) => w.mediaBytes.set("v1", ogg(30)),
    steps: [{ from: PHONES.owner, media: voice("v1"), expect: "voice_kept", reply: /Got it, I am listening/ }], check: (w) => assert.equal(w.voices.length, 1) },
  { name: "owner: a voice note over 10 MB is refused kindly", tags: ["owner", "28.3"], steps: [{ from: PHONES.owner, media: voice("v2", 11 * 1024 * 1024), expect: "voice_too_big", reply: /Please keep voice notes under 3 minutes/ }],
    check: (w) => assert.equal(w.voices.length, 0) },
  { name: "owner: a voice note over 3 minutes is refused kindly", tags: ["owner", "28.3"], setup: (w) => w.mediaBytes.set("v3", ogg(200)),
    steps: [{ from: PHONES.owner, media: voice("v3"), expect: "voice_too_long", reply: /under 3 minutes/ }], check: (w) => assert.equal(w.voices.length, 0) },
  { name: "owner: a video is kept, not posted", tags: ["owner", "9.3"], steps: [{ from: PHONES.owner, media: { kind: "video", id: "vid", mime: "video/mp4", filename: null, size: 1000, voice: false }, expect: "video" }] },
  { name: "owner: Ask a customer with a shared contact, stored in E.164", tags: ["owner", "30.8"], steps: [{ from: PHONES.owner, contacts: [{ name: "Dana", phones: ["(212) 555-0177"] }], expect: "contact", reply: /Kabsi never messages your customers/ }] },
  { name: "owner: a contact without a usable number", tags: ["owner", "30.8"], steps: [{ from: PHONES.owner, contacts: [{ name: "Sam", phones: ["12"] }], expect: "contact_bad" }] },
  { name: "owner: upgrade is the billing stub", tags: ["owner", "billing"], steps: [{ from: PHONES.owner, text: "upgrade", expect: "billing_stub", reply: /Billing is coming soon, reply 'talk to a person' for help/ }] },
  { name: "owner: cancel is a billing question, not STOP", tags: ["owner", "billing"], steps: [{ from: PHONES.owner, text: "cancel", expect: "billing_stub" }],
    check: (w) => assert.equal(w.conversation(PHONES.owner).stopped_at, null) },
  { name: "owner: talk to a person, then free text waits for the person, a button still works", tags: ["owner", "9.9"], setup: (w) => void w.alert(PHONES.owner, BIZ.harbour),
    steps: [
      { from: PHONES.owner, text: "talk to a person", expect: "handoff", head: /^Harbour Lane Coffee/ },
      { from: PHONES.owner, text: "are you there", expect: "handoff_quiet", none: true },
      { from: PHONES.owner, button: "a:tok00000000000000000001", expect: "approved" }] },
  { name: "owner: hours go to the app for now", tags: ["owner", "9.3"], steps: [{ from: PHONES.owner, text: "hours", expect: "hours_in_app", reply: /kabsi\.co\/app\/hours/ }] },
  { name: "owner: close at 3 today is understood as hours", tags: ["owner", "9.3"], setup: (w) => (w.aiMap["close at 3 today"] = tool("hours", { text: "close at 3 today" })),
    steps: [{ from: PHONES.owner, text: "close at 3 today", expect: "hours_in_app", ai: 1 }] },
  { name: "owner: an unclear message gets one short question", tags: ["owner"], steps: [{ from: PHONES.owner, text: "the thing from before", expect: "unclear", reply: /review link or your stats/, ai: 1 }] },
  { name: "owner: a slow answer sends On it first", tags: ["owner", "speed"], setup: (w) => { w.aiSlow = true; w.onItFast = true; w.aiMap["can you put up the lunch special"] = tool("post", { text: "lunch special" }); },
    steps: [{ from: PHONES.owner, text: "can you put up the lunch special", expect: "post_in_app", ai: 1 }],
    check: (w) => { const r = w.repliesTo(PHONES.owner).map((s) => s.body); assert.match(r[0], /On it\.$/); assert.match(r[1], /send me a photo/); } },
  { name: "owner: a quick answer sends no On it", tags: ["owner", "speed"], setup: (w) => (w.aiMap["can you put up the lunch special"] = tool("post", { text: "x" })),
    steps: [{ from: PHONES.owner, text: "can you put up the lunch special", expect: "post_in_app", ai: 1 }],
    check: (w) => assert.equal(w.repliesTo(PHONES.owner).length, 1) },
  { name: "owner: help, headed", tags: ["owner"], steps: [{ from: PHONES.owner, text: "help", expect: "help", head: /^Harbour Lane Coffee \(owner\)/, reply: /review link/ }] },
  { name: "owner: STOP stops alerts too", tags: ["owner", "9.5"], steps: [
    { from: PHONES.owner, text: "STOP", expect: "stopped" }, { from: PHONES.owner, text: "stats", expect: "stopped_ignored", none: true }],
    check: (w) => assert.equal(w.users[0].optin, "stopped") },
  { name: "owner: a repeated webhook does nothing the second time", tags: ["owner", "9.1", "failure"], steps: [
    { from: PHONES.owner, text: "stats", id: "wamid.same", expect: "stats" }, { from: PHONES.owner, text: "stats", id: "wamid.same", expect: "duplicate", none: true }] },
  { name: "owner: a message older than 10 minutes is refused", tags: ["9.1", "failure"], steps: [{ from: PHONES.owner, text: "stats", ts: NOW0 / 1000 - 3600, expect: "stale", none: true }] },
  { name: "a message for another phone number id is refused", tags: ["9.1", "failure"], steps: [{ from: PHONES.owner, text: "stats", pnid: "999", expect: "wrong_number", none: true }] },
  { name: "a sender that is not a phone number is refused", tags: ["30.8", "failure"], steps: [{ from: "+1", text: "hi", expect: "bad_phone", none: true }] },
  { name: "owner: Spanish stats", lang: "es", tags: ["owner"], steps: [{ from: PHONES.owner, text: "estadísticas", expect: "stats" }] },
  { name: "owner: Arabic stats", lang: "ar", tags: ["owner"], steps: [{ from: PHONES.owner, text: "احصائيات", expect: "stats" }] },
  { name: "owner: Spanish yes approves the one item", lang: "es", tags: ["owner"], setup: (w) => void w.alert(PHONES.owner, BIZ.harbour), steps: [{ from: PHONES.owner, text: "sí", expect: "approved" }] },
  { name: "owner: Arabic yes approves the one item", lang: "ar", tags: ["owner"], setup: (w) => void w.alert(PHONES.owner, BIZ.harbour), steps: [{ from: PHONES.owner, text: "نعم", expect: "approved" }] },
  { name: "owner: Spanish talk to a person", lang: "es", tags: ["owner"], steps: [{ from: PHONES.owner, text: "hablar con una persona", expect: "handoff", reply: /Una persona de Kabsi/ }] },
  { name: "owner: Arabic review link", lang: "ar", tags: ["owner"], steps: [{ from: PHONES.owner, text: "رابط التقييم", expect: "review_link" }] },
  { name: "owner: a partner tool is refused", tags: ["owner", "29.7"], steps: [{ from: PHONES.owner, text: "kit", expect: "partner_refused", reply: /Partner tools are for Kabsi Partners/ }] },
  { name: "owner: a staff command is never revealed", tags: ["owner", "29.7", "privacy"], steps: [{ from: PHONES.owner, text: "today", expect: /^unclear/ }] },

  // ─── Manager and staff (9.2 roles).
  { name: "manager: stats, headed as manager", tags: ["manager"], steps: [{ from: PHONES.manager, text: "stats", expect: "stats", head: /^Harbour Lane Coffee \(manager\)/ }] },
  // Session 10 (10.2.10): billing through Creem, owner only, every change after a Confirm.
  ...((): Case[] => {
    const paid = (plan: "essentials" | "pro" = "essentials") => (w: World) => {
      w.billingSubs = new Map([[BIZ.harbour, { plan, period: "month", state: "active", periodEnd: "2026-11-26T15:00:00Z", cancelAtEnd: false, units: 0 }]]);
    };
    return [
      { name: "owner billing: no paid plan points to the Plan page", tags: ["owner", "billing"], setup: (w) => { w.billingSubs = new Map(); },
        steps: [{ from: PHONES.owner, text: "upgrade", expect: "billing_no_plan", reply: /kabsi\.co\/app\/plan/ }] },
      { name: "owner billing: card and invoice give a fresh portal link", tags: ["owner", "billing"], setup: paid(),
        steps: [{ from: PHONES.owner, text: "invoice", expect: "billing_portal", reply: /https:\/\/creem\.io\// }, { from: PHONES.owner, text: "my card changed", expect: "billing_portal" }],
        check: (w) => assert.deepEqual(w.calls.filter((c) => c.startsWith("portal")), [`portal:${BIZ.harbour}`, `portal:${BIZ.harbour}`]) },
      { name: "owner billing: cancel asks first, then cancels at the period end and offers Keep my plan", tags: ["owner", "billing"], setup: paid(),
        steps: [
          { from: PHONES.owner, text: "cancel my plan", expect: "billing_cancel_ask", reply: /ends on 26 November 2026, and everything keeps working/, buttons: ["Confirm"] },
          { from: PHONES.owner, button: "k:cancel", expect: "billing_cancelled", reply: /Your plan ends on 26 November 2026/, buttons: ["Keep my plan"] },
          { from: PHONES.owner, button: "k:keep", expect: "billing_kept", reply: /carries on/ },
        ],
        check: (w) => assert.deepEqual(w.calls.filter((c) => /^(cancel|keep):/.test(c)), [`cancel:${BIZ.harbour}`, `keep:${BIZ.harbour}`]) },
      { name: "owner billing: upgrade shows the price and charges only after Confirm", tags: ["owner", "billing"], setup: paid(),
        steps: [
          { from: PHONES.owner, text: "upgrade", expect: "billing_upgrade_ask", reply: /Switch to Pro for \$39 a month\?/, buttons: ["Confirm"] },
          { from: PHONES.owner, button: "k:upgrade", expect: "billing_upgraded" },
          { from: PHONES.owner, text: "upgrade", expect: "billing_same_plan" },
        ],
        check: (w) => assert.deepEqual(w.calls.filter((c) => c.startsWith("change")), [`change:${BIZ.harbour}:pro`]) },
      { name: "owner billing: downgrade takes effect at renewal", tags: ["owner", "billing"], setup: paid("pro"),
        steps: [
          { from: PHONES.owner, text: "downgrade", expect: "billing_downgrade_ask", reply: /\$19 a month from your next renewal, 26 November 2026/ },
          { from: PHONES.owner, button: "k:downgrade", expect: "billing_downgraded", reply: /Essentials starts on 26 November 2026/ },
        ] },
      { name: "owner billing: add a location shows the price, then adds one", tags: ["owner", "billing"], setup: paid(),
        steps: [
          { from: PHONES.owner, text: "add a location", expect: "billing_add_ask", reply: /\$15 a month/, buttons: ["Confirm"] },
          { from: PHONES.owner, button: "k:add_location", expect: "billing_location_added", reply: /1 extra location\./ },
        ] },
      { name: "owner billing: plan shows the plan and the renewal", tags: ["owner", "billing"], setup: paid(),
        steps: [{ from: PHONES.owner, text: "plan", expect: "billing_status", reply: /Kabsi Essentials, monthly\. It renews on 26 November 2026/ }] },
      { name: "manager billing: a Confirm button from a manager's phone changes nothing", tags: ["manager", "billing"], setup: paid(),
        steps: [{ from: PHONES.manager, button: "k:cancel", expect: "billing_owner_only", reply: /Only the owner/ }],
        check: (w) => assert.equal(w.calls.filter((c) => c.startsWith("cancel")).length, 0) },
    ];
  })(),
  { name: "manager: billing is the owner's", tags: ["manager", "billing"], steps: [{ from: PHONES.manager, text: "upgrade", expect: "billing_owner_only", reply: /Only the owner/ }] },
  { name: "manager: approves what the rules allow", tags: ["manager"], setup: (w) => void w.alert(PHONES.manager, BIZ.harbour), steps: [{ from: PHONES.manager, button: "a:tok00000000000000000001", expect: "approved" }] },
  { name: "manager removed: an old button is no longer theirs", tags: ["manager", "privacy", "25.5"],
    setup: (w) => { w.alert(PHONES.manager, BIZ.harbour); delete w.biz[0].members["00000000-0000-4000-8000-000000000102"]; },
    steps: [{ from: PHONES.manager, button: "a:tok00000000000000000001", expect: "not_yours" }], check: (w) => assert.equal(w.calls.filter((c) => c.startsWith("approve")).length, 0) },
  { name: "manager removed: the phone sees no business data at once", tags: ["manager", "privacy"], setup: (w) => delete w.biz[0].members["00000000-0000-4000-8000-000000000102"],
    steps: [{ from: PHONES.manager, text: "stats", expect: "needs_account" }] },
  { name: "staff: a photo goes to Photos for the owner", tags: ["staff", "18.3"], steps: [{ from: PHONES.staff, media: img("m3"), expect: "photo", head: /\(staff\)/ }] },
  { name: "staff: stats are not for staff", tags: ["staff"], steps: [{ from: PHONES.staff, text: "stats", expect: "not_for_staff", reply: /photos and news/ }] },
  { name: "staff: help", tags: ["staff"], steps: [{ from: PHONES.staff, text: "help", expect: "help", reply: /photos here for the owner/ }] },
  { name: "staff: the owner's button is not theirs", tags: ["staff", "privacy"], steps: [{ from: PHONES.staff, button: (w) => `a:${w.alert(PHONES.owner, BIZ.harbour)}`, expect: "not_yours" }] },
  { name: "staff: Spanish stats are not for staff", lang: "es", tags: ["staff"], steps: [{ from: PHONES.staff, text: "estadisticas", expect: "not_for_staff" }] },

  // ─── Several businesses (9.2).
  { name: "several: stats asks Which business, the tap answers it", tags: ["several"], steps: [
    { from: PHONES.multi, text: "stats", expect: "which_business", buttons: ["Bright Smile Kids", "Smile Dental"] },
    { from: PHONES.multi, button: `b:${BIZ.smile}`, expect: "stats", head: /^Smile Dental \(owner\)/ }] },
  { name: "several: the business is remembered", tags: ["several"], steps: [
    { from: PHONES.multi, text: "stats", expect: "which_business" }, { from: PHONES.multi, button: `b:${BIZ.bright}`, expect: "stats" },
    { from: PHONES.multi, text: "review link", expect: "no_review_link", head: /^Bright Smile Kids/ }] },
  { name: "several: switch changes the business", tags: ["several"], setup: (w) => (w.conversation(PHONES.multi).active_location_id = BIZ.smile), steps: [
    { from: PHONES.multi, text: "switch", expect: "which_business" }, { from: PHONES.multi, button: `b:${BIZ.bright}`, expect: "business_set", reply: /Bright Smile Kids/ }] },
  { name: "several: a number answers Which business", tags: ["several"], steps: [
    { from: PHONES.multi, text: "this month", expect: "which_business" }, { from: PHONES.multi, text: "2", expect: "stats", head: /^Smile Dental/ }] },
  { name: "several: a business button for someone else's business is refused and not named", tags: ["several", "privacy"], steps: [{ from: PHONES.multi, button: `b:${BIZ.foreign}`, expect: "business_refused" }] },
  { name: "several: typed yes with items in two businesses names both", tags: ["several", "25.5"], setup: (w) => { w.alert(PHONES.multi, BIZ.smile); w.alert(PHONES.multi, BIZ.bright); },
    steps: [{ from: PHONES.multi, text: "yes", expect: "which_one", reply: /Which one/ }],
    check: (w) => { const b = w.repliesTo(PHONES.multi).at(-1)!.buttons.join(" "); assert.match(b, /Smile Dental/); assert.match(b, /Bright Smile/); } },
  { name: "several: a photo asks Which business first", tags: ["several"], steps: [{ from: PHONES.multi, media: img("m4"), expect: "which_business" }] },

  // ─── Two roles on one phone (29.7).
  { name: "two roles: help asks business or partner tools; the tap answers", tags: ["two_roles", "29.7"], steps: [
    { from: PHONES.both, text: "help", expect: "which_role", reply: /Your business or your partner tools\?/, buttons: ["My business", "Partner tools"] },
    { from: PHONES.both, button: "r:partner", expect: "help", head: /^Your partner tools/ }] },
  { name: "two roles: switch asks again", tags: ["two_roles"], setup: (w) => (w.conversation(PHONES.both).active_role = "partner"), steps: [{ from: PHONES.both, text: "switch", expect: "which_role" }] },
  { name: "two roles: a business tool needs no question and is headed", tags: ["two_roles"], steps: [{ from: PHONES.both, text: "stats", expect: "stats", head: /^Al Noor Salon \(owner\)/ }] },
  { name: "two roles: a partner tool needs no question and is headed", tags: ["two_roles"], steps: [{ from: PHONES.both, text: "kit", expect: "partner_stub", head: /^Your partner tools/ }] },
  { name: "two roles: free text asks the role, then runs it", tags: ["two_roles"], setup: (w) => (w.aiMap["how are we doing"] = tool("stats", { days: "7" })), steps: [
    { from: PHONES.both, text: "how are we doing", expect: "which_role", ai: 0 },
    { from: PHONES.both, button: "r:business", expect: "stats", head: /^Al Noor Salon/, ai: 1 }] },
  { name: "two roles: my link means the partner link when partner tools are chosen", tags: ["two_roles"], setup: (w) => (w.conversation(PHONES.both).active_role = "partner"),
    steps: [{ from: PHONES.both, text: "my link", expect: "partner_stub" }] },
  { name: "staff_admin and owner: status is staff, headed Kabsi staff", tags: ["staff_admin", "29.7"], steps: [{ from: PHONES.rashid, text: "status", expect: "staff_status", head: /^Kabsi staff/, reply: /Number quality/ }] },
  { name: "staff_admin and owner: help asks business or staff tools", tags: ["staff_admin", "two_roles"], steps: [{ from: PHONES.rashid, text: "help", expect: "which_role", reply: /Kabsi staff tools/ }] },
  { name: "staff_admin and owner: stats are the business's", tags: ["staff_admin"], steps: [{ from: PHONES.rashid, text: "stats", expect: "stats", head: /^Yawmiyati \(owner\)/ }] },
  { name: "staff_admin: waiting and today", tags: ["staff_admin", "9.9"], steps: [
    { from: PHONES.rashid, text: "waiting", expect: "staff_waiting", reply: /Hand-offs/ }, { from: PHONES.rashid, text: "today", expect: "staff_today", reply: /Beirut/ }] },
  { name: "staff_admin: pause a business by name", tags: ["staff_admin", "9.9"], steps: [{ from: PHONES.rashid, text: "pause Harbour", expect: "staff_pause", reply: /Paused: Kabsi sends Harbour Lane Coffee/ }],
    check: (w) => assert.ok(w.calls.includes(`pause:${BIZ.harbour}`)) },
  { name: "staff_admin: resume", tags: ["staff_admin"], steps: [{ from: PHONES.rashid, text: "resume Corner Deli", expect: "staff_resume" }] },
  { name: "staff_admin: pause with two matches asks for more", tags: ["staff_admin"], steps: [{ from: PHONES.rashid, text: "pause Smile", expect: "staff_no_match", reply: /More than one business/ }] },
  { name: "staff_admin: partner approvals and payouts are stubs until PA1", tags: ["staff_admin", "29.7"], steps: [
    { from: PHONES.rashid, text: "partner approvals", expect: "staff_partners_stub" }, { from: PHONES.rashid, text: "payout list", expect: "staff_payouts_stub" }] },
  { name: "partner only: business tools are refused", tags: ["partner", "29.7", "privacy"], steps: [{ from: PHONES.partner, text: "stats", expect: "business_refused", reply: /Business tools are for businesses/ }] },
  { name: "partner only: my link is a partner tool (stub until PA2)", tags: ["partner"], steps: [{ from: PHONES.partner, text: "my link", expect: "partner_stub", head: /^Your partner tools/ }] },
  { name: "partner only: an owner's button is not theirs", tags: ["partner", "privacy"], steps: [{ from: PHONES.partner, button: (w) => `a:${w.alert(PHONES.owner, BIZ.harbour)}`, expect: "not_yours" }] },
  { name: "partner only: a photo is not a partner tool", tags: ["partner"], steps: [{ from: PHONES.partner, media: img("m5"), expect: "needs_account" }] },
  { name: "partner only: staff commands are never revealed", tags: ["partner", "privacy"], steps: [{ from: PHONES.partner, text: "status", expect: /^unclear/ }] },
];

// ─── The sender (9.4, 9.5, 18.2).
type SendCase = { name: string; tags?: string[]; run: (w: World) => Promise<void> };
const alertRow = (w: World, phone: string, o: { urgent?: boolean; dedupe?: string; template?: boolean; business?: string } = {}) => ({
  phone, userId: null, locationId: BIZ.harbour, kind: "review_alert", body: `${o.business ?? "Harbour Lane Coffee"}: new 5-star review from Maya.`,
  buttons: [{ id: `a:${w.alert(phone, BIZ.harbour)}`, title: "Approve" }], urgent: !!o.urgent, dedupe: o.dedupe ?? null,
  template: o.template === false ? null : ref("review_waiting", { business: "Harbour Lane Coffee", stars: "5" }),
});
const openWindow = (w: World, phone: string) => (w.conversation(phone).window_expires_at = new Date(w.now + 3600_000).toISOString());
const last = (w: World): SentMsg => w.sent.at(-1)!;

const SENDS: SendCase[] = [
  { name: "quiet hours: an alert at 22:00 local waits for 08:00", tags: ["9.5"], run: async (w) => {
    w.now = Date.UTC(2026, 9, 27, 2, 0); // 22:00 in New York
    openWindow(w, PHONES.owner);
    assert.equal(await notify(w.out(), alertRow(w, PHONES.owner)), "queued:quiet");
    assert.equal(w.sent.length, 0);
    w.now = Date.UTC(2026, 9, 27, 12, 0); // 08:00 in New York
    openWindow(w, PHONES.owner);
    await flush(w.out());
    assert.equal(w.sent.length, 1);
  } },
  { name: "quiet hours: an identity-field change goes at once", tags: ["9.5"], run: async (w) => {
    w.now = Date.UTC(2026, 9, 27, 2, 0);
    openWindow(w, PHONES.owner);
    assert.equal(await notify(w.out(), alertRow(w, PHONES.owner, { urgent: true })), "mock_sent");
  } },
  { name: "the cap: the 7th business-started message of the day waits", tags: ["9.5"], run: async (w) => {
    openWindow(w, PHONES.owner);
    for (let i = 0; i < 6; i++) {
      w.now += 16 * 60_000;
      openWindow(w, PHONES.owner);
      assert.equal(await notify(w.out(), alertRow(w, PHONES.owner)), "mock_sent", `message ${i + 1}`);
    }
    w.now += 16 * 60_000;
    assert.equal(await notify(w.out(), alertRow(w, PHONES.owner)), "queued:cap");
  } },
  { name: "batching: an event within 15 minutes waits, then goes", tags: ["9.5"], run: async (w) => {
    openWindow(w, PHONES.owner);
    assert.equal(await notify(w.out(), alertRow(w, PHONES.owner)), "mock_sent");
    w.now += 5 * 60_000;
    assert.equal(await notify(w.out(), alertRow(w, PHONES.owner)), "queued:batch");
    w.now += 11 * 60_000;
    await flush(w.out());
    assert.equal(w.sent.filter((s) => s.to === PHONES.owner).length, 2);
  } },
  { name: "digest: three waiting become one message, and a number opens one with its buttons", tags: ["9.5"], run: async (w) => {
    openWindow(w, PHONES.owner);
    await notify(w.out(), alertRow(w, PHONES.owner));
    for (let i = 0; i < 3; i++) await notify(w.out(), alertRow(w, PHONES.owner));
    w.now += 16 * 60_000;
    openWindow(w, PHONES.owner);
    await flush(w.out());
    assert.match(last(w).body, /^Kabsi has 3 updates for you/);
    const r = await receive(w.deps(), msg(w, PHONES.owner, { text: "2" }));
    assert.equal(r, "digest_item");
    assert.deepEqual(last(w).buttons, ["Approve"]);
  } },
  { name: "outside the window: the template goes; the reply releases the full message", tags: ["9.1"], run: async (w) => {
    assert.equal(await notify(w.out(), alertRow(w, PHONES.owner)), "template");
    assert.equal(last(w).template, "kabsi_review_waiting");
    await receive(w.deps(), msg(w, PHONES.owner, { text: "Show me" }));
    await flush(w.out());
    assert.match(last(w).body, /new 5-star review from Maya/);
  } },
  { name: "outside the window without a template the message is held", tags: ["9.1"], run: async (w) => {
    assert.equal(await notify(w.out(), alertRow(w, PHONES.owner, { template: false })), "held");
    assert.equal(w.sent.length, 0);
  } },
  { name: "before launch: owners get the mock, Kabsi's test phones and the staff phone get the live sender", tags: ["9.5"], run: async (w) => {
    openWindow(w, PHONES.owner);
    openWindow(w, PHONES.rashid);
    await notify(w.out(), alertRow(w, PHONES.owner));
    assert.equal(last(w).live, false);
    await notify(w.out(), alertRow(w, PHONES.rashid));
    assert.equal(last(w).live, true);
    w.livePhones.add(PHONES.manager);
    openWindow(w, PHONES.manager);
    await notify(w.out(), alertRow(w, PHONES.manager));
    assert.equal(last(w).live, true);
  } },
  { name: "number quality Medium: only digests go", tags: ["9.5"], run: async (w) => {
    w.quality = "MEDIUM";
    openWindow(w, PHONES.owner);
    assert.equal(await notify(w.out(), alertRow(w, PHONES.owner)), "queued:digest_only");
  } },
  { name: "STOP: nothing Kabsi starts goes after it", tags: ["9.5"], run: async (w) => {
    await receive(w.deps(), msg(w, PHONES.owner, { text: "STOP" }));
    assert.equal(await notify(w.out(), alertRow(w, PHONES.owner, { urgent: true })), "dropped");
  } },
  { name: "the same alert twice is queued once", tags: ["9.6"], run: async (w) => {
    openWindow(w, PHONES.owner);
    assert.equal(await notify(w.out(), alertRow(w, PHONES.owner, { dedupe: "review_alert:r1:u1" })), "mock_sent");
    assert.equal(await notify(w.out(), alertRow(w, PHONES.owner, { dedupe: "review_alert:r1:u1" })), "duplicate");
  } },
  { name: "a failed send is retried, then given up after 3 tries", tags: ["9.6", "failure"], run: async (w) => {
    openWindow(w, PHONES.owner);
    w.failSends = 5;
    assert.equal(await notify(w.out(), alertRow(w, PHONES.owner)), "failed");
    for (let i = 0; i < 3; i++) {
      w.now += 5 * 60_000;
      openWindow(w, PHONES.owner);
      await flush(w.out());
    }
    const row = w.outbox.at(-1)!;
    assert.equal(row.state, "failed");
    assert.equal(row.attempts, 3);
  } },
  { name: "18.2 suspended: at once at night, the business named, Google's own help page, no promise", tags: ["18.2"], run: async (w) => {
    w.now = Date.UTC(2026, 9, 27, 3, 0);
    const body = needsActionBody("Harbour Lane Coffee", caseOf({ action: "COMPLY_WITH_GUIDELINES" }));
    assert.match(body, /^Harbour Lane Coffee: Google is asking for action/);
    assert.match(body, /support\.google\.com\/business\/answer\/4569145/);
    assert.match(body, /cannot promise what Google decides/);
    assert.doesNotMatch(body, /reinstate you|we will appeal|guarantee/i);
    assert.equal(await notify(w.out(), { phone: PHONES.owner, userId: null, locationId: BIZ.harbour, kind: "google_needs_action", body, urgent: true,
      template: ref("google_action", { business: "Harbour Lane Coffee" }), dedupe: "gna:t1:open:u1" }), "template");
    assert.equal(last(w).template, "kabsi_google_action");
  } },
  { name: "18.2 verification required: the verify help page", tags: ["18.2"], run: async () => {
    const body = needsActionBody("Smile Dental", caseOf({ action: "VERIFY" }));
    assert.match(body, /needs to be verified/);
    assert.match(body, /answer\/7107242/);
  } },
  { name: "18.2 cleared again: the owner is told publishing resumes", tags: ["18.2"], run: async (w) => {
    openWindow(w, PHONES.owner);
    const { SAY } = await import("./say.ts");
    assert.equal(await notify(w.out(), { phone: PHONES.owner, userId: null, locationId: BIZ.harbour, kind: "google_cleared", body: SAY.googleCleared("Harbour Lane Coffee"),
      template: ref("google_action", { business: "Harbour Lane Coffee" }), dedupe: "gna:t1:cleared:u1" }), "mock_sent");
    assert.match(last(w).body, /no longer asks for action/);
  } },
];

const BANNED = /[–—!]/;
const LATIN_BANNED = /Profile Score|Do now|Listing Shield|Put mine back/;

for (const c of CASES) {
  Deno.test(`conversation: ${c.name}`, async () => {
    const w = new World();
    c.setup?.(w);
    const deps = w.deps();
    for (const [i, s] of c.steps.entries()) {
      const before = w.sent.length;
      const aiBefore = w.aiCalls;
      const button = typeof s.button === "function" ? s.button(w) : s.button;
      const started = performance.now();
      const r = await receive(deps, msg(w, s.from, { text: s.text, button, media: s.media, contacts: s.contacts, referral: s.referral, id: s.id, ts: s.ts, pnid: s.pnid }));
      const took = performance.now() - started;
      const label = `step ${i + 1} (${s.text ?? button ?? s.media?.kind ?? "contact"})`;
      if (typeof s.expect === "string") assert.equal(r, s.expect, label);
      else assert.match(r, s.expect, label);
      const replies = w.sent.slice(before);
      if (s.none) assert.equal(replies.length, 0, `${label}: no reply`);
      if (s.reply) assert.ok(replies.some((m) => s.reply!.test(m.body)), `${label}: reply ${s.reply} in ${JSON.stringify(replies.map((m) => m.body))}`);
      if (s.head) assert.match(replies[0]?.body ?? "", s.head, `${label}: head`);
      if (s.buttons) assert.deepEqual(replies.at(-1)?.buttons.map((b) => b.slice(0, 21)), s.buttons.map((b) => b.slice(0, 21)), `${label}: buttons`);
      if (s.ai !== undefined) assert.equal(w.aiCalls - aiBefore, s.ai, `${label}: model calls`);
      // Button taps answer within 3 seconds and typed requests within 8 (here: no network, so far below).
      assert.ok(took < (button ? 3000 : 8000), `${label}: took ${took} ms`);
      for (const m of replies) {
        assert.doesNotMatch(m.body, BANNED, `${label}: no dash or exclamation mark in ${m.body}`);
        assert.doesNotMatch(m.body, LATIN_BANNED, label);
        assert.ok(m.buttons.every((b) => b.length <= 20), `${label}: button titles fit WhatsApp`);
        for (const name of w.foreignNames(m.to).filter((n) => !(s.text ?? "").includes(n))) assert.ok(!m.body.includes(name) && !m.buttons.some((b) => b.includes(name)), `${label}: ${name} never shown to ${m.to}`);
      }
    }
    c.check?.(w);
  });
}

for (const c of SENDS) Deno.test(`sender: ${c.name}`, () => c.run(new World()));

Deno.test("the suite has at least 100 conversations, in English, Spanish and Arabic, for every kind of person", () => {
  const total = CASES.length + SENDS.length;
  assert.ok(total >= 100, `only ${total}`);
  const lang = (l: string) => CASES.filter((c) => (c.lang ?? "en") === l).length;
  assert.ok(lang("es") >= 8 && lang("ar") >= 8, `es ${lang("es")}, ar ${lang("ar")}`);
  const tags = new Set(CASES.flatMap((c) => c.tags ?? []).concat(SENDS.flatMap((c) => c.tags ?? [])));
  for (const t of ["unknown", "prospect", "owner", "manager", "staff", "several", "partner", "staff_admin", "two_roles", "privacy", "failure", "18.2", "18.3", "25.5", "28.3", "9.5"]) {
    assert.ok(tags.has(t), `no ${t} case`);
  }
  assert.equal(PNID.length > 0, true);
});
