// FIX-4: Meta caps an interactive reply button title at 20 characters (Kapso answers "buttons.0.title: Too big").
// This reads every WhatsApp message builder under supabase/functions and fails when any button title is over 20.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SIGNIN_SAY } from "../supabase/functions/_shared/wa-signin.ts";
import { CARDS_SAY } from "../supabase/functions/_shared/whatsapp/cards.ts";
import { PARTNERS_SAY } from "../supabase/functions/_shared/whatsapp/partners.ts";

const MAX = 20;
const ROOT = join(__dirname, "../supabase/functions");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return files(p);
    return /\.ts$/.test(n) &&
      !/\.test(-helpers)?\.ts$|\.test-helpers\.ts$|\.matrix\.ts$/.test(n) &&
      n !== "catalog.ts"
      ? [p]
      : [];
  });
}

describe("WhatsApp reply button titles", () => {
  it("every literal button title in the builders is at most 20 characters", () => {
    const re =
      /\{\s*id:\s*(?:`[^`]*`|"[^"]*"|'[^']*'|[\w.]+)\s*,\s*title:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
    const bad: string[] = [];
    let seen = 0;
    for (const f of files(ROOT)) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(re)) {
        const t = (m[1] ?? m[2]).replace(/\\(.)/g, "$1");
        seen++;
        if (t.length > MAX) bad.push(`${f.replace(ROOT, "")}: "${t}" (${t.length})`);
      }
    }
    expect(seen).toBeGreaterThan(15);
    expect(bad).toEqual([]);
  });

  it("every named button title constant is at most 20 characters", () => {
    const titles = [
      SIGNIN_SAY.yesButton,
      SIGNIN_SAY.signOutButton,
      CARDS_SAY.yesButton,
      PARTNERS_SAY.payoutYes,
      PARTNERS_SAY.approveButton("ABCDEFGHIJKLMNOP"),
    ];
    for (const t of titles) expect(t.length, t).toBeLessThanOrEqual(MAX);
  });
});
