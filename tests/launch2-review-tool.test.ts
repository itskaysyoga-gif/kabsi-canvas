// Launch 2 part B (master plan 30.36 item 7): the free review link tool tells the truth. A name the card cannot print is
// caught by its letters; a download counts only when the file was made (PNG and PDF); the copy and busy lines.
import { describe, expect, it, vi } from "vitest";
import { dropsLetters, hasLetters, printable } from "@/lib/qr-card-name";
import { estimate, saveCard } from "@/lib/qr-card";
import { COPY_FAILED, copyFailedLine } from "@/components/kabsi/d2-parts";
import {
  CARD_FAILED,
  NAME_HELP,
  NAME_LABEL,
  REVIEW_TOOL_BUSY,
  TEST_LINE,
} from "@/components/kabsi/d2-tools";

const LINK = "https://search.google.com/local/writereview?placeid=ChIJbarberUKAAAAA";
const AR = "مطعم البيت"; // a name in Arabic letters, never shown (R-61)

describe("a name the card cannot print", () => {
  it("is caught when printable() drops any letter, and only then", () => {
    expect(dropsLetters(AR)).toBe(true);
    expect(dropsLetters(`Beit ${AR}`)).toBe(true);
    expect(printable(`Beit ${AR}`)).toBe("Beit");
    expect(dropsLetters("Café Rosa")).toBe(false);
    expect(dropsLetters("Rose Lane Salon ☕")).toBe(false);
    expect(dropsLetters("O’Brien's Bakery")).toBe(false);
  });
  it("needs letters before a card is made", () => {
    expect(hasLetters(AR)).toBe(false);
    expect(hasLetters("  ")).toBe(false);
    expect(hasLetters("Beit")).toBe(true);
  });
});

describe("a download is counted only when the file was made", () => {
  const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });
  it("PNG: true and saved once when drawn; false and nothing saved when the device gives no image or throws", async () => {
    const save = vi.fn();
    expect(
      await saveCard("png", "Fade Room", LINK, "a.png", {
        measure: estimate,
        png: async () => png,
        save,
      }),
    ).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][1]).toBe("a.png");
    save.mockClear();
    expect(
      await saveCard("png", "Fade Room", LINK, "a.png", {
        measure: estimate,
        png: async () => null,
        save,
      }),
    ).toBe(false);
    expect(
      await saveCard("png", "Fade Room", LINK, "a.png", {
        measure: estimate,
        png: async () => {
          throw new Error("canvas");
        },
        save,
      }),
    ).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });
  it("PDF: true and saved as a PDF when made; false when making or saving it throws", async () => {
    const save = vi.fn();
    expect(await saveCard("pdf", "Fade Room", LINK, "a.pdf", { measure: estimate, save })).toBe(
      true,
    );
    const blob = save.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("application/pdf");
    expect(
      new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer())).startsWith("%PDF-"),
    ).toBe(true);
    expect(
      await saveCard("pdf", "Fade Room", LINK, "a.pdf", {
        measure: estimate,
        pdf: () => {
          throw new Error("pdf");
        },
        save,
      }),
    ).toBe(false);
    expect(
      await saveCard("pdf", "Fade Room", LINK, "a.pdf", {
        measure: estimate,
        save: () => {
          throw new Error("blocked");
        },
      }),
    ).toBe(false);
  });
  it("never makes a card without letters in the name", async () => {
    const save = vi.fn();
    expect(await saveCard("pdf", AR, LINK, "a.pdf", { measure: estimate, save })).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });
});

describe("the tool's lines", () => {
  it("are the approved words", () => {
    expect(copyFailedLine(true)).toBe("Press and hold the link to copy it.");
    expect(copyFailedLine(false)).toBe("Press Ctrl+C or Cmd+C to copy it.");
    expect(COPY_FAILED.phone).toBe("Press and hold the link to copy it.");
    expect(REVIEW_TOOL_BUSY).toEqual({
      title: "The review link tool is busy right now.",
      line: "Try again in a few minutes.",
    });
    expect(CARD_FAILED).toBe(
      "The card could not be made on this device. Try the PDF, or another browser.",
    );
    expect(TEST_LINE).toBe(
      "Check it opens your business. Google may ask customers to sign in before they write a review.",
    );
    expect(NAME_LABEL).toBe("Name on the card");
    expect(NAME_HELP).toBe("Type the business name in English letters as you want it printed.");
  });
});
