import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FONT,
  HEAD_FONT,
  SIZES,
  TOKEN_CSS,
  TOKENS,
} from "../supabase/functions/_shared/email/tokens";
import {
  BRAND_LINE as EMAIL_BRAND_LINE,
  NOT_AFFILIATED as EMAIL_NOT_AFFILIATED,
} from "../supabase/functions/_shared/email/template";
import { BRAND_LINE, NOT_AFFILIATED } from "../src/lib/site";

// P0.4-08: the email template reads the design tokens (K-102, K-108). The values in the email are copies of the ones in
// src/styles.css (the brand constants), because an email cannot read a stylesheet; this keeps them equal.
const css = readFileSync(join(__dirname, "..", "src", "styles.css"), "utf8");
const token = (name: string) =>
  css.match(new RegExp(`--kb-${name}:\\s*(#[0-9a-fA-F]{6});`))?.[1]?.toUpperCase();

describe("email tokens", () => {
  it("equal the design tokens", () => {
    for (const [key, name] of Object.entries(TOKEN_CSS)) {
      expect(TOKENS[key as keyof typeof TOKENS], name).toBe(token(name));
    }
  });

  it("Bricolage Grotesque headings with system fallbacks, 600 px, 16 px body and 44 px taps (K-102, 30.18)", () => {
    expect(HEAD_FONT.startsWith("'Bricolage Grotesque',")).toBe(true);
    expect(FONT).toMatch(/^-apple-system,/);
    expect(SIZES).toEqual({ width: 600, body: 16, tap: 44 });
  });

  it("the footer lines equal the website's (COPY.md 25)", () => {
    expect(EMAIL_BRAND_LINE).toBe(BRAND_LINE);
    expect(EMAIL_NOT_AFFILIATED).toBe(NOT_AFFILIATED);
  });
});
