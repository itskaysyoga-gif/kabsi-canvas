// Photo quality checks in code (P0.5-01, K-23): brightness, blur (variance of the Laplacian), resolution and
// near-duplicates (a 64-bit difference hash). Plain words for the owner; nothing here changes the photo.

export type Pixels = { width: number; height: number; data: Uint8Array | Uint8ClampedArray };
export type Metrics = { brightness: number; sharpness: number; phash: string };
export type Issue = "dark" | "blurry" | "small" | "duplicate";

// Thresholds: the mean light level (0 to 255) below which a photo reads as dark, the Laplacian variance below which
// it reads as blurry (measured on the photo scaled to 512 pixels across), Google's 720 by 720 minimum, and how many
// of the 64 hash bits two photos may differ by and still count as the same picture.
export const DARK_BELOW = 60;
export const BLURRY_BELOW = 40;
export const MIN_SIDE = 720;
export const SAME_WITHIN = 6;

export const ISSUE_TEXT: Record<Issue, string> = {
  dark: "This photo is dark.",
  blurry: "This photo looks blurry.",
  small: "This photo is small. Google asks for at least 720 by 720 pixels.",
  duplicate: "This looks like a photo you already added.",
};

// Grey levels of the photo scaled down to at most `max` pixels across (box average), for the checks below.
export function grey(p: Pixels, max = 512): { w: number; h: number; g: Float32Array } {
  const scale = Math.max(1, Math.max(p.width, p.height) / max);
  const w = Math.max(1, Math.round(p.width / scale)), h = Math.max(1, Math.round(p.height / scale));
  const g = new Float32Array(w * h), n = new Uint32Array(w * h);
  for (let y = 0; y < p.height; y++) {
    const gy = Math.min(h - 1, Math.floor(y / scale));
    for (let x = 0; x < p.width; x++) {
      const i = (y * p.width + x) * 4, gi = gy * w + Math.min(w - 1, Math.floor(x / scale));
      g[gi] += 0.299 * p.data[i] + 0.587 * p.data[i + 1] + 0.114 * p.data[i + 2];
      n[gi]++;
    }
  }
  for (let i = 0; i < g.length; i++) g[i] = n[i] ? g[i] / n[i] : 0;
  return { w, h, g };
}

// Mean light level (0 to 255) of grey cells.
function meanOf(g: Float32Array): number {
  let s = 0;
  for (const v of g) s += v;
  return g.length ? s / g.length : 0;
}

// Variance of the 4-neighbour Laplacian: sharp edges give a high value, a soft or shaken photo a low one.
function laplacianVariance(w: number, h: number, g: Float32Array): number {
  if (w < 3 || h < 3) return 0;
  let sum = 0, sq = 0, n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = g[i - 1] + g[i + 1] + g[i - w] + g[i + w] - 4 * g[i];
      sum += l; sq += l * l; n++;
    }
  }
  const mean = sum / n;
  return sq / n - mean * mean;
}

// Difference hash: the grey cells as 9 by 8 blocks, one bit per left-right comparison, as 16 hex characters.
function dhashOf(w: number, h: number, g: Float32Array): string {
  const cells = new Float32Array(72), counts = new Uint32Array(72);
  for (let y = 0; y < h; y++) {
    const cy = Math.min(7, Math.floor((y * 8) / h));
    for (let x = 0; x < w; x++) {
      const c = cy * 9 + Math.min(8, Math.floor((x * 9) / w));
      cells[c] += g[y * w + x];
      counts[c]++;
    }
  }
  for (let i = 0; i < 72; i++) cells[i] = counts[i] ? cells[i] / counts[i] : 0;
  let hex = "";
  for (let y = 0; y < 8; y++) {
    let byte = 0;
    for (let x = 0; x < 8; x++) byte = (byte << 1) | (cells[y * 9 + x] > cells[y * 9 + x + 1] ? 1 : 0);
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

export function hamming(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i += 2) {
    let x = parseInt(a.slice(i, i + 2), 16) ^ parseInt(b.slice(i, i + 2), 16);
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}

export const nearDuplicate = (hash: string, others: string[]) => others.some((o) => o && hamming(hash, o) <= SAME_WITHIN);

// One pass over the photo scaled to 512 pixels across gives all three measures.
export function measure(p: Pixels): Metrics {
  const { w, h, g } = grey(p, 512);
  return {
    brightness: Math.round(meanOf(g) * 10) / 10, sharpness: Math.round(laplacianVariance(w, h, g) * 10) / 10, phash: dhashOf(w, h, g),
  };
}

// The issues of one photo; `width` and `height` are the photo as taken (upright), before Kabsi resizes it.
export function issuesOf(m: Metrics, width: number, height: number, others: string[] = []): Issue[] {
  const out: Issue[] = [];
  if (m.brightness < DARK_BELOW) out.push("dark");
  if (m.sharpness < BLURRY_BELOW) out.push("blurry");
  if (Math.min(width, height) < MIN_SIDE) out.push("small");
  if (nearDuplicate(m.phash, others)) out.push("duplicate");
  return out;
}

// The preferred cover photo and logo (K-23): Google decides what it shows, so these are checks, not promises.
export type Role = "COVER" | "LOGO";
export function roleIssue(role: Role, width: number, height: number): string | null {
  const ratio = width / height;
  if (role === "COVER") {
    if (ratio < 1.5 || ratio > 2.1) return "A cover photo works best wide, about 16 by 9. This one is not.";
    if (width < 1080) return "A cover photo works best at least 1080 pixels across.";
    return null;
  }
  if (ratio < 0.9 || ratio > 1.1) return "A logo works best square. This one is not.";
  if (Math.min(width, height) < 250) return "A logo needs at least 250 by 250 pixels.";
  return null;
}
