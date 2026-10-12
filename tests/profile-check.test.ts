import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHECK_PAGES,
  LIMITS,
  TIPS_CONSENT_TEXT as SERVER_CONSENT,
} from "../supabase/functions/_shared/profile-snapshot";

// P0.4-01: the free snapshot and Google Profile Check. The behaviour tests (field mask, the fourth check, the cache,
// the email proof) are the Deno tests in supabase/functions/_shared/profile-snapshot.test.ts and the pgTAP file
// supabase/tests/profile_check.sql; these hold the pieces that must stay equal across the browser, the function and SQL.
const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
// The client file imports through the "@" alias, which this runner does not resolve, so its constants are read as text.
const CLIENT_CONSENT = read("src/lib/profile-check.ts").match(/TIPS_CONSENT_TEXT = "([^"]+)"/)?.[1];

describe("Free Profile Check (P0.4-01)", () => {
  it("the words next to the tips box are the same in the browser and in the function that stores them", () => {
    expect(CLIENT_CONSENT).toBe(SERVER_CONSENT);
    expect(CLIENT_CONSENT).toBe("Send me tips on managing my Google profile");
  });

  it("the pages that may send an email request are the two screens that exist", () => {
    expect(CHECK_PAGES).toEqual(["/google-profile-check", "/get-started"]);
    for (const page of CHECK_PAGES) {
      const route = read(`src/routes/${page.slice(1)}.tsx`);
      expect(route).toContain(`createFileRoute("${page}")`);
    }
    expect(read("src/components/profile-check/snapshot-result.tsx")).toContain(
      '"/google-profile-check" | "/get-started"',
    );
  });

  it("the limits are the ones K-100 sets: 3 checks a day, 10 requests a minute", () => {
    expect(LIMITS.checksPerDay).toBe(3);
    expect(LIMITS.perMinute).toBe(10);
  });

  it("the function is registered with a JWT setting (D295)", () => {
    expect(read("supabase/config.toml")).toMatch(
      /\[functions\.profile-snapshot\][^\n]*\nverify_jwt = true/,
    );
  });

  it("the Places mask for the snapshot never names the reviews field", () => {
    const live = read("supabase/functions/_shared/google/places/live.ts");
    const mask = live.match(/SNAPSHOT_FIELD_MASK =\s*"([^"]+)"/)?.[1] ?? "";
    expect(mask.split(",")).toEqual(
      expect.arrayContaining([
        "rating",
        "userRatingCount",
        "regularOpeningHours",
        "currentOpeningHours",
        "nationalPhoneNumber",
        "websiteUri",
        "primaryTypeDisplayName",
        "photos",
      ]),
    );
    expect(mask.toLowerCase()).not.toContain("review");
    const fn =
      read("supabase/functions/_shared/profile-snapshot.ts") +
      read("supabase/functions/profile-snapshot/index.ts");
    expect(fn).not.toMatch(/googleapis\.com/);
    expect(fn).not.toMatch(/\breviews?\b[^\n]*field/i);
  });

  it("the migration keeps the consent proof and no Google content, and contains no removal statement", () => {
    const sql = read("supabase/migrations/20261012110000_profile_check.sql");
    for (const col of [
      "email",
      "place_id",
      "tips_opt_in",
      "consent_text",
      "consent_language",
      "page",
      "created_at",
    ]) {
      expect(sql).toContain(col);
    }
    expect(sql).not.toMatch(/delete|drop /i);
  });

  it("the three level labels are the ones in the card, and nothing on the screens says score or rank", () => {
    const labels = read("src/lib/profile-check.ts").match(/LEVEL_LABEL[^{]*\{([^}]*)\}/)?.[1] ?? "";
    expect(labels.replace(/\s+/g, " ").trim()).toBe(
      'urgent: "Urgent", recommended: "Recommended", nice: "Nice to have",',
    );
    for (const f of [
      "src/components/profile-check/snapshot-result.tsx",
      "src/components/profile-check/business-finder.tsx",
      "src/routes/google-profile-check.tsx",
      "src/routes/get-started.tsx",
    ]) {
      const text = read(f);
      expect(text, f).not.toMatch(/[\u2013\u2014]/);
      expect(text, f).not.toMatch(/\b(profile score|do now|listing shield|put mine back)\b/i);
    }
  });

  it("no new file has an em dash, an en dash or an exclamation mark in its text", () => {
    for (const f of [
      "supabase/functions/_shared/profile-snapshot.ts",
      "supabase/functions/profile-snapshot/index.ts",
      "src/lib/profile-check.ts",
      "src/components/profile-check/snapshot-result.tsx",
      "src/components/profile-check/business-finder.tsx",
      "src/routes/google-profile-check.tsx",
      "src/routes/get-started.tsx",
    ]) {
      const text = read(f);
      expect(text, f).not.toMatch(/[\u2013\u2014]/);
      // JavaScript's not operator and non-null assertion are fine; an exclamation mark after a word or a full stop is copy.
      expect(text.match(/[A-Za-z0-9"'.?]!(?=[\s"'`<]|$)/g) ?? [], f).toEqual([]);
    }
  });
});
