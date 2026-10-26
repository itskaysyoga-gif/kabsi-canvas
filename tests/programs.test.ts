import { describe, expect, it } from "vitest";
import {
  checkFounding,
  checkPartner,
  FOUNDING_CONSENT_TEXT,
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
    expect(c.value.consent_text).toBe(FOUNDING_CONSENT_TEXT);
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

describe("Kabsi Partners application", () => {
  const p = { name: "Sara", email: "Sara@Example.com", kind: "creator", terms: true };
  it("accepts an application with the terms agreed and records the terms version", () => {
    const c = checkPartner(p);
    expect(c).toMatchObject({
      ok: true,
      value: { email: "sara@example.com", terms_version: PARTNER_TERMS_VERSION, source: "web" },
    });
  });
  it("refuses without the terms, a known kind or a real email", () => {
    expect(checkPartner({ ...p, terms: false })).toMatchObject({ ok: false, field: "terms" });
    expect(checkPartner({ ...p, kind: "reseller_whitelabel" })).toMatchObject({
      ok: false,
      field: "kind",
    });
    expect(checkPartner({ ...p, email: "sara" })).toMatchObject({ ok: false, field: "email" });
    expect(checkPartner({ ...p, phone: "123" })).toMatchObject({ ok: false, field: "phone" });
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
  });
});

describe("the founding consent words (Web 2)", () => {
  it("are the same on the form and in the stored proof", async () => {
    const site = await import("../src/lib/public-api");
    const server = await import("../supabase/functions/_shared/programs.ts");
    expect(site.FOUNDING_CONSENT_TEXT).toBe(server.FOUNDING_CONSENT_TEXT);
  });
});
