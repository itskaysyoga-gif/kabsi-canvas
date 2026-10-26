// Access 2: accepting Manager invitations whose address Google writes in the listing's own script, without ever
// accepting a listing whose owner did not consent in Kabsi (D270). Run with: scripts/deno-check.sh.
import assert from "node:assert/strict";
import { io } from "./client.ts";
import * as google from "./index.ts";
import { guard } from "./places/live.ts";
import { type LookupMemory, type PlaceHit, type PlaceSearch, type Remembered, strayListings } from "../invitations.ts";
import invitationsFixture from "../../../../tests/fixtures/google/accounts.invitations.arabic.json" with { type: "json" };
import placesFixture from "../../../../tests/fixtures/google/places.searchText.invitation.json" with { type: "json" };

const YAWMIYATI_PLACE = "ChIJaXHRjL4XHxURYvc-mzYQzcg";
const YAWMIYATI_LOCATION = "locations/4825254240697973899";
const ARABIC = invitationsFixture.invitations[0].targetLocation.address;
const yawmiyati = { id: "b-yawmiyati", name: "Yawmiyati", address: "Mirna Chalouhi", placeId: YAWMIYATI_PLACE };

type Inv = { name: string; role?: string; targetType?: string; targetLocation?: { locationName?: string; address?: string } };
function fakeGoogle(invitations: Inv[], managedAfter: { name: string; title: string; placeId: string }[] = []) {
  const acceptedNames: string[] = [];
  let accepted = false;
  return {
    acceptedNames,
    accounts: {
      listAccounts: () => Promise.resolve({ accounts: [{ name: "accounts/113746201522792609010" }] }),
      listInvitations: () => Promise.resolve({ invitations: invitations as never }),
      acceptInvitation: (n: string) => { acceptedNames.push(n); accepted = true; return Promise.resolve({}); },
    },
    locations: {
      listLocations: () => Promise.resolve({
        locations: accepted ? managedAfter.map((l) => ({ name: l.name, title: l.title, metadata: { placeId: l.placeId } })) : [],
      }),
    },
  };
}
const arabicInvitation = (address = ARABIC, name = "Yawmiyati", id = "1") =>
  ({ name: `accounts/113746201522792609010/invitations/${id}`, role: "MANAGER", targetType: "LOCATIONS_ONLY", targetLocation: { locationName: name, address } });

// The 24-hour memory, as invitation_lookup_claim does it, on a clock the test moves.
function memoryOn(clock: { now: number }) {
  const rows = new Map<string, Remembered & { at: number }>();
  const m: LookupMemory & { rows: typeof rows } = {
    rows,
    claim: (inv) => {
      const r = rows.get(inv);
      if (r && clock.now - r.at < 24 * 3600_000) return Promise.resolve({ placeId: r.placeId, reason: r.reason });
      rows.set(inv, { placeId: null, reason: "looking up", at: clock.now });
      return Promise.resolve(null);
    },
    save: (inv, v) => { rows.set(inv, { ...v, at: rows.get(inv)!.at }); return Promise.resolve(); },
    release: (inv) => { if (rows.get(inv)?.reason === "looking up") rows.delete(inv); return Promise.resolve(); },
  };
  return m;
}
function searchReturning(places: PlaceHit[] | "cap" | "error") {
  const calls: { query: string; language?: string }[] = [];
  const search: PlaceSearch = (query, language) => {
    calls.push({ query, language });
    return Promise.resolve(places === "cap" || places === "error" ? { status: places } : { status: "ok", places });
  };
  return { search, calls };
}

Deno.test("Access 2: the Arabic invitation is confirmed by Places and accepted (fixture)", async () => {
  const g = fakeGoogle(invitationsFixture.invitations, [{ name: YAWMIYATI_LOCATION, title: "Yawmiyati", placeId: YAWMIYATI_PLACE }]);
  const { search, calls } = searchReturning(placesFixture.places);
  const r = await google.acceptInvitationsAndListLocations([yawmiyati], { ...g, search, memory: memoryOn({ now: 0 }) });
  assert.equal(r.accepted, 1);
  assert.deepEqual(g.acceptedNames, [invitationsFixture.invitations[0].name]);
  assert.deepEqual(calls, [{ query: `Yawmiyati, ${ARABIC}`, language: "ar" }]);
  // The saved copy keeps Google's own text, so a re-invitation needs no lookup.
  assert.deepEqual(r.acceptedFor.map((a) => [a.business.id, a.title, a.address]), [["b-yawmiyati", "Yawmiyati", ARABIC]]);
});

Deno.test("Access 2: the Places request: five results, place ID, name and address only, in the invitation's language, counted", async () => {
  const was = { fetch: globalThis.fetch, take: guard.take };
  const sent: { url: string; mask: string | null; body: unknown }[] = [];
  const kinds: string[] = [];
  guard.take = (kind) => { kinds.push(kind); return Promise.resolve(true); };
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    sent.push({ url: String(input), mask: new Headers(init?.headers).get("x-goog-fieldmask"), body: JSON.parse(String(init?.body)) });
    return Promise.resolve(new Response(JSON.stringify({ places: placesFixture.places }), { status: 200 }));
  }) as typeof fetch;
  try {
    const r = await google.invitationSearch("test-key")!(`Yawmiyati, ${ARABIC}`, "ar");
    assert.equal(r.status, "ok");
    assert.deepEqual(sent, [{
      url: "https://places.googleapis.com/v1/places:searchText", mask: "places.id,places.displayName,places.formattedAddress",
      body: { textQuery: `Yawmiyati, ${ARABIC}`, maxResultCount: 5, languageCode: "ar" },
    }]);
    assert.deepEqual(kinds, ["search"]);
    // The cap: places_take refuses, nothing is sent, the answer is "cap".
    guard.take = () => Promise.resolve(false);
    assert.deepEqual(await google.invitationSearch("test-key")!("q", undefined), { status: "cap" });
    assert.equal(sent.length, 1);
  } finally {
    globalThis.fetch = was.fetch;
    guard.take = was.take;
  }
  assert.equal(google.invitationSearch(""), null);
});

Deno.test("Access 2: invitations are listed with Accept-Language: en", async () => {
  const was = { fetch: globalThis.fetch, token: io.token, gate: io.gate, mode: Deno.env.get("GOOGLE_MODE") };
  const seen: { url: string; lang: string | null }[] = [];
  Deno.env.set("GOOGLE_MODE", "live");
  io.token = () => Promise.resolve("t");
  io.gate = () => Promise.resolve({});
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    seen.push({ url: String(input), lang: new Headers(init?.headers).get("accept-language") });
    const body = String(input).endsWith("/accounts") ? { accounts: [{ name: "accounts/1" }] } : {};
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  }) as typeof fetch;
  try {
    await google.acceptInvitationsAndListLocations([], { search: null, memory: null });
  } finally {
    globalThis.fetch = was.fetch;
    Object.assign(io, { token: was.token, gate: was.gate });
    if (was.mode === undefined) Deno.env.delete("GOOGLE_MODE"); else Deno.env.set("GOOGLE_MODE", was.mode);
  }
  const inv = seen.find((s) => s.url.endsWith("/accounts/1/invitations"));
  assert.equal(inv?.lang, "en");
});

Deno.test("Access 2: a same-named stranger in another city is never accepted", async () => {
  const stranger = arabicInvitation("شارع الحمرا, Beirut, Lebanon");
  // Places names the stranger's own listing: no consented business has that place ID.
  const one = searchReturning([{ id: "ChIJstranger", displayName: { text: "Yawmiyati" }, formattedAddress: "شارع الحمرا، بيروت، لبنان" }]);
  const g1 = fakeGoogle([stranger]);
  const r1 = await google.acceptInvitationsAndListLocations([yawmiyati], { ...g1, search: one.search, memory: memoryOn({ now: 0 }) });
  assert.equal(r1.accepted, 0);
  assert.match(r1.skipped[0].reason, /no consented business has/);
  // Places answers with Yawmiyati's own listing (the stranger's street is not in its address): refused.
  const two = searchReturning(placesFixture.places);
  const r2 = await google.acceptInvitationsAndListLocations([yawmiyati], { ...fakeGoogle([stranger]), search: two.search, memory: memoryOn({ now: 0 }) });
  assert.equal(r2.accepted, 0);
  assert.match(r2.skipped[0].reason, /street is not in the Places address/);
  // Two results with the exact name: refused.
  const twins = searchReturning([placesFixture.places[0], { ...placesFixture.places[0], id: "ChIJtwin" }]);
  const r3 = await google.acceptInvitationsAndListLocations([yawmiyati], { ...fakeGoogle([arabicInvitation()]), search: twins.search, memory: memoryOn({ now: 0 }) });
  assert.equal(r3.accepted, 0);
  assert.match(r3.skipped[0].reason, /2 listings with this exact name/);
  // Two consented businesses sharing the place ID: refused.
  const both = searchReturning(placesFixture.places);
  const r4 = await google.acceptInvitationsAndListLocations([yawmiyati, { ...yawmiyati, id: "b-copy" }], { ...fakeGoogle([arabicInvitation()]), search: both.search, memory: memoryOn({ now: 0 }) });
  assert.equal(r4.accepted, 0);
  assert.match(r4.skipped[0].reason, /share this place ID/);
});

Deno.test("Access 2: a vague address ('Yawmiyati, Lebanon') and a hidden one ('United Kingdom') are refused with no lookup", async () => {
  for (const address of ["Yawmiyati, Lebanon", "United Kingdom", "Dubai, United Arab Emirates", ""]) {
    const { search, calls } = searchReturning(placesFixture.places);
    const r = await google.acceptInvitationsAndListLocations([yawmiyati], { ...fakeGoogle([arabicInvitation(address)]), search, memory: memoryOn({ now: 0 }) });
    assert.equal(r.accepted, 0, address);
    assert.match(r.skipped[0].reason, /has no street/, address);
    assert.equal(calls.length, 0, address);
  }
});

Deno.test("Access 2: one stuck invitation costs one lookup a day: 288 runs, 1 lookup", async () => {
  const clock = { now: 0 };
  const memory = memoryOn(clock);
  const { search, calls } = searchReturning([]);
  for (let run = 0; run < 288; run++, clock.now += 5 * 60_000) {
    const r = await google.acceptInvitationsAndListLocations([yawmiyati], { ...fakeGoogle([arabicInvitation()]), search, memory });
    assert.equal(r.accepted, 0);
  }
  assert.equal(calls.length, 1);
  // The next day it is asked once more.
  await google.acceptInvitationsAndListLocations([yawmiyati], { ...fakeGoogle([arabicInvitation()]), search, memory });
  assert.equal(calls.length, 2);
  // An error from Google is remembered too, never retried every run.
  const err = searchReturning("error");
  const m2 = memoryOn({ now: 0 });
  for (let run = 0; run < 3; run++) await google.acceptInvitationsAndListLocations([yawmiyati], { ...fakeGoogle([arabicInvitation()]), search: err.search, memory: m2 });
  assert.equal(err.calls.length, 1);
});

Deno.test("Access 2: the cap refusing leaves the invitation pending with no error and no memory, and a broken memory asks nothing", async () => {
  const memory = memoryOn({ now: 0 });
  const { search, calls } = searchReturning("cap");
  for (let run = 0; run < 3; run++) {
    const r = await google.acceptInvitationsAndListLocations([yawmiyati], { ...fakeGoogle([arabicInvitation()]), search, memory });
    assert.equal(r.accepted, 0);
    assert.match(r.skipped[0].reason, /Places cap reached today/);
  }
  assert.equal(calls.length, 3); // places_take is asked each run; nothing reaches Google while it refuses
  assert.equal(memory.rows.size, 0);
  const broken: LookupMemory = { claim: () => Promise.reject(new Error("db down")), save: () => Promise.resolve(), release: () => Promise.resolve() };
  const s2 = searchReturning(placesFixture.places);
  const r = await google.acceptInvitationsAndListLocations([yawmiyati], { ...fakeGoogle([arabicInvitation()]), search: s2.search, memory: broken });
  assert.equal(r.accepted, 0);
  assert.equal(s2.calls.length, 0);
});

Deno.test("Access 2: the saved copy reconnects a re-invitation with no Places call", async () => {
  const saved = { ...yawmiyati, googleTitle: "Yawmiyati", googleAddress: ARABIC };
  const noSearch: PlaceSearch = () => { throw new Error("Places must not be called"); };
  const g = fakeGoogle([arabicInvitation(ARABIC, "Yawmiyati", "2")]);
  const r = await google.acceptInvitationsAndListLocations([saved], { ...g, search: noSearch, memory: memoryOn({ now: 0 }) });
  assert.equal(r.accepted, 1);
  // A saved copy with no street, or a different street, never matches on its own.
  const vague = { ...yawmiyati, placeId: null, googleTitle: "Yawmiyati", googleAddress: "Yawmiyati, Lebanon" };
  const r2 = await google.acceptInvitationsAndListLocations([vague], { ...fakeGoogle([arabicInvitation("Yawmiyati, Lebanon")]), search: noSearch, memory: memoryOn({ now: 0 }) });
  assert.equal(r2.accepted, 0);
  const other = { ...saved, placeId: null };
  const r3 = await google.acceptInvitationsAndListLocations([other], { ...fakeGoogle([arabicInvitation("شارع الحمرا, Beirut, Lebanon")]), search: noSearch, memory: memoryOn({ now: 0 }) });
  assert.equal(r3.accepted, 0);
});

Deno.test("Access 2: a listing that matches no business is removed automatically; known listings are kept", async () => {
  const yaw = { locationId: YAWMIYATI_LOCATION, placeId: YAWMIYATI_PLACE, title: "Yawmiyati" };
  const abouHamze = { locationId: "locations/1850906632456176734", placeId: "ChIJeaz8F0khHxURnCU4N2ofLBw", title: "Abou Hamze Auto Center" };
  const stranger = { locationId: "locations/999", placeId: "ChIJstranger", title: "Yawmiyati" };
  const businesses = [{ placeId: YAWMIYATI_PLACE, googleLocationId: YAWMIYATI_LOCATION }];
  // The first run has no record: nothing is removed (Kabsi's own profiles become the baseline).
  assert.deepEqual(strayListings([yaw, abouHamze, stranger], businesses, new Set()), { remove: [], report: [] });
  assert.deepEqual(strayListings([yaw, abouHamze, stranger], businesses, null), { remove: [], report: [] });
  // Later: a new listing matching no business is removed; one already managed before is kept.
  const seen = new Set([yaw.locationId, abouHamze.locationId]);
  assert.deepEqual(strayListings([yaw, abouHamze, stranger], businesses, seen), { remove: [stranger], report: [] });
  // Matching by Google location also counts as a business (a demo or a listing with no place ID yet).
  assert.deepEqual(strayListings([stranger], [{ googleLocationId: "locations/999" }], seen).remove, []);
  // No place ID: reported, not removed. More than two at once: a fault, reported only.
  assert.deepEqual(strayListings([{ ...stranger, placeId: null }], businesses, seen), { remove: [], report: [{ ...stranger, placeId: null }] });
  const many = [1, 2, 3].map((i) => ({ ...stranger, locationId: `locations/9${i}`, placeId: `ChIJ${i}` }));
  assert.deepEqual(strayListings(many, businesses, seen), { remove: [], report: many });

  // The removal itself: only Kabsi's own entries are deleted and read back.
  const deleted: string[] = [];
  let listed = 0;
  const api = {
    listAccounts: () => Promise.resolve({ accounts: [{ name: "accounts/kabsi-group" }] }),
    listLocationAdmins: () => Promise.resolve({
      admins: listed++ === 0
        ? [{ name: "locations/999/admins/1", account: "accounts/kabsi-group", role: "MANAGER" }, { name: "locations/999/admins/2", account: "accounts/owner", role: "PRIMARY_OWNER" }]
        : [{ name: "locations/999/admins/2", account: "accounts/owner", role: "PRIMARY_OWNER" }],
    }),
    deleteLocationAdmin: (n: string) => { deleted.push(n); return Promise.resolve({}); },
  };
  assert.equal(await google.removeKabsiEntries(api as never, stranger.locationId), "removed");
  assert.deepEqual(deleted, ["locations/999/admins/1"]);
});
