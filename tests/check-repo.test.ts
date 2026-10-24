import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain JavaScript module without types
import { checkMigrations, checkSkills, checkWorkflows } from "../scripts/check-repo.mjs";

const tmp = () => mkdtempSync(join(tmpdir(), "check-repo-"));

describe("check-repo", () => {
  it("passes on the repo", () => {
    const r = spawnSync("node", ["scripts/check-repo.mjs"], { encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
  });

  it("rejects a migration without a timestamp and a repeated timestamp", () => {
    const d = tmp();
    for (const f of ["20261024120000_ok.sql", "20261024120000_twin.sql", "add_table.sql", "2026102412_short.sql", "20261024130000_Upper.sql"])
      writeFileSync(join(d, f), "");
    const problems: string[] = checkMigrations(d);
    expect(problems.length).toBe(4);
    expect(problems.join("\n")).toContain("already used");
  });

  it("rejects a skill with no frontmatter, a wrong name or no description", () => {
    const d = tmp();
    const skill = (name: string, body: string) => {
      mkdirSync(join(d, name));
      writeFileSync(join(d, name, "SKILL.md"), body);
    };
    skill("good", "---\nname: good\ndescription: \"Does a thing\"\n---\nBody");
    skill("nofront", "Body only");
    skill("wrongname", "---\nname: other\ndescription: x\n---\n");
    skill("nodesc", "---\nname: nodesc\n---\n");
    mkdirSync(join(d, "empty"));
    const problems: string[] = checkSkills(d, join(d, "no-lock.json"));
    expect(problems.length).toBe(4);
    expect(problems.some((p) => p.startsWith("skill good"))).toBe(false);
  });

  it("rejects an action that is not pinned to a full commit SHA", () => {
    const d = tmp();
    writeFileSync(
      join(d, "a.yml"),
      [
        "jobs:",
        "  j:",
        "    steps:",
        "      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0",
        "      - uses: actions/setup-node@v4",
        "      - uses: ./local-action",
        "      - uses: owner/repo@main",
      ].join("\n"),
    );
    const problems: string[] = checkWorkflows(d);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain("a.yml:5");
  });
});
