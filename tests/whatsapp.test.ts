import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEBANON_PHONE,
  WHATSAPP_DIGITS,
  WHATSAPP_MESSAGES,
  WHATSAPP_NUMBER,
  whatsappHref,
  type WhatsappKind,
} from "../src/lib/site";
import {
  WHATSAPP_NUMBER as EMAIL_NUMBER,
  WHATSAPP_URL,
  emailLayout,
} from "../supabase/functions/_shared/email-layout";

const kinds = Object.keys(WHATSAPP_MESSAGES) as WhatsappKind[];

describe("WhatsApp click-to-chat (P0.6-10, K-122)", () => {
  it("uses the Kapso US number, with digits for wa.me", () => {
    expect(WHATSAPP_NUMBER).toBe("+1 201-483-5474");
    expect(WHATSAPP_DIGITS).toBe("12014835474");
  });

  it("builds a wa.me link with the prefilled text for every placement", () => {
    for (const kind of kinds) {
      const url = new URL(whatsappHref(kind));
      expect(url.origin).toBe("https://wa.me");
      expect(url.pathname).toBe("/12014835474");
      expect(url.searchParams.get("text")).toBe(WHATSAPP_MESSAGES[kind]);
    }
  });

  it("keeps the messages short, plain and free of private details (K-58) and house-style slips", () => {
    for (const text of Object.values(WHATSAPP_MESSAGES)) {
      expect(text.length).toBeLessThanOrEqual(120);
      expect(text).not.toMatch(/[—–!@]|https?:|\d{5,}/);
      expect(text.startsWith("Hello Kabsi")).toBe(true);
    }
  });

  it("email footers use the same number and a working wa.me link", () => {
    expect(EMAIL_NUMBER).toBe(WHATSAPP_NUMBER);
    const url = new URL(WHATSAPP_URL);
    expect(url.pathname).toBe(`/${WHATSAPP_DIGITS}`);
    expect(url.searchParams.get("text")).toBe(WHATSAPP_MESSAGES.email);
    const html = emailLayout({ preheader: "p", title: "t", bodyHtml: "<p>x</p>" });
    expect(html).toContain(`href="${WHATSAPP_URL.replace(/&/g, "&amp;")}"`);
    expect(html).toContain(`WhatsApp ${WHATSAPP_NUMBER}`);
    expect(html.match(/background:#FFD60A/gi)).toBeNull();
  });

  it("shows the Lebanese number only on /lebanon", () => {
    const digits = LEBANON_PHONE.replace(/\D/g, "");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(tsx?|html|txt)$/.test(name) && !path.endsWith("routeTree.gen.ts")) {
          const text = readFileSync(path, "utf8");
          if (path.endsWith("src/routes/lebanon.tsx")) continue;
          if (/LEBANON_PHONE|961 3 956 917/.test(text) || text.replace(/\D/g, "").includes(digits))
            offenders.push(path);
        }
      }
    };
    walk("src");
    expect(offenders.filter((p) => !p.endsWith("src/lib/site.ts"))).toEqual([]);
  });

  it("names no personal email and nobody who left (R-26, R-32)", () => {
    for (const file of [
      "src/components/layouts/public-layout.tsx",
      "src/routes/partners.tsx",
      "src/routes/faq.tsx",
    ]) {
      expect(readFileSync(file, "utf8")).not.toMatch(/Rashid/i);
    }
  });
});
