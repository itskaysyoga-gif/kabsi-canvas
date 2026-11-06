// Launch 1 (master plan 30.35 item 4, docs/COPY.md 61 part B): the emailed and WhatsApp report use the result page's own
// words from the one shared module (scan-words.ts). Each part is checked present and absent.
import { describe, expect, it } from "vitest";
import {
  buildSnapshot,
  checkEmail,
  whatsappParams,
} from "../supabase/functions/_shared/profile-snapshot.ts";
import type { ReportParts } from "../supabase/functions/_shared/visibility/report.ts";
import { AI_QUESTION, aiAskedLines, aiVerdict, nearbyCount, nearbyLead } from "@/lib/scan-words";

const esc = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const snap = buildSnapshot(
  "ChIJ_test",
  { id: "ChIJ_test", displayName: { text: "SEVEN Burgers" }, formattedAddress: "Boqaata, Lebanon" },
  true,
);
const ranks = [2, 4, 4, 5, 9, null, 4, 3, 4];
const LEAD = nearbyLead("fast food restaurant", 4);
const COUNT = nearbyCount(5, 49, ranks);
const AI = {
  named: false,
  line: "ChatGPT did not name you. It named Burger One and Grill Two, which Google Maps shows near you.",
  named_other: 0,
  question: "best fast food restaurant in Boqaata, Lebanon",
  model: "gpt-4.1-mini-2025-04-14",
  asked_at: "2026-11-05T09:00:00.000Z",
};
const AI_LINES = [AI_QUESTION, aiVerdict(AI).line, ...aiAskedLines(AI)];
const LINK = "https://kabsi.co/scan/CFE4RMDN";
const full: ReportParts = { nearby: [LEAD, COUNT], ai: AI_LINES, link: LINK };

describe("Launch 1: the report reads like the result page", () => {
  it("the shared words are the page's lines", () => {
    expect(LEAD).toBe(
      "When someone searches for 'fast food restaurant' near you, you appear 4th in this Google Maps check.",
    );
    expect(COUNT).toBe(
      "You appeared in the first three at 5 of 49 points around you. Most places put you 4th.",
    );
    expect(AI_LINES).toEqual([
      "Did ChatGPT name your business?",
      "No. It named Burger One and Grill Two, which Google Maps shows near you.",
      "Question: 'best fast food restaurant in Boqaata, Lebanon'",
      "Model: ChatGPT (gpt-4.1-mini)",
      "Asked on 5 November 2026",
    ]);
  });

  it("email: every part present, in order, with the question as the AI part's heading and the link", () => {
    const m = checkEmail({ esc, appUrl: "https://kabsi.co" }, snap, false, full);
    const order = [LEAD, COUNT, ...AI_LINES, LINK].map((l) => m.text.indexOf(l));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(m.bodyHtml).toContain(`<strong>${AI_QUESTION}</strong>`);
    expect(m.bodyHtml).toContain(`href="${LINK}"`);
    expect(m.text).not.toContain("An answer customers might see");
    expect(m.text + m.bodyHtml).not.toMatch(/[–—!]/);
  });

  it("email: a part the check does not hold is left out, the rest stays", () => {
    const noAi = checkEmail({ esc, appUrl: "https://kabsi.co" }, snap, false, { ...full, ai: [] });
    expect(noAi.text).toContain(LEAD);
    expect(noAi.text).not.toContain(AI_QUESTION);
    expect(noAi.text).toContain(LINK);
    const noNearby = checkEmail({ esc, appUrl: "https://kabsi.co" }, snap, false, {
      ...full,
      nearby: [],
    });
    expect(noNearby.text).not.toContain("Where you come up nearby");
    expect(noNearby.text).not.toContain("in this Google Maps check");
    expect(noNearby.text).toContain(AI_QUESTION);
    const unfinished = checkEmail({ esc, appUrl: "https://kabsi.co" }, snap, false, null);
    expect(unfinished.text).toContain(
      "The nearby search and the AI answer were not part of this check.",
    );
    expect(unfinished.text).not.toContain("/scan/");
    const noCode = checkEmail({ esc, appUrl: "https://kabsi.co" }, snap, false);
    expect(noCode.text).not.toContain("were not part of this check");
    expect(noCode.text).not.toContain(AI_QUESTION);
  });

  it("WhatsApp: the approved template's two parameters, one line each, every part present within 900 characters", () => {
    const [name, body] = whatsappParams(snap, full);
    expect(name).toBe("SEVEN Burgers");
    expect(body).not.toMatch(/\n/);
    expect(body.length).toBeLessThanOrEqual(900);
    expect(body).toContain(`${LEAD} ${COUNT} ${AI_QUESTION} ${aiVerdict(AI).line}`);
    expect(body).toContain(
      "Question: 'best fast food restaurant in Boqaata, Lebanon'. Model: ChatGPT (gpt-4.1-mini). Asked on 5 November 2026. kabsi.co/scan/CFE4RMDN",
    );
    expect(body.endsWith("kabsi.co/scan/CFE4RMDN")).toBe(true);
  });

  it("WhatsApp: absent parts are left out; a check that never finished says so; no code adds nothing", () => {
    const [, noAi] = whatsappParams(snap, { ...full, ai: [] });
    expect(noAi).toContain(COUNT);
    expect(noAi).not.toContain(AI_QUESTION);
    const [, noNearby] = whatsappParams(snap, { ...full, nearby: [] });
    expect(noNearby).not.toContain("in this Google Maps check");
    expect(noNearby).toContain(AI_QUESTION);
    expect(whatsappParams(snap, "none")[1].endsWith("were not part of this check.")).toBe(true);
    expect(whatsappParams(snap)[1]).not.toContain("kabsi.co/scan/");
  });

  it("WhatsApp: a long profile line is cut first, then the question, so the answer and the link always fit", () => {
    const long = {
      ...snap,
      flags: Array.from({ length: 40 }, (_, i) => ({
        tone: "warning" as const,
        fact: `A long fact number ${i} that keeps going for a while.`,
        action: "x",
      })),
    };
    const [, p] = whatsappParams(long, full);
    expect(p.length).toBeLessThanOrEqual(900);
    expect(p.endsWith("kabsi.co/scan/CFE4RMDN")).toBe(true);
    expect(p).toContain(COUNT);
    const huge = {
      ...full,
      ai: [
        AI_QUESTION,
        aiVerdict(AI).line,
        `Question: '${"q".repeat(800)}'`,
        "Model: ChatGPT (gpt-4.1-mini)",
      ],
    };
    const [, q] = whatsappParams(long, huge);
    expect(q.length).toBeLessThanOrEqual(900);
    expect(q).not.toContain("Question: ");
    expect(q).toContain(aiVerdict(AI).line);
    expect(q.endsWith("kabsi.co/scan/CFE4RMDN")).toBe(true);
  });
});
