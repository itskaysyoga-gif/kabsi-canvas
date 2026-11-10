// Sec 2: the backup keeps 21 days (3 weekly sets), reaches the database over IPv4 (the session pooler), and the restore
// drill applies deletions made after the backup again, restores Storage and records how long it took.
import { execFileSync, spawnSync } from "node:child_process";
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

  // Clean 4: one failed part (R2 InvalidPart, 10 Nov) must not fail the whole weekly run.
  it("sends each file up to 3 times with a pause, and every upload goes through the retry", () => {
    const sh = read("scripts/backup/backup.sh");
    expect(sh).toMatch(/UPLOAD_TRIES="\$\{BACKUP_UPLOAD_TRIES:-3\}"/);
    expect(sh).toMatch(/UPLOAD_PAUSE="\$\{BACKUP_UPLOAD_PAUSE:-20\}"/);
    const uploads = sh.split("\n").filter((l) => l.includes('"$AWS" s3 cp'));
    expect(uploads).toHaveLength(3);
    for (const l of uploads) expect(l.trim().startsWith("with_retry ")).toBe(true);
    // The helper itself, run on its own: two failures then success; and three failures stop it.
    const fn = sh.match(/with_retry\(\) \{[\s\S]*?\n\}\n/)?.[0] ?? "";
    expect(fn).not.toBe("");
    const run = (failures: number) =>
      spawnSync(
        "bash",
        [
          "-c",
          `set -euo pipefail; say() { printf '%s\\n' "$*"; }; UPLOAD_TRIES=3; UPLOAD_PAUSE=0; N=0
${fn}
flaky() { N=$((N+1)); [ "$N" -gt ${failures} ]; }
with_retry "stand-in" flaky; echo "tries=$N"`,
        ],
        { encoding: "utf8" },
      );
    const ok = run(2);
    expect(ok.status).toBe(0);
    expect(ok.stdout).toContain("tries=3");
    const bad = run(3);
    expect(bad.status).not.toBe(0);
    expect(bad.stdout).toContain("failed 3 times; giving up");
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

  it("names the usual paste mistakes without printing the password", () => {
    const run = (url: string) =>
      execFileSync("node", ["scripts/backup/db-url.mjs"], {
        env: { PATH: process.env.PATH ?? "", SUPABASE_DB_URL: url },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    const host = "@aws-0-eu-central-1.pooler.supabase.com:5432/postgres";
    const err = (url: string) => {
      const r = spawnSync("node", ["scripts/backup/db-url.mjs"], {
        env: { PATH: process.env.PATH ?? "", SUPABASE_DB_URL: url },
        encoding: "utf8",
      });
      return r.stderr;
    };
    expect(run(`postgresql://postgres.abcdefghijklmnopqrst:Secret123${host}`)).toContain(
      "Secret123",
    );
    const ok = err(`postgresql://postgres.abcdefghijklmnopqrst:Secret123${host}`);
    expect(ok).toMatch(/password 9 characters\. No paste mistake found/);
    expect(ok).not.toContain("Secret123");
    expect(err(`postgresql://postgres.abcdefghijklmnopqrst:[Secret123]${host}`)).toMatch(
      /square brackets/,
    );
    expect(err(`postgresql://postgres.abcdefghijklmnopqrst:[YOUR-PASSWORD]${host}`)).toMatch(
      /placeholder/,
    );
    expect(err(`postgresql://postgres:Secret123${host}`)).toMatch(/not postgres\.<project ref>/);
    expect(err(`postgresql://postgres.abcdefghijklmnopqrst:Sec$ret!${host}`)).toMatch(
      /percent-encoded/,
    );
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

  // Safe 1 (R-151 section C): the Sunday job also backs up the two private Harvey repositories.
  it("backs up both Harvey repositories and the release assets inside the existing Sunday job", () => {
    const sh = read("scripts/backup/backup.sh");
    const wf = read(".github/workflows/backup.yml");
    expect(sh).toMatch(/kabsi-harvey-run:\$HARVEY_RUN_SOURCE/);
    expect(sh).toMatch(/kabsi-harvey:\$HARVEY_SOURCE/);
    expect(sh).toMatch(/bundle create "\$3" --all/);
    expect(sh).toMatch(/seal "\$hname\.bundle"/);
    expect(sh).toMatch(/s3:\/\/\$BUCKET\/weekly\/\$STAMP\/harvey-release\//);
    // No new schedule and no new workflow: still one cron line in the job.
    expect(wf.match(/cron:/g)).toHaveLength(1);
  });

  it("a missing or refused HARVEY_READ_TOKEN is a warning, never a failure", () => {
    const sh = read("scripts/backup/backup.sh");
    expect(sh).toMatch(/::warning::HARVEY_READ_TOKEN is not set/);
    expect(sh).toMatch(/harvey_warn\(\) \{ say "::warning::Harvey backup/);
    expect(sh).toMatch(/Not backed up this week/);
    // The Harvey functions return 1 on a soft failure and never call exit.
    const fns = sh.slice(sh.indexOf("harvey_mirror()"), sh.indexOf('say "Harvey repositories"'));
    expect(fns).not.toMatch(/\bexit\b/);
  });

  it("only Harvey's own encrypted files are copied, and the token never reaches a command line or a log", () => {
    const sh = read("scripts/backup/backup.sh");
    expect(sh).toMatch(/\*\.enc \]\] && \[ "\$\(head -c 8 "\$f"/);
    expect(sh).toMatch(/Salted__/);
    // The token goes through the environment (GIT_CONFIG_*, GH_TOKEN) and every message is scrubbed.
    expect(sh).toMatch(/GIT_CONFIG_VALUE_0=/);
    expect(sh).toMatch(/GH_TOKEN="\$HARVEY_READ_TOKEN"/);
    expect(sh).not.toMatch(/^\s*set -x/m);
    expect(sh).not.toMatch(/(echo|say)[^\n]*\$\{?HARVEY_READ_TOKEN/);
    // The only printf that names the token feeds base64 (the git header value), never a log line.
    expect(sh).not.toMatch(/printf [^\n]*HARVEY_READ_TOKEN"(?! \| base64)/);
    expect(sh.match(/harvey\.err" \| scrub/g)!.length).toBeGreaterThanOrEqual(3);
    // The Storage download lines name files (some hold a phone number) and the repository is public.
    expect(sh).toMatch(/2> "\$W\/storage\.err"/);
  });

  it("a pull request run gets no HARVEY_READ_TOKEN and uses the stand-ins", () => {
    const wf = read(".github/workflows/backup.yml");
    expect(wf).toMatch(
      /HARVEY_READ_TOKEN: \$\{\{ github\.event_name != 'pull_request' && secrets\.HARVEY_READ_TOKEN \|\| '' \}\}/,
    );
    expect(wf).toMatch(/harvey-fixtures\.sh/);
    const fx = read("scripts/backup/harvey-fixtures.sh");
    expect(fx).toMatch(/plain-by-mistake\.csv/);
  });
});
