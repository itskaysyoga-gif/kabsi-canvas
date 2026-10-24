// Master plan 27.12: the facts are written in knowledge/facts/ and built by one generator (scripts/kb-lib.mjs, run with
// node scripts/build-kb.mjs) into the combined facts file and the two llms files. These tests prove the committed copies are
// what the generator makes, that team notes never reach them, and that the house style holds in the sources.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { OUTPUTS, buildAll } from "../scripts/kb-lib.mjs";

const built: Record<string, string> = buildAll();

describe("the facts generator (master plan 27.12)", () => {
  it("the committed combined facts and llms files equal what the generator builds (run node scripts/build-kb.mjs)", () => {
    for (const path of Object.values(OUTPUTS))
      expect(readFileSync(path, "utf8"), path).toBe(built[path]);
  });

  it("llms-full.txt ends with the combined facts", () => {
    expect(
      (built[OUTPUTS.full] as string).endsWith((built[OUTPUTS.combined] as string).trim() + "\n"),
    ).toBe(true);
  });

  it("the sources are numbered files in knowledge/facts/ and the notes in knowledge/internal/ never reach an output", () => {
    const sources = readdirSync("knowledge/facts").filter((f) => f.endsWith(".md"));
    expect(sources.length).toBeGreaterThan(10);
    for (const f of sources) expect(f, f).toMatch(/^\d\d-[a-z0-9-]+\.md$/);
    for (const f of readdirSync("knowledge/internal")) {
      const note = readFileSync(`knowledge/internal/${f}`, "utf8").trim();
      if (note.length < 80) continue;
      for (const output of Object.values(built)) expect(output.includes(note), f).toBe(false);
    }
  });

  it("no source or note holds an em dash or an en dash", () => {
    for (const dir of ["knowledge/facts", "knowledge/internal"])
      for (const f of readdirSync(dir)) {
        const text = readFileSync(`${dir}/${f}`, "utf8");
        expect(text, `${dir}/${f}`).not.toMatch(/[\u2014\u2013]/);
      }
  });
});
