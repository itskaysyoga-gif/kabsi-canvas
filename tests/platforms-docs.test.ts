// P0.6-08 (K-87, K-118): the secrets list holds every secret the code reads, by name only, and the platform check holds
// no value. A new secret read by a function fails this test until it is listed in docs/SECRETS.md (Ops 1 part B merged
// the old docs/secrets-inventory.md into it).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const inventory = readFileSync("docs/SECRETS.md", "utf8");
const platforms = readFileSync("docs/platforms.md", "utf8");

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(ts|js)$/.test(name) && !/\.test\.ts$/.test(name)) out.push(p);
  }
  return out;
}

describe("the secrets list (docs/SECRETS.md)", () => {
  it("lists every name the Edge Functions and the Worker read from the environment", () => {
    const names = new Set<string>();
    for (const f of [...files("supabase/functions"), ...files("workers/kabsi-go/src")]) {
      for (const m of readFileSync(f, "utf8").matchAll(
        /(?:Deno\.env\.get|env\.)\(?["']?([A-Za-z_][A-Za-z_0-9]+)["']?\)?/g,
      )) {
        const n = m[1]!;
        if (/^[A-Z][A-Z0-9_]{3,}$/.test(n) || n === "Anthropic_Api") names.add(n);
      }
    }
    // Bindings and variables of the Worker that are not secrets, and names Supabase sets itself.
    for (const skip of ["STICKERS", "APP_ORIGIN", "TAP_FUNCTION_URL", "DENO_DEPLOYMENT_ID"])
      names.delete(skip);
    expect(names.size).toBeGreaterThan(10);
    const missing = [...names].filter((n) => !inventory.includes(n));
    expect(missing).toEqual([]);
  });

  it("holds names, never values", () => {
    for (const text of [inventory, platforms]) {
      expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/); // a JWT
      expect(text).not.toMatch(
        /\b(sk|re|whsec|xoxb|xoxp|phx|sntrys|sntryu|ghp|github_pat)_[A-Za-z0-9]{12,}/,
      );
      expect(text).not.toMatch(/AIza[0-9A-Za-z_-]{20,}/);
      expect(text).not.toMatch(/[0-9a-f]{40,}/);
    }
  });

  it("gives every row what it opens, a place it lives, who uses it, a rotation and a date", () => {
    const rows = inventory.split("\n").filter((l) => l.startsWith("| `") || l.startsWith("| Cron"));
    expect(rows.length).toBeGreaterThan(40);
    for (const r of rows) expect(r.split("|").filter((c) => c.trim()).length, r).toBe(6);
  });

  it("names the planned and the backup secrets", () => {
    for (const n of [
      "DATAFORSEO_LOGIN",
      "DATAFORSEO_PASSWORD",
      "GEMINI_API_KEY",
      "GEOAPIFY_API_KEY",
      "META_PIXEL_ID",
      "META_CAPI_TOKEN",
      "VITE_META_PIXEL_ID",
      "ELEVENLABS_API_KEY",
      "BACKUP_PASSPHRASE",
      "SUPABASE_DB_URL",
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "SENTRY_AUTH_TOKEN",
    ])
      expect(inventory, n).toContain(`\`${n}\``);
  });

  it("uses no em dashes, en dashes or exclamation marks", () => {
    for (const text of [inventory, platforms]) {
      expect(text).not.toMatch(/[—–]/);
      expect(text).not.toMatch(/!/);
    }
  });

  it("keeps the personal address out of the platform check", () => {
    expect(platforms).not.toMatch(/@gmail\.com|@hotmail\.|@yahoo\./i);
    expect(inventory).not.toMatch(/@gmail\.com|@hotmail\.|@yahoo\./i);
  });
});
