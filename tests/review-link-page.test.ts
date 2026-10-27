import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import worker from "../workers/kabsi-go/src/index.js";
import {
  ReviewPageUnavailable,
  ReviewPageView,
} from "../src/components/review-link/review-page-view";
import { MANAGER_LINE, managerHref, type ReviewPageData } from "../src/lib/review-page";
import { pageData, whatsappDigits } from "../supabase/functions/_shared/review-page";

// P0.8-05 (K-132): the review link page. Existing links keep going straight to Google; a link switched to the page
// opens the same page for every visitor, the Google button first.
const GOOGLE = "https://search.google.com/local/writereview?placeid=abc";
const data: ReviewPageData = { name: "Yawmiyati", review_url: GOOGLE, whatsapp: "971501234567" };
const html = (d: ReviewPageData) =>
  renderToStaticMarkup(createElement(ReviewPageView, { data: d }));

describe("the page", () => {
  it("puts the Google button first in the document and the tab order, and the manager line after it", () => {
    const out = html(data);
    const google = out.indexOf(`href="${GOOGLE}"`);
    const manager = out.indexOf(MANAGER_LINE);
    expect(google).toBeGreaterThan(-1);
    expect(manager).toBeGreaterThan(google);
    // The first link in the page is Google's; no tabindex reorders anything.
    expect(out.match(/<a /g)?.length).toBe(2);
    expect(out.indexOf("<a ")).toBeLessThan(out.indexOf("wa.me"));
    expect(out).not.toMatch(/tabindex/i);
  });

  it("is the Google review button, large, with the manager line as a wa.me link to the business", () => {
    const out = html(data);
    expect(out).toContain("Write a review on Google");
    expect(out).toContain("h-14 w-full");
    const href = managerHref("971501234567", "Yawmiyati");
    expect(new URL(href).origin + new URL(href).pathname).toBe("https://wa.me/971501234567");
    expect(out).toContain("https://wa.me/971501234567?text=");
    expect(MANAGER_LINE).toBe("Need help now? Message the manager");
  });

  it("hides the manager line when the business has no WhatsApp number", () => {
    const out = html({ ...data, whatsapp: null });
    expect(out).not.toContain(MANAGER_LINE);
    expect(out).not.toContain("wa.me");
    expect(out).toContain("Write a review on Google");
  });

  it("asks nothing and shows no rating: no form control, no stars, no question about the visit", () => {
    for (const out of [
      html(data),
      html({ ...data, whatsapp: null }),
      renderToStaticMarkup(createElement(ReviewPageUnavailable)),
    ]) {
      expect(out).not.toMatch(/<(input|select|textarea|form|button)\b/);
      expect(out).not.toMatch(/star|rating|how was|enjoy|happy|reward|discount|free /i);
      expect(out).not.toMatch(/[—–!]/);
    }
    for (const file of [
      "src/components/review-link/review-page-view.tsx",
      "src/lib/review-page.ts",
      "src/routes/review.$code.tsx",
      "supabase/functions/review-page/index.ts",
      "supabase/functions/_shared/review-page.ts",
    ]) {
      const code = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      expect(code, file).not.toMatch(/star_rating|sentiment|rating/i);
    }
  });
});

describe("what the function returns", () => {
  const card = {
    status: "active",
    destination: GOOGLE,
    page_mode: "page",
    kind: "link",
    location_id: "loc",
  };

  it("gives the page data for an active link set to the page", () => {
    expect(pageData(card, "Yawmiyati", "+971 50 123 4567")).toEqual({
      name: "Yawmiyati",
      review_url: GOOGLE,
      whatsapp: "971501234567",
    });
  });

  it("gives nothing for a link on Go straight to Google, a switched off link, a card or a non-Google destination", () => {
    expect(pageData({ ...card, page_mode: "direct" }, "Yawmiyati", null)).toBeNull();
    expect(pageData({ ...card, status: "disabled" }, "Yawmiyati", null)).toBeNull();
    expect(pageData({ ...card, kind: "card" }, "Yawmiyati", null)).toBeNull();
    expect(
      pageData({ ...card, destination: "https://example.com/x" }, "Yawmiyati", null),
    ).toBeNull();
    expect(pageData(null, "Yawmiyati", null)).toBeNull();
  });

  it("uses only an international number for wa.me", () => {
    expect(whatsappDigits("+1 (201) 555-0100")).toBe("12015550100");
    expect(whatsappDigits("050 123 4567")).toBeNull();
    expect(whatsappDigits("+12")).toBeNull();
    expect(whatsappDigits("+1234567890123456")).toBeNull();
    expect(whatsappDigits(undefined)).toBeNull();
    expect(pageData(card, "Yawmiyati", "call me")?.whatsapp).toBeNull();
  });
});

// The Worker: the edge copy of a link carries m ("direct" or "page"); a copy written before P0.8-05 has none.
describe("the go.kabsi.co Worker", () => {
  async function open(value: Record<string, unknown>) {
    const kv = { get: vi.fn(async () => value), put: vi.fn(async () => undefined) };
    const waits: Promise<unknown>[] = [];
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await worker.fetch(
      new Request("https://go.kabsi.co/KQA234?s=q", { headers: { "user-agent": "iPhone" } }),
      {
        STICKERS: kv,
        APP_ORIGIN: "https://kabsi.co",
        TAP_FUNCTION_URL: "https://tap.test",
        TAP_SECRET: "s",
      },
      { waitUntil: (p: Promise<unknown>) => waits.push(p) },
    );
    await Promise.all(waits);
    vi.unstubAllGlobals();
    return { res, fetchMock };
  }

  it("still redirects an existing link straight to Google (no m in its edge copy)", async () => {
    const { res } = await open({ d: GOOGLE, b: "loc", a: true });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(GOOGLE);
  });

  it("redirects a link set to Go straight to Google, and counts the open", async () => {
    const { res, fetchMock } = await open({ d: GOOGLE, b: "loc", a: true, m: "direct" });
    expect(res.headers.get("location")).toBe(GOOGLE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends a link set to the page to kabsi.co/review/CODE, and counts the open the same way", async () => {
    const { res, fetchMock } = await open({ d: GOOGLE, b: "loc", a: true, m: "page" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://kabsi.co/review/KQA234");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends a switched off link to the not-active page whatever its mode", async () => {
    const { res } = await open({ d: GOOGLE, b: "loc", a: false, m: "page" });
    expect(res.headers.get("location")).toBe("https://kabsi.co/?sticker=disabled");
  });
});
