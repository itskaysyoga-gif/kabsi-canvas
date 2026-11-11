// Polish 3 (lane R's decisions of 3 Nov 2026): the free check result's order. Go live 1 (5 Nov 2026, master plan 30.28)
// removed the one switch for the At launch labels (NEARBY_ON) and the WhatsApp launch line: the nearby check and the AI
// answer are open, and no public line says At launch or opens at launch.
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CheckLooksAtVisual } from "@/components/kabsi/d4-free-check";
import { JOBS } from "@/components/kabsi/d8-data";
import {
  buildFaq,
  buildFaqGroups,
  FAQ,
  FAQ_GROUPS,
  NEARBY_FAQ_A,
  WHATSAPP_APPROVE_Q,
  whatsappApproveAnswer,
} from "@/components/kabsi/faq-data";
import { ResultPreview } from "@/components/kabsi/result-preview";
import * as site from "@/lib/site";

const LAUNCH = /At launch|opens at launch|from launch/i;
const WA_OFF = "You approve on kabsi.co or from the email.";
const allFaqText = (whatsappOn: boolean) =>
  JSON.stringify([buildFaq(), buildFaqGroups(whatsappOn)]);

describe("Go live 1: no At launch label and no launch line (master plan 30.28)", () => {
  it("has no NEARBY_ON and no WHATSAPP_LAUNCH_LINE any more; WhatsApp is on and the defaults follow it", () => {
    expect("NEARBY_ON" in site).toBe(false);
    expect("WHATSAPP_LAUNCH_LINE" in site).toBe(false);
    expect(site.WHATSAPP_ON).toBe(true);
    expect(FAQ).toEqual(buildFaq());
    expect(FAQ_GROUPS).toEqual(buildFaqGroups(site.WHATSAPP_ON));
  });
  it("keeps the two Home jobs about the nearby check and AI answers, with no label", () => {
    const titles = JOBS.map((j) => j.title);
    expect(titles).toContain("See where you show up nearby");
    expect(titles).toContain("Know what AI assistants say");
    expect(JOBS.every((j) => Object.keys(j).sort().join() === "text,title")).toBe(true);
  });
  it("shows the Example result and the free check page's list with no label", () => {
    const ex = renderToStaticMarkup(createElement(ResultPreview, {}));
    expect(ex).toContain("An answer customers might see");
    expect(ex).not.toMatch(LAUNCH);
    const list = renderToStaticMarkup(createElement(CheckLooksAtVisual));
    expect(list).toContain("What ChatGPT says");
    expect(list).not.toMatch(LAUNCH);
  });
  it("ends the FAQ's nearby answer at what you can do next", () => {
    expect(NEARBY_FAQ_A).toBe(
      "No one can promise that. Kabsi shows what changed on your profile and what you can do next.",
    );
    for (const whatsappOn of [false, true]) expect(allFaqText(whatsappOn)).not.toMatch(LAUNCH);
  });
  it("leaves the free check without labels and says when Kabsi Partners opens", () => {
    const scan = readFileSync("src/components/kabsi/scan-live.tsx", "utf8");
    expect(scan).not.toContain("NEARBY_ON");
    expect(scan).not.toMatch(LAUNCH);
    const partners = readFileSync("src/components/kabsi/d2-partners.tsx", "utf8");
    // Partners 3 (30.50 item 7): the page says it once, as the launch day line under the hero button.
    expect(partners).toContain("Partner links start paying on launch day.");
    expect(partners).not.toMatch(LAUNCH);
  });
});

describe("Polish 3: the WhatsApp approval answer follows WHATSAPP_ON (decision 3)", () => {
  const find = (groups: ReturnType<typeof buildFaqGroups>) =>
    groups.flatMap((g) => g.items).find((i) => i.q === WHATSAPP_APPROVE_Q);
  it("says approvals are on kabsi.co with no number, and the one written from the facts with it", () => {
    expect(whatsappApproveAnswer(false)).toBe(WA_OFF);
    const on = whatsappApproveAnswer(true);
    expect(on).toMatch(/on WhatsApp/);
    expect(on).toMatch(/nothing goes live on Google until you say yes/);
    expect(on).not.toMatch(/opens at launch|Not yet/);
    expect(find(buildFaqGroups(false))?.a).toBe(WA_OFF);
    expect(find(buildFaqGroups(true))?.a).toBe(on);
  });
  it("keeps the house rules in every answer, with the number set or not", () => {
    for (const whatsappOn of [false, true]) {
      const text = allFaqText(whatsappOn);
      expect(text).not.toMatch(LAUNCH);
      expect(text).not.toMatch(/[–—!]/);
      expect(text).not.toMatch(/[؀-ۿ]/);
    }
  });
});

describe("Polish 3: the free check result's order (decision 1)", () => {
  const src = readFileSync("src/components/kabsi/scan-live.tsx", "utf8");
  const live = src.slice(src.indexOf("export function LiveResult"));
  const at = (s: string) => {
    const i = live.indexOf(s);
    expect(i, s).toBeGreaterThan(-1);
    return i;
  };
  // Scan 3 (master plan 30.34 item 2) replaced Polish 3's order with a progressive result: the business, one main finding,
  // what Kabsi would do in three lines, the details on request, then the one trial button, Manager access and the report.
  it("Scan 3: the business, the main finding, what Kabsi would do, the details on request, then the trial, access and the report", () => {
    const order = [
      "<ResultHead",
      "<MainFindingCard",
      "<WouldDoCard",
      'id="google"',
      'id="nearby"',
      'id="ai"',
      "<TrialCard",
      "<AccessCard />",
      "<SendReport",
    ].map(at);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    // One primary button in the result: the trial.
    expect(
      live.slice(0, live.indexOf("/* ---------- Save my place")).match(/buttonClass\("primary"\)/g),
    ).toBeNull();
    expect(src.match(/\{TRIAL_BUTTON\}/g)?.length).toBe(1);
  });
  it("keeps every analytics and Meta event with the same name and trigger", () => {
    const events = [...src.matchAll(/(track|pixelEvent|pixelCustom)\(\s*"([^"]+)"[^)]*\)/g)].map(
      (m) => `${m[1]}:${m[2]}`,
    );
    expect(events.sort()).toEqual(
      [
        "pixelCustom:FreeScanStarted",
        // Scan 2 (30.29): a finished check is FreeScanCompleted; Lead fires when the report is sent.
        "pixelCustom:FreeScanCompleted",
        "pixelEvent:Lead",
        "track:free_scan_completed",
        "track:free_scan_started",
        "track:free_tool_used",
        "track:free_tool_used",
        "track:signup_started",
      ].sort(),
    );
  });
});
