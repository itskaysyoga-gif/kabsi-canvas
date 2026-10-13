// Run: deno test supabase/functions/_shared/facts.test.ts
// P0.3-01: drafts use only verified Business Knowledge (K-10, K-11, K-120, guardrail 4). The database returns the
// trusted facts (public.draft_facts, tested in supabase/tests/knowledge_source.sql); here the prompt side is held to
// the same rule even if a caller hands it more: an unconfirmed AI suggestion, a fact nobody confirmed, an outdated,
// rejected, superseded or out-of-date fact never reaches a prompt. Every model call is a stub; nothing leaves the
// machine.
import assert from "node:assert/strict";
import { businessFacts, cardFromFacts, type FactRow, loadCard } from "./facts.ts";
import { draftReply, replySystem } from "./ai.ts";

const DAY = 86_400_000;
const future = new Date(Date.now() + 30 * DAY).toISOString();
const past = new Date(Date.now() - DAY).toISOString();
const row = (slot: string, key: string, value: Record<string, unknown>, status = "verified", extra: Partial<FactRow> = {}): FactRow =>
  ({ id: crypto.randomUUID(), slot, key, value, status, review_after: null, ...extra });

// What a business's facts can look like: the owner's verified ones and everything that must stay out.
const ROWS: FactRow[] = [
  row("card.about", "description", { text: "A family bakery in Hamra." }),
  row("card.signature", "signature", { text: "Rami and the team" }),
  row("card.staff_names:a1", "staff_member", { name: "Lina" }, "verified", { review_after: future }),
  row("card.faqs:b2", "faq", { item: { q: "Do you bake gluten-free bread?", a: "Yes, every Friday." } }),
  row("card.delivery", "delivery", { offered: true }),
  // An AI suggestion waits for the owner (K-11): never in a prompt.
  row("card.parking", "parking", { text: "Free valet parking for every guest" }, "needs_confirmation"),
  // A website fact nobody confirmed.
  row("card.booking", "booking", { text: "Book online at any time of day" }, "needs_confirmation"),
  // A price past its 90 days (K-10 review_after): out of date until the owner confirms it again.
  row("card.price_notes", "price_note", { text: "Cakes from $12" }, "verified", { review_after: past }),
  row("card.wifi", "wifi", { text: "Wifi for all diners" }, "outdated"),
  row("card.policies", "policy", { text: "Full refunds on request" }, "rejected"),
  row("card.services", "service", { text: "Old services list" }, "verified", { superseded_by: crypto.randomUUID() }),
  // Google Protection's profile details are not draft facts.
  row("profile.phone", "phone", { display: "+961 1 234 567" }),
];
const UNTRUSTED = ["valet", "Book online", "$12", "Wifi for all", "Full refunds", "Old services", "234 567"];

Deno.test("only verified, current facts within their ask-again date become the draft's facts", () => {
  const card = cardFromFacts(ROWS);
  assert.deepEqual(card, {
    about: "A family bakery in Hamra.",
    signature: "Rami and the team",
    staff_names: ["Lina"],
    faqs: [{ q: "Do you bake gluten-free bread?", a: "Yes, every Friday." }],
    delivery: true,
  });
});

Deno.test("a staff name past its 180 days drops out until the owner confirms it again", () => {
  const card = cardFromFacts([row("card.staff_names:x", "staff_member", { name: "Omar" }, "verified", { review_after: past })]);
  assert.deepEqual(card, {});
});

Deno.test("loadCard asks the database for the trusted facts of one business and one use", async () => {
  const calls: [string, Record<string, unknown>][] = [];
  const db = { rpc: (fn: string, args: Record<string, unknown>) => { calls.push([fn, args]); return Promise.resolve({ data: ROWS, error: null }); } };
  const card = await loadCard(db, "loc-1", "replies");
  assert.deepEqual(calls, [["draft_facts", { p_location: "loc-1", p_use: "replies" }]]);
  assert.equal(card.about, "A family bakery in Hamra.");
  await assert.rejects(loadCard({ rpc: () => Promise.resolve({ data: null, error: new Error("db down") }) }, "loc-1", "posts"), /db down/);
});

Deno.test("an unconfirmed AI suggestion never appears in a reply prompt or anything sent to the model", async () => {
  // Even if the database handed back every row, the prompt is built only from the trusted ones.
  const db = { rpc: () => Promise.resolve({ data: ROWS, error: null }) };
  const card = await loadCard(db, "loc-1", "replies");
  const review = { reviewer: "Maya", rating: 5, comment: "Is there parking? And can I book online?" };
  const system = replySystem({ review, business: "Hamra Bakery", card, language: "en", urgent: false });
  assert.match(system, /A family bakery in Hamra\./);
  for (const s of UNTRUSTED) assert.ok(!system.includes(s), `prompt holds "${s}"`);

  const sent: string[] = [];
  const send = (s: string, u: string) => { sent.push(s, u); return Promise.resolve({ text: "Thank you Maya.\nRami and the team", model: "stub" }); };
  await draftReply({ review, business: "Hamra Bakery", card, language: "en", urgent: false }, send);
  assert.equal(sent.length, 2);
  for (const s of UNTRUSTED) assert.ok(!sent.join("\n").includes(s), `model call holds "${s}"`);
});

Deno.test("a post's facts (what postSystem and the post check list) hold the same trusted facts only", () => {
  // posts.ts builds its prompt and its check from businessFacts(card, "post") (it needs the function's secrets to
  // load, so the builder is checked here).
  const lines = businessFacts(cardFromFacts(ROWS), "post").join("\n");
  assert.match(lines, /A family bakery in Hamra\./);
  for (const s of UNTRUSTED) assert.ok(!lines.includes(s), `post facts hold "${s}"`);
  // Staff names and the sign-off are reply-only.
  assert.ok(!lines.includes("Lina") && !lines.includes("Rami"));
});

Deno.test("with no trusted facts the prompt says so and invents nothing", () => {
  const system = replySystem({ review: { reviewer: "Sam", rating: 4, comment: "Nice" }, business: "Hamra Bakery", card: cardFromFacts([]), language: "en", urgent: false });
  assert.match(system, /<business_facts>\n\(no extra facts\)\n<\/business_facts>/);
});
