// The replay runner (QA 1, master plan 30.12). Runs one named scenario of replay.ts against an `io`: in the `whatsapp`
// function the io signs each payload and feeds it to the normal inbound path (replay-db.ts); in the tests it is a fake.
// The report holds the replies Kabsi gave to fictional phones and the problems found; it never holds a secret.
import { check, kapsoPayload, type Observed, phoneProblem, SCENARIOS, type Scenario, type Step, tapId } from "./replay.ts";

export interface ReplayIo {
  phoneNumberId: string;
  nowMs(): number;
  /** null when every phone is fictional and bound only to demo businesses, else the reason it must not run. */
  problem(phones: string[]): Promise<string | null>;
  /** Clears the fictional phones' conversation and opens their opt-in again, so a scenario starts the same every time. */
  reset(phones: string[]): Promise<void>;
  lastOutbox(phone: string): Promise<number>;
  /** An approval token for the review the QA seed prepared, for this phone's user; null when there is none. */
  action(phone: string): Promise<string | null>;
  /** Signs the payload, feeds it to the inbound path and waits until the background work has finished. */
  deliver(p: { event: string; body: unknown }): Promise<void>;
  observe(phone: string, messageId: string, sinceOutbox: number): Promise<Observed>;
  /** PILOT-READY: takes the scenario's phones for a few minutes. null when taken, else the phone another scenario still holds. */
  lock(scenario: string, phones: string[]): Promise<string | null>;
  unlock(scenario: string, phones: string[]): Promise<void>;
}

export type StepReport = {
  n: number; note: string; phone: string; sent: string;
  result: string | null; replies: { state: string; kind: string; body: string; buttons: string[] }[]; problems: string[];
};
export type Report = { scenario: string; ok: boolean; refused?: string; steps: StepReport[]; ms: number };

const describe = (s: Step, id: string | null) => (s.tap ? `tap ${id ?? "(no button)"}` : s.media ? `${s.media.kind} ${s.media.id}` : JSON.stringify(s.text ?? ""));

export async function runScenario(io: ReplayIo, name: string, runId: string): Promise<Report> {
  const t0 = io.nowMs();
  const sc: Scenario | undefined = SCENARIOS[name];
  if (!sc) return { scenario: name, ok: false, refused: "unknown scenario", steps: [], ms: 0 };
  const phones = [...new Set(sc.steps.map((s) => s.phone).concat(sc.phones))];
  // Two scenarios on one phone spoiled each other (25 Nov 2026): the second is refused until the first has finished.
  // The lock belongs to this run (name and run id), so a second run of the same scenario is refused too.
  const owner = `${name}:${runId}`;
  const early = await io.problem(phones);
  if (early) return { scenario: name, ok: false, refused: early, steps: [], ms: 0 };
  const busy = await io.lock(owner, phones);
  if (busy) return { scenario: name, ok: false, refused: /^\+/.test(busy) ? `another scenario is running on ${busy.slice(0, -4)}xxxx; run one at a time` : busy, steps: [], ms: 0 };
  try {
    return await runLocked(io, sc, phones, runId, t0);
  } finally {
    await io.unlock(owner, phones);
  }
}

async function runLocked(io: ReplayIo, sc: Scenario, phones: string[], runId: string, t0: number): Promise<Report> {
  const name = sc.name;
  // The reset binds the fictional phones to the demo businesses again first, so the check below reads the real bindings.
  await io.reset(phones);
  const why = await io.problem(phones);
  if (why) return { scenario: name, ok: false, refused: why, steps: [], ms: 0 };
  const steps: StepReport[] = [];
  const lastButtons = new Map<string, { id: string; title: string }[]>();
  let token: string | null = null;
  for (const [i, s] of sc.steps.entries()) {
    const problems: string[] = [];
    if (s.prep === "action") {
      token = await io.action(s.phone);
      if (!token) problems.push("no approval token could be made: run the QA seed (tests/e2e/seed/qa-reset.sql)");
    }
    const buttonId = s.tap ? tapId(s.tap, lastButtons.get(s.phone) ?? [], token) : null;
    if (s.tap && !buttonId) problems.push("no button to tap");
    const since = await io.lastOutbox(s.phone);
    const id = `replay.${runId}.${i + 1}`;
    if (!problems.length) {
      const p = kapsoPayload({ phoneNumberId: io.phoneNumberId, from: s.phone, id, nowSeconds: Math.floor(io.nowMs() / 1000) }, { text: s.text, media: s.media, buttonId });
      await io.deliver({ event: p.event, body: p.body });
      const got = await io.observe(s.phone, id, since);
      problems.push(...check(s, got));
      lastButtons.set(s.phone, got.replies[got.replies.length - 1]?.buttons ?? []);
      steps.push({
        n: i + 1, note: s.note, phone: s.phone.slice(0, -4) + "xxxx", sent: describe(s, buttonId?.replaceAll(token ?? "\0", "$token") ?? null), result: got.result,
        replies: got.replies.map((r) => ({ state: r.state, kind: r.kind, body: r.body.slice(0, 600), buttons: r.buttons.map((b) => b.title) })), problems,
      });
    } else {
      steps.push({ n: i + 1, note: s.note, phone: s.phone.slice(0, -4) + "xxxx", sent: describe(s, buttonId), result: null, replies: [], problems });
    }
  }
  return { scenario: name, ok: steps.every((x) => !x.problems.length), steps, ms: io.nowMs() - t0 };
}

export { phoneProblem };
