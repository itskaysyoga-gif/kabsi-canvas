// Master plan 18.3: the WhatsApp photo paths on real files. A photo sent as an image (WhatsApp turns it into a JPEG)
// and photos sent as documents (HEIC from an iPhone, PNG, WebP) each go from Kapso's webhook through the router to the
// photo engine and end as a clean JPEG that meets Google's photo rules (a JPEG, at least 720 pixels on the short side
// when taken that way, at most 5 MB, no hidden details). An unreadable file is answered with "Please send it as a photo".
import { assert, assertEquals } from "jsr:@std/assert@1";
import { parseWebhook } from "./channel.ts";
import { parse } from "./router.ts";
import { photoRefusal } from "./media.ts";
import { sniff } from "../photos/sniff.ts";
import { decodePhoto, MAX_JPEG, processPhoto } from "../photos/process.ts";
import { MIN_SIDE } from "../photos/quality.ts";
import { SAY } from "./say.ts";

const fixture = (name: string) => Deno.readFile(new URL(`../../../../tests/fixtures/photos/${name}`, import.meta.url));
const has = (b: Uint8Array, text: string) => new TextDecoder("latin1").decode(b).includes(text);

// What Kapso's v2 webhook carries for a photo (image) or a file (document).
const webhook = (media: Record<string, unknown>) => ({
  phone_number_id: "PNID",
  conversation: { phone_number: "+12125550143", phone_number_id: "PNID" },
  message: { id: crypto.randomUUID(), timestamp: String(Math.floor(Date.now() / 1000)), kapso: { direction: "inbound" }, ...media },
});

async function throughWhatsapp(payload: Record<string, unknown>, bytes: Uint8Array) {
  const { messages } = parseWebhook("whatsapp.message.received", webhook(payload));
  assertEquals(messages.length, 1);
  const cmd = parse(messages[0]);
  assertEquals(cmd.k, "photo", "the router sends it the photo way");
  assertEquals(photoRefusal(bytes), null, "the photo engine takes it");
  const s = sniff(bytes);
  assert(s.kind === "photo");
  return { cmd, out: await processPhoto(bytes, s, decodePhoto) };
}

function meetsGoogle(out: Awaited<ReturnType<typeof processPhoto>>) {
  assertEquals([...out.jpeg.slice(0, 3)], [0xff, 0xd8, 0xff], "a JPEG");
  assert(out.jpeg.length <= MAX_JPEG, "at most 5 MB");
  assert(Math.min(out.takenWidth, out.takenHeight) >= MIN_SIDE, "at least 720 pixels");
  assert(!has(out.jpeg, "Exif") && !has(out.jpeg, "GPS"), "no hidden details");
}

Deno.test("18.3: a photo sent as an image (JPEG) ends as a clean JPEG", async () => {
  const bytes = await fixture("gps.jpg");
  const { out } = await throughWhatsapp({ type: "image", image: { id: "m-img", mime_type: "image/jpeg" } }, bytes);
  assert(has(bytes, "Exif"), "the original had EXIF");
  assertEquals([...out.jpeg.slice(0, 3)], [0xff, 0xd8, 0xff]);
  assert(!has(out.jpeg, "Exif") && !has(out.jpeg, "TestPhone"));
});

Deno.test("18.3: an iPhone HEIC sent as a document ends as a clean JPEG", async () => {
  const bytes = await fixture("iphone.heic");
  assertEquals(sniff(bytes).kind, "photo");
  const { out } = await throughWhatsapp({ type: "document", document: { id: "m-heic", mime_type: "image/heic", filename: "IMG_4021.HEIC" } }, bytes);
  meetsGoogle(out);
});

Deno.test("18.3: a PNG sent as a document ends as a clean JPEG", async () => {
  const { out } = await throughWhatsapp({ type: "document", document: { id: "m-png", mime_type: "image/png", filename: "menu.png" } }, await fixture("document.png"));
  meetsGoogle(out);
});

Deno.test("18.3: a WebP sent as a document ends as a clean JPEG", async () => {
  const { out } = await throughWhatsapp({ type: "document", document: { id: "m-webp", mime_type: "image/webp", filename: "dish.webp" } }, await fixture("document.webp"));
  meetsGoogle(out);
});

Deno.test("18.3: an unreadable file is refused with Please send it as a photo", async () => {
  const bytes = await fixture("renamed-pdf.jpg");
  const { messages } = parseWebhook("whatsapp.message.received", webhook({ type: "document", document: { id: "m-bad", mime_type: "image/jpeg", filename: "photo.jpg" } }));
  assertEquals(parse(messages[0]).k, "photo");
  assertEquals(photoRefusal(bytes), "not_photo");
  assertEquals(SAY.photoUnreadable, "Please send it as a photo.");
});
