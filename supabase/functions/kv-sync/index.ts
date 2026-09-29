// kv-sync: internal (DB trigger on public.cards, or a one-off backfill). Keeps the Worker's copy of each card
// (KV key "s:{CODE}" in namespace STICKERS) in step with the database, D271.
// Write-through with no expiry: a tap never waits on, or fails with, the database.
//   POST { code }        writes that card's value (deletes the key if the card row is gone)
//   POST { backfill: true }  writes every card once (Cloudflare bulk endpoint, 1,000 keys per call)
import { admin, captureError, isInternal, json, log } from "../_shared/kabsi.ts";

const NAMESPACE = Deno.env.get("CF_KV_NAMESPACE_ID") ?? "d897cbaa4ff34c8bab5e6923b3c41542"; // STICKERS
const CODE_RE = /^[2-9A-HJKMNP-Z]{6}$/;
const BULK_SIZE = 1000;

type CardRow = { code: string; status: string; destination: string | null; location_id: string | null };

// Same shape the Worker reads: {d: destination, b: location_id, a: active}.
function cardValue(c: Pick<CardRow, "status" | "destination" | "location_id">) {
  return JSON.stringify({ d: c.destination ?? null, b: c.location_id ?? null, a: c.status === "active" });
}

Deno.serve(async (req) => {
  if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
  const body = await req.json().catch(() => ({})) as { code?: string; backfill?: boolean };

  const token = Deno.env.get("CF_API_TOKEN");
  const account = Deno.env.get("CF_ACCOUNT_ID");
  if (!token || !account) {
    log("kv-sync", { ok: false, skipped: "cloudflare_not_configured" });
    return json({ skipped: "cloudflare_not_configured" });
  }
  const base = `https://api.cloudflare.com/client/v4/accounts/${account}/storage/kv/namespaces/${NAMESPACE}`;
  const headers = { authorization: `Bearer ${token}` };
  const db = admin();

  try {
    if (body.backfill === true) {
      let written = 0;
      for (let from = 0; ; from += BULK_SIZE) {
        const { data, error } = await db.from("cards").select("code, status, destination, location_id")
          .order("code").range(from, from + BULK_SIZE - 1);
        if (error) throw error;
        const rows = (data ?? []) as CardRow[];
        if (!rows.length) break;
        const res = await fetch(`${base}/bulk`, {
          method: "PUT",
          headers: { ...headers, "content-type": "application/json" },
          body: JSON.stringify(rows.map((c) => ({ key: `s:${c.code}`, value: cardValue(c) }))),
        });
        if (!res.ok) throw new Error(`cloudflare bulk ${res.status}: ${(await res.text()).slice(0, 200)}`);
        written += rows.length;
        if (rows.length < BULK_SIZE) break;
      }
      log("kv-sync", { ok: true, backfill: true, written });
      return json({ ok: true, written });
    }

    const code = body.code;
    if (!code || !CODE_RE.test(code)) return json({ error: "bad_code" }, 400);
    const { data: card, error } = await db.from("cards").select("code, status, destination, location_id")
      .eq("code", code).maybeSingle();
    if (error) throw error;

    const key = `${base}/values/${encodeURIComponent(`s:${code}`)}`;
    // A deleted card has no value to write: remove the key so the Worker asks the database and gets a 404.
    const res = card
      ? await fetch(key, { method: "PUT", headers: { ...headers, "content-type": "text/plain" }, body: cardValue(card as CardRow) })
      : await fetch(key, { method: "DELETE", headers });
    if (!res.ok && !(res.status === 404 && !card)) throw new Error(`cloudflare ${res.status}: ${(await res.text()).slice(0, 200)}`);
    log("kv-sync", { ok: true, code, action: card ? "put" : "delete" });
    return json({ ok: true });
  } catch (e) {
    await captureError("kv-sync", e, body.backfill ? { backfill: true } : { code: body.code });
    return json({ error: "internal" }, 500);
  }
});
