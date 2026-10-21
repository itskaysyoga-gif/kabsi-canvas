import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reviewLinkMessage, sendReviewLinkHref } from "../src/lib/send-review-link";

// P0.8-06 (K-133, K-25): staff "Send review link". The same neutral message for every customer, the place link, no
// reward or "if you enjoyed" wording, and nothing that records who sent what.
const LINK = "https://go.kabsi.co/KQA234";
const message = reviewLinkMessage("Yawmiyati", LINK);

describe("the message", () => {
  it("offers the link to every customer and nothing else", () => {
    expect(message).toBe(
      "Thanks for visiting Yawmiyati. If you would like to leave a review, here is our link: https://go.kabsi.co/KQA234",
    );
  });

  it("never uses reward, free, discount, if you enjoyed, happy or 5 stars", () => {
    for (const word of [
      "reward",
      "free",
      "discount",
      "if you enjoyed",
      "happy",
      "5 stars",
      "5-star",
      "five star",
    ]) {
      expect(message.toLowerCase(), word).not.toContain(word);
    }
    expect(message).not.toMatch(/[—–!]/);
  });

  it("is a wa.me click-to-chat with no number, so the staff member picks the customer in their own WhatsApp", () => {
    const url = new URL(sendReviewLinkHref("Yawmiyati", LINK));
    expect(url.origin).toBe("https://wa.me");
    expect(url.pathname).toBe("/");
    expect(url.searchParams.get("text")).toBe(message);
  });

  it("keeps the link in the message intact when the business name has an ampersand or accents", () => {
    const url = new URL(sendReviewLinkHref("Café & Co", LINK));
    expect(url.searchParams.get("text")).toContain(LINK);
    expect(url.searchParams.get("text")).toContain("Café & Co");
  });
});

describe("no record of who sent what", () => {
  it("the send path calls no function, writes no table and tracks nothing", () => {
    for (const file of [
      "src/lib/send-review-link.ts",
      "src/components/shared/send-review-link.tsx",
    ]) {
      const code = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      expect(code, file).not.toMatch(
        /\.rpc\(|\.insert\(|\.update\(|\.upsert\(|track\(|fetch\(|functions\.invoke/,
      );
    }
  });
});
