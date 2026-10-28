// Sec 2: the backup keeps 21 days (3 weekly sets), reaches the database over IPv4 (the session pooler), and the restore
// drill applies deletions made after the backup again, restores Storage and records how long it took.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const dbUrl = (env: Record<string, string>) => {
  try {
    return {
      out: execFileSync("node", ["scripts/backup/db-url.mjs"], {
        env: { PATH: process.env.PATH ?? "", ...env },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
      code: 0,
    };
  } catch (e) {
    const err = e as { status: number; stderr: string };
    return { out: err.stderr, code: err.status };
  }
};

describe("Sec 2: backup and restore", () => {
  it("keeps the newest 3 weekly sets (21 days) and runs every Sunday", () => {
    expect(read("scripts/backup/backup.sh")).toMatch(/KEEP="\$\{BACKUP_KEEP:-3\}"/);
    expect(read(".github/workflows/backup.yml")).toMatch(/cron: "17 2 \* \* 0"/);
  });

  it("a pooler address passes through unchanged; a bad value is named, never printed", () => {
    const pooler =
      "postgresql://postgres.abcdefghijklmnopqrst:pw@aws-0-eu-central-1.pooler.supabase.com:5432/postgres";
    expect(dbUrl({ SUPABASE_DB_URL: pooler })).toEqual({ out: pooler, code: 0 });
    const bad = dbUrl({ SUPABASE_DB_URL: "secret-not-a-url" });
    expect(bad.code).toBe(1);
    expect(bad.out).toMatch(/Session pooler connection string/);
    expect(bad.out).not.toContain("secret-not-a-url");
    const direct = dbUrl({
      SUPABASE_DB_URL: "postgresql://postgres:pw@db.abcdefghijklmnopqrst.supabase.co:5432/postgres",
    });
    expect(direct.code).toBe(1);
    expect(direct.out).toMatch(/IPv6 only/);
    expect(direct.out).not.toContain("pw");
  });

  it("backup.sh resolves the address before pg_dump and never echoes it", () => {
    const sh = read("scripts/backup/backup.sh");
    expect(sh.indexOf('SUPABASE_DB_URL="$(node scripts/backup/db-url.mjs)"')).toBeLessThan(
      sh.indexOf("pg_dump --format=custom"),
    );
    expect(sh).not.toMatch(/^\s*set -x|^\s*(echo|say|printf) .*\$\{?SUPABASE_DB_URL/m);
  });

  it("the restore drill re-applies deletions, restores Storage and records its time", () => {
    const d = read("scripts/backup/restore-drill.sh");
    expect(d).toMatch(/private\.reapply_deletions\(:'rows'::jsonb\)/);
    expect(d).toMatch(/from public\.deletion_log where deleted_at >= /);
    expect(d).toMatch(/select private\.run_retention\(\);/);
    expect(d).toMatch(/tar -xzf "\$W\/plain\/photos\.tar\.gz" -C "\$W\/plain\/restore"/);
    expect(d).toMatch(/seconds: \$secs/);
  });
});
