// Scan 3 (master plan 30.34 item 3): the branded review QR card. The business name, "Scan to review us on Google", a
// charcoal QR with rounded dots in a yellow frame, kabsi.co small at the foot. No stars, no Google logo, nothing that asks
// for a rating. One layout in PDF points (A6, 105 by 148 mm) drawn three ways: SVG on the page, PNG to download and a
// printable A6 PDF, so the three always match. Loaded only where a card shows.
import { qrMatrix } from "@/lib/qr";

export const CARD_LINE = "Scan to review us on Google";
export const CARD_FOOT = "kabsi.co";

/** A6 in PDF points. */
export const A6 = { w: 297.64, h: 419.53 } as const;

const INK = "#111111";
const MUTED = "#4a4740";
const YELLOW = "#ffd60a";
const WHITE = "#ffffff";

export type Shape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; r: number; fill: string }
  | { kind: "circle"; cx: number; cy: number; r: number; fill: string }
  | {
      kind: "text";
      x: number;
      y: number;
      text: string;
      size: number;
      bold: boolean;
      fill: string;
      width: number;
    };

/** Measures text at a size; the page uses a canvas, the tests an estimate. */
export type Measure = (text: string, size: number, bold: boolean) => number;
export const estimate: Measure = (t, size, bold) => t.length * size * (bold ? 0.58 : 0.52);

/** Text the card can print: Latin-1 only (the PDF's standard fonts), nothing else. */
export const printable = (t: string) =>
  t
    .normalize("NFC")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7e\xa0-\xff]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Up to two centred lines for the name, shrinking from 22 to 16 points before it is cut. */
function nameLines(
  name: string,
  maxW: number,
  measure: Measure,
): { lines: string[]; size: number } {
  for (const size of [22, 20, 18, 16]) {
    const words = name.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (measure(next, size, true) <= maxW || !cur) cur = next;
      else {
        lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    if (lines.length <= 2 && lines.every((l) => measure(l, size, true) <= maxW))
      return { lines, size };
  }
  // Still too long: two lines at 16 points, the second cut with an ellipsis-free trim.
  const size = 16;
  const out: string[] = [];
  let cur = "";
  for (const ch of name) {
    if (measure(cur + ch, size, true) > maxW) {
      out.push(cur.trim());
      cur = "";
      if (out.length === 2) break;
    }
    cur += ch;
  }
  if (out.length < 2 && cur) out.push(cur.trim());
  return { lines: out.slice(0, 2), size };
}

/** The finder patterns' modules (the three corner squares), drawn as rounded squares instead of dots. */
const inFinder = (r: number, c: number, n: number) =>
  (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

/** The card as shapes, in points from the top left. */
export function cardShapes(business: string, link: string, measure: Measure = estimate): Shape[] {
  const { w: W, h: H } = A6;
  const out: Shape[] = [{ kind: "rect", x: 0, y: 0, w: W, h: H, r: 0, fill: WHITE }];
  const name = printable(business) || "Your business";
  const { lines, size } = nameLines(name, W - 48, measure);
  let y = 46;
  for (const l of lines) {
    out.push({
      kind: "text",
      x: W / 2,
      y,
      text: l,
      size,
      bold: true,
      fill: INK,
      width: measure(l, size, true),
    });
    y += size * 1.2;
  }
  y += 4;
  out.push({
    kind: "text",
    x: W / 2,
    y,
    text: CARD_LINE,
    size: 13,
    bold: false,
    fill: MUTED,
    width: measure(CARD_LINE, 13, false),
  });
  // The yellow frame, a white panel inside it, the code with a quiet zone of 4 modules on the white.
  const S = 212;
  const fx = (W - S) / 2;
  const fy = y + 22;
  out.push({ kind: "rect", x: fx, y: fy, w: S, h: S, r: 22, fill: YELLOW });
  const inset = 14;
  const inner = S - inset * 2;
  out.push({ kind: "rect", x: fx + inset, y: fy + inset, w: inner, h: inner, r: 10, fill: WHITE });
  const m = qrMatrix(link) as boolean[][];
  const n = m.length;
  const mod = inner / (n + 8);
  const ox = fx + inset + 4 * mod;
  const oy = fy + inset + 4 * mod;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (m[r]![c] && !inFinder(r, c, n))
        out.push({
          kind: "circle",
          cx: ox + (c + 0.5) * mod,
          cy: oy + (r + 0.5) * mod,
          r: mod * 0.46,
          fill: INK,
        });
  for (const [r0, c0] of [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ] as const) {
    const x = ox + c0 * mod;
    const yy = oy + r0 * mod;
    out.push({ kind: "rect", x, y: yy, w: 7 * mod, h: 7 * mod, r: 1.8 * mod, fill: INK });
    out.push({
      kind: "rect",
      x: x + mod,
      y: yy + mod,
      w: 5 * mod,
      h: 5 * mod,
      r: 1.2 * mod,
      fill: WHITE,
    });
    out.push({
      kind: "rect",
      x: x + 2 * mod,
      y: yy + 2 * mod,
      w: 3 * mod,
      h: 3 * mod,
      r: 0.9 * mod,
      fill: INK,
    });
  }
  out.push({
    kind: "text",
    x: W / 2,
    y: H - 26,
    text: CARD_FOOT,
    size: 10,
    bold: false,
    fill: MUTED,
    width: measure(CARD_FOOT, 10, false),
  });
  return out;
}

const FONT = "Helvetica, Arial, 'Liberation Sans', sans-serif";
const escXml = (t: string) =>
  t.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

/** The card as an SVG string (the page shows it; print uses it too). */
export function cardSvg(shapes: Shape[], label: string): string {
  const body = shapes
    .map((s) =>
      s.kind === "rect"
        ? `<rect x="${s.x.toFixed(2)}" y="${s.y.toFixed(2)}" width="${s.w.toFixed(2)}" height="${s.h.toFixed(2)}" rx="${s.r.toFixed(2)}" fill="${s.fill}"/>`
        : s.kind === "circle"
          ? `<circle cx="${s.cx.toFixed(2)}" cy="${s.cy.toFixed(2)}" r="${s.r.toFixed(2)}" fill="${s.fill}"/>`
          : `<text x="${s.x.toFixed(2)}" y="${s.y.toFixed(2)}" text-anchor="middle" font-family="${FONT}" font-size="${s.size}" font-weight="${s.bold ? 700 : 400}" fill="${s.fill}">${escXml(s.text)}</text>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${A6.w} ${A6.h}" role="img" aria-label="${escXml(label)}">${body}</svg>`;
}

/** A canvas measure for the page (Helvetica's metrics, as the PDF prints them). */
export function canvasMeasure(): Measure {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return estimate;
  return (t, size, bold) => {
    ctx.font = `${bold ? "bold " : ""}${size}px ${FONT}`;
    return ctx.measureText(t).width;
  };
}

/** The card as a PNG, 4 pixels to the point (1191 by 1678). */
export async function cardPng(shapes: Shape[], scale = 4): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(A6.w * scale);
  canvas.height = Math.round(A6.h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);
  for (const s of shapes) {
    ctx.fillStyle = s.fill;
    if (s.kind === "rect") {
      ctx.beginPath();
      ctx.roundRect(s.x, s.y, s.w, s.h, s.r);
      ctx.fill();
    } else if (s.kind === "circle") {
      ctx.beginPath();
      ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.font = `${s.bold ? "bold " : ""}${s.size}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(s.text, s.x, s.y);
    }
  }
  return new Promise((res) => canvas.toBlob(res, "image/png"));
}

/* ---------- A6 PDF, written by hand: two standard fonts, vector shapes, nothing embedded ---------- */

const K = 0.5523; // a quarter circle as a Bezier curve
const n2 = (v: number) => (Math.round(v * 100) / 100).toString();
const rgb = (hex: string) => {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) => n2(x / 255)).join(" ");
};
const pdfText = (t: string) => t.replace(/[\\()]/g, (c) => `\\${c}`);

/** One page, A6, as PDF bytes. Text is Latin-1 (WinAnsi), the shapes are paths, y counts from the foot of the page. */
export function cardPdf(shapes: Shape[]): Uint8Array<ArrayBuffer> {
  const H = A6.h;
  const ops: string[] = [];
  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    // PDF y is from the foot: the top edge of the box is at H - y.
    const t = H - y;
    const b = H - y - h;
    const k = r * K;
    return [
      `${n2(x + r)} ${n2(b)} m`,
      `${n2(x + w - r)} ${n2(b)} l`,
      `${n2(x + w - r + k)} ${n2(b)} ${n2(x + w)} ${n2(b + r - k)} ${n2(x + w)} ${n2(b + r)} c`,
      `${n2(x + w)} ${n2(t - r)} l`,
      `${n2(x + w)} ${n2(t - r + k)} ${n2(x + w - r + k)} ${n2(t)} ${n2(x + w - r)} ${n2(t)} c`,
      `${n2(x + r)} ${n2(t)} l`,
      `${n2(x + r - k)} ${n2(t)} ${n2(x)} ${n2(t - r + k)} ${n2(x)} ${n2(t - r)} c`,
      `${n2(x)} ${n2(b + r)} l`,
      `${n2(x)} ${n2(b + r - k)} ${n2(x + r - k)} ${n2(b)} ${n2(x + r)} ${n2(b)} c`,
      "f",
    ].join("\n");
  };
  for (const s of shapes) {
    ops.push(`${rgb(s.fill)} rg`);
    if (s.kind === "rect")
      ops.push(
        s.r > 0
          ? roundRect(s.x, s.y, s.w, s.h, s.r)
          : `${n2(s.x)} ${n2(H - s.y - s.h)} ${n2(s.w)} ${n2(s.h)} re f`,
      );
    else if (s.kind === "circle")
      ops.push(roundRect(s.cx - s.r, s.cy - s.r, s.r * 2, s.r * 2, s.r));
    else
      ops.push(
        `BT /${s.bold ? "F1" : "F2"} ${s.size} Tf ${n2(s.x - s.width / 2)} ${n2(H - s.y)} Td (${pdfText(s.text)}) Tj ET`,
      );
  }
  const stream = ops.join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A6.w} ${A6.h}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  // Every character is Latin-1 (printable() made sure), so one byte each and the offsets above are byte offsets.
  const bytes = new Uint8Array(new ArrayBuffer(pdf.length));
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 255;
  return bytes;
}

/** Starts a download of a Blob. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
