// The print-ready review cards (master plan 27.3 item 5, V3): the A6 counter card and the A4 table tent, drawn from the
// design studio's Print cards (kabsi-design-studio, src/components/kabsi/d3-images.tsx, PrintFace): the same words, the same
// order, one QR code that opens the business's own review link. Both plans get both cards.
//
// A real PDF, written here with no library: vector shapes for the code (always sharp at any print size, black on white with
// the quiet zone a scanner needs) and the two standard Helvetica faces. Business names Helvetica cannot write (another
// script) are left off the card; the code and the short link still print. The card never says a rating, a reward or a
// threshold, and every customer reads the same card. Pure apart from the QR matrix, which comes from qrcode-generator.
import qrcode from "npm:qrcode-generator@2.0.4";

export type CardKind = "counter" | "tent";

/** Words printed on a card. One place, so the tests read what the design studio drew. */
export const CARD_WORDS = {
  headline: "Tell others how your visit went",
  line: "Scan to leave a review on Google. It takes a minute.",
  fold: "Fold here",
} as const;

const MM = 72 / 25.4;
export const PAGE: Record<CardKind, { w: number; h: number }> = {
  counter: { w: 105 * MM, h: 148 * MM }, // A6
  tent: { w: 210 * MM, h: 297 * MM }, // A4, folded across the middle
};

// Helvetica and Helvetica-Bold widths for ASCII 32 to 126, in 1/1000 em (the PDF standard 14 fonts' metrics).
const W_REG = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667,
  944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500,
  278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const W_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667,
  944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556,
  333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

type Face = "F1" | "F2"; // F1 Helvetica, F2 Helvetica-Bold

/** Printable with the standard fonts: ASCII letters, digits and punctuation only. */
export const printable = (s: string) => /^[\x20-\x7e]*$/.test(s);

export function textWidth(s: string, size: number, face: Face): number {
  const table = face === "F2" ? W_BOLD : W_REG;
  let w = 0;
  for (const ch of s) w += table[ch.charCodeAt(0) - 32] ?? 556;
  return (w * size) / 1000;
}

const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
const n = (x: number) => (Math.round(x * 100) / 100).toString();

/** Wraps text to a width in points, on spaces. */
export function wrap(s: string, size: number, face: Face, maxW: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of s.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && textWidth(next, size, face) > maxW) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

class Page {
  ops: string[] = [];
  constructor(readonly w: number, readonly h: number) {}
  /** Centred text; y is the baseline from the bottom. */
  text(s: string, y: number, size: number, face: Face, gray = 0, cx = this.w / 2) {
    const x = cx - textWidth(s, size, face) / 2;
    this.ops.push(`BT /${face} ${n(size)} Tf ${n(gray)} g ${n(x)} ${n(y)} Td (${esc(s)}) Tj ET`);
  }
  line(x1: number, y1: number, x2: number, y2: number, gray: number, dash = true) {
    this.ops.push(`q ${n(gray)} G 0.8 w ${dash ? "[6 4] 0 d" : ""} ${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l S Q`);
  }
  /** The QR code: white square with the quiet zone, then one black path of modules. */
  qr(matrix: boolean[][], x: number, y: number, side: number) {
    const quiet = 4;
    const cells = matrix.length + quiet * 2;
    const unit = side / cells;
    this.ops.push(`q 1 g ${n(x)} ${n(y)} ${n(side)} ${n(side)} re f 0 g`);
    for (let r = 0; r < matrix.length; r++) {
      // Runs of dark modules in a row are one rectangle, which keeps the file small.
      let c = 0;
      while (c < matrix.length) {
        if (!matrix[r][c]) { c++; continue; }
        let end = c;
        while (end + 1 < matrix.length && matrix[r][end + 1]) end++;
        this.ops.push(`${n(x + (c + quiet) * unit)} ${n(y + side - (r + quiet + 1) * unit)} ${n((end - c + 1) * unit)} ${n(unit)} re f`);
        c = end + 1;
      }
    }
    this.ops.push("Q");
  }
}

/** The QR matrix for a link: error correction M, the same level as the design studio's code. */
export function qrMatrix(value: string): boolean[][] {
  const q = qrcode(0, "M");
  q.addData(value);
  q.make();
  const size = q.getModuleCount();
  return Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => q.isDark(r, c)));
}

/** One face of a card, in the box (x, y, w, h) with y from the bottom. Mirrors the studio's PrintFace: the headline, the
 *  line, the code, the business name, the short link. Sizes are the studio's pixel sizes at 0.75 points a pixel, scaled down
 *  until the whole face fits the box. A turned face is drawn half a turn about its own centre. */
function face(p: Page, box: { x: number; y: number; w: number; h: number }, o: { name: string; qrLink: string; shortLink: string; small: boolean; turned: boolean }) {
  const cx = box.x + box.w / 2;
  const maxW = box.w * 0.84;
  const name = o.name && printable(o.name) ? o.name : "";
  let s = 1;
  let layout = lay(s);
  function lay(sc: number) {
    const px = (v: number) => v * 0.75 * sc;
    const head = px(o.small ? 34 : 44), sub = px(o.small ? 18 : 22), side = px(o.small ? 210 : 250), nm = px(o.small ? 26 : 30), sm = px(o.small ? 15 : 17);
    const gap = px(18);
    const headLines = wrap(CARD_WORDS.headline, head, "F2", maxW);
    const subLines = wrap(CARD_WORDS.line, sub, "F1", maxW);
    const nameLines = name ? wrap(name, nm, "F2", maxW).slice(0, 2) : [];
    const total = headLines.length * head * 1.1 + px(10) + subLines.length * sub * 1.2 + gap + side + gap + nameLines.length * nm * 1.15 +
      (nameLines.length ? px(6) : 0) + sm * 1.2;
    return { head, sub, side, nm, sm, gap, headLines, subLines, nameLines, total, px };
  }
  while (layout.total > box.h * 0.92 && s > 0.4) layout = lay((s -= 0.04));
  const L = layout;
  if (o.turned) p.ops.push(`q -1 0 0 -1 ${n(cx * 2)} ${n((box.y + box.h / 2) * 2)} cm`);
  let y = box.y + box.h / 2 + L.total / 2;
  const put = (t: string, size: number, f: Face, gray: number) => p.text(t, y - size * 0.8, size, f, gray, cx);
  for (const l of L.headLines) { put(l, L.head, "F2", 0.06); y -= L.head * 1.1; }
  y -= L.px(10);
  for (const l of L.subLines) { put(l, L.sub, "F1", 0.35); y -= L.sub * 1.2; }
  y -= L.gap;
  p.qr(qrMatrix(o.qrLink), cx - L.side / 2, y - L.side, L.side);
  y -= L.side + L.gap;
  for (const l of L.nameLines) { put(l, L.nm, "F2", 0.06); y -= L.nm * 1.15; }
  if (L.nameLines.length) y -= L.px(6);
  put(`Or type ${o.shortLink}`, L.sm, "F1", 0.35);
  if (o.turned) p.ops.push("Q");
}

export type CardInput = { kind: CardKind; businessName: string; code: string };

/** The card as PDF bytes. Throws on a code that is not a Kabsi review link code. */
export function buildCard(i: CardInput): Uint8Array<ArrayBuffer> {
  const code = i.code.toUpperCase();
  if (!/^[2-9A-HJKMNP-Z]{6}$/.test(code)) throw new Error("bad_code");
  const { w, h } = PAGE[i.kind];
  const p = new Page(w, h);
  const base = { name: i.businessName.trim().slice(0, 80), qrLink: `https://go.kabsi.co/${code}?s=q`, shortLink: `go.kabsi.co/${code}` };
  if (i.kind === "counter") {
    face(p, { x: 0, y: 0, w, h }, { ...base, small: false, turned: false });
  } else {
    // A4 folded across the middle: the top half is turned, so both sides read from where they sit.
    face(p, { x: 0, y: h / 2, w, h: h / 2 }, { ...base, small: true, turned: true });
    face(p, { x: 0, y: 0, w, h: h / 2 }, { ...base, small: true, turned: false });
    p.line(18, h / 2, w - 18, h / 2, 0.6);
    p.text(CARD_WORDS.fold, h / 2 - 12, 9, "F1", 0.45);
  }
  return pdf(w, h, p.ops.join("\n"));
}

function pdf(w: number, h: number, content: string): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(w)} ${n(h)}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${enc.encode(content).length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(enc.encode(out).length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = enc.encode(out).length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return enc.encode(out);
}
