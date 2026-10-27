// email: the two public doors of Kabsi's email system (P0.4-08). Neither can carry a Supabase sign-in: a mail provider
// posts to them. Each proves itself instead.
//   GET  /email/unsubscribe?t=TOKEN   what the link would stop (reads only: a mail scanner changes nothing). The page people
//                                     see is kabsi.co/unsubscribe, which asks first and then POSTs here.
//   POST /email/unsubscribe?t=TOKEN   stops that one kind of notice for that one address (also the RFC 8058 one-click
//                                     POST that Gmail and Apple Mail send from their own Unsubscribe button)
//   POST /email/webhook               Resend's bounce, complaint and delivery events, signed with Svix
//                                     (RESEND_WEBHOOK_SECRET). A permanent bounce or a complaint puts the address on the
//                                     one suppression list, and the outbox never mails it again.
//   POST /email/test                  internal (x-cron-secret): sends one of each email type to hello@kabsi.co, or to the one
//                                     address in the body's `to` if _shared/email/test-recipient.ts allows it (a
//                                     mail-tester.com address, or one listed for the inbox test in
//                                     app_settings.email_test_recipients), so a person can read them in a real inbox
//                                     (P0.4-08, master plan 30.4). Never to anyone else.
import { admin, captureError, CORS, internalSecret, isInternal, json, log } from "../_shared/kabsi.ts";
import { UNSUBSCRIBE_HEADERS, unsubscribeRequest } from "../_shared/email/unsubscribe.ts";
import { resendWebhook } from "../_shared/email/webhook-route.ts";
import { categoryOf } from "../_shared/notify-categories.ts";
import { isAllowedTestRecipient, TEST_HOME } from "../_shared/email/test-recipient.ts";

const FN = "email";
async function unsubscribe(req: Request, url: URL) {
  // The decision is in _shared/email/unsubscribe.ts (Sec 1: GET reads, POST acts, HEAD and the rest do nothing).
  const r = await unsubscribeRequest(req.method, url.searchParams.get("t"), {
    secret: internalSecret,
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
function webhook(req: Request) {
  return resendWebhook(req, { secret: Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "", db: admin(), log: (fields) => log(FN, fields), json });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const route = url.pathname.split("/").filter(Boolean).pop();
  try {
    if (route === "unsubscribe") return await unsubscribe(req, url);
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
