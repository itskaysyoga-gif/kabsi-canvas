// OFFER-2 (blueprint 11.2 row 16): the review QR code as an image in the chat. The same QR matrix as the printed cards
// (review-growth/pdf.ts, error correction M), drawn as a black and white PNG with a quiet zone of 4 modules. The PNG is
// made here with the runtime's own deflate (CompressionStream), so no image library is added.
import { qrMatrix } from "../review-growth/pdf.ts";

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const u32 = (n: number) => new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
function chunk(type: string, data: Uint8Array): Uint8Array {
  const td = new Uint8Array(4 + data.length);
  td.set(new TextEncoder().encode(type), 0);
  td.set(data, 4);
  return concat([u32(data.length), td, u32(crc32(td))]);
}
function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) (out.set(p, o), o += p.length);
  return out;
}
async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** A grayscale PNG of a QR matrix: `scale` pixels a module, 4 modules of white around it. */
export async function matrixPng(m: boolean[][], scale = 12): Promise<Uint8Array> {
  const quiet = 4;
  const size = (m.length + quiet * 2) * scale;
  const rows: Uint8Array[] = [];
  for (let y = 0; y < size; y++) {
    const row = new Uint8Array(size + 1); // filter byte 0, then one gray byte a pixel
    const my = Math.floor(y / scale) - quiet;
    for (let x = 0; x < size; x++) {
      const mx = Math.floor(x / scale) - quiet;
      row[x + 1] = m[my]?.[mx] ? 0 : 255;
    }
    rows.push(row);
  }
  const ihdr = concat([u32(size), u32(size), new Uint8Array([8, 0, 0, 0, 0])]); // 8-bit grayscale
  return concat([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", await deflate(concat(rows))), chunk("IEND", new Uint8Array()),
  ]);
}

/** The QR code that opens a link, as a PNG. */
export const qrPng = (link: string) => matrixPng(qrMatrix(link));
