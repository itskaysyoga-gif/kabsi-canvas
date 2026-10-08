import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs script without types
import { checkEnv } from "../scripts/check-env.mjs";

const good = { VITE_SUPABASE_URL: "https://x.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "k" };

describe("checkEnv", () => {
  it("passes when both required names are set", () => {
    expect(checkEnv(good)).toEqual([]);
  });

  it("names every missing or empty variable and never a value", () => {
    const problems = checkEnv({ VITE_SUPABASE_URL: " " });
    expect(problems).toEqual([
      "VITE_SUPABASE_URL is missing",
      "VITE_SUPABASE_PUBLISHABLE_KEY is missing",
    ]);
  });

  it("refuses a server secret under a browser-visible name", () => {
    const problems = checkEnv({ ...good, VITE_SUPABASE_SERVICE_ROLE_KEY: "s" });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("VITE_SUPABASE_SERVICE_ROLE_KEY");
    expect(problems[0]).not.toContain("=");
  });
});
