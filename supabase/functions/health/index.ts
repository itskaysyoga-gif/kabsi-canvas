// health: internal (cron secret). Reports which secrets are set (true/false only, never values)
// and whether each external service answers. Used by Claude to verify setup without seeing secrets.
// Self-contained (no shared imports) so it stays tiny.
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

const SECRETS = [
  "RESEND_API_KEY", "PLACES_API_KEY", "TAP_SECRET", "CF_API_TOKEN", "CF_ACCOUNT_ID",
  "ANTHROPIC_API_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "GOOGLE_MODE", "APP_URL",
];

Deno.serve(async (req) => {
  if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
  const all = Object.keys(Deno.env.toObject());
  const set: Record<string, boolean> = {};
  for (const name of SECRETS) set[name] = Boolean(Deno.env.get(name));
  // Secret names that look like ours but don't match exactly (e.g. wrong case): names only.
  const nearMisses = all.filter((n) => !SECRETS.includes(n) && /anthropic|resend|places|tap|cf_|google/i.test(n));

  const checks: Record<string, string> = {};
  const cfToken = Deno.env.get("CF_API_TOKEN");
  if (cfToken) {
    const r = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", { headers: { authorization: `Bearer ${cfToken}` } });
    checks.cloudflare = r.ok ? "token valid" : `token rejected (${r.status})`;
  }
  const resend = Deno.env.get("RESEND_API_KEY");
  if (resend) {
    const r = await fetch("https://api.resend.com/domains", { headers: { authorization: `Bearer ${resend}` } });
    checks.resend = r.ok ? "key valid (full access)" : r.status === 401 ? "key rejected" : `sending-only key (${r.status}), fine for sending`;
  }
  const places = Deno.env.get("PLACES_API_KEY");
  if (places) {
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": places, "x-goog-fieldmask": "places.id" },
      body: JSON.stringify({ textQuery: "Yawmiyati Beirut", maxResultCount: 1 }),
    });
    checks.places = r.ok ? "search works" : `search failed (${r.status}): ${(await r.text()).slice(0, 160)}`;
  }
  const anthropic = Deno.env.get("ANTHROPIC_API_KEY");
  if (anthropic) {
    const r = await fetch("https://api.anthropic.com/v1/models?limit=1", { headers: { "x-api-key": anthropic, "anthropic-version": "2023-06-01" } });
    checks.anthropic = r.ok ? "key valid" : `key rejected (${r.status})`;
  }
  // Go-live readiness (D250): can Kabsi get a Google token for hello@kabsi.co, and does the Business Profile
  // API answer? Before the API grant, Google replies 429 with a zero quota; that is expected.
  const gid = Deno.env.get("GOOGLE_CLIENT_ID"), gsecret = Deno.env.get("GOOGLE_CLIENT_SECRET"), grefresh = Deno.env.get("GOOGLE_REFRESH_TOKEN");
  if (gid && gsecret && grefresh) {
    const t = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: gid, client_secret: gsecret, refresh_token: grefresh, grant_type: "refresh_token" }),
    });
    const tj = await t.json().catch(() => ({}));
    if (!t.ok) checks.google_token = `refresh failed (${t.status}): ${tj.error ?? ""}`;
    else {
      checks.google_token = `ok, scope ${String(tj.scope ?? "").includes("business.manage") ? "business.manage" : `MISSING business.manage (${tj.scope})`}`;
      const a = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", { headers: { authorization: `Bearer ${tj.access_token}` } });
      const aj = await a.json().catch(() => ({}));
      checks.google_accounts = a.ok
        ? `ok, ${(aj.accounts ?? []).length} account(s)`
        : `${a.status}: ${String(aj.error?.message ?? "").slice(0, 160)}`;
    }
  } else checks.google_token = "not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN)";
  checks.google_mode = Deno.env.get("GOOGLE_MODE") === "live" ? "live" : "mock";
  return json({ set, nearMisses, checks });
});
