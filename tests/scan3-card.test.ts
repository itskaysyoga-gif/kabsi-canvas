// Scan 3 (master plan 30.34 item 3): the branded review card. The layout, the words on it, nothing that asks for a rating,
// and a PDF whose cross-reference offsets point at its objects. The decoding of every code is in tests/e2e/scan3-review.spec.ts.
import { describe, expect, it } from "vitest";
import {
  A6,
  CARD_FOOT,
  CARD_LINE,
  cardPdf,
  cardShapes,
  cardSvg,
  printable,
  type Shape,
} from "@/lib/qr-card";

const LINK = "https://search.google.com/local/writereview?placeid=ChIJbarberUKAAAAA";
const texts = (s: Shape[]) => s.flatMap((x) => (x.kind === "text" ? [x.text] : []));

describe("the review card", () => {
  it("carries the name, the line and kabsi.co, and nothing about stars or ratings", () => {
    const s = cardShapes("Fade Room Barbers", LINK);
    expect(texts(s)).toEqual(["Fade Room Barbers", CARD_LINE, CARD_FOOT]);
    expect(CARD_LINE).toBe("Scan to review us on Google");
    expect(CARD_FOOT).toBe("kabsi.co");
    const svg = cardSvg(s, "card");
    expect(svg).not.toMatch(/star|rating|★|logo/i);
  });
  it("draws the code as rounded dots and three rounded finder squares inside a yellow frame, all on the page", () => {
    const s = cardShapes("Pearl Beauty Salon", LINK);
    const dots = s.filter((x) => x.kind === "circle");
    expect(dots.length).toBeGreaterThan(200);
    const yellow = s.filter((x) => x.kind === "rect" && x.fill === "#ffd60a");
    expect(yellow).toHaveLength(1);
    const finders = s.filter((x) => x.kind === "rect" && x.fill === "#111111");
    expect(finders).toHaveLength(6);
    for (const x of s) {
      if (x.kind === "circle") {
        expect(x.cx - x.r).toBeGreaterThan(0);
        expect(x.cy + x.r).toBeLessThan(A6.h);
      }
      if (x.kind === "rect") expect(x.y + x.h).toBeLessThanOrEqual(A6.h);
    }
  });
  it("keeps a long name on two lines at most and prints only Latin-1", () => {
    const s = cardShapes(
      "The Very Long Example Name of a Neighbourhood Dental and Smile Clinic",
      LINK,
    );
    const name = texts(s).slice(0, -2);
    expect(name.length).toBeLessThanOrEqual(2);
    expect(printable("Café “Nord” ☕ Bar")).toBe('Café "Nord" Bar');
    expect(texts(cardShapes("☕☕", LINK))[0]).toBe("Your business");
  });
  it("writes an A6 PDF with valid cross-reference offsets", () => {
    const bytes = cardPdf(cardShapes("Fade Room (Barbers)", LINK));
    const t = Buffer.from(bytes).toString("latin1");
    expect(t.startsWith("%PDF-1.4")).toBe(true);
    expect(t).toContain("/MediaBox [0 0 297.64 419.53]");
    expect(t).toContain("(Fade Room \\(Barbers\\)) Tj");
    const start = Number(t.match(/startxref\n(\d+)/)![1]);
    expect(t.slice(start, start + 4)).toBe("xref");
    const offsets = [...t.slice(start).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(offsets).toHaveLength(6);
    offsets.forEach((o, i) =>
      expect(t.slice(o, o + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`),
    );
    const len = Number(t.match(/\/Length (\d+)/)![1]);
    const s = t.indexOf("stream\n") + 7;
    expect(t.slice(s + len, s + len + 10)).toBe("\nendstream");
  });
});
