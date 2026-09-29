// Run: deno test supabase/functions/_shared/nowpayments.test.ts
import assert from "node:assert/strict";
import { canonical, hmacSha512Hex, sortDeep, STATUS_RANK, verifyIpn } from "./nowpayments.ts";

// A body shaped like a real IPN, with a nested `fee` object. The two expected signatures were computed once with
// `openssl dgst -sha512 -hmac test_secret` over the canonical string and over the legacy top-level-replacer string.
const BODY = '{"payment_id":5077125051,"payment_status":"finished","pay_address":"TXyzTestAddress","price_amount":19,"price_currency":"usd","pay_amount":19.02,"actually_paid":19.02,"pay_currency":"usdttrc20","order_id":"kb1.pro_monthly.loc.abc123","order_description":"Kabsi Pro, monthly","fee":{"withdrawalFee":0.5,"currency":"usdttrc20","depositFee":0,"serviceFee":0},"invoice_id":4522625843}';
const CANONICAL_SIG = "975175353d453daa4ea25a3be0131c9541ab9eba2e18cb6b700f5b8a0aad1019730bf84e7124a734dc8fd5c17ae0c3fb48bd1e0079fbe0d657444daf710d4de7";
const LEGACY_SIG = "4fe488cdef7d2ee9c307b29cb86ca2ebe9aa8e065271c76c6ff2267e82feaf7f38dbb4b69c206b68911d1fc2fdb7eeccc12bd4bfeda2cb104dc1ed27504210cf";
const SECRET = "test_secret";

Deno.test("sortDeep sorts every level and keeps array order", () => {
  assert.equal(JSON.stringify(sortDeep({ b: 1, a: { d: 1, c: [{ z: 1, y: 2 }, 3] } })), '{"a":{"c":[{"y":2,"z":1},3],"d":1},"b":1}');
});

Deno.test("canonical string matches the fixture", () => {
  assert.equal(canonical(JSON.parse(BODY)).includes('"fee":{"currency":"usdttrc20","depositFee":0,"serviceFee":0,"withdrawalFee":0.5}'), true);
});

Deno.test("hmacSha512Hex reproduces the openssl value", async () => {
  assert.equal(await hmacSha512Hex(SECRET, canonical(JSON.parse(BODY))), CANONICAL_SIG);
});

Deno.test("verifyIpn accepts the canonical signature and the legacy one", async () => {
  assert.equal(await verifyIpn(BODY, CANONICAL_SIG, SECRET), true);
  assert.equal(await verifyIpn(BODY, LEGACY_SIG, SECRET), true);
  assert.equal(await verifyIpn(BODY, CANONICAL_SIG.toUpperCase(), SECRET), true); // hex case does not matter
});

Deno.test("verifyIpn accepts a reordered body (the signature is over the canonical form)", async () => {
  const reordered = JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(BODY)).reverse()));
  assert.equal(await verifyIpn(reordered, CANONICAL_SIG, SECRET), true);
});

Deno.test("verifyIpn rejects a tampered body, a wrong secret, a missing or malformed header", async () => {
  assert.equal(await verifyIpn(BODY.replace('"price_amount":19', '"price_amount":1'), CANONICAL_SIG, SECRET), false);
  assert.equal(await verifyIpn(BODY, CANONICAL_SIG, "other_secret"), false);
  assert.equal(await verifyIpn(BODY, null, SECRET), false);
  assert.equal(await verifyIpn(BODY, "", SECRET), false);
  assert.equal(await verifyIpn(BODY, CANONICAL_SIG.slice(0, -2) + "00", SECRET), false);
  assert.equal(await verifyIpn(BODY, CANONICAL_SIG, ""), false);
  assert.equal(await verifyIpn("not json", CANONICAL_SIG, SECRET), false);
  assert.equal(await verifyIpn("[]", CANONICAL_SIG, SECRET), false);
});

Deno.test("status rank puts finished last and partially_paid before it", () => {
  const order = ["waiting", "confirming", "confirmed", "sending", "partially_paid", "finished"];
  for (let i = 1; i < order.length; i++) assert.ok(STATUS_RANK[order[i]!]! > STATUS_RANK[order[i - 1]!]!);
  assert.equal(STATUS_RANK["failed"], undefined);
});
