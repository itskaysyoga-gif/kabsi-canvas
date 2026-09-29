// Run: deno test supabase/functions/_shared/invitations.test.ts
import assert from "node:assert/strict";
import { addressMatches, matchInvitation, norm } from "./invitations.ts";

const younes = { name: "Cafe Younes", address: "Hamra Street 12, Beirut, Lebanon" };
const plain = { name: "Cafe", address: "Main Street 5, Beirut, Lebanon" };
const inv = (o: Record<string, unknown> = {}) => ({ addressLines: ["Hamra Street 12"], locality: "Beirut", ...o });

Deno.test("norm ignores case, accents and punctuation", () => {
  assert.equal(norm("  Café  Younes! "), "cafe younes");
  assert.equal(norm("Éclair & Co."), "eclair co");
});

Deno.test("exact name and street match is accepted", () => {
  const r = matchInvitation("Cafe Younes", inv(), [younes, plain]);
  assert.equal(r.ok, true);
});

Deno.test("look-alike names: 'Cafe' does not match 'Cafe Younes' and the reverse", () => {
  assert.equal(matchInvitation("Cafe", inv({ addressLines: ["Main Street 5"] }), [younes]).ok, false);
  assert.equal(matchInvitation("Cafe Younes", inv(), [plain]).ok, false);
  // both consented: each invitation picks only its own business
  const a = matchInvitation("Cafe", inv({ addressLines: ["Main Street 5"] }), [younes, plain]);
  assert.equal(a.ok && a.business.name, "Cafe");
  const b = matchInvitation("Cafe Younes", inv(), [younes, plain]);
  assert.equal(b.ok && b.business.name, "Cafe Younes");
});

Deno.test("same name in another city is refused", () => {
  const r = matchInvitation("Cafe Younes", { addressLines: ["Rue 9"], locality: "Tripoli" }, [younes]);
  assert.equal(r.ok, false);
});

Deno.test("city alone is enough when the street differs", () => {
  assert.equal(matchInvitation("Cafe Younes", { addressLines: ["Other Road"], locality: "Beirut" }, [younes]).ok, true);
});

Deno.test("whole words only: Rome is not Jerome", () => {
  assert.equal(addressMatches("1 Main St, Jerome, USA", { locality: "Rome" }), false);
  assert.equal(addressMatches("1 Main St, Rome, Italy", { locality: "Rome" }), true);
});

Deno.test("two consented businesses with the same name and city: never accepted", () => {
  const twin = { name: "Cafe Younes", address: "Hamra Street 40, Beirut, Lebanon" };
  const r = matchInvitation("Cafe Younes", { locality: "Beirut" }, [younes, twin]);
  assert.equal(r.ok, false);
  assert.match(!r.ok ? r.reason : "", /ambiguous/);
});

Deno.test("missing address on the invitation or the business is refused", () => {
  assert.equal(matchInvitation("Cafe Younes", null, [younes]).ok, false);
  assert.equal(matchInvitation("Cafe Younes", inv(), [{ name: "Cafe Younes", address: null }]).ok, false);
});

Deno.test("empty listing name is refused", () => {
  assert.equal(matchInvitation("  ", inv(), [younes]).ok, false);
});
