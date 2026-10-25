// A small palette PNG encoder for the map image (28.2: under 250 KB). resvg renders full colour; a street map with
// anti-aliased pins and text in full colour PNG is several hundred KB, while the same picture in 256 colours looks
// the same on a phone and is a fraction of the size. The palette is built from the picture itself (4 bits a channel
// buckets, the 256 heaviest kept), every colour goes to its nearest palette entry, and the rows are zlib-compressed
// with the platform's CompressionStream. No dependency.

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(parts: Uint8Array[]): number {
  let c = 0xffffffff;
  for (const p of parts) for (let i = 0; i < p.length; i++) c = CRC[(c ^ p[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const t = new TextEncoder().encode(type);
  const out = new Uint8Array(12 + data.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, data.length);
  out.set(t, 4);
  out.set(data, 8);
  v.setUint32(8 + data.length, crc32([t, data]));
  return out;
}

async function zlib(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Up to 256 colours that represent the picture (RGBA pixels, alpha ignored: the image is opaque). */
export function palette(rgba: Uint8Array): number[][] {
  const sums = new Map<number, [number, number, number, number]>();
  for (let i = 0; i < rgba.length; i += 4) {
    const k = ((rgba[i] >> 4) << 8) | ((rgba[i + 1] >> 4) << 4) | (rgba[i + 2] >> 4);
    const s = sums.get(k);
    if (s) { s[0] += rgba[i]; s[1] += rgba[i + 1]; s[2] += rgba[i + 2]; s[3]++; }
    else sums.set(k, [rgba[i], rgba[i + 1], rgba[i + 2], 1]);
  }
  return [...sums.values()].sort((a, b) => b[3] - a[3]).slice(0, 256)
    .map(([r, g, b, n]) => [Math.round(r / n), Math.round(g / n), Math.round(b / n)]);
}

/** Encode opaque RGBA pixels as an 8-bit palette PNG. */
export async function encodePalettePng(rgba: Uint8Array, width: number, height: number): Promise<Uint8Array<ArrayBuffer>> {
  const pal = palette(rgba);
  const nearest = new Map<number, number>();
  const raw = new Uint8Array((width + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const key = (rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2];
      let idx = nearest.get(key);
      if (idx === undefined) {
        let best = Infinity;
        idx = 0;
        for (let p = 0; p < pal.length; p++) {
          const dr = pal[p][0] - rgba[i], dg = pal[p][1] - rgba[i + 1], db = pal[p][2] - rgba[i + 2];
          const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
          if (d < best) { best = d; idx = p; }
        }
        nearest.set(key, idx);
      }
      raw[y * (width + 1) + 1 + x] = idx;
    }
  }
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, width);
  v.setUint32(4, height);
  ihdr.set([8, 3, 0, 0, 0], 8); // 8-bit, palette, deflate, adaptive filtering, no interlace
  const plte = new Uint8Array(pal.length * 3);
  pal.forEach((c, i) => plte.set(c, i * 3));
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("PLTE", plte), chunk("IDAT", await zlib(raw)), chunk("IEND", new Uint8Array()),
  ];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
