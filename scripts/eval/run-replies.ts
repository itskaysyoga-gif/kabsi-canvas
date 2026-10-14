// Reply evaluation (Q09). Drafts a reply for each example review through the real grounded pipeline (P0.3-02: memory,
// structured output, code checks, the Haiku check). Run once per model, then compare:
//
//   ANTHROPIC_API_KEY=... DRAFT_MODEL=claude-sonnet-5-5 deno run -A scripts/eval/run-replies.ts > eval-55.json
//   ANTHROPIC_API_KEY=... DRAFT_MODEL=claude-sonnet-5   deno run -A scripts/eval/run-replies.ts > eval-5.json
//   deno run -A scripts/eval/run-replies.ts --compare eval-55.json eval-5.json
//
// Needs the functions copied next to a deno.json with nodeModulesDir (scripts/deno-check.sh shows how), or run it
// from that scratch copy. Reviews are fictional. Nothing is stored.
import {
  buildMemory,
  classify,
  draftGrounded,
  draftMessage,
  MODELS,
} from "../../supabase/functions/_shared/ai.ts";
import type { FactRow } from "../../supabase/functions/_shared/facts.ts";
import fixtures from "./reviews.json" with { type: "json" };

type Row = {
  id: number;
  rating: number;
  language: string;
  risk: string;
  model_used: string;
  draft: string;
  words: number;
  safety_ok: boolean;
  issues: string[];
  checked_by: string;
  dashes: number;
  exclamations: number;
  error?: string;
};

// The fixture card as verified facts (P0.3-02: drafts read Business Knowledge, never a card).
function factsOf(card: Record<string, unknown>): FactRow[] {
  const keyOf: Record<string, string> = {
    signature: "signature",
    tone: "voice",
    about: "description",
    hours_note: "hours_note",
    delivery: "delivery",
    parking: "parking",
    contact_phone: "contact",
    avoid: "phrase_avoid",
  };
  const rows: FactRow[] = [];
  for (const [k, v] of Object.entries(card)) {
    if (k === "staff_names") {
      for (const n of v as string[])
        rows.push({
          id: crypto.randomUUID(),
          slot: `card.staff_names:${n}`,
          key: "staff_member",
          value: { name: n },
          status: "verified",
          review_after: null,
        });
    } else if (keyOf[k]) {
      rows.push({
        id: crypto.randomUUID(),
        slot: `card.${k}`,
        key: keyOf[k],
        value: { text: String(v) },
        status: "verified",
        review_after: null,
      });
    }
  }
  return rows;
}

async function run() {
  const rows: Row[] = [];
  const memory = await buildMemory({
    business: fixtures.business,
    facts: factsOf(fixtures.card),
    approvedReplies: [],
    openQuestions: [],
  });
  for (const r of fixtures.reviews) {
    try {
      const review = { reviewer: r.reviewer, rating: r.rating, comment: r.comment };
      const c = await classify(review);
      const d = await draftGrounded(
        { review, memory, language: c.language ?? "unknown", risk: c.risk, reasons: c.reasons, holding: c.risk === "high", recentReplies: [] },
        (s, u, m) => draftMessage(s, u, m),
      );
      const text = d.output?.reply ?? "";
      const failedCheck = d.checks.find((x) => !x.ok);
      rows.push({
        id: r.id,
        rating: r.rating,
        language: c.language ?? "",
        risk: c.risk,
        model_used: d.model,
        draft: text,
        words: text.split(/\s+/).filter(Boolean).length,
        safety_ok: d.ok,
        issues: d.problems,
        checked_by: failedCheck?.name === "model_check" || d.ok ? (d.checkModel ?? "code") : "code",
        dashes: (text.match(/[—–]/g) ?? []).length,
        exclamations: (text.match(/!/g) ?? []).length,
      });
    } catch (e) {
      rows.push({
        id: r.id,
        rating: r.rating,
        language: "",
        risk: "",
        model_used: "",
        draft: "",
        words: 0,
        safety_ok: false,
        issues: [],
        checked_by: "",
        dashes: 0,
        exclamations: 0,
        error: String(e).slice(0, 200),
      });
    }
  }
  console.log(JSON.stringify({ requested: MODELS.draft, rows }, null, 2));
}

function summarize(name: string, o: { requested: string; rows: Row[] }) {
  const ok = o.rows.filter((r) => !r.error);
  const n = (f: (r: Row) => boolean) => ok.filter(f).length;
  return {
    model: name,
    reviews: o.rows.length,
    errors: o.rows.length - ok.length,
    fell_back: n((r) => r.model_used !== o.requested),
    safety_pass: n((r) => r.safety_ok),
    blocked_by_code_check: n((r) => !r.safety_ok && r.checked_by === "code"),
    blocked_by_haiku_check: n((r) => !r.safety_ok && r.checked_by !== "code"),
    avg_words: Math.round(ok.reduce((a, r) => a + r.words, 0) / Math.max(1, ok.length)),
    over_70_words: n((r) => r.words > 70),
    with_dashes: n((r) => r.dashes > 0),
    multiple_exclamations: n((r) => r.exclamations > 1),
  };
}

if (Deno.args[0] === "--compare") {
  const [a, b] = await Promise.all(
    Deno.args.slice(1, 3).map(async (f) => JSON.parse(await Deno.readTextFile(f))),
  );
  console.table([summarize(a.requested, a), summarize(b.requested, b)]);
  console.log("\nReviews where the two models differ on the safety check:");
  for (const ra of a.rows as Row[]) {
    const rb = (b.rows as Row[]).find((x) => x.id === ra.id)!;
    if (ra.safety_ok !== rb.safety_ok) {
      console.log(
        `#${ra.id} (${ra.rating} stars): ${a.requested} ${ra.safety_ok ? "pass" : "FAIL " + ra.issues.join("; ")} | ${b.requested} ${rb.safety_ok ? "pass" : "FAIL " + rb.issues.join("; ")}`,
      );
    }
  }
} else {
  await run();
}
