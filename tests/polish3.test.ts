// Polish 3 (lane R's decisions of 3 Nov 2026): the free check result's order, and one switch for the At launch labels.
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CheckLooksAtVisual } from "@/components/kabsi/d4-free-check";
import { jobs, JOBS } from "@/components/kabsi/d8-data";
import {
  buildFaq,
  buildFaqGroups,
  FAQ,
  FAQ_GROUPS,
  nearbyFaqAnswer,
  WHATSAPP_APPROVE_Q,
  whatsappApproveAnswer,
} from "@/components/kabsi/faq-data";
import { ResultPreview } from "@/components/kabsi/result-preview";
import { NEARBY_ON, WHATSAPP_ON } from "@/lib/site";

const NEARBY_SENTENCE = "Where you come up nearby opens at launch.";
const WA_OFF = "Not yet. WhatsApp opens at launch. Until then you approve on kabsi.co.";
const pills = (html: string) => (html.match(/At launch/g) ?? []).length;
const allFaqText = (nearbyOn: boolean, whatsappOn: boolean) =>
  JSON.stringify([buildFaq(nearbyOn), buildFaqGroups(whatsappOn, nearbyOn)]);

describe("Polish 3: NEARBY_ON, the one switch for the nearby check and the AI answer (decision 2)", () => {
  it("is false today, beside WHATSAPP_ON, and the defaults follow it", () => {
    expect(NEARBY_ON).toBe(false);
    expect(WHATSAPP_ON).toBe(true); // Go live 1 (5 Nov 2026)
    expect(JOBS).toEqual(jobs(NEARBY_ON));
    expect(FAQ).toEqual(buildFaq(NEARBY_ON));
    expect(FAQ_GROUPS).toEqual(buildFaqGroups(WHATSAPP_ON, NEARBY_ON));
  });
  it("labels the two Home jobs At launch while it is false, and neither once it is true", () => {
    const off = jobs(false).filter((j) => j.atLaunch);
    expect(off.map((j) => j.title)).toEqual([
      "See where you show up nearby",
      "Know what AI assistants say",
    ]);
    expect(jobs(true).some((j) => j.atLaunch)).toBe(false);
    // Nothing else about the jobs changes.
    expect(jobs(true).map((j) => [j.title, j.text])).toEqual(
      jobs(false).map((j) => [j.title, j.text]),
    );
  });
  it("shows the pill on the Example result while it is false, and not once it is true", () => {
    const off = renderToStaticMarkup(createElement(ResultPreview, { nearbyOn: false }));
    const on = renderToStaticMarkup(createElement(ResultPreview, { nearbyOn: true }));
    expect(pills(off)).toBe(1);
    expect(pills(on)).toBe(0);
    expect(on).toContain("An answer customers might see");
    expect(off.replace(/<span[^>]*>At launch<\/span>/, "")).toBe(on.replace(/ $/, ""));
  });
  it("shows the pill on the free check page's list while it is false, and not once it is true", () => {
    const off = renderToStaticMarkup(createElement(CheckLooksAtVisual, { nearbyOn: false }));
    const on = renderToStaticMarkup(createElement(CheckLooksAtVisual, { nearbyOn: true }));
    expect(pills(off)).toBe(1);
    expect(pills(on)).toBe(0);
    expect(on).toContain("What ChatGPT says");
  });
  it("says 'Where you come up nearby opens at launch.' in the FAQ only while it is false", () => {
    expect(nearbyFaqAnswer(false)).toBe(
      `No one can promise that. Kabsi shows what changed on your profile and what you can do next. ${NEARBY_SENTENCE}`,
    );
    expect(nearbyFaqAnswer(true)).toBe(
      "No one can promise that. Kabsi shows what changed on your profile and what you can do next.",
    );
    for (const whatsappOn of [false, true]) {
      expect(allFaqText(false, whatsappOn)).toContain(NEARBY_SENTENCE);
      expect(allFaqText(true, whatsappOn)).not.toContain(NEARBY_SENTENCE);
    }
  });
  it("leaves the live free check's waiting list and Kabsi Partners to their own lines", () => {
    const scan = readFileSync("src/components/kabsi/scan-live.tsx", "utf8");
    expect(scan).not.toContain("NEARBY_ON");
    expect(scan).toContain("waitlist && <Pill>At launch</Pill>");
    expect(readFileSync("src/components/kabsi/d2-partners.tsx", "utf8")).toContain(
      "Kabsi Partners opens at launch.",
    );
  });
});

describe("Polish 3: the WhatsApp approval answer follows WHATSAPP_ON (decision 3)", () => {
  const find = (groups: ReturnType<typeof buildFaqGroups>) =>
    groups.flatMap((g) => g.items).find((i) => i.q === WHATSAPP_APPROVE_Q);
  it("shows the old answer while it is false, and the one written from the facts once it is true", () => {
    expect(whatsappApproveAnswer(false)).toBe(WA_OFF);
    const on = whatsappApproveAnswer(true);
    expect(on).toMatch(/on WhatsApp/);
    expect(on).toMatch(/nothing goes live on Google until you say yes/);
    expect(on).not.toMatch(/opens at launch|Not yet/);
    for (const nearbyOn of [false, true]) {
      expect(find(buildFaqGroups(false, nearbyOn))?.a).toBe(WA_OFF);
      expect(find(buildFaqGroups(true, nearbyOn))?.a).toBe(on);
    }
  });
  it("keeps the other WhatsApp answers switching with it, and the house rules in every answer", () => {
    expect(allFaqText(false, false)).toContain("WhatsApp opens at launch");
    expect(allFaqText(false, true)).not.toContain("WhatsApp opens at launch");
    for (const nearbyOn of [false, true])
      for (const whatsappOn of [false, true]) {
        const text = allFaqText(nearbyOn, whatsappOn);
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
  it("puts the useful part first at every width: most important, found, day one with Start free, then the At launch cards, then the rest", () => {
    const order = [
      'aria-labelledby="first-h"',
      'aria-labelledby="found-h"',
      'aria-labelledby="day1-h"',
      "START_STEPS.map",
      "Or apply for Founding 25",
      "<AiAnswer ai={check.ai} />",
      'aria-labelledby="near-h"',
      "<SideLinks />",
      'Fold title="What Kabsi sees once connected"',
      'Fold title="When you start: add Kabsi on Google"',
      "<SendReport",
    ].map(at);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    // Start free is in the day one block, ahead of the At launch cards.
    expect(at(">\n                  Start free\n")).toBeLessThan(at("<AiAnswer"));
  });
  it("keeps every analytics and Meta event with the same name and trigger", () => {
    const events = [...src.matchAll(/(track|pixelEvent|pixelCustom)\(\s*"([^"]+)"[^)]*\)/g)].map(
      (m) => `${m[1]}:${m[2]}`,
    );
    expect(events.sort()).toEqual(
      [
        "pixelCustom:FreeScanStarted",
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
