import { describe, expect, it } from "vitest";
import { scanHandoffHref, scanHandoffText } from "../src/lib/site";
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
    });
    expect(cmd).toMatchObject({ k: "scan_code", code: "KAB-7Q4M2X9P" });
  });
});
