// Fix 5 (R-158 item 2, item 4): the WhatsApp messaging provider's name leaves every public surface. Public pages,
// the llms files, the public facts, Nora's public knowledge and every email name the category instead: "our WhatsApp
// messaging provider, which carries messages over Meta's WhatsApp Business Platform". Internal docs, code that never
// reaches a page (supabase/functions outside the email words) and knowledge/internal/ keep the name.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string, ok: (f: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p, ok) : ok(p) ? [p] : [];
  });
}

const SURFACES = [
  // Every route and component a page is made of (public pages, the account and the sign-in panel).
  ...walk("src/routes", (f) => /\.tsx?$/.test(f)),
  ...walk("src/components", (f) => /\.tsx?$/.test(f)),
  ...walk("src/content", () => true),
  // The consent words and site constants shown on pages.
  "src/lib/whatsapp-owner.ts",
  "src/lib/wa-signin.ts",
  "supabase/functions/_shared/wa-signin.ts",
  // The llms files, the built facts (Nora's public knowledge) and the numbered public facts.
  ...walk("public", (f) => /\.(txt|xml|html|json)$/.test(f)),
  "knowledge/kabsi-facts.md",
  ...walk("knowledge/facts", (f) => f.endsWith(".md")),
  // Every email: the words, the auth templates and the previews.
  ...walk("supabase/functions/_shared/email", (f) => f.endsWith(".ts") && !f.endsWith(".test.ts")),
  ...walk("emails", (f) => /\.(html|txt)$/.test(f)),
  ...walk("docs/email-previews", (f) => /\.(html|txt)$/.test(f)),
];

describe("the WhatsApp provider's name is on no public surface", () => {
  it("covers the surfaces", () => {
    for (const f of [
      "src/routes/privacy.tsx",
      "src/routes/terms.tsx",
      "src/components/kabsi/d8-about.tsx",
      "public/llms-full.txt",
      "knowledge/facts/11-privacy-security-and-data.md",
    ])
      expect(SURFACES).toContain(f);
  });
  it.each(SURFACES)("%s", (f) => {
    expect(readFileSync(f, "utf8")).not.toMatch(/kapso/i);
  });
  it("privacy and terms name the category instead", () => {
    for (const f of ["src/routes/privacy.tsx", "src/routes/terms.tsx"]) {
      const t = readFileSync(f, "utf8").replace(/\s+/g, " ");
      expect(t).toContain(
        "Our WhatsApp messaging provider, which carries messages over Meta&apos;s WhatsApp Business Platform",
      );
    }
  });
});
