// google-capture: internal (cron secret), read-only. Captures real Google responses for the two Kabsi-owned profiles
// (P0.7-01, K-34) with personal data removed. Every request is a GET (see _shared/google/capture.ts); it never
// writes to Google and never changes GOOGLE_MODE.
import { inventory, reviews } from "../_shared/google/capture.ts";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });
async function isInternal(req: Request) {
  const given = req.headers.get("x-cron-secret");
  if (!given) return false;
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/internal_secret`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
    body: JSON.stringify({ p_name: "cron_secret" }),
  });
  return res.ok && given === (await res.json());
}

Deno.serve(async (req) => {
  if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
  const body = await req.json().catch(() => ({})) as { op?: string; profile?: string };
  try {
    if (body.op === "inventory") return json(await inventory());
    if (body.op === "reviews") return json(await reviews(String(body.profile ?? "")));
    return json({ error: "unknown op" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e).slice(0, 300) }, 500);
  }
});
