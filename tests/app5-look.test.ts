// App 5 part B (master plan 30.33 item 2): the 30.32 look on the signed-in site. A long line is shown as paragraphs of
// at most 25 words, cut only between sentences, so not one word changes; each signed-in heading puts one phrase on the
// highlight bar (the title's last word unless a phrase is named).
import { describe, expect, it } from "vitest";
import { sentences, shortParas } from "@/components/kabsi/d3-account";
import { lastWord } from "@/components/kabsi/highlight";

const words = (s: string) => s.trim().split(/\s+/).length;

describe("short paragraphs", () => {
  const ai =
    'ChatGPT was asked "best hair salon in williamsburg" on 2 November. It said: "Rose Lane Salon is open Monday to Saturday from 9 am to 8 pm." Kabsi has: Monday 09:00 to 18:00.';

  it("cuts between sentences only, and keeps every word in order", () => {
    const parts = shortParas(ai);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.join(" ")).toBe(ai);
    for (const p of parts) expect(words(p)).toBeLessThanOrEqual(25);
  });

  it("splits after a closing quote too", () => {
    expect(sentences(ai)).toHaveLength(3);
  });

  it("keeps a short line whole and a single long sentence whole", () => {
    expect(shortParas("Reviews that need extra care are emailed right away.")).toHaveLength(1);
    const one = Array.from({ length: 30 }, (_, i) => `w${i}`).join(" ") + ".";
    expect(shortParas(one)).toEqual([one]);
  });

  it("does not cut inside a number or an initial", () => {
    expect(sentences("It costs $2.47 a month. Next.")).toEqual([
      "It costs $2.47 a month.",
      "Next.",
    ]);
  });
});

describe("the heading's phrase", () => {
  it("is the title's last word, without its closing punctuation", () => {
    expect(lastWord("Home")).toBe("Home");
    expect(lastWord("Posts and photos")).toBe("photos");
    expect(lastWord("Google profile")).toBe("profile");
    expect(lastWord("Is this your business?")).toBe("business");
    expect(lastWord("Access works.")).toBe("works");
  });
});
