// Partners 3 (master plan 30.50 item 5): the A6 insert a partner puts in card packaging. The card's line, what Kabsi does
// in one sentence, "30 days free", the partner's own QR code and link, and the disclosure. No Google logo, no ranking, no
// review count. One layout in PDF points (A6, 105 by 148 mm), drawn as SVG for the preview and as a PDF to print, with
// the same shapes and fonts as the review card (src/lib/qr-card.ts), so the two always match. Loaded only in the kit.
import {
  A6,
  cardPdf,
  cardSvg,
  estimate,
  INK,
  MUTED,
  type Measure,
  printable,
  qrShapes,
  type Shape,
  WHITE,
  YELLOW,
} from "@/lib/qr-card";

export const INSERT = {
  head: ["The card gets the reviews.", "Kabsi answers them."],
  body: "Kabsi prepares a reply for every new Google review. Nothing goes live without your yes.",
  big: "30 days free",
  bigSub: "of Kabsi Pro. No card needed.",
  scan: "Scan to start",
  notAffiliated: "Kabsi is independent and not affiliated with Google.",
  label: "A6 insert with a QR code and 30 days free",
} as const;

/** The disclosure line: the partner's name when it can be printed, otherwise "a Kabsi Partner" alone. */
export function disclosure(name: string): string {
  const n = printable(name).slice(0, 24).trim();
  return n
    ? `Paid partnership. ${n} is a Kabsi Partner.`
    : "Paid partnership. Shared by a Kabsi Partner.";
}

/** The link as people read it: no scheme. */
export const shortLink = (link: string) => link.replace(/^https?:\/\//, "");

/** Words wrapped into lines no wider than maxW, at a size. */
function wrap(text: string, size: number, maxW: number, measure: Measure): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of text.split(" ")) {
    const next = cur ? `${cur} ${w}` : w;
    if (!cur || measure(next, size, false) <= maxW) cur = next;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** The insert as shapes, in points from the top left (see qr-card.ts for the shape types). */
export function insertShapes(
  partnerName: string,
  link: string,
  measure: Measure = estimate,
): Shape[] {
  const { w: W, h: H } = A6;
  const out: Shape[] = [{ kind: "rect", x: 0, y: 0, w: W, h: H, r: 0, fill: WHITE }];
  const line = (text: string, y: number, size: number, bold: boolean, fill: string) =>
    out.push({
      kind: "text",
      x: W / 2,
      y,
      text,
      size,
      bold,
      fill,
      width: measure(text, size, bold),
    });

  INSERT.head.forEach((t, i) => line(t, 46 + i * 22, 17, true, INK));
  wrap(INSERT.body, 11.5, W - 56, measure).forEach((t, i) =>
    line(t, 96 + i * 15, 11.5, false, MUTED),
  );

  // The yellow panel with the offer.
  out.push({ kind: "rect", x: 24, y: 146, w: W - 48, h: 68, r: 14, fill: YELLOW });
  line(INSERT.big, 182, 30, true, INK);
  line(INSERT.bigSub, 201, 11.5, false, INK);

  // The partner's own code on a white panel with a yellow frame, as the review card has it.
  const S = 132;
  const fx = (W - S) / 2;
  const fy = 228;
  out.push({ kind: "rect", x: fx, y: fy, w: S, h: S, r: 16, fill: YELLOW });
  const inset = 8;
  out.push({
    kind: "rect",
    x: fx + inset,
    y: fy + inset,
    w: S - inset * 2,
    h: S - inset * 2,
    r: 8,
    fill: WHITE,
  });
  out.push(...qrShapes(link, fx + inset, fy + inset, S - inset * 2));

  line(`${INSERT.scan}: ${shortLink(link)}`, fy + S + 18, 10, false, INK);
  line(disclosure(partnerName), H - 28, 8, false, MUTED);
  line(INSERT.notAffiliated, H - 17, 8, false, MUTED);
  return out;
}

/** The insert's SVG for the page. */
export const insertSvg = (shapes: Shape[]) => cardSvg(shapes, INSERT.label);
/** The insert as PDF bytes, A6, one page. */
export const insertPdf = (shapes: Shape[]) => cardPdf(shapes);
