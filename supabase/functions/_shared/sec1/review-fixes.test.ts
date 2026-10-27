// Sec 1, after the independent review: the stricter checks do not refuse ordinary owners' content. A sentence that
// runs into the next ("again.Live music") is not a link, a tidied comma still matches the owner's exact words, a JPEG
// with stray bytes between segments still has its size read, and four letters "ispe" inside HEIC picture data are not
// taken for the image size.
import assert from "node:assert/strict";
import { contactIssues } from "../contact.ts";
import { inMessage } from "../whatsapp/intent.ts";
import { declaredSize, type Sniffed } from "../photos/sniff.ts";

const hasLink = (t: string) => contactIssues(t, { allowedText: "" }).some((i) => i.includes("link"));

Deno.test("sec1 review: endings that are English words are not links, planted links still are", () => {
  assert.equal(hasLink("We hope to see you again.Live music is on Fridays."), false);
  assert.equal(hasLink("Thanks for the visit.Pro tip: try the lemon cake."), false);
  assert.equal(hasLink("Book at bit.ly/abc"), true);
  assert.equal(hasLink("Visit cheap-deals.xyz today"), true);
  assert.equal(hasLink("See kabsi.page/offer"), true);
});

Deno.test("sec1 review: the owner's exact words match with punctuation tidied, and invented words still do not", () => {
  assert.equal(inMessage("Thank you so much, see you soon", "Reply: thank you so much see you soon!"), true);
  assert.equal(inMessage("Thank you, we will refund you", "Reply: thank you"), false);
});

const jpeg: Sniffed = { kind: "photo", format: "jpeg", mime: "image/jpeg", animated: false };
const heic: Sniffed = { kind: "photo", format: "heic", mime: "image/heic", animated: false };

Deno.test("sec1 review: a JPEG with stray bytes before its frame still has its size read", () => {
  // SOI, two stray bytes, then SOF0 with height 480 and width 640.
  const b = new Uint8Array([0xff, 0xd8, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0xe0, 0x02, 0x80, 0x03, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(declaredSize(b, jpeg), { width: 640, height: 480 });
});

Deno.test("sec1 review: only a real 20-byte ispe box gives a HEIC size", () => {
  const box = (size: number, w: number, h: number) => {
    const b = new Uint8Array(20);
    const v = new DataView(b.buffer);
    v.setUint32(0, size);
    b.set([0x69, 0x73, 0x70, 0x65], 4);
    v.setUint32(12, w);
    v.setUint32(16, h);
    return b;
  };
  const head = new Uint8Array(16);
  const real = new Uint8Array([...head, ...box(20, 4032, 3024)]);
  assert.deepEqual(declaredSize(real, heic), { width: 4032, height: 3024 });
  const noise = new Uint8Array([...head, ...box(0x12345678, 90000, 90000), ...box(20, 4032, 3024)]);
  assert.deepEqual(declaredSize(noise, heic), { width: 4032, height: 3024 }, "random picture data reading ispe is not counted");
});
