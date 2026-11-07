import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain JavaScript module without types
import {
  checkFiles,
  checkMigrations,
  checkSkills,
  checkWorkflows,
  MAX_BYTES,
} from "../scripts/check-repo.mjs";

const tmp = () => mkdtempSync(join(tmpdir(), "check-repo-"));

describe("check-repo", () => {
  it("passes on the repo", () => {
    const r = spawnSync("node", ["scripts/check-repo.mjs"], { encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
  });

  it("rejects a migration without a timestamp and a repeated timestamp", () => {
    const d = tmp();
    for (const f of [
      "20261024120000_ok.sql",
      "20261024120000_twin.sql",
      "add_table.sql",
      "2026102412_short.sql",
      "20261024130000_Upper.sql",
    ])
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
    skill("good", '---\nname: good\ndescription: "Does a thing"\n---\nBody');
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

  // Clean 2 (7 Nov 2026): the repository stays small; a screenshot, PDF, video or zip belongs only in the named folders.
  it("rejects an image, PDF, video or zip outside the allowed folders, and a file over 1 MB", () => {
    const f = (path: string, size = 100) => ({ path, size });
    const problems: string[] = checkFiles([
      f("docs/app9/after-390.png"),
      f("docs/scan3/card.PDF"),
      f("scripts/demo.mp4"),
      f("shots/archive.zip"),
      f("src/assets/video/clip.mp4"),
      f("public/og/home.webp"),
      f("tests/e2e/baseline/m390/public.spec.ts/home.png"),
      f("docs/email-previews/logo.png"),
      f("tests/fixtures/photos/small.png"),
      f("docs/notes.md", MAX_BYTES),
      f("docs/big.md", MAX_BYTES + 1),
      f("supabase/functions/_shared/review-graphic/assets.ts", MAX_BYTES + 400_000),
    ]);
    expect(problems).toHaveLength(5);
    expect(
      problems.filter((p) => p.includes("may only be committed")).map((p) => p.split(":")[0]),
    ).toEqual([
      "docs/app9/after-390.png",
      "docs/scan3/card.PDF",
      "scripts/demo.mp4",
      "shots/archive.zip",
    ]);
    expect(problems.some((p) => p.startsWith("docs/big.md") && p.includes("1 MB"))).toBe(true);
    expect(problems.some((p) => p.startsWith("docs/notes.md"))).toBe(false);
  });
});
