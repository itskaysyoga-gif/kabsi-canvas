import { describe, expect, it } from "vitest";
import { sumAiSpend, usd } from "../src/components/staff/costs-panel";

// The staff Costs panel adds up AI Visibility runs by provider the way ai_visibility_spend(days) does (runs and cost
// micros per provider), from the rows staff read under RLS.
describe("AI Visibility spend by provider", () => {
  it("counts runs and adds cost per provider, a missing cost as zero", () => {
    expect(
      sumAiSpend([
        { provider: "chatgpt", cost_micros: 12_000 },
        { provider: "chatgpt", cost_micros: 8_000 },
        { provider: "perplexity", cost_micros: null },
      ]),
    ).toEqual({ chatgpt: { runs: 2, micros: 20_000 }, perplexity: { runs: 1, micros: 0 } });
    expect(sumAiSpend([])).toEqual({});
  });
  it("shows micros as dollars with two decimals", () => {
    expect(usd(2_470_000)).toBe("$2.47");
    expect(usd(0)).toBe("$0.00");
  });
});
