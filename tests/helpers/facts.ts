// The facts come from the one generator (scripts/kb-lib.mjs, master plan 27.12): knowledge/facts/*.md built into the
// combined facts file, public/llms-full.txt and public/llms.txt. Tests read the generated text, not the committed copy, so a
// stale copy cannot hide a change; tests/knowledge-build.test.ts proves the committed copies equal it.
import { readFileSync } from "node:fs";
import { OUTPUTS, buildAll } from "../../scripts/kb-lib.mjs";

const built: Record<string, string> = buildAll();

export const facts = built[OUTPUTS.combined] as string;
export const llmsFull = built[OUTPUTS.full] as string;
export const llmsShort = built[OUTPUTS.short] as string;

/** readFileSync(path, "utf8"), except that the three generated facts files come from the generator. */
export function readText(path: string): string {
  const generated = built[path.replace(/\\/g, "/")];
  return generated ?? readFileSync(path, "utf8");
}
