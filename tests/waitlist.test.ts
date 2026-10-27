import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  WAITLIST_NOTICE_TEXT,
  WAITLIST_TIPS_TEXT,
  WAITLIST_WHATSAPP_TEXT,
  checkWaitlist,
} from "../supabase/functions/_shared/visibility/waitlist";
import { TIPS_CONSENT_TEXT } from "../src/lib/profile-check";
import { WAITLIST_LINE, WAITLIST_WHATSAPP_LINE } from "../src/lib/waitlist-copy";

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
    expect(ok.ok && ok.value.whatsapp_consent_text).toBe(WAITLIST_WHATSAPP_TEXT);
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
    // What the box prints is what the row keeps: the page imports these two lines and renders both.
    expect(WAITLIST_LINE).toBe(WAITLIST_NOTICE_TEXT);
    expect(WAITLIST_WHATSAPP_LINE).toBe(WAITLIST_WHATSAPP_TEXT);
    const page = readFileSync(join(__dirname, "..", "src/components/kabsi/scan-live.tsx"), "utf8");
    expect(page).toContain('from "@/lib/waitlist-copy"');
    // Each line is the content of a real element, not a comment or a stray token.
    expect(page).toMatch(/<p className="[^"]*">\{WAITLIST_LINE\}<\/p>/);
    expect(page).toMatch(/>\s*\{WAITLIST_WHATSAPP_LINE\}\s*</);
    expect(page).not.toMatch(/"The free (scan|check) opens soon/);
    for (const t of [WAITLIST_NOTICE_TEXT, WAITLIST_TIPS_TEXT, WAITLIST_WHATSAPP_TEXT])
      expect(t).not.toMatch(new RegExp("[\\u2013\\u2014!]"));
  });

  it("uses owner words: no free scan and no map, and the exact lines the owner approved", () => {
    expect(WAITLIST_NOTICE_TEXT).toBe(
      "The free check opens soon. Leave your email or WhatsApp number and Kabsi sends your result the day it opens.",
    );
    expect(WAITLIST_WHATSAPP_TEXT).toBe(
      "Send my result to this WhatsApp number the day the free check opens.",
    );
    for (const t of [WAITLIST_NOTICE_TEXT, WAITLIST_WHATSAPP_TEXT])
      expect(t).not.toMatch(/\b(scan|map)\b/i);
  });

  it("keeps the database test on the same words, so a check constraint is tried with the stored text", () => {
    const sql = readFileSync(join(__dirname, "..", "supabase/tests/ux1_waitlist.sql"), "utf8");
    expect(sql).toContain(WAITLIST_NOTICE_TEXT);
    expect(sql).toContain(WAITLIST_WHATSAPP_TEXT);
    expect(sql).not.toMatch(/free scan opens|sends your map|Send my map/);
  });
});
