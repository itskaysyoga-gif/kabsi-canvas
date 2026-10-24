// Weekly Supabase advisors check (Ops 1 part B, master plan 19.3). Run by .github/workflows/advisors.yml.
//
//   node scripts/ops/advisors.mjs [--fixture advisors.json] [--dry-run]
//
// Asks the Supabase Management API for the security advisors (the same lints as Studio and the MCP get_advisors). Every
// ERROR or WARN finding that Kabsi has not seen before becomes one ops_events row (channel alerts, kind advisor_finding),
// which the staff channel posts. A finding is "seen" when an ops_events row with its key exists, so a finding is reported
// once, however many weeks it stays open. INFO findings are ignored. The first run only records what is open now
// (those rows are marked as sent) and posts one summary, so a baseline of known findings does not flood the channel.
// Performance advisors are listed in the job summary only.
import { createHash } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { api, lit, runSql } from "./supabase-api.mjs";

const ALERT_LEVELS = new Set(["ERROR", "WARN"]);

/** One flat finding per affected object, whichever shape the API answers with. */
export function flatten(payload) {
  const lints = payload?.lints ?? payload?.result?.lints ?? [];
  const out = [];
  for (const l of lints) {
    const items = Array.isArray(l.findings) && l.findings.length ? l.findings : [l];
    for (const f of items) {
      out.push({
        name: l.name,
        title: l.title ?? l.name,
        level: String(l.level ?? "").toUpperCase(),
        remediation: l.remediation ?? "",
        detail: f.detail ?? l.detail ?? l.description ?? "",
        metadata: f.metadata ?? l.metadata ?? {},
        cacheKey: f.cache_key ?? l.cache_key ?? null,
      });
    }
  }
  return out;
}

const stable = (o) => JSON.stringify(o, Object.keys(o ?? {}).sort());
export const keyFor = (f) =>
  `advisor:${f.name}:${createHash("sha1").update(f.cacheKey ?? stable(f.metadata)).digest("hex").slice(0, 16)}`;

export function planSql(findings, knownKeys) {
  const alerts = findings.filter((f) => ALERT_LEVELS.has(f.level));
  const baseline = knownKeys.size === 0;
  const fresh = alerts.filter((f) => !knownKeys.has(keyFor(f)));
  const rows = fresh.map((f) => {
    const where = [f.metadata.schema, f.metadata.name ?? f.metadata.entity].filter(Boolean).join(".");
    const fields = [{ l: "Level", v: f.level }, ...(where ? [{ l: "Where", v: where }] : []), ...(f.remediation ? [{ l: "How to fix", v: f.remediation }] : [])];
    return (
      `(${lit("advisor_finding")}, 'alerts', ${lit(`New security finding: ${f.title}`.slice(0, 200))}, ${lit(f.detail.slice(0, 600))}, ` +
      `${lit(JSON.stringify(fields))}::jsonb, ${lit(keyFor(f))}, ${baseline ? "now()" : "null"})`
    );
  });
  const parts = [];
  if (rows.length) {
    parts.push(
      `insert into public.ops_events (kind, channel, title, body, fields, dedupe_key, sent_at) values\n${rows.join(",\n")}\non conflict (dedupe_key) do nothing;`,
    );
  }
  if (baseline) {
    const body = `${alerts.length} security findings are open today and were recorded as the starting point. From now on a new one is posted here.`;
    parts.push(
      `insert into public.ops_events (kind, channel, title, body, dedupe_key) values (${lit("advisor_baseline")}, 'alerts', ` +
        `${lit("Supabase security advisors: baseline recorded")}, ${lit(body)}, ${lit(`advisor_baseline:${new Date().toISOString().slice(0, 10)}`)}) on conflict (dedupe_key) do nothing;`,
    );
  }
  return { sql: parts.join("\n"), fresh, baseline, alerts };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const { values } = parseArgs({ options: { fixture: { type: "string" }, "dry-run": { type: "boolean", default: false } } });
  const security = values.fixture ? JSON.parse(readFileSync(values.fixture, "utf8")) : await api("/advisors/security");
  const findings = flatten(security);
  let known = new Set();
  if (!values.fixture && !values["dry-run"]) {
    const rows = await runSql("select dedupe_key from public.ops_events where dedupe_key like 'advisor:%'");
    known = new Set(rows.map((r) => r.dedupe_key));
  }
  const plan = planSql(findings, known);
  const lines = [
    `Security advisors: ${findings.length} findings (${plan.alerts.length} ERROR or WARN).`,
    plan.baseline ? "First run: recorded as the baseline." : `${plan.fresh.length} new since the last run.`,
    ...plan.fresh.map((f) => `- NEW ${f.level} ${f.title}: ${f.detail.slice(0, 160)}`),
  ];
  console.log(lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
  if (values["dry-run"] || values.fixture) console.log(plan.sql || "(nothing to write)");
  else if (plan.sql) await runSql(plan.sql);
  if (!values.fixture) {
    try {
      const perf = flatten(await api("/advisors/performance"));
      const summary = `Performance advisors: ${perf.length} findings (not alerts).`;
      console.log(summary);
      if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
    } catch (e) {
      console.log(`Performance advisors could not be read: ${String(e.message).slice(0, 120)}`);
    }
  }
}
