// Signing the QA accounts in (QA 1). The accounts are @test.local or @resend.dev addresses with no inbox. The one-time code
// is made by tests/e2e/seed/qa-login-code.sql and passed in the environment; it is exchanged here at Supabase Auth's own
// verify endpoint (the one the sign-in panel calls) and the session is kept in tests/e2e/.auth. Nothing is printed.
import type { BrowserContext } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

export const QA = {
  demo: {
    email: "qa-demo@test.local",
    env: "KABSI_QA_CODE_DEMO",
    file: "tests/e2e/.auth/demo.json",
  },
  owner: {
    email: "delivered+kabsi-qa@resend.dev",
    env: "KABSI_QA_CODE_OWNER",
    file: "tests/e2e/.auth/owner.json",
  },
} as const;
export type Who = keyof typeof QA;

// The two public values the browser itself carries (src/lib/supabase-config.ts); no secret.
const supabaseUrl = "https://ynjdqjlmdwjgbfezevxy.supabase.co";
const supabasePublishableKey = "sb_publishable_eF-s_uWvQzj1MngyU1to6Q_aJNQZh2R";
const STORAGE_KEY = "sb-ynjdqjlmdwjgbfezevxy-auth-token";

/** Exchanges the code for a session. Throws a plain message on failure (never the code). */
export async function verifyCode(email: string, token: string) {
  const res = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: supabasePublishableKey },
    body: JSON.stringify({ type: "email", email, token }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || typeof body["access_token"] !== "string")
    throw new Error(
      `sign-in for ${email} failed (${res.status}): ${String(body["msg"] ?? body["error_description"] ?? "no session")}`,
    );
  return {
    ...body,
    expires_at: Math.floor(Date.now() / 1000) + Number(body["expires_in"] ?? 3600),
  };
}

/** The saved session of a QA account, or null when no code was given for this run. */
export function savedSession(who: Who): Record<string, unknown> | null {
  const f = QA[who].file;
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as Record<string, unknown>) : null;
}
export function saveSession(who: Who, session: Record<string, unknown>) {
  mkdirSync("tests/e2e/.auth", { recursive: true });
  writeFileSync(QA[who].file, JSON.stringify(session));
}

/** Puts the saved session in the browser before the page loads, exactly where supabase-js keeps it. */
export async function signedIn(context: BrowserContext, who: Who) {
  const s = savedSession(who);
  if (!s)
    throw new Error(`no saved session for ${who}: run with ${QA[who].env} set (docs/testing.md)`);
  await context.addInitScript(
    ([k, v]) => {
      try {
        window.localStorage.setItem(k as string, v as string);
      } catch {
        /* blocked */
      }
    },
    [STORAGE_KEY, JSON.stringify(s)],
  );
}
