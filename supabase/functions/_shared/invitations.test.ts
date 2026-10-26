// Run: deno test supabase/functions/_shared/invitations.test.ts
import assert from "node:assert/strict";
import { addressMatches, matchByPlace, matchInvitation, norm } from "./invitations.ts";

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

Deno.test("Access 1: a saved address of two words or more, whole inside Google's street and city, matches", () => {
  assert.equal(addressMatches("Mirna Chalouhi", { addressLines: ["Mirna Chalouhi Highway"], locality: "Sin El Fil" }), true);
  assert.equal(addressMatches("Mirna Chalouhi", { addressLines: ["Main Road"], locality: "Mirna Chalouhi" }), true);
  assert.equal(matchInvitation("Yawmiyati", { addressLines: ["Mirna Chalouhi Highway"], locality: "Sin El Fil" }, [{ name: "Yawmiyati", address: "Mirna Chalouhi" }]).ok, true);
});

Deno.test("Access 1: a one-word saved address never matches Google's longer address", () => {
  assert.equal(addressMatches("Dubai", { addressLines: ["Sheikh Zayed Road"], locality: "Al Barsha" }), false);
  assert.equal(addressMatches("Chalouhi", { addressLines: ["Mirna Chalouhi Highway"] }), false);
});

Deno.test("Access 1: area and postcode alone never match", () => {
  assert.equal(addressMatches("Greater London", { addressLines: ["1 High Street"], locality: "Croydon", administrativeArea: "Greater London" }), false);
  assert.equal(addressMatches("SW1A 1AA", { addressLines: ["10 Road"], locality: "Kingston", postalCode: "SW1A 1AA" }), false);
});

Deno.test("Access 1: part of a word never counts", () => {
  assert.equal(addressMatches("Mirna Chalouhi", { addressLines: ["Mirna Chalouhiyeh Road"] }), false);
});

Deno.test("Access 1: missing addresses still refused", () => {
  assert.equal(addressMatches(null, { addressLines: ["Mirna Chalouhi Highway"] }), false);
  assert.equal(addressMatches("Mirna Chalouhi", null), false);
  assert.equal(addressMatches("Mirna Chalouhi", { addressLines: [] }), false);
});

Deno.test("Access 1: Google's address as one string (its documented shape)", () => {
  // Yawmiyati: Google's listing has only the street line, and so does the saved address
  assert.equal(matchInvitation("Yawmiyati", "Mirna Chalouhi", [{ name: "Yawmiyati", address: "Mirna Chalouhi" }]).ok, true);
  assert.equal(addressMatches("Mirna Chalouhi", "Mirna Chalouhi, Sin El Fil, Lebanon"), true);
  assert.equal(addressMatches("Hamra Street 12, Beirut, Lebanon", "Hamra Street 12, Beirut"), true);
  assert.equal(addressMatches("1 Main Street, Example Town, CA 00000, USA", "1 Main Street, Example Town, CA 00000"), true);
  // another street in the same city: refused
  assert.equal(addressMatches("Hamra Street 12, Beirut, Lebanon", "Rue 9, Beirut"), false);
  // one-word, country-only or town-different overlaps never count
  assert.equal(addressMatches("Dubai", "Sheikh Zayed Road, Al Barsha, Dubai"), false);
  assert.equal(addressMatches("10 King Street, Manchester, UK", "United Kingdom"), false);
  assert.equal(addressMatches("United Kingdom", "10 King Street, Manchester, United Kingdom"), false);
  assert.equal(addressMatches("United Arab Emirates", "Dubai - United Arab Emirates"), false);
  assert.equal(addressMatches("High Street, Bromley, UK", "High Street, Croydon"), false);
  assert.equal(addressMatches("1 High St, London", "1 High St, London SW1A 1AA"), true);
  assert.equal(addressMatches("1 High St, London, SW1A 1AA, UK", "1 High St, London"), true);
  assert.equal(addressMatches("Unit 4, London", "1 High Street, London"), false);
  assert.equal(addressMatches("Mirna Chalouhi", ""), false);
  assert.equal(addressMatches(null, "Mirna Chalouhi"), false);
});

Deno.test("Access 1b: Google's address in Arabic is confirmed by the place ID from Places", async () => {
  const yawmiyati = { name: "Yawmiyati", address: "Mirna Chalouhi", placeId: "ChIJyawmiyati" };
  const arabic = "طريق ميرنا شالوحي, Lebanon";
  assert.equal(matchInvitation("Yawmiyati", arabic, [yawmiyati]).ok, false);
  const asked: string[] = [];
  const r = await matchByPlace("Yawmiyati", arabic, [yawmiyati], (q) => { asked.push(q); return Promise.resolve("ChIJyawmiyati"); });
  assert.equal(r.ok && r.business.name, "Yawmiyati");
  assert.deepEqual(asked, ["Yawmiyati, طريق ميرنا شالوحي, Lebanon"]);
});

Deno.test("Access 1b: Places naming another listing, or none, leaves the invitation pending", async () => {
  const b = { name: "Fade Barbers", address: "10 King Street, Manchester", placeId: "ChIJmine" };
  assert.equal((await matchByPlace("Fade Barbers", "5 Other Road, Leeds", [b], () => Promise.resolve("ChIJstranger"))).ok, false);
  assert.equal((await matchByPlace("Fade Barbers", "5 Other Road, Leeds", [b], () => Promise.resolve(null))).ok, false);
});

Deno.test("Access 1b: no lookup without a same-named business with a place ID, or without an address", async () => {
  let calls = 0;
  const resolve = () => { calls++; return Promise.resolve("ChIJmine"); };
  assert.equal((await matchByPlace("Fade Barbers", "5 Other Road", [{ name: "Fade Barbers", address: "x", placeId: null }], resolve)).ok, false);
  assert.equal((await matchByPlace("Other Name", "5 Other Road", [{ name: "Fade Barbers", address: "x", placeId: "ChIJmine" }], resolve)).ok, false);
  assert.equal((await matchByPlace("Fade Barbers", "", [{ name: "Fade Barbers", address: "x", placeId: "ChIJmine" }], resolve)).ok, false);
  assert.equal(calls, 0);
});

Deno.test("Access 1b: two consented businesses sharing a place ID are never accepted", async () => {
  const a = { name: "Cafe", address: "a", placeId: "ChIJsame" }, b = { name: "Cafe", address: "b", placeId: "ChIJsame" };
  assert.equal((await matchByPlace("Cafe", "Somewhere", [a, b], () => Promise.resolve("ChIJsame"))).ok, false);
});
