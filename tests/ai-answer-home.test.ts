// AI Answers 1 (docs/COPY.md 37): an AI answer that gives a fact differently is one Needs attention line on Home, with
// the assistant's sentence, what to do and the label under it, and a button to the right screen.
import { describe, expect, it } from "vitest";
import { attentionLines, cardAction, homeState } from "../src/lib/home-state";
import type { Task } from "../src/lib/tasks";

const LABEL =
  "Answers we get from ChatGPT and Perplexity directly, which can differ from what their apps show.";
const task = (fact: string, path: string): Task => ({
  id: `t-${fact}`,
  kind: "ai_answer",
  priority: "recommended",
  title: "ChatGPT's answer gives a different closing time for your business",
  why: 'ChatGPT was asked "best hair salon in williamsburg" on 2 November. It said: "Rose Lane Salon is open Monday to Saturday from 9 am to 8 pm." Kabsi has: Monday 09:00 to 18:00.',
  recommendation: "Make sure your Google profile and website say this. AI assistants read them.",
  path,
  evidence: { fact, label: LABEL },
  created_at: "2026-11-02T09:00:00Z",
});

describe("AI answer on Home", () => {
  it("is a Needs attention line, never a draft to approve", () => {
    const t = task("hours", "/app/hours");
    const lines = attentionLines({
      tasks: [t],
      accessLost: false,
      setup: null,
      plan: null,
      owner: true,
    });
    expect(lines).toEqual([
      {
        key: "t-hours",
        text: t.title,
        action: { label: "Check your hours", to: "/app/hours" },
        detail: [t.why, t.recommendation, LABEL],
      },
    ]);
    expect(homeState([t]).kind).toBe("attention");
  });

  it("sends each fact to its screen", () => {
    expect(cardAction(task("phone", "/app/shield")).primary).toBe("Check your Google profile");
    expect(cardAction(task("services", "/app/knowledge")).primary).toBe(
      "Check your business details",
    );
    expect(cardAction(task("price", "/app/knowledge")).primary).toBe("Check your business details");
  });

  it("never promises a correction, and has no dashes or exclamation marks", () => {
    const t = task("hours", "/app/hours");
    for (const s of [t.title, t.why, t.recommendation ?? "", LABEL]) {
      expect(s).not.toMatch(/[–—!]/);
      expect(s).not.toMatch(
        /we will (fix|change|correct)|correct(ed)? (it|this) for you|guarantee/i,
      );
    }
  });
});
