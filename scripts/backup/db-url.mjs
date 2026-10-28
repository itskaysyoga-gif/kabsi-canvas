#!/usr/bin/env node
// The database address the backup can reach from GitHub Actions (Sec 2, LATER row "Backup workflow fails at Back up").
//
//   SUPABASE_DB_URL=... SUPABASE_ACCESS_TOKEN=... node scripts/backup/db-url.mjs   prints one URL on stdout, nothing else
//
// Supabase's direct address (db.<ref>.supabase.co) answers on IPv6 only, and GitHub's runners have no IPv6, so
// pg_dump failed with "Network is unreachable" (runs 10, 12 and 13, 25 Oct 2026). The session pooler (Supavisor, port
// 5432, user postgres.<ref>) answers on IPv4 and supports pg_dump. When the secret holds the direct address, this
// script asks the Management API for the project's pooler host and rewrites the address, keeping the password. A
// pooler address is printed as it is. The password is never printed anywhere but stdout, which backup.sh captures
// into a variable; errors name the problem, never the value.
const url = process.env.SUPABASE_DB_URL ?? "";
const token = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const fail = (msg) => {
  process.stderr.write(`::error::${msg}\n`);
  process.exit(1);
};

let u;
try {
  u = new URL(url);
} catch {
  fail(
    "SUPABASE_DB_URL is not a URL. Paste the Session pooler connection string from Supabase, Connect: " +
      "postgresql://postgres.<project ref>:<password, percent-encoded>@aws-<n>-<region>.pooler.supabase.com:5432/postgres",
  );
}
if (!/^postgres(ql)?:$/.test(u.protocol)) fail("SUPABASE_DB_URL must start with postgresql://");

const direct = /^db\.([a-z0-9]{20})\.supabase\.co$/.exec(u.hostname);
if (!direct) {
  // Already a pooler (or another reachable) address.
  process.stdout.write(url);
  process.exit(0);
}
const ref = direct[1];
if (!token)
  fail(
    "SUPABASE_DB_URL is the direct address (IPv6 only) and SUPABASE_ACCESS_TOKEN is not set to look up the pooler.",
  );

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/database/pooler`, {
  headers: { authorization: `Bearer ${token}` },
}).catch(() => null);
if (!res || !res.ok)
  fail(`the Management API did not give the pooler address (status ${res ? res.status : "none"})`);
const configs = await res.json().catch(() => null);
const list = Array.isArray(configs) ? configs : configs ? [configs] : [];
const primary =
  list.find(
    (c) => c && typeof c.db_host === "string" && (c.database_type ?? "PRIMARY") === "PRIMARY",
  ) ?? list.find((c) => c?.db_host);
if (!primary) fail("the pooler configuration has no host");

const out = new URL(url);
out.hostname = primary.db_host;
out.port = "5432"; // session mode: pg_dump needs a session, not the transaction pooler on 6543
// The pooler finds the project by the user name: postgres.<ref>. The API may name the plain database user.
const user = typeof primary.db_user === "string" && primary.db_user ? primary.db_user : "postgres";
out.username = user.endsWith(`.${ref}`) ? user : `${user}.${ref}`;
if (!out.pathname || out.pathname === "/") out.pathname = "/postgres";
process.stdout.write(out.toString());
