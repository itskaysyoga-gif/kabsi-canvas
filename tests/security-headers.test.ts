// P0.6-05 (G-15, G-16): security headers on every kabsi.co response, the content policy in report-only mode, no caching
// of app pages or API answers, and the abuse checks on the public endpoints.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Rule = { source: string; headers: { key: string; value: string }[]; has?: unknown };
const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { headers: Rule[] };
const all = vercel.headers.find((h) => h.source === "/(.*)" && !h.has);
const header = (k: string) => all?.headers.find((h) => h.key === k)?.value ?? "";

describe("security headers", () => {
  it("sends HSTS, nosniff, the referrer policy and the permissions policy on every path", () => {
    expect(header("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
    expect(header("X-Content-Type-Options")).toBe("nosniff");
    expect(header("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(header("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
  });

  it("keeps the content policy in report-only mode, with frame-ancestors none and reports to Sentry", () => {
    const csp = header("Content-Security-Policy-Report-Only");
    expect(header("Content-Security-Policy")).toBe("");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain(
      "report-uri https://o4512003528720384.ingest.de.sentry.io/api/4512145411801168/security/",
    );
    for (const host of [
      "https://ynjdqjlmdwjgbfezevxy.supabase.co",
      "wss://ynjdqjlmdwjgbfezevxy.supabase.co",
      "https://challenges.cloudflare.com",
      "https://connect.facebook.net",
      "https://*.ingest.de.sentry.io",
    ])
      expect(csp).toContain(host);
    expect(csp).not.toMatch(/[–—]/);
  });

  it("never lets app pages or API answers be cached", () => {
    for (const source of ["/app/:path*", "/staff/:path*", "/login", "/a/:path*", "/api/:path*"]) {
      const rule = vercel.headers.find(
        (h) => h.source === source && h.headers.some((x) => x.key === "Cache-Control"),
      );
      expect(rule?.headers.find((x) => x.key === "Cache-Control")?.value, source).toBe("no-store");
    }
  });
});

describe("abuse checks on public endpoints", () => {
  const read = (p: string) => readFileSync(p, "utf8");

  it("the review link tool allows 10 requests a minute per IP before anything else", () => {
    const src = read("supabase/functions/review-link/index.ts");
    expect(src).toMatch(/rateLimit\(`review-link:min:\$\{visitor\}`, 10, 60\)/);
    expect(src.indexOf("review-link:min:")).toBeLessThan(src.indexOf("verifyTurnstile(turnstile"));
  });

  it("the Profile Check keeps 10 a minute, checked before Turnstile", async () => {
    const { LIMITS } = await import("../supabase/functions/_shared/profile-snapshot");
    expect(LIMITS.perMinute).toBe(10);
    const src = read("supabase/functions/_shared/profile-snapshot.ts");
    expect(src.indexOf("snapshot:min:")).toBeLessThan(src.indexOf("d.verifyTurnstile("));
  });

  it("Nora asks a visitor who is not signed in for Turnstile before a new conversation", () => {
    const src = read("supabase/functions/assistant/index.ts");
    expect(src).toMatch(/if \(!user && !\(await verifyTurnstile\(/);
    expect(read("src/components/assistant/assistant-widget.tsx")).toContain("<Turnstile");
  });

  it("sign-up, login, both free tools and the contact form check Turnstile on the server", () => {
    expect(read("supabase/functions/_shared/auth-code.ts")).toContain("d.verifyTurnstile(");
    expect(read("supabase/functions/_shared/profile-snapshot.ts")).toContain("d.verifyTurnstile(");
    expect(read("supabase/functions/review-link/index.ts")).toContain("verifyTurnstile(turnstile");
    expect(read("supabase/functions/lead/index.ts")).toContain("verifyTurnstile(b.turnstile");
  });
});
