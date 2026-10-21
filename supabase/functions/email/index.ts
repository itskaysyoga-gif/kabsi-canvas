// email: the two public doors of Kabsi's email system (P0.4-08). Neither can carry a Supabase sign-in: a mail provider
// posts to them. Each proves itself instead.
//   GET  /email/unsubscribe?t=TOKEN   what the link would stop (reads only: a mail scanner changes nothing). The page people
//                                     see is kabsi.co/unsubscribe, which asks first and then POSTs here.
//   POST /email/unsubscribe?t=TOKEN   stops that one kind of notice for that one address (also the RFC 8058 one-click
//                                     POST that Gmail and Apple Mail send from their own Unsubscribe button)
//   POST /email/webhook               Resend's bounce, complaint and delivery events, signed with Svix
//                                     (RESEND_WEBHOOK_SECRET). A permanent bounce or a complaint puts the address on the
//                                     one suppression list, and the outbox never mails it again.
//   POST /email/test                  internal (x-cron-secret): sends one of each email type to hello@kabsi.co only,
//                                     never to anyone else, so a person can read them in a real inbox (P0.4-08).
import { admin, captureError, CORS, internalSecret, isInternal, json, log } from "../_shared/kabsi.ts";
import { verifyUnsubscribe } from "../_shared/email/unsubscribe.ts";
import { readEvent, verifySvix } from "../_shared/email/webhook.ts";
import { categoryOf } from "../_shared/notify-categories.ts";

const FN = "email";
async function unsubscribe(req: Request, url: URL) {
  const secret = await internalSecret();
  const claim = secret ? await verifyUnsubscribe(url.searchParams.get("t") ?? "", secret) : null;
  if (!claim) return json({ error: "invalid_link", message: "This link is not valid." }, 400);
  const label = categoryOf(claim.c)?.label ?? "these";
  // Reads only: what the link would stop. A mail scanner that opens it changes nothing.
  if (req.method === "GET") return json({ ok: true, label });
  const { error } = await admin().rpc("apply_unsubscribe", { p_address: claim.a, p_location: claim.l, p_category: claim.c });
  if (error) {
    await captureError(FN, error, { route: "unsubscribe", category: claim.c });
    return json({ error: "failed", message: "That did not work. Write to hello@kabsi.co." }, 400);
  }
  log(FN, { ok: true, route: "unsubscribe", category: claim.c });
  return json({ ok: true, label }); // the mail client's one-click POST wants a 200; the page reads the label
}

async function webhook(req: Request) {
  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";
  const body = await req.text();
  const ok = await verifySvix(secret, {
    id: req.headers.get("svix-id"), timestamp: req.headers.get("svix-timestamp"), signature: req.headers.get("svix-signature"),
  }, body);
  if (!ok) return json({ error: "bad_signature" }, 401);
  const ev = readEvent(JSON.parse(body));
  const db = admin();
  if (ev.kind === "ignored") return json({ ok: true, ignored: true });
  if (ev.kind === "delivered") {
    await db.from("emails").update({ status: "delivered" }).eq("resend_id", ev.resendId).eq("status", "sent");
    return json({ ok: true });
  }
  if (ev.kind === "bounced" && !ev.permanent) return json({ ok: true, suppressed: false });
  const reason = ev.kind === "complained" ? "complaint" : "bounce";
  await db.from("emails").update({ status: "bounced", error: reason }).eq("resend_id", ev.resendId);
  for (const address of ev.addresses) {
    const { error } = await db.from("email_suppressions").upsert({ address, scope: "*", reason }, { onConflict: "address,scope", ignoreDuplicates: true });
    if (error) throw error;
  }
  log(FN, { ok: true, route: "webhook", event: reason, addresses: ev.addresses.length });
  return json({ ok: true, suppressed: ev.addresses.length });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const route = url.pathname.split("/").filter(Boolean).pop();
  try {
    if (route === "unsubscribe" && (req.method === "GET" || req.method === "POST")) return await unsubscribe(req, url);
    if (route === "webhook" && req.method === "POST") return await webhook(req);
    if (route === "test" && req.method === "POST") {
      if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
      const { sendCatalogTo } = await import("../_shared/email/catalog-send.ts");
      const body = await req.json().catch(() => ({})) as { only?: unknown };
      return json({ ok: true, sent: await sendCatalogTo("hello@kabsi.co", typeof body.only === "string" && /^[a-z_]{1,30}$/.test(body.only) ? body.only : undefined) });
    }
    return json({ error: "not_found" }, 404);
  } catch (e) {
    await captureError(FN, e, { route });
    return json({ error: "failed" }, 500);
  }
});
