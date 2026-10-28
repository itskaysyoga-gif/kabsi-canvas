// One-click unsubscribe (K-102, P0.4-08). The link in an email's footer opens /unsubscribe#t=TOKEN (before Sec 2: ?t=TOKEN). The page asks the
// email function what the link would stop (a read, so a mail scanner that opens the link changes nothing), and only the
// button sends the POST. The token is signed on the server and names one address and one kind of notice.
import { supabaseUrl } from "@/lib/supabase-config";

export type UnsubscribeResult = { ok: true; label: string } | { ok: false; message: string };

// Sec 2: the token travels in the POST body, never in a query string (request logs keep query strings).
async function call(token: string, view: boolean): Promise<UnsubscribeResult> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/email/unsubscribe`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(view ? { t: token, view: true } : { t: token }),
    });
    const body = (await res.json().catch(() => ({}))) as { label?: string; message?: string };
    if (res.ok && body.label) return { ok: true, label: body.label };
    return { ok: false, message: body.message ?? "This link is not valid." };
  } catch {
    return { ok: false, message: "We couldn't reach Kabsi. Check your connection and try again." };
  }
}

export const lookUpUnsubscribe = (token: string) => call(token, true);
export const unsubscribe = (token: string) => call(token, false);
