// The one place model ids live (Q09, D207). Import from here; do not write a model id anywhere else.
//   draft     replies and posts. DRAFT_MODEL (a Supabase secret) overrides the default without a code change.
//   fallback  used only when the draft model is unavailable (unknown model, overload, rate limit, 5xx).
//   check     classification, safety checks, grounding checks: stays on Haiku.
//   chat      Nora, the site assistant.
function override(name: string): string | undefined {
  try {
    return Deno.env.get(name)?.trim() || undefined;
  } catch {
    return undefined; // env access not granted (a test run): use the default
  }
}

export const MODELS = {
  draft: override("DRAFT_MODEL") ?? "claude-sonnet-5-5",
  fallback: "claude-sonnet-5",
  check: "claude-haiku-4-5-20251001",
  chat: "claude-sonnet-5",
} as const;

// Errors worth retrying on the fallback model: the model id is unknown or retired, or Anthropic is overloaded.
// A 400 or 401 (bad request, bad key) would fail on the fallback too, so it is not retried.
export function shouldFallBack(status: number | undefined): boolean {
  return status === 404 || status === 429 || (status !== undefined && status >= 500);
}
