import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WhatsappChannel } from "../src/components/app/whatsapp-channel";
import { WHATSAPP_ON } from "../src/lib/site";
import { WHATSAPP_CONSENT_TEXT, connectHref } from "../src/lib/whatsapp-owner";

// P0.8-03 (K-129, K-113 as amended): the opt-in wording and the Connect link. The approvals, undo, STOP and access
// rules are tested in supabase/tests/whatsapp_channel.sql and supabase/functions/_shared/whatsapp/whatsapp.test.ts.
describe("WhatsApp owner channel in the app (P0.8-03)", () => {
  it("the consent text names what is sent, Meta and Kapso, the limits and STOP", () => {
    for (const p of [
      /first name/,
      /up to 300 characters/,
      /draft reply/,
      /Meta/,
      /Kapso/,
      /STOP/,
      /low and medium risk/,
      /name, address, categories, map pin, phone or opening status/,
    ]) {
      expect(WHATSAPP_CONSENT_TEXT).toMatch(p);
    }
    expect(WHATSAPP_CONSENT_TEXT).not.toMatch(/[—–!]/);
    expect(WHATSAPP_CONSENT_TEXT.length).toBeGreaterThan(40);
  });

  it("Connect opens WhatsApp with the code typed in", () => {
    const url = new URL(connectHref("123456", "12015550100"));
    expect(url.origin + url.pathname).toBe("https://wa.me/12015550100");
    expect(url.searchParams.get("text")).toBe("KABSI 123456");
  });

  if (!WHATSAPP_ON) {
    it("Settings shows coming soon while Kabsi has no WhatsApp number, with no Connect button", () => {
      const html = renderToStaticMarkup(createElement(WhatsappChannel));
      expect(html).toContain("WhatsApp: coming soon");
      expect(html).not.toMatch(/Connect WhatsApp|wa\.me/);
    });
  }
});
