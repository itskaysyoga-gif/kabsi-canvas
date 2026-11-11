import { describe, expect, it } from "vitest";
import {
  checkFounding,
  checkJoin,
  checkPayout,
  emailCode,
  PARTNER_KIND_LABEL,
  PARTNER_KINDS,
  payoutChannel,
  payoutCodeEmail,
  FOUNDING_CONSENT,
  FOUNDING_DAYS,
  foundingLine,
  PARTNER_TERMS_VERSION,
  phoneOf,
} from "../supabase/functions/_shared/programs.ts";

// Partners session (master plan 30.17 section 1, 29): what a Founding 25 or partner application must hold, and the
// words of the day-60, day-85 and day-90 messages (nothing charged by itself, the founding price, kabsi-copy rules).
const good = {
  business_name: " Al Noor  Salon ",
  country: "ae",
  trade: "beauty_hair",
  business_kind: "Hair salon",
  whatsapp: "00971 50 123 4567",
  why_now: "We have 200 reviews and no time to answer them.",
  case_study: "anonymous",
  checkin_consent: true,
};

describe("Founding 25 application", () => {
  it("accepts a full application and stores the consent words", () => {
    const c = checkFounding(good);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.value).toMatchObject({
      business_name: "Al Noor Salon",
      country: "AE",
      whatsapp: "+971501234567",
    });
    expect(c.value.case_study).toBe("anonymous");
    expect(c.value.consent_text).toBe(FOUNDING_CONSENT.anonymous);
  });
  it("stores the words of the case study the applicant chose (UX 1)", () => {
    const named = checkFounding({ ...good, case_study: "named" });
    expect(named.ok && named.value.consent_text).toBe(FOUNDING_CONSENT.named);
    expect(FOUNDING_CONSENT.named).toContain("names my business");
    expect(FOUNDING_CONSENT.anonymous).toContain("does not name my business");
  });
  it("needs the check-in yes, a case study choice, a country it serves and a WhatsApp number", () => {
    expect(checkFounding({ ...good, checkin_consent: false })).toMatchObject({
      ok: false,
      field: "checkin_consent",
    });
    expect(checkFounding({ ...good, checkin_consent: "true" })).toMatchObject({
      ok: false,
      field: "checkin_consent",
    });
    expect(checkFounding({ ...good, case_study: "" })).toMatchObject({
      ok: false,
      field: "case_study",
    });
    expect(checkFounding({ ...good, country: "LB" })).toMatchObject({
      ok: false,
      field: "country",
    });
    expect(checkFounding({ ...good, trade: "barbers" })).toMatchObject({
      ok: false,
      field: "trade",
    });
    expect(checkFounding({ ...good, whatsapp: "050 123" })).toMatchObject({
      ok: false,
      field: "whatsapp",
    });
    expect(checkFounding({ ...good, why_now: "now" })).toMatchObject({
      ok: false,
      field: "why_now",
    });
  });
  it("reads phone numbers in their usual forms", () => {
    expect(phoneOf("+44 7700 900123")).toBe("+447700900123");
    expect(phoneOf("+1 (212) 555-0100")).toBe("+12125550100");
  });
});

describe("Kabsi Partners join (Partners 2, 30.50 items 4 and 5)", () => {
  const p = {
    name: "Sara",
    email: "Sara@Example.com",
    kind: "card_seller",
    country: "gb",
    reach: "My card customers",
    terms: true,
  };
  it("accepts the one short form and records the terms version", () => {
    expect(checkJoin(p)).toMatchObject({
      ok: true,
      value: {
        email: "sara@example.com",
        country: "GB",
        kind: "card_seller",
        uae_permit: null,
        terms_version: PARTNER_TERMS_VERSION,
      },
    });
  });
  it("has the six kinds of 30.50 item 5, each with its words", () => {
    expect([...PARTNER_KINDS]).toEqual([
      "card_seller",
      "agency",
      "creator",
      "accountant",
      "reseller",
      "customer",
    ]);
    expect(Object.keys(PARTNER_KIND_LABEL)).toEqual([...PARTNER_KINDS]);
  });
  it("refuses without the terms, a known kind, a country, how they share, or a real email", () => {
    expect(checkJoin({ ...p, terms: false })).toMatchObject({ ok: false, field: "terms" });
    expect(checkJoin({ ...p, kind: "reseller_whitelabel" })).toMatchObject({
      ok: false,
      field: "kind",
    });
    expect(checkJoin({ ...p, country: "" })).toMatchObject({ ok: false, field: "country" });
    expect(checkJoin({ ...p, reach: "" })).toMatchObject({ ok: false, field: "reach" });
    expect(checkJoin({ ...p, email: "sara" })).toMatchObject({ ok: false, field: "email" });
    expect(checkJoin({ ...p, email: "wa-1@wa.kabsi.co" })).toMatchObject({
      ok: false,
      field: "email",
    });
  });
  it("asks a UAE partner for the permit number or 'only privately' (29.2)", () => {
    expect(checkJoin({ ...p, country: "AE" })).toMatchObject({ ok: false, field: "uae_permit" });
    expect(checkJoin({ ...p, country: "AE", uae_permit: "AP-12345" })).toMatchObject({
      ok: true,
      value: { uae_permit: "AP-12345" },
    });
    expect(checkJoin({ ...p, country: "AE", uae_private: true })).toMatchObject({
      ok: true,
      value: { uae_permit: "private" },
    });
  });
});

describe("Payout method (29.1, 30.51 item 6)", () => {
  it("takes a PayPal email or a wallet address", () => {
    expect(checkPayout({ method: "paypal", detail: " sara@example.com " })).toMatchObject({
      ok: true,
      value: { detail: "sara@example.com" },
    });
    expect(checkPayout({ method: "usdt", detail: "TXyz1234567890abcdefghijklmnop" })).toMatchObject(
      { ok: true },
    );
    expect(checkPayout({ method: "usdc", detail: "0x12" })).toMatchObject({
      ok: false,
      field: "detail",
    });
    expect(checkPayout({ method: "bank", detail: "x" })).toMatchObject({
      ok: false,
      field: "method",
    });
  });
  it("confirms on WhatsApp with a confirmed number, by email code only without WhatsApp", () => {
    expect(payoutChannel({ phone: "+447700900123", windowOpen: true, stopped: false })).toBe(
      "whatsapp",
    );
    expect(payoutChannel({ phone: null, windowOpen: true, stopped: false })).toBe("email");
    expect(payoutChannel({ phone: "+447700900123", windowOpen: false, stopped: false })).toBe(
      "open_window",
    );
  });
  it("makes 6 digits and keeps the code out of the subject", () => {
    let i = 0;
    const code = emailCode((n) =>
      Uint8Array.from({ length: n }, () => [255, 7, 3, 251, 9, 0, 1, 2][i++ % 8]),
    );
    expect(code).toMatch(/^[0-9]{6}$/);
    const m = payoutCodeEmail(code, "paypal", "e.co");
    expect(m.subject).not.toContain(code);
    expect(m.text).toContain(code);
    expect(`${m.subject} ${m.text}`).not.toMatch(/[—–!]/);
  });
});

describe("Founding 25 messages", () => {
  const ends = "2027-02-01T00:00:00Z";
  it("never charge by themselves and give the founding price", () => {
    for (const d of FOUNDING_DAYS) {
      const l = foundingLine(d, "Al Noor Salon", ends, "https://kabsi.co");
      const all = `${l.whatsapp} ${l.email.subject} ${l.email.text}`;
      expect(all).not.toMatch(/[–—!]/);
      expect(all).toContain("Al Noor Salon");
      if (d !== 60)
        expect(all).toContain(
          "$19 a month or Pro $39 a month, kept while your subscription stays paid",
        );
      expect(all).toMatch(/[Nn]othing is charged/);
    }
    expect(foundingLine(85, "X", ends, "https://kabsi.co").whatsapp).toContain("1 February 2027");
    expect(foundingLine(90, "X", ends, "https://kabsi.co").email.button?.url).toBe(
      "https://kabsi.co/app/plan",
    );
    expect(foundingLine(60, "X", ends, "https://kabsi.co").email.button).toBeUndefined();
    for (const d of [85, 90] as const)
      expect(foundingLine(d, "X", ends, "https://kabsi.co").email.text).toContain(
        "Card payments in US dollars are coming. Until they open there is nothing to pay.",
      );
  });
});

describe("the founding consent words (Web 2)", () => {
  it("are the same on the form and in the stored proof", async () => {
    const site = await import("../src/lib/public-api");
    const server = await import("../supabase/functions/_shared/programs.ts");
    expect(site.FOUNDING_CONSENT).toEqual(server.FOUNDING_CONSENT);
  });
});
