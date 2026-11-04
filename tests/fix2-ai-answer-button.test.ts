// Fix 2 part C (master plan 30.27 item 2): the AI answer finding shows its next step as a button to the task it opened,
// on Home and in the report, with the same words on both. The task's path is the one the database gives an ai_answer
// task (private.task_path in supabase/migrations/20261101075711_ai_answers1_accuracy.sql), copied here so a change on
// either side fails.
import { describe, expect, it } from "vitest";
import { accuracyBlock } from "../supabase/functions/_shared/results-report/receipt";
import { cardAction } from "../src/lib/home-state";
import type { Task } from "../src/lib/tasks";

const TASK_PATH: Record<string, string> = {
  hours: "/app/hours",
  services: "/app/knowledge",
  price: "/app/knowledge",
  phone: "/app/shield",
  address: "/app/shield",
  website: "/app/shield",
};

describe("the AI answer's next step", () => {
  for (const [fact, path] of Object.entries(TASK_PATH)) {
    it(`${fact}: the report's button opens the task's screen, with Home's words`, () => {
      const block = accuracyBlock(
        {
          fact: fact as "hours",
          detail: fact as "hours",
          sentence: "Example Salon closes at 17:00 on Saturday.",
          assistant: "chatgpt",
          question: "Which hair salon is open late on Saturday?",
          asked_at: "2026-11-02T09:00:00Z",
          kabsi: "Saturday 09:00 to 18:00",
        },
        "UTC",
      );
      expect(block?.button.path).toBe(path);
      const home = cardAction({
        id: "t",
        kind: "ai_answer",
        priority: "recommended",
        title: "x",
        path,
        evidence: { fact },
        created_at: "2026-11-02T09:00:00Z",
      } as Task);
      expect(block?.button.label).toBe(home.primary);
    });
  }
});
