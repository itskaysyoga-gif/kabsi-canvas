// Scan 3 (master plan 30.34 item 2): the suggestions' signed pass, kept for this tab so every free check box and the
// review link tool share one bot check per search session. Only the pass is kept here, never anything from Places
// (tests/check2-find-business.test.ts holds that). The box loads this file on its first touch, so a page that
// shows the box pays nothing for it until then.
import { anonHeaders, supabaseUrl } from "@/lib/supabase-config";

const PASS_KEY = "kb-suggest-pass";
// A pass is "<expiry seconds>.<signature>". It is used until 30 seconds before it runs out, then a fresh one is asked.
const passLive = (p: string | null | undefined): p is string => {
  const exp = Number(String(p ?? "").split(".")[0]);
  return Number.isInteger(exp) && exp * 1000 - 30_000 > Date.now();
};
let memoryPass: string | undefined;

/** The pass this tab holds, if it is still good: kept for the tab only (sessionStorage), so /scan, the review link tool
 * and every free check box share it. It proves a bot check passed; it is not a secret and grants nothing else. */
export function readSuggestPass(): string | undefined {
  if (passLive(memoryPass)) return memoryPass;
  try {
    const p = window.sessionStorage.getItem(PASS_KEY);
    if (passLive(p)) return (memoryPass = p);
  } catch {
    /* storage blocked: the pass lives in memory only */
  }
  return undefined;
}
export function saveSuggestPass(p: string | undefined) {
  memoryPass = p;
  try {
    if (p) window.sessionStorage.setItem(PASS_KEY, p);
    else window.sessionStorage.removeItem(PASS_KEY);
  } catch {
    /* storage blocked */
  }
}

/** One Turnstile token for the pass, before the first suggestion (and the function is warm by then). */
export async function getSuggestPass(turnstile: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/profile-snapshot`, {
      method: "POST",
      headers: { "content-type": "application/json", ...anonHeaders },
      body: JSON.stringify({ action: "pass", turnstile }),
      // A pass that does not come within 5 seconds is given up: the first suggestion then asks as before.
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return undefined;
    const j = (await res.json()) as { pass?: unknown };
    return typeof j.pass === "string" ? j.pass : undefined;
  } catch {
    return undefined;
  }
}
