// email: the two public doors of Kabsi's email system (P0.4-08). Neither can carry a Supabase sign-in: a mail provider
// posts to them. Each proves itself instead.
//   POST /email/unsubscribe { t, view: true }  what the link would stop (reads only: a mail scanner changes nothing).
//                                     The page people see is kabsi.co/unsubscribe#t=TOKEN (the fragment never reaches a
//                                     server), which asks first and then POSTs { t } here.
//   POST /email/unsubscribe/TOKEN     the RFC 8058 one-click POST that Gmail and Apple Mail send from their own
//                                     Unsubscribe button: stops that one kind of notice for that one address.
//   Links sent before Sec 2 carry ?t=TOKEN and keep working (GET reads, POST stops), signed with the old key.
//   POST /email/webhook               Resend's bounce, complaint and delivery events, signed with Svix
//                                     (RESEND_WEBHOOK_SECRET). A permanent bounce or a complaint puts the address on the
//                                     one suppression list, and the outbox never mails it again.
//   POST /email/test                  internal (x-cron-secret): sends one of each email type to hello@kabsi.co, or to the one
//                                     address in the body's `to` if _shared/email/test-recipient.ts allows it (a
//                                     mail-tester.com address, or one listed for the inbox test in
//                                     app_settings.email_test_recipients), so a person can read them in a real inbox
//                                     (P0.4-08, master plan 30.4). Never to anyone else.
import { admin, captureError, CORS, internalSecret, isInternal, json, log } from "../_shared/kabsi.ts";
import { capBody } from "../_shared/body-cap.ts";
import { UNSUBSCRIBE_HEADERS, unsubscribeRequest, unsubscribeToken } from "../_shared/email/unsubscribe.ts";
import { resendWebhook } from "../_shared/email/webhook-route.ts";
import { categoryOf } from "../_shared/notify-categories.ts";
import { isAllowedTestRecipient, TEST_HOME } from "../_shared/email/test-recipient.ts";
import { counted } from "../_shared/webhook-rejections.ts";

const FN = "email";
let unsubscribeKey: string | null = null;
async function unsubscribeSecret() {
  if (!unsubscribeKey) {
    const { data } = await admin().rpc("internal_secret", { p_name: "unsubscribe_key" });
    unsubscribeKey = (data as string | null) ?? null;
  }
  return unsubscribeKey;
}

async function unsubscribe(req: Request, url: URL) {
  // The decision is in _shared/email/unsubscribe.ts (Sec 1: GET reads, POST acts, HEAD and the rest do nothing). Sec 2:
  // the page's read is a POST with view: true; a mail client's one-click POST carries no body (form-encoded at most).
  const capped = await capBody(req, 4096, { ...CORS, ...UNSUBSCRIBE_HEADERS });
  if (capped instanceof Response) return capped;
  const raw = req.method === "POST" ? await capped.text().catch(() => "") : "";
  let body: Record<string, unknown> | null = null;
  try {
    const j = raw.startsWith("{") ? JSON.parse(raw) : null;
    body = j && typeof j === "object" ? j as Record<string, unknown> : null;
  } catch { /* the one-click POST body is "List-Unsubscribe=One-Click" */ }
  const method = req.method === "POST" && body?.view === true ? "GET" : req.method;
  const r = await unsubscribeRequest(method, unsubscribeToken(url, body), {
    secret: unsubscribeSecret,
    oldSecret: internalSecret,
    label: (c) => categoryOf(c)?.label ?? "these",
    apply: async (claim) => {
      const { error } = await admin().rpc("apply_unsubscribe", { p_address: claim.a, p_location: claim.l, p_category: claim.c });
      if (error) {
        await captureError(FN, error, { route: "unsubscribe", category: claim.c });
        return false;
      }
      log(FN, { ok: true, route: "unsubscribe", category: claim.c });
      return true;
    },
  });
  return json(r.body, r.status, UNSUBSCRIBE_HEADERS);
}

// The decision is in _shared/email/webhook-route.ts (Sec 1: tested with a stub database); here it is wired to the database.
async function webhook(req: Request) {
  // Sec 2: refused calls are counted for the staff operations view.
  return counted("resend", await resendWebhook(req, { secret: Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "", db: admin(), log: (fields) => log(FN, fields), json }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const route = parts.pop();
  try {
    if (route === "unsubscribe" || parts.pop() === "unsubscribe") return await unsubscribe(req, url);
    if (route === "webhook" && req.method === "POST") return await webhook(req);
    if (route === "test" && req.method === "POST") {
      if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
      const { sendCatalogTo } = await import("../_shared/email/catalog-send.ts");
      const body = await req.json().catch(() => ({})) as { only?: unknown; to?: unknown };
      const to = typeof body.to === "string" && body.to.trim() ? body.to.trim().toLowerCase() : TEST_HOME;
      if (to !== TEST_HOME) {
        const { data: listed } = await admin().from("app_settings").select("value").eq("key", "email_test_recipients").maybeSingle();
        if (!isAllowedTestRecipient(to, String(listed?.value ?? ""))) return json({ error: "recipient_not_allowed" }, 400);
      }
      return json({ ok: true, to, sent: await sendCatalogTo(to, typeof body.only === "string" && /^[a-z_]{1,30}$/.test(body.only) ? body.only : undefined) });
    }
    return json({ error: "not_found" }, 404);
  } catch (e) {
    await captureError(FN, e, { route });
    return json({ error: "failed" }, 500);
  }
});
