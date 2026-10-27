import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { doIUseEmail } from "doiuse-email";

// Email 1 (master plan 30.18 section 3): the caniemail check (doiuse-email, caniemail.com's data) for Gmail, Outlook and
// Apple Mail on every email in docs/email-previews and the four Supabase Auth templates. What a reader needs is in inline
// styles; the <style> block (dark mode, the heading font, the phone tweaks) and Outlook's conditional comments (the VML
// button) are progressive enhancement, so the check reads the HTML without them. The features below are the known,
// harmless degradations: each one is allowed with its reason, and anything else fails.
const ALLOWED: Record<string, string> = {
  "<body> element": "Outlook's apps replace the body; the full-width table carries the page ground",
  "display:none": "the hidden preheader: shown as its short first line at worst",
  overflow: "the hidden preheader",
  opacity: "the hidden preheader",
  "role attribute": "role=presentation is ignored where unsupported",
  "aria-hidden attribute": "decorative marks only; ignored where unsupported",
  "border-radius": "square corners in Outlook on Windows; its button is the VML copy",
  "white-space": "quoted text wraps normally in Outlook on Windows",
};
const CLIENTS = ["gmail.*", "outlook.*", "apple-mail.*"];

const files = [
  ...readdirSync("docs/email-previews")
    .filter((f) => f.endsWith(".html") && f !== "index.html")
    .map((f) => `docs/email-previews/${f}`),
  ...readdirSync("emails/auth")
    .filter((f) => f.endsWith(".html"))
    .map((f) => `emails/auth/${f}`),
];

describe("caniemail: Gmail, Outlook and Apple Mail", () => {
  it("reads every email", () => {
    expect(files.length).toBeGreaterThanOrEqual(50);
  });
  for (const file of files) {
    it(file, () => {
      const base = readFileSync(file, "utf8")
        .replace(/<style>[\s\S]*?<\/style>/g, "")
        .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/g, "");
      const r = doIUseEmail(base, { emailClients: CLIENTS });
      const errors = (r.errors ?? []).filter((e) => {
        const feature = e.match(/^`([^`]+)`/)?.[1] ?? e;
        return !(feature in ALLOWED);
      });
      expect(errors, file).toEqual([]);
    });
  }
});
