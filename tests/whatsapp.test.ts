import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WhatsappLink } from "../src/components/shared/whatsapp-link";
import {
  WHATSAPP_DIGITS,
  WHATSAPP_MESSAGES,
  WHATSAPP_NUMBER,
  WHATSAPP_ON,
  whatsappHref,
  type WhatsappKind,
} from "../src/lib/site";
import * as setting from "../supabase/functions/_shared/whatsapp-setting";
import {
  WHATSAPP_NUMBER as EMAIL_NUMBER,
  WHATSAPP_URL,
} from "../supabase/functions/_shared/email-layout";
import { noraAck } from "../supabase/functions/_shared/email/copy";
import { renderEmail } from "../supabase/functions/_shared/email/template";
import { readText } from "./helpers/facts";

const kinds = Object.keys(WHATSAPP_MESSAGES) as WhatsappKind[];

// Every text file in the repo, minus what is not ours or not shipped.
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".output",
  ".vercel",
  ".bundles",
  ".tanstack",
]);
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(path, out);
    } else if (/\.(tsx?|mjs|js|json|html|txt|md|py|sql|toml|ya?ml|sh)$/.test(name)) out.push(path);
  }
  return out;
}
const repoFiles = walk(".");

describe("WhatsApp is one setting that can be empty (PR 0, 22 Oct 2026)", () => {
  it("the site and the emails read the same one setting", () => {
    expect(WHATSAPP_NUMBER).toBe(setting.WHATSAPP_NUMBER);
    expect(EMAIL_NUMBER).toBe(setting.WHATSAPP_NUMBER);
    expect(WHATSAPP_ON).toBe(setting.WHATSAPP_NUMBER.trim() !== "");
    expect(WHATSAPP_DIGITS).toBe(setting.WHATSAPP_NUMBER.replace(/\D/g, ""));
    // No other file holds its own copy of the number (emails/build.py reads the setting file itself).
    const copies = repoFiles.filter(
      (f) =>
        !f.endsWith("whatsapp-setting.ts") &&
        !f.endsWith(join("emails", "build.py")) &&
        !f.endsWith(".md") &&
        /WHATSAPP_NUMBER(:\s*string)?\s*=\s*["'`]/.test(readFileSync(f, "utf8")),
    );
    expect(copies).toEqual([]);
  });

  it("the deleted Kapso number appears nowhere outside docs/source, PROGRESS and its archive", () => {
    // Built from parts so this file does not contain it either.
    const old = new RegExp(["\\(?201\\)?", "483", "5474"].join("[\\s.\\-]?"));
    const digits = ["1", "201", "483", "5474"].join("");
    const offenders = repoFiles.filter((f) => {
      if (
        f.startsWith(join("docs", "source")) ||
        f.startsWith(join("docs", "progress", "archive")) ||
        f.startsWith(join("docs", "plan", "archive")) ||
        f.endsWith("KABSI-PROGRESS.md")
      )
        return false;
      const text = readFileSync(f, "utf8");
      return old.test(text) || text.includes(`wa.me/${digits}`);
    });
    expect(offenders).toEqual([]);
  });

  it("keeps the messages short, plain and free of private details (K-58) and house-style slips", () => {
    for (const text of Object.values(WHATSAPP_MESSAGES)) {
      expect(text.length).toBeLessThanOrEqual(120);
      expect(text).not.toMatch(/[—–!@]|https?:|\d{5,}/);
      expect(text.startsWith("Hello Kabsi")).toBe(true);
    }
  });

  it("every placement that shows the number is guarded by the setting", () => {
    for (const file of [
      "src/components/kabsi/site-chrome.tsx",
      "src/components/kabsi/ui.tsx",
      "src/components/assistant/assistant-widget.tsx",
      "src/components/kabsi/d2-legal.tsx",
      "src/routes/terms.tsx",
      "src/routes/privacy.tsx",
      "src/routes/setup-call.tsx",
      "supabase/functions/assistant/index.ts",
    ]) {
      expect(readFileSync(file, "utf8"), file).toMatch(/WHATSAPP_ON/);
    }
    for (const f of repoFiles.filter((p) => /^src[\\/].*\.tsx?$/.test(p))) {
      const text = readFileSync(f, "utf8");
      if (/\{WHATSAPP_NUMBER\}|WHATSAPP_NUMBER\}/.test(text))
        expect(text, f).toMatch(/WHATSAPP_ON/);
    }
  });

  if (WHATSAPP_ON) {
    it("builds a wa.me link with the prefilled text for every placement", () => {
      for (const kind of kinds) {
        const url = new URL(whatsappHref(kind));
        expect(url.origin).toBe("https://wa.me");
        expect(url.pathname).toBe(`/${WHATSAPP_DIGITS}`);
        expect(url.searchParams.get("text")).toBe(WHATSAPP_MESSAGES[kind]);
      }
    });

    it("email footers carry the same number and a working wa.me link", () => {
      const url = new URL(WHATSAPP_URL ?? "");
      expect(url.pathname).toBe(`/${WHATSAPP_DIGITS}`);
      expect(url.searchParams.get("text")).toBe(WHATSAPP_MESSAGES.email);
      const { html, text } = renderEmail(
        { subject: "s", preheader: "p", title: "t", bodyHtml: "<p>x</p>", text: "x" },
        { appUrl: "https://kabsi.co", defaultWhy: "w" },
      );
      expect(html).toContain(`href="${(WHATSAPP_URL ?? "").replace(/&/g, "&amp;")}"`);
      expect(html).toContain(`WhatsApp ${WHATSAPP_NUMBER}`);
      expect(text).toContain(`WhatsApp ${WHATSAPP_NUMBER}`);
    });

    it("the facts file, the auth emails and the previews carry the number", () => {
      expect(readText("knowledge/kabsi-facts.md")).toContain(WHATSAPP_NUMBER);
      for (const f of readdirSync("emails/auth").filter((n) => n.endsWith(".html")))
        expect(readFileSync(join("emails/auth", f), "utf8")).toContain(`wa.me/${WHATSAPP_DIGITS}`);
    });
  } else {
    it("the WhatsApp link renders nothing", () => {
      for (const button of [false, true]) {
        const html = renderToStaticMarkup(
          createElement(WhatsappLink, { kind: "general", button }, "WhatsApp"),
        );
        expect(html).toBe("");
      }
    });

    it("emails carry no WhatsApp line or link, and hello@kabsi.co stays", () => {
      expect(WHATSAPP_URL).toBeNull();
      const { html, text } = renderEmail(
        { subject: "s", preheader: "p", title: "t", bodyHtml: "<p>x</p>", text: "x" },
        { appUrl: "https://kabsi.co", defaultWhy: "w" },
      );
      for (const out of [html, text]) {
        expect(out).not.toMatch(/WhatsApp|wa\.me/);
        expect(out).toContain("hello@kabsi.co");
      }
      const ack = noraAck();
      expect(ack.button?.url).toBe("mailto:hello@kabsi.co");
      expect(JSON.stringify(ack)).not.toMatch(/WhatsApp|wa\.me/);
    });

    it("the auth emails and the rendered previews have no WhatsApp line (rebuilt from the setting)", () => {
      for (const f of readdirSync("emails/auth").filter((n) => n.endsWith(".html"))) {
        const text = readFileSync(join("emails/auth", f), "utf8");
        expect(text, f).not.toMatch(/WhatsApp|wa\.me/);
        expect(text, f).toContain("hello@kabsi.co");
      }
      for (const f of readdirSync("docs/email-previews")) {
        const text = readFileSync(join("docs/email-previews", f), "utf8");
        // Kabsi's own number never appears; a staff "Send review link" wa.me/? without a number is not Kabsi's.
        expect(text, f).not.toMatch(/WhatsApp \+|Message us on WhatsApp|wa\.me\/\d/);
      }
    });

    it("the facts file and Nora's public copy say the number is in testing and give none", () => {
      for (const file of ["knowledge/kabsi-facts.md", "public/llms-full.txt"]) {
        const text = readText(file);
        // 13b part 2 (25 Oct 2026): Kabsi has a number; owners stay off until the launch gate, so none is given.
        expect(text).toContain("Kabsi has a WhatsApp number");
        expect(text).toContain("do not give the number yet");
        expect(text).not.toMatch(/wa\.me\/\d|WhatsApp \*\*\+|WhatsApp \+\d/);
      }
    });
  }

  it("shows no Lebanese number anywhere (K-123, P0.8-01)", () => {
    const offenders: string[] = [];
    const scan = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) scan(path);
        else if (/\.(tsx?|html|txt)$/.test(name) && !path.endsWith("routeTree.gen.ts")) {
          const text = readFileSync(path, "utf8");
          if (
            /LEBANON_PHONE|\+961|\+1 555 010 4477/.test(text) ||
            text.replace(/\D/g, "").includes("15550104477")
          )
            offenders.push(path);
        }
      }
    };
    scan("src");
    scan("public");
    expect(offenders).toEqual([]);
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
