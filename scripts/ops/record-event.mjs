// Writes one result where the daily staff summary reads it (Ops 1 part B, master plan 19.1 and 19.3).
// It talks to the Supabase Management API with SUPABASE_ACCESS_TOKEN, the token deploy.yml already uses, so no new
// secret is needed and no service role key leaves Supabase.
//
//   node scripts/ops/record-event.mjs --kind backup_drill --channel daily --title "..." [--body "..."]
//        [--field "Label=value" ...] [--dedupe-key key] [--setting name --value-file result.json] [--dry-run]
//
// --setting stores the JSON in app_settings (key = name): the stable place a summary reads the latest result from.
// The ops_events row (channels: alerts, customers, chats, money, partners, daily) is what the staff channel posts;
// a repeat of the same --dedupe-key is ignored, so one finding becomes one event.
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { lit, runSql } from "./supabase-api.mjs";

const CHANNELS = ["alerts", "customers", "chats", "money", "partners", "daily"];

export function buildSql(v, now = new Date()) {
  if (!v.kind || !v.title) throw new Error("--kind and --title are required");
  const channel = v.channel ?? "alerts";
  if (!CHANNELS.includes(channel)) throw new Error(`--channel must be one of ${CHANNELS.join(", ")}`);
  if (v.setting && !/^[a-z][a-z0-9_]{2,60}$/.test(v.setting)) throw new Error("--setting must be snake_case");
  const fields = (v.field ?? []).map((f) => {
    const i = f.indexOf("=");
    return { l: f.slice(0, i), v: f.slice(i + 1).slice(0, 300) };
  });
  const parts = [];
  if (v.setting) {
    const json = readFileSync(v["value-file"], "utf8").trim();
    JSON.parse(json); // refuses anything that is not JSON
    parts.push(
      `insert into public.app_settings (key, value, updated_at) values (${lit(v.setting)}, ${lit(json)}, now()) ` +
        `on conflict (key) do update set value = excluded.value, updated_at = now();`,
    );
  }
  const dedupe = v["dedupe-key"] ?? `${v.kind}:${now.toISOString()}`;
  parts.push(
    `insert into public.ops_events (kind, channel, title, body, fields, dedupe_key) values (` +
      `${lit(v.kind)}, ${lit(channel)}, ${lit(v.title.slice(0, 200))}, ${lit((v.body ?? "").slice(0, 1500))}, ` +
      `${lit(JSON.stringify(fields))}::jsonb, ${lit(dedupe)}) on conflict (dedupe_key) do nothing;`,
  );
  return parts.join("\n");
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const { values } = parseArgs({
    options: {
      kind: { type: "string" },
      channel: { type: "string", default: "alerts" },
      title: { type: "string" },
      body: { type: "string", default: "" },
      field: { type: "string", multiple: true, default: [] },
      "dedupe-key": { type: "string" },
      setting: { type: "string" },
      "value-file": { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  const sql = buildSql(values);
  if (values["dry-run"]) {
    console.log(sql);
  } else if (!process.env.SUPABASE_ACCESS_TOKEN) {
    console.log("SUPABASE_ACCESS_TOKEN is not set, so nothing was written to the staff summary.");
  } else {
    try {
      await runSql(sql);
      console.log(`Recorded ${values.kind} for the staff summary.`);
    } catch (e) {
      console.error(String(e.message ?? e));
      process.exit(1);
    }
  }
}
