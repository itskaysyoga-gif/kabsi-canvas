// The real model for the extraction evaluation (RB-D), by hand only. It sends each case's fenced text to the model the
// extraction step names (MODELS.check) through the one Anthropic client, counts what each call costs with the repository's
// own price table, and stops starting cases when the next one could pass the budget. The key is read from the
// environment by the client and is never printed. EVAL_LIVE is not used and CI never imports this file.
import { message, meterCost, newMeter } from "../../supabase/functions/_shared/ai/client.ts";
import {
  EXTRACT_MAX_TOKENS,
  EXTRACT_MODEL,
  type Ask,
} from "../../supabase/functions/_shared/request-book/extract.ts";

/** What one call can cost at most: about 2,000 tokens in and 400 out at the model's list price, with room. */
const PER_CALL_MARGIN_USD = 0.01;

export function live(budgetUsd: number) {
  const meter = newMeter();
  const spentUsd = () => meterCost(meter) / 1e6;
  const ask: Ask = (req) =>
    message(
      req.model && req.model !== "request" ? req.model : EXTRACT_MODEL,
      req.system,
      req.user,
      req.maxTokens || EXTRACT_MAX_TOKENS,
      meter,
    );
  // Four calls run at once, so the check keeps room for the ones already on their way.
  const mayStart = () => spentUsd() + 5 * PER_CALL_MARGIN_USD < budgetUsd;
  return { ask, spentUsd, mayStart, model: EXTRACT_MODEL };
}
