// The AI contract (K-39): one runner every AI workflow goes through, so none can be weaker than another. Code decides
// the flow; the model only writes text inside it. The steps never change:
//   1. trusted context (the workflow's fixed rules and the business's memory) and the untrusted input, already fenced;
//   2. one generation; the answer must parse into the workflow's structured output, or it is discarded, never shown;
//   3. the code checks; if any fails the model check is not asked and the result is not ready;
//   4. the model check (a second, cheaper model);
//   5. a record of the run: prompt version, model, input hash, output hash, checks, memory version (ai_runs).
import type { CallOptions, JsonSchema, System } from "./client.ts";
import type { Check } from "./checks.ts";

export type Send = (system: System, user: string, maxTokens: number, o?: CallOptions) => Promise<{ text: string; model: string }>;

export type Workflow<I, O> = {
  /** The prompt version, for example "reply.v1". */
  promptVersion: string;
  system: (input: I) => System;
  user: (input: I) => string;
  maxTokens: number;
  effort?: CallOptions["effort"];
  /** Structured output (26.1): the JSON schema the model must answer in. `parse` still validates it in code. */
  schema?: JsonSchema;
  /** Structured output: throws on anything that does not fit. */
  parse: (text: string, input: I) => O;
  codeChecks: (output: O, input: I) => Check[];
  /** The second model's judgement; problems are owner-readable sentences. */
  modelCheck?: (output: O, input: I) => Promise<{ ok: boolean; problems: string[]; model: string }>;
};

export type RunResult<O> = {
  promptVersion: string;
  model: string;
  checkModel: string | null;
  inputHash: string;
  outputHash: string | null;
  /** null when the answer did not parse: nothing is shown. */
  output: O | null;
  checks: Check[];
  /** Ready to offer the owner: parsed, every code check and the model check passed. */
  ok: boolean;
  problems: string[];
};

export async function sha256(text: string) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return [...d].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const systemText = (s: System) => (typeof s === "string" ? s : s.map((p) => p.text).join("\n"));

export async function runContract<I, O>(wf: Workflow<I, O>, input: I, send: Send): Promise<RunResult<O>> {
  const system = wf.system(input);
  const user = wf.user(input);
  const inputHash = await sha256(`${wf.promptVersion}\n${systemText(system)}\n${user}`);
  const base = { promptVersion: wf.promptVersion, inputHash, checkModel: null as string | null };

  const gen = await send(system, user, wf.maxTokens, { effort: wf.effort, schema: wf.schema });
  let output: O;
  try {
    output = wf.parse(gen.text, input);
  } catch {
    return {
      ...base, model: gen.model, outputHash: null, output: null, ok: false,
      checks: [{ name: "structured_output", ok: false, problem: "Kabsi's draft came back in the wrong shape, so it was not used." }],
      problems: ["Kabsi's draft came back in the wrong shape, so it was not used."],
    };
  }
  const outputHash = await sha256(JSON.stringify(output));
  const checks: Check[] = [{ name: "structured_output", ok: true }, ...wf.codeChecks(output, input)];
  const failed = checks.filter((c) => !c.ok);
  if (failed.length || !wf.modelCheck) {
    return { ...base, model: gen.model, outputHash, output, checks, ok: failed.length === 0, problems: failed.map((c) => c.problem!).slice(0, 6) };
  }
  const judged = await wf.modelCheck(output, input);
  checks.push(judged.ok ? { name: "model_check", ok: true } : { name: "model_check", ok: false, problem: judged.problems[0] ?? "The safety check flagged the draft." });
  return {
    ...base, checkModel: judged.model, model: gen.model, outputHash, output, checks, ok: judged.ok,
    problems: judged.ok ? [] : judged.problems.slice(0, 6),
  };
}

/** The ai_runs row for a run (K-39 record). No text: the draft lives in reply_drafts and is redacted with its review. */
export function runRecord<O>(r: RunResult<O>, ids: { locationId: string; reviewId?: string; draftId?: string; workflow: string; memoryVersion?: string }) {
  return {
    location_id: ids.locationId, review_id: ids.reviewId ?? null, draft_id: ids.draftId ?? null, workflow: ids.workflow,
    prompt_version: r.promptVersion, model: r.model, check_model: r.checkModel, input_hash: r.inputHash,
    output_hash: r.outputHash, memory_version: ids.memoryVersion ?? null, ok: r.ok,
    checks: r.checks.map((c) => ({ name: c.name, ok: c.ok })),
  };
}
