// health: internal (cron secret). Reports which secrets are set (true/false only, never values)
// and whether each external service answers. Used by Claude to verify setup without seeing secrets.
// Self-contained apart from the Google layer (K-34), so it stays tiny.
import { googleMode, listAccountsOnce, refreshToken, searchText } from "../_shared/google/index.ts";

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

// D295: a redeploy once reset verify_jwt and every cron call got 401 for a day while pg_cron still showed
// "succeeded". The only proof the jobs really run is a successful jobs_log row (api cron-tick writes a
// heartbeat every tick). None in 30 minutes raises one alert in #kabsi-alerts per half hour.
const STALE_MINUTES = 30;
async function rest(path: string, init: RequestInit = {}) {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/${path}`, {
    ...init,
    headers: { "content-type": "application/json", apikey: key, authorization: `Bearer ${key}`, ...(init.headers ?? {}) },
  });
}
async function jobsFreshness(): Promise<string> {
  const since = new Date(Date.now() - STALE_MINUTES * 60_000).toISOString();
  const r = await rest(`jobs_log?ok=eq.true&created_at=gte.${encodeURIComponent(since)}&select=id&limit=1`);
  if (!r.ok) return `check failed (${r.status})`;
  if ((await r.json()).length) return "ok";
  const bucket = Math.floor(Date.now() / (STALE_MINUTES * 60_000));
  await rest("rpc/ops_emit", {
    method: "POST",
    body: JSON.stringify({
      p_kind: "jobs_silent", p_channel: "alerts",
      p_title: `:rotating_light: No successful job in ${STALE_MINUTES} minutes`,
      p_body: "jobs_log has no successful row. Scheduled functions may be returning 401 or 5xx (check verify_jwt in supabase/config.toml and the function logs).",
      p_dedupe: `jobs_silent:${bucket}`,
    }),
  });
  return `STALE: no successful jobs_log row in ${STALE_MINUTES} minutes (alert sent)`;
}

const SECRETS = [
  "RESEND_API_KEY", "PLACES_API_KEY", "TAP_SECRET", "CF_API_TOKEN", "CF_ACCOUNT_ID",
  "ANTHROPIC_API_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "GOOGLE_MODE", "APP_URL",
];

Deno.serve(async (req) => {
  if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
  const body = await req.json().catch(() => ({})) as { only?: string };
  if (body.only === "jobs") return json({ checks: { jobs_recent: await jobsFreshness() } });
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
    const r = await searchText(places, "Yawmiyati Beirut", 1, "places.id");
    checks.places = r.ok ? "search works" : `search failed (${r.status}): ${JSON.stringify(r.data).slice(0, 160)}`;
  }
  // The key was saved as "Anthropic_Api"; the functions accept both names.
  const anthropic = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("Anthropic_Api");
  set.ANTHROPIC_API_KEY = Boolean(anthropic);
  if (anthropic) {
    const r = await fetch("https://api.anthropic.com/v1/models?limit=1", { headers: { "x-api-key": anthropic, "anthropic-version": "2023-06-01" } });
    checks.anthropic = r.ok ? "key valid" : `key rejected (${r.status})`;
  }
  // Go-live readiness (D250): can Kabsi get a Google token for hello@kabsi.co, and does the Business Profile
  // API answer? Before the API grant, Google replies 429 with a zero quota; that is expected.
  const gid = Deno.env.get("GOOGLE_CLIENT_ID"), gsecret = Deno.env.get("GOOGLE_CLIENT_SECRET"), grefresh = Deno.env.get("GOOGLE_REFRESH_TOKEN");
  if (gid && gsecret && grefresh) {
    const t = await refreshToken();
    const tj = t.body;
    if (!t.ok) checks.google_token = `refresh failed (${t.status}): ${tj.error ?? ""}`;
    else {
      checks.google_token = `ok, scope ${String(tj.scope ?? "").includes("business.manage") ? "business.manage" : `MISSING business.manage (${tj.scope})`}`;
      const a = await listAccountsOnce(String(tj.access_token));
      checks.google_accounts = a.ok
        ? `ok, ${(a.body.accounts ?? []).length} account(s)`
        : `${a.status}: ${String(a.body.error?.message ?? "").slice(0, 160)}`;
    }
  } else checks.google_token = "not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN)";
  checks.jobs_recent = await jobsFreshness();
  checks.google_mode = googleMode();
  return json({ set, nearMisses, checks });
});
