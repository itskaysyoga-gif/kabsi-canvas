// Cards 2 (master plan 30.50 item 9): "Link card CODE", the place and "cards", inside the real agent on the fake world
// (world.test-helpers.ts). The database side (only the phone's own businesses, refused codes limited, taps per week for
// this business only, bots left out) is tested in supabase/tests/cards2.sql.
import assert from "node:assert/strict";
import { receive } from "./agent.ts";
import { type CardCheck, cardRowDescription, cardRowTitle, CARDS_SAY, type CardsDb, type CardWeek, cardsList, LINK_CARD_RE, typedPlace } from "./cards.ts";
import { lookProblems, ROW_DESC_MAX, ROW_TITLE_MAX } from "./look.ts";
import { BIZ, msg, PHONES, World } from "./world.test-helpers.ts";
import { parse } from "./router.ts";

type Card = { location: string | null; label: string | null; status: "unassigned" | "active" | "disabled" };

function fake(w: World, cards: Record<string, Card>, weeks: CardWeek[] = []): CardsDb & { cards: Record<string, Card> } {
  const mine = (phone: string) =>
    w.roles(phone).flatMap((r) => (r.kind === "business" && (r.role === "owner" || r.role === "manager") ? [r.location_id] : []));
  return {
    cards,
    check: async (code, phone): Promise<CardCheck> => {
      const c = cards[code];
      if (!c || (c.location && !mine(phone).includes(c.location))) return { result: "unknown" };
      if (c.status === "disabled") return { result: "disabled" };
      if (c.location) return { result: "already", location_id: c.location, label: c.label };
      return { result: mine(phone).length ? "ask" : "signup" };
    },
    link: async (code, loc, phone) => {
      const c = cards[code];
      if (!mine(phone).includes(loc) || !c || (c.location && c.location !== loc)) return { result: "unknown" };
      Object.assign(c, { location: loc, status: "active" });
      return { result: "linked", label: c.label };
    },
    label: async (code, label, phone) => {
      const c = cards[code];
      if (!c?.location || !mine(phone).includes(c.location)) return { result: "unknown" };
      c.label = label;
      return { result: "labelled", label };
    },
    list: async (loc, phone) => (mine(phone).includes(loc) ? { result: "ok", cards: weeks } : { result: "unknown" }),
  };
}

const last = (w: World, phone: string) => w.repliesTo(phone).at(-1)!;

Deno.test("cards2: the activate page's message is read in any case, and nothing around it", () => {
  assert.equal(LINK_CARD_RE.exec("Link card ABC234")?.[1], "ABC234");
  assert.equal(LINK_CARD_RE.exec("  link card abc234. ")?.[1], "abc234");
  assert.equal(LINK_CARD_RE.exec("please link card ABC234"), null);
  assert.equal(LINK_CARD_RE.exec("Link card ABC23"), null, "six characters");
  assert.equal(LINK_CARD_RE.exec("Link card ABC1O4"), null, "no 0, 1, I, L or O");
});

Deno.test("cards2: one business: \"Link card CODE to [business]?\" with one button, then the place", async () => {
  const w = new World();
  const db = fake(w, { ABC234: { location: null, label: null, status: "unassigned" } });
  const deps = { ...w.deps(), cards: db };
  assert.equal(await receive(deps, msg(w, PHONES.owner, { text: "Link card abc234" })), "card_ask");
  const ask = last(w, PHONES.owner);
  assert.match(ask.body, /^\*❓ Link a card\*\n\nEach tap opens your Google review form\.\n\nLink card ABC234 to Harbour Lane Coffee\?$/);
  assert.deepEqual(ask.buttons, [CARDS_SAY.yesButton]);
  assert.deepEqual(lookProblems({ body: ask.body }), []);
  assert.equal(await receive(deps, msg(w, PHONES.owner, { button: `lc:ABC234:${BIZ.harbour}` })), "card_linked");
  assert.equal(db.cards.ABC234!.location, BIZ.harbour);
  const linked = last(w, PHONES.owner);
  assert.match(linked.body, /^\*✅ Card linked\*\n\nCard ABC234 · Harbour Lane Coffee\n/);
  assert.deepEqual(linked.buttons, ["Front desk", "Till", "Table"]);
  assert.equal(await receive(deps, msg(w, PHONES.owner, { button: "cl:ABC234:t" })), "card_labelled");
  assert.equal(db.cards.ABC234!.label, "Till");
  assert.match(last(w, PHONES.owner).body, /^\*✅ Card ready\*\n\nCard ABC234 · Till\n/);
  assert.equal(w.aiCalls, 0, "no model call");
});

Deno.test("cards2: a place typed back is the label, only while the question is open", async () => {
  const w = new World();
  const db = fake(w, { ABC234: { location: null, label: null, status: "unassigned" } });
  const deps = { ...w.deps(), cards: db };
  await receive(deps, msg(w, PHONES.owner, { text: "Link card ABC234" }));
  await receive(deps, msg(w, PHONES.owner, { button: `lc:ABC234:${BIZ.harbour}` }));
  assert.equal(await receive(deps, msg(w, PHONES.owner, { text: "Window seat" })), "card_labelled");
  assert.equal(db.cards.ABC234!.label, "Window seat");
  // Closed after the answer: the next words are not a label.
  assert.notEqual(await receive(deps, msg(w, PHONES.owner, { text: "Bar" })), "card_labelled");
  assert.equal(db.cards.ABC234!.label, "Window seat");
  // A question is never taken as a place, and the question closes after 10 minutes.
  await receive(deps, msg(w, PHONES.owner, { text: "Link card ABC234" }));
  assert.notEqual(await receive(deps, msg(w, PHONES.owner, { text: "what are my hours?" })), "card_labelled");
  w.now += 11 * 60_000;
  assert.notEqual(await receive(deps, msg(w, PHONES.owner, { text: "Bar" })), "card_labelled");
  assert.equal(db.cards.ABC234!.label, "Window seat");
});

Deno.test("cards2: a phone with several businesses is asked which one; only its own can be picked", async () => {
  const w = new World();
  const db = fake(w, { ABC234: { location: null, label: null, status: "unassigned" } });
  const deps = { ...w.deps(), cards: db };
  assert.equal(await receive(deps, msg(w, PHONES.multi, { text: "Link card ABC234" })), "card_which");
  const which = last(w, PHONES.multi);
  assert.deepEqual([...which.buttons].sort(), ["Bright Smile Kids", "Smile Dental"]);
  assert.match(which.body, /Which business is it for\?$/);
  // A button naming a business that is not the phone's own links nothing.
  assert.equal(await receive(deps, msg(w, PHONES.multi, { button: `lc:ABC234:${BIZ.harbour}` })), "card_unknown");
  assert.equal(db.cards.ABC234!.location, null);
  assert.equal(await receive(deps, msg(w, PHONES.multi, { button: `lc:ABC234:${BIZ.bright}` })), "card_linked");
  assert.equal(db.cards.ABC234!.location, BIZ.bright);
});

Deno.test("cards2: an unknown phone is sent to sign in with the code kept", async () => {
  const w = new World();
  const deps = { ...w.deps(), cards: fake(w, { ABC234: { location: null, label: null, status: "unassigned" } }) };
  assert.equal(await receive(deps, msg(w, PHONES.unknown, { text: "Link card ABC234" })), "card_signup");
  const body = last(w, PHONES.unknown).body;
  assert.match(body, /\/start\?code=ABC234/);
  assert.match(body, /Nothing goes live without your yes\./);
});

Deno.test("cards2: another business's card is unknown and never named; staff and forwarded messages link nothing", async () => {
  const w = new World();
  const db = fake(w, { ABC234: { location: BIZ.deli, label: "Till", status: "active" }, QRS234: { location: null, label: null, status: "disabled" },
    NEW234: { location: null, label: null, status: "unassigned" } });
  const deps = { ...w.deps(), cards: db };
  assert.equal(await receive(deps, msg(w, PHONES.owner, { text: "Link card ABC234" })), "card_unknown");
  assert.doesNotMatch(last(w, PHONES.owner).body, /Corner Deli|Till/);
  assert.equal(await receive(deps, msg(w, PHONES.owner, { text: "Link card QRS234" })), "card_disabled");
  assert.equal(await receive(deps, msg(w, PHONES.plain, { text: "Link card ABC234" })), "card_already", "its own owner sees it");
  assert.match(last(w, PHONES.plain).body, /Card ABC234 · Till/);
  assert.equal(await receive(deps, msg(w, PHONES.owner, { text: "Link card ABC234", forwarded: true })) === "card_ask", false);
  assert.equal(await receive(deps, msg(w, PHONES.owner, { button: `lc:ABC234:${BIZ.harbour}`, forwarded: true })), "card_forwarded");
  // A staff member of a business is not its owner or manager: sign in as the owner instead.
  assert.equal(await receive(deps, msg(w, PHONES.staff, { text: "Link card NEW234" })), "card_signup");
});

Deno.test("cards2: \"cards\" lists each card with taps this week and last week; a row opens the card", async () => {
  const w = new World();
  const weeks: CardWeek[] = [
    { code: "ABC234", label: "Front desk", this_week: 12, last_week: 9 },
    { code: "DEF567", label: null, this_week: 1, last_week: 0 },
  ];
  const db = fake(w, { ABC234: { location: BIZ.harbour, label: "Front desk", status: "active" } }, weeks);
  const deps = { ...w.deps(), cards: db };
  assert.equal(parse(msg(w, PHONES.owner, { text: "cards" })).k, "tool");
  assert.equal(await receive(deps, msg(w, PHONES.owner, { text: "Cards" })), "card_list");
  const list = last(w, PHONES.owner);
  assert.match(list.body, /^\*📋 Your cards\*\n\nTaps this week and last week, by place\.\nA tap is not a review\.\n\nTap one to change its place\.$/);
  assert.deepEqual(list.rows, ["Front desk · This week: 12 taps · Last week: 9 taps", "Card DEF567 · This week: 1 tap · Last week: 0 taps"]);
  assert.deepEqual(list.rowIds, ["cr:ABC234", "cr:DEF567"]);
  assert.doesNotMatch(list.body + (list.rows ?? []).join(" "), /review(s)? (left|written|from)|became|ranking|target/i);
  assert.equal(await receive(deps, msg(w, PHONES.owner, { button: "cr:ABC234" })), "card_already");
  assert.deepEqual(last(w, PHONES.owner).buttons, ["Front desk", "Till", "Table"]);
  // Staff of the business cannot list cards; a business with no card says how to link one.
  assert.notEqual(await receive(deps, msg(w, PHONES.staff, { text: "cards" })), "card_list");
  const empty = { ...w.deps(), cards: fake(w, {}, []) };
  assert.equal(await receive(empty, msg(w, PHONES.plain, { text: "cards" })), "card_none");
});

Deno.test("cards2: list rows never cut a word, and a long place keeps its taps", () => {
  const long: CardWeek = { code: "ABC234", label: "The big window by the garden terrace", this_week: 1234567, last_week: 7654321 };
  const t = cardRowTitle(long);
  assert.ok(t.length <= ROW_TITLE_MAX && "The big window by the garden terrace".startsWith(t) && !t.endsWith("..."));
  assert.ok(/\s|$/.test("The big window by the garden terrace".charAt(t.length)), "cut at a word boundary");
  const d = cardRowDescription(long);
  assert.ok(d.length <= ROW_DESC_MAX);
  assert.equal(cardsList(Array.from({ length: 12 }, (_, i) => ({ code: `ABC23${i % 8 + 2}`, label: null, this_week: i, last_week: 0 }))).list.sections[0]!.rows.length, 10);
  assert.match(CARDS_SAY.listBody(12), /and 2 more/);
});

Deno.test("cards2: words: taps never reviews, no dash or exclamation mark, a place not a person", () => {
  const all = [
    CARDS_SAY.ask("ABC234", "Bloom"), CARDS_SAY.which("ABC234"), CARDS_SAY.linked("ABC234", "Bloom"), CARDS_SAY.already("ABC234", null),
    CARDS_SAY.labelled("ABC234", "Till"), CARDS_SAY.badLabel, CARDS_SAY.unknown("ABC234"), CARDS_SAY.disabled("ABC234"), CARDS_SAY.limited,
    CARDS_SAY.noPlace, CARDS_SAY.signup("ABC234", "https://kabsi.co/start?code=ABC234"), CARDS_SAY.listBody(3), CARDS_SAY.none,
  ].join("\n");
  assert.doesNotMatch(all, /[—–!]/);
  assert.doesNotMatch(all, /\breviews\b|staff member|employee|best|top performer|goal|target/i);
  assert.equal(typedPlace(" Front   desk. "), "Front desk");
  assert.equal(typedPlace("x"), null);
  assert.equal(typedPlace("a".repeat(31)), null);
  assert.ok(CARDS_SAY.yesButton.length <= 20);
});
