// Go live 1 (master plan 30.28): the visibility checks fail quietly when the data provider refuses. DataForSEO's balance
// will run out before the top-up, so a refusal is expected, not an error: the free check shows its Google part in full
// and leaves the nearby and AI parts out, the signed-in Where you show up says the check runs again later, one staff
// WhatsApp alert a day says the provider refused and why, and nothing retries in a loop. Pure: no Deno, no database.
//
// DataForSEO's codes (docs.dataforseo.com/v3/appendix/errors, read 5 Nov 2026): 40200 Payment Required and 40210
// Insufficient Funds (the balance), HTTP 402 (a billing problem), 40203 the cost limit set in its panel, 40201 an account
// blocked for suspicious activity. Anything else from the provider is a provider error.

export type Refusal = "no_balance" | "cap" | "blocked" | "provider_error";

/** Why, in the staff alert's words. */
export const REFUSAL_WHY: Record<Refusal, string> = {
  no_balance: "no balance left",
  cap: "the spend cap is reached",
  blocked: "the account is blocked",
  provider_error: "a provider error",
};

/** The provider error messages Kabsi's own clients throw: dataforseo_<code>, dataforseo_task_<code>, dataforseo_http_<status>. */
const CODE = /^dataforseo_(?:task_|http_)?(\d{3,5})$/;

/** A provider refusal, or null when the error is not the provider saying no (a bug, a missing key, a timeout on our side). */
export function refusalOf(e: unknown): Refusal | null {
  const message = String((e as Error)?.message ?? e ?? "");
  if (message === "ai_visibility_cap_reached" || message === "cap") return "cap";
  const m = CODE.exec(message);
  if (!m) return null;
  const code = Number(m[1]);
  if (code === 40200 || code === 40210 || code === 402) return "no_balance";
  if (code === 40203) return "cap";
  if (code === 40201) return "blocked";
  return "provider_error";
}

/** One alert a day for every refusal, whatever the reason: the key holds the day, the summary says what and why. */
export function refusalAlert(r: Refusal, what: "nearby check" | "AI answer" | "free check", now: Date): { summary: string; key: string } {
  return {
    summary: `DataForSEO refused the ${what}: ${REFUSAL_WHY[r]}. Kabsi tries again later on its own`,
    key: `dataforseo_refused:${now.toISOString().slice(0, 10)}`,
  };
}
