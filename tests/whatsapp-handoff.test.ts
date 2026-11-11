import { describe, expect, it } from "vitest";
import { linkCardHref, scanHandoffHref, scanHandoffText } from "../src/lib/site";
import { parse } from "../supabase/functions/_shared/whatsapp/router";

// Session 13b part 1 (master plan 24.8, 28.1): the site's prefilled message is exactly what the agent picks up.
describe("the scan hand-off to WhatsApp", () => {
  it("carries the scan code in plain text, no link", () => {
    expect(scanHandoffText("kab-7q4m2x9p")).toBe("Hi Kabsi, my scan code is KAB-7Q4M2X9P");
    expect(scanHandoffText("KAB-123")).toBeNull();
    expect(scanHandoffText("https://evil.example")).toBeNull();
    expect(scanHandoffHref("KAB-7Q4M2X9P", "12057456874")).toBe(
      "https://wa.me/12057456874?text=Hi%20Kabsi%2C%20my%20scan%20code%20is%20KAB-7Q4M2X9P",
    );
    expect(scanHandoffHref("KAB-7Q4M2X9P", "")).toBeNull();
  });

  it("is read by the agent's router as the scan code", () => {
    const text = scanHandoffText("KAB-7Q4M2X9P")!;
    const cmd = parse({
      phoneNumberId: "P",
      from: "+12125550143",
      messageId: "m",
      timestamp: 1,
      type: "text",
      text,
      buttonId: null,
      mediaId: null,
      forwarded: false,
    });
    expect(cmd).toMatchObject({ k: "scan_code", code: "KAB-7Q4M2X9P" });
  });
});

// Cards 2 (master plan 30.50 item 9): the activate page's "Set up on WhatsApp" fills in "Link card CODE" and nothing else.
describe("linkCardHref", () => {
  it("fills in Link card and the code, upper case", () => {
    expect(linkCardHref("abc234", "12057456874")).toBe(
      "https://wa.me/12057456874?text=Link%20card%20ABC234",
    );
  });
  it("refuses a malformed code and a missing number", () => {
    expect(linkCardHref("ABC1O4", "12057456874")).toBeNull();
    expect(linkCardHref("ABC23", "12057456874")).toBeNull();
    expect(linkCardHref("ABC234", "")).toBeNull();
  });
});
