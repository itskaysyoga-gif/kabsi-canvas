// kv-sync — internal (DB trigger on public.cards). Deletes the Worker's cached copy of a card
// (KV key "s:{CODE}" in namespace STICKERS) so the next tap re-reads the database.
import { captureError, isInternal, json, log } from "../_shared/kabsi.ts";

const NAMESPACE = Deno.env.get("CF_KV_NAMESPACE_ID") ?? "d897cbaa4ff34c8bab5e6923b3c41542"; // STICKERS
const CODE_RE = /^[2-9A-HJKMNP-Z]{6}$/;

Deno.serve(async (req) => {
  if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
  const { code } = await req.json().catch(() => ({})) as { code?: string };
  if (!code || !CODE_RE.test(code)) return json({ error: "bad_code" }, 400);

  const token = Deno.env.get("CF_API_TOKEN");
  const account = Deno.env.get("CF_ACCOUNT_ID");
  if (!token || !account) {
    log("kv-sync", { ok: false, code, skipped: "cloudflare_not_configured" });
    return json({ skipped: "cloudflare_not_configured" });
  }
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/storage/kv/namespaces/${NAMESPACE}/values/${encodeURIComponent(`s:${code}`)}`,
      { method: "DELETE", headers: { authorization: `Bearer ${token}` } },
    );
    if (!res.ok && res.status !== 404) throw new Error(`cloudflare ${res.status}: ${(await res.text()).slice(0, 200)}`);
    log("kv-sync", { ok: true, code });
    return json({ ok: true });
  } catch (e) {
    await captureError("kv-sync", e, { code });
    return json({ error: "internal" }, 500);
  }
});
