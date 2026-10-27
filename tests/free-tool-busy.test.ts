// Lane R, 22 Oct 2026: when places_daily_cap is 0 or used up, the free tools (the Google Profile Check and the review
// link tool) say one calm sentence with the free trial as the button, never "Join early access". The server limits are
// unchanged: this only covers what the visitor reads.
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: unknown }) =>
    createElement("a", { href: to }, children as never),
}));

import { FreeToolBusy } from "../src/components/shared/free-tool-busy";
import { CTA_PRIMARY, CTA_TRIAL, FREE_TOOL_BUSY } from "../src/lib/site";
import { FREE_TOOL_BUSY as SERVER_SENTENCE } from "../supabase/functions/_shared/free-tool-busy";
import { readText } from "./helpers/facts";

describe("the free tools when the day's cap is 0 or used up", () => {
  it("say the sentence and offer the free trial as the button, never Join early access", () => {
    expect(FREE_TOOL_BUSY).toBe(
      "The free check is busy today. Try again tomorrow, or start your free trial.",
    );
    expect(SERVER_SENTENCE).toBe(FREE_TOOL_BUSY);
    expect(CTA_TRIAL).toBe("Start your free trial");
    const html = renderToStaticMarkup(createElement(FreeToolBusy));
    expect(html).toContain(FREE_TOOL_BUSY);
    expect(html).toMatch(/<a href="\/start"[^>]*>Start your free trial<\/a>/);
    expect(html).not.toContain(CTA_PRIMARY);
    expect(html).not.toMatch(/early access|Join/i);
    expect((html.match(/<a /g) ?? []).length).toBe(1);
    expect(`${FREE_TOOL_BUSY} ${CTA_TRIAL}`).not.toMatch(/[–—!]/);
  });

  it("are used by the Profile Check and by the review link tool, which no longer show the old wording", () => {
    const finder = readFileSync("src/components/profile-check/business-finder.tsx", "utf8");
    expect(finder).toContain("<FreeToolBusy />");
    expect(finder).not.toMatch(/CTA_PRIMARY|Join early access|Back soon/);
    // Web 2: the review link tool is the design studio's (d2-tools.tsx); it shows the same sentence and the trial button.
    const tool = readFileSync("src/components/kabsi/d2-tools.tsx", "utf8");
    expect(tool).toContain("{FREE_TOOL_BUSY}");
    expect(tool).toContain("{CTA_TRIAL}");
    expect(tool).toMatch(/FREE_TOOL_BUSY_CODES/);
    expect(tool).not.toMatch(/CTA_PRIMARY|Join early access|Back soon/);
  });

  it("is what both Edge Functions answer when the cap is reached, with the limits unchanged", () => {
    const check = readFileSync("supabase/functions/_shared/profile-snapshot.ts", "utf8");
    // Search, and the live read shared by the check, its email and its WhatsApp copy (nothing cached, 30.10).
    expect(check.match(/fail\("back_soon", FREE_TOOL_BUSY, 503\)/g)).toHaveLength(3);
    expect(check).toMatch(/LIMITS/);
    const link = readFileSync("supabase/functions/review-link/index.ts", "utf8");
    expect(link).toContain('fail("back_soon", FREE_TOOL_BUSY, 503)');
    expect(link).toContain('fail("busy", FREE_TOOL_BUSY, 429)');
    // The same limits as before: 10 a minute, 20 an hour, 400 a day; since Sec 1 each fails closed.
    expect(link).toContain("10, 60, { failClosed: true })");
    expect(link).toContain("20, 3600, { failClosed: true })");
    expect(link).toContain('"review-link:all", 400, 86400, { failClosed: true })');
  });

  it("is in the facts file and in llms-full.txt", () => {
    for (const f of ["knowledge/kabsi-facts.md", "public/llms-full.txt"]) {
      const text = readText(f);
      expect(text).toContain(FREE_TOOL_BUSY);
      expect(text).toContain("**Start your free trial**");
    }
  });
});
