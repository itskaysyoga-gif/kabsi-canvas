import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FONT, SIZES, TOKENS } from "../supabase/functions/_shared/email/tokens";

// P0.4-08: the email template reads the design tokens (K-102, K-108). The values in the email are copies of the ones in
// src/styles.css, because an email cannot read a stylesheet; this keeps them equal.
const css = readFileSync(join(__dirname, "..", "src", "styles.css"), "utf8");
const token = (name: string) =>
  css.match(new RegExp(`--color-kb-${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]?.toUpperCase();

describe("email tokens", () => {
  it("equal the design tokens", () => {
    expect(TOKENS.yellow).toBe(token("yellow"));
    expect(TOKENS.black).toBe(token("black"));
    expect(TOKENS.ink).toBe(token("ink"));
    expect(TOKENS.white).toBe(token("white"));
    expect(TOKENS.sand).toBe(token("sand"));
    expect(TOKENS.stone).toBe(token("stone"));
    expect(TOKENS.hairline).toBe(token("hairline"));
  });

  it("use the brand font, 600 px, 16 px body and 44 px taps (K-102)", () => {
    expect(FONT.startsWith("'Readex Pro'")).toBe(true);
    expect(SIZES).toEqual({ width: 600, body: 16, tap: 44 });
  });
});
