// Run: deno test supabase/functions/_shared/whatsapp/fix5-help.test.ts
// Fix 5 (R-158 item 2, item 6; the Cards 2 gap): an owner's "help" names "cards" and "my link", in the Look 2 style.
import assert from "node:assert/strict";
import { SAY } from "./say.ts";
import { fromText, lookProblems, markFor, toMsg } from "./look.ts";

Deno.test("owner help lists cards and my link, and keeps the look", () => {
  assert.match(SAY.ownerHelp, /\n"cards" for the taps on your Kabsi cards\n/);
  assert.match(SAY.ownerHelp, /\n"my link" to share Kabsi with another business\n/);
  assert.ok(SAY.ownerHelp.indexOf('"cards"') > SAY.ownerHelp.indexOf('"review link"'), "after the review link");
  assert.doesNotMatch(SAY.ownerHelp, /[‒-―!]/);
  const m = toMsg(fromText(SAY.ownerHelp, markFor("help", null), null), { buttons: 0 });
  assert.deepEqual(lookProblems(m, { list: true }), []);
  assert.match(m.body, /^\*\u{1F4CB} You can send\*/u);
});
