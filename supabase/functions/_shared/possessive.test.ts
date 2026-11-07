// Clean 2 A3 (PR 469's rule for every product message): one helper, used by Outbound, the access and disconnect notices,
// the staff billing line and the AI answer findings. Names ending in s, in ss and in an apostrophe are tested in each.
// Run with: deno test --no-check _shared/ (scripts/deno-check.sh).
import assert from "node:assert/strict";
import { staffPlanLine } from "./billing-lines.ts";
import { accessChangeEmail } from "./disconnect.ts";
import { accessWorks } from "./email/account-copy.ts";
import { possessive } from "./possessive.ts";
import { findingTask } from "./visibility/ai/accuracy-words.ts";

const CASES: [string, string][] = [
  ["Rose Lane Salon", "Rose Lane Salon's"],
  ["Harbor Barbers", "Harbor Barbers'"],
  ["Maple Nails", "Maple Nails'"],
  ["Moss", "Moss'"],
  ["Harbor Barbers'", "Harbor Barbers'"],
  ["Harbor Barbers’", "Harbor Barbers’"],
  ["Rose Lane Salon ", "Rose Lane Salon's"],
  ["", "'s"],
];

Deno.test("possessive: s and ss take an apostrophe only, an apostrophe already there is kept, anything else takes 's", () => {
  for (const [name, want] of CASES) assert.equal(possessive(name), want, name);
  assert.equal(possessive("ABC Cleaners"), "ABC Cleaners'", "upper case s");
});

Deno.test("the disconnect notice writes the possessive in its html and its text", () => {
  for (const [name, own] of CASES.slice(0, 6)) {
    const m = accessChangeEmail({ change: "removed", name, at: "2026-10-09T10:00:00.000Z" }, "https://kabsi.co");
    assert.ok(m.text.includes(`access to ${own} Google profile.`), `${name}: ${m.text.slice(0, 120)}`);
    assert.ok(m.bodyHtml.includes(`<strong>${own.replaceAll("'", "&#39;")}</strong> Google profile.`) || m.bodyHtml.includes(`<strong>${own}</strong> Google profile.`), name);
    assert.ok(!/s's |''/.test(m.text));
  }
});

Deno.test("the access works notice writes the possessive in its html and its text", () => {
  for (const [name, own] of CASES.slice(0, 6)) {
    const m = accessWorks({ business: name, when: "9 October", removeSteps: "on your profile.", freeLine: "Free.", helpUrl: "https://example.com" }, "https://kabsi.co");
    assert.ok(m.text.includes(`became a Manager of ${own} Google profile`), name);
    assert.ok(!/s's |''/.test(m.text));
  }
});

Deno.test("the staff billing line writes the possessive of a plan that has ended", () => {
  for (const [name, own] of CASES.slice(0, 6))
    assert.equal(staffPlanLine({ paid: false, message: "ended", business: name, plan: "pro", endDate: null }), `${own} plan has ended`);
  assert.equal(staffPlanLine({ paid: false, message: "scheduled_cancel", business: "Moss", plan: "pro", endDate: "9 December 2026" }), "Moss cancelled; the plan ends on 9 December 2026");
  assert.equal(staffPlanLine({ paid: true, message: null, business: "Moss", plan: "essentials", endDate: null }), "New paying customer: Moss on Essentials");
});

Deno.test("the AI answer finding writes the possessive of the assistant", () => {
  const f = { fact: "hours", detail: "hours", sentence: "Open until 9.", assistant: "Overviews", question: "q", asked_at: "2026-11-01T10:00:00Z", kabsi: "Open until 6" } as const;
  assert.ok(findingTask(f).title.startsWith("Overviews' answer gives"));
  assert.ok(findingTask({ ...f, assistant: "chatgpt" }).title.startsWith("ChatGPT's answer gives"));
});
