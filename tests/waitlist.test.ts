import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  WAITLIST_NOTICE_TEXT,
  WAITLIST_TIPS_TEXT,
  checkWaitlist,
} from "../supabase/functions/_shared/visibility/waitlist";
import { TIPS_CONSENT_TEXT } from "../src/lib/profile-check";

// UX 1: "Save my place" while the free check is closed. Stored with the words agreed to; tips are separate and unticked.
const good = {
  business: "Rose Lane Salon",
  email: "Nadia@Example.com",
  country: "AE",
  place_id: "ChIJroselanesalon000001",
  term: "hair salon",
};

describe("the free check waiting list", () => {
  it("keeps an email with the notice words, lower cased, and no tips unless asked", () => {
    const c = checkWaitlist(good, false);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.value.email).toBe("nadia@example.com");
    expect(c.value.notice_consent_text).toBe(WAITLIST_NOTICE_TEXT);
    expect(c.value.marketing_consent).toBe(false);
    expect(c.value.marketing_consent_text).toBeNull();
    expect(c.value.page).toBe("/scan");
  });

  it("stores the tips words only when the box was ticked and there is an email", () => {
    const c = checkWaitlist({ ...good, tips: true }, false);
    expect(c.ok && c.value.marketing_consent_text).toBe(WAITLIST_TIPS_TEXT);
    const phoneOnly = checkWaitlist(
      { business: "X Cafe", phone: "+971 50 123 4567", whatsapp_consent: true, tips: true },
      true,
    );
    expect(phoneOnly.ok && phoneOnly.value.marketing_consent).toBe(false);
  });

  it("needs a contact, and a WhatsApp number only while WhatsApp is on and with its tick", () => {
    expect(checkWaitlist({ business: "X Cafe" }, true)).toMatchObject({
      ok: false,
      field: "email",
    });
    expect(checkWaitlist({ business: "X Cafe", email: "not-an-email" }, false)).toMatchObject({
      ok: false,
      field: "email",
    });
    expect(
      checkWaitlist({ business: "X Cafe", phone: "+971501234567", whatsapp_consent: true }, false),
    ).toMatchObject({ ok: false, field: "email" });
    expect(checkWaitlist({ business: "X Cafe", phone: "+971501234567" }, true)).toMatchObject({
      ok: false,
      field: "phone",
    });
    const ok = checkWaitlist(
      { business: "X Cafe", phone: "00971 50 123 4567", whatsapp_consent: true },
      true,
    );
    expect(ok.ok && ok.value.phone).toBe("+971501234567");
    expect(checkWaitlist({ email: "a@b.co" }, false)).toMatchObject({
      ok: false,
      field: "business",
    });
  });

  it("drops what it cannot trust", () => {
    const c = checkWaitlist(
      {
        ...good,
        country: "uae",
        place_id: "bad id",
        page: "https://evil.example",
        industry: "Bad Industry",
      },
      false,
    );
    expect(c.ok && [c.value.country, c.value.place_id, c.value.page, c.value.industry]).toEqual([
      null,
      null,
      "/scan",
      null,
    ]);
  });

  it("shows the visitor the same words the server stores", () => {
    expect(WAITLIST_TIPS_TEXT).toBe(TIPS_CONSENT_TEXT);
    const page = readFileSync(join(__dirname, "..", "src/components/kabsi/scan-live.tsx"), "utf8");
    expect(page).toContain(`"${WAITLIST_NOTICE_TEXT}"`);
    for (const t of [WAITLIST_NOTICE_TEXT, WAITLIST_TIPS_TEXT]) expect(t).not.toMatch(/[–—!]/);
  });
});
