// What the free tools (the Google Profile Check and the review link tool) say when the day's Places cap is 0 or used up
// (lane R, 22 Oct 2026). One sentence, worded once: the Edge Functions send it as the message, and the screens show it
// with the free trial as the button (src/components/shared/free-tool-busy.tsx). Keep it free of dashes and of "early access".
export const FREE_TOOL_BUSY = "The free check is busy today. Try again tomorrow, or start your free trial.";
// The codes the functions answer with when the cap is reached ("back_soon") or the review link tool's own day limit is used ("busy").
export const FREE_TOOL_BUSY_CODES = ["back_soon", "busy"] as const;
