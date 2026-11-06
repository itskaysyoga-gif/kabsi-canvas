// Launch 2 part C (master plan 30.36 item 8): one door to sign-up.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { startFreeDoor, startFreeHref } from "@/lib/start-free";

describe("Start free goes through sign-in to /start", () => {
  it("a visitor (or an account not read yet) goes to sign in, then /start", () => {
    expect(startFreeHref(startFreeDoor("out", null))).toBe("/login?next=/start");
    expect(startFreeHref(startFreeDoor("unknown", null))).toBe("/login?next=/start");
  });
  it("a signed-in owner without a business goes to /start, one with a business to /app", () => {
    expect(startFreeHref(startFreeDoor("in", 0))).toBe("/start");
    expect(startFreeHref(startFreeDoor("in", 2))).toBe("/app");
    expect(startFreeHref(startFreeDoor("in", null))).toBe("/app");
  });
  it("Pricing and the guides use it, /get-started is a 301 to /scan and its route is gone", () => {
    expect(readFileSync("src/components/kabsi/d8-pricing.tsx", "utf8")).toContain("useStartFree()");
    expect(readFileSync("src/components/marketing/guide-article.tsx", "utf8")).toContain(
      "useStartFree()",
    );
    const v = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      redirects: {
        source: string;
        destination: string;
        statusCode?: number;
        permanent?: boolean;
      }[];
    };
    expect(v.redirects).toContainEqual({
      source: "/get-started",
      destination: "/scan",
      statusCode: 301,
    });
    expect(() => readFileSync("src/routes/get-started.tsx")).toThrow();
    expect(readFileSync("src/routeTree.gen.ts", "utf8")).not.toContain("get-started");
  });
});
