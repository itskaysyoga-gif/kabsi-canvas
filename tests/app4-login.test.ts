// App 4 part C (master plan 30.31 item 3): the log in page's words for each case, in-app browsers and email typos.
import { describe, expect, it } from "vitest";
import { isInAppBrowser } from "../src/lib/in-app-browser";
import { emailTypoSuggestion } from "../src/lib/email-typo";
import {
  codeErrorWords,
  EXPIRED_CODE,
  OFFLINE,
  tooManyWords,
  UNREACHABLE,
  waitWords,
  WRONG_CODE,
} from "../src/lib/sign-in-errors";
import { safeNext } from "../src/lib/signup-next";

const UA = {
  instagram:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.36.88",
  facebook:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.40.94;FBBV/600000000]",
  facebookAndroid:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/470.0.0.40.94;]",
  messenger:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/470.0]",
  tiktok:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_35.0.0 BytedanceWebview/d8a21c6",
  linkedin:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.29.1",
  snapchat:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/13.0.0.0 (like Safari/8617.1.17.10.9, panda)",
  safari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  chrome:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  desktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};

describe("in-app browsers", () => {
  it.each([
    "instagram",
    "facebook",
    "facebookAndroid",
    "messenger",
    "tiktok",
    "linkedin",
    "snapchat",
  ])("%s is an in-app browser", (k) => expect(isInAppBrowser(UA[k as keyof typeof UA])).toBe(true));
  it.each(["safari", "chrome", "desktop"])("%s is a normal browser", (k) =>
    expect(isInAppBrowser(UA[k as keyof typeof UA])).toBe(false),
  );
});

describe("email typos", () => {
  it("suggests the likely address and never changes it", () => {
    expect(emailTypoSuggestion("rana@gmial.com")).toBe("rana@gmail.com");
    expect(emailTypoSuggestion("rana@gmail.con")).toBe("rana@gmail.com");
    expect(emailTypoSuggestion("rana@hotmial.com")).toBe("rana@hotmail.com");
    expect(emailTypoSuggestion("rana@yahooo.com")).toBe("rana@yahoo.com");
  });
  it("is quiet for a correct or unknown domain", () => {
    expect(emailTypoSuggestion("rana@gmail.com")).toBeNull();
    expect(emailTypoSuggestion("rana@hotmail.co.uk")).toBeNull();
    expect(emailTypoSuggestion("rana@shop.ae")).toBeNull();
    expect(emailTypoSuggestion("rana")).toBeNull();
  });
});

describe("code errors", () => {
  const now = 1_000_000_000;
  const base = { online: true, sentAt: now - 60_000, now };
  it("a wrong code", () => {
    expect(codeErrorWords({ status: 403, message: "Token has expired or is invalid" }, base)).toBe(
      WRONG_CODE,
    );
  });
  it("an expired code (sent more than 10 minutes ago)", () => {
    expect(
      codeErrorWords(
        { status: 403, message: "Token has expired or is invalid" },
        { ...base, sentAt: now - 11 * 60_000 },
      ),
    ).toBe(EXPIRED_CODE);
  });
  it("too many requests, with the wait in plain words", () => {
    expect(
      codeErrorWords(
        {
          status: 429,
          message: "For security purposes, you can only request this after 42 seconds.",
        },
        base,
      ),
    ).toBe("Wait 42 seconds, then try again.");
    expect(tooManyWords("Email rate limit exceeded")).toBe(
      "Too many tries for now. Wait a few minutes, then try again.",
    );
    expect(waitWords(1)).toBe("Wait 1 second, then try again.");
    expect(waitWords(300)).toBe("Wait 5 minutes, then try again.");
  });
  it("offline", () => {
    expect(codeErrorWords({ status: 403, message: "x" }, { ...base, online: false })).toBe(OFFLINE);
  });
  it("Kabsi unreachable", () => {
    expect(codeErrorWords({ message: "fetch failed" }, base)).toBe(UNREACHABLE);
    expect(codeErrorWords({ status: 503, message: "upstream" }, base)).toBe(UNREACHABLE);
    expect(codeErrorWords({ name: "AuthRetryableFetchError", status: 0, message: "" }, base)).toBe(
      UNREACHABLE,
    );
  });
  it("no line has an exclamation mark or a dash", () => {
    for (const l of [WRONG_CODE, EXPIRED_CODE, OFFLINE, UNREACHABLE])
      expect(l).not.toMatch(/[!\u2013\u2014]/);
  });
});

describe("safe next", () => {
  it("keeps a same-site path and refuses another site", () => {
    expect(safeNext("/app/reviews?tab=waiting")).toBe("/app/reviews?tab=waiting");
    expect(safeNext("//evil.example/app")).toBe("/app");
    expect(safeNext("/\\evil.example")).toBe("/app");
    expect(safeNext("https://evil.example")).toBe("/app");
    expect(safeNext(undefined)).toBe("/app");
  });
});
