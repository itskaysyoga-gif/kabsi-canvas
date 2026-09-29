// Reply evaluation (Q09). Drafts a reply for each example review with one model, then runs Kabsi's real safety
// checks (code checks plus the Haiku check) on it. Run once per model, then compare:
//
//   ANTHROPIC_API_KEY=... DRAFT_MODEL=claude-sonnet-5-5 deno run -A scripts/eval/run-replies.ts > eval-55.json
//   ANTHROPIC_API_KEY=... DRAFT_MODEL=claude-sonnet-5   deno run -A scripts/eval/run-replies.ts > eval-5.json
//   deno run -A scripts/eval/run-replies.ts --compare eval-55.json eval-5.json
//
// Needs the functions copied next to a deno.json with nodeModulesDir (scripts/deno-check.sh shows how), or run it
// from that scratch copy. Reviews are fictional. Nothing is stored.
import { checkDraft, classify, draftReply, MODELS } from "../../supabase/functions/_shared/ai.ts";
import fixtures from "./reviews.json" with { type: "json" };

type Row = {
  id: number; rating: number; language: string; urgent: boolean; model_used: string; draft: string; words: number;
  safety_ok: boolean; issues: string[]; checked_by: string; dashes: number; exclamations: number; error?: string;
};

async function run() {
  const rows: Row[] = [];
  for (const r of fixtures.reviews) {
    try {
      const review = { reviewer: r.reviewer, rating: r.rating, comment: r.comment };
      const c = await classify(review);
      const d = await draftReply({ review, business: fixtures.business, card: fixtures.card, language: c.language, urgent: c.urgent });
      const check = await checkDraft({ review, draft: d.text, card: fixtures.card });
      rows.push({
        id: r.id, rating: r.rating, language: c.language, urgent: c.urgent, model_used: d.model, draft: d.text,
        words: d.text.split(/\s+/).filter(Boolean).length, safety_ok: check.ok, issues: check.issues, checked_by: check.model,
        dashes: (d.text.match(/[—–]/g) ?? []).length, exclamations: (d.text.match(/!/g) ?? []).length,
      });
    } catch (e) {
      rows.push({ id: r.id, rating: r.rating, language: "", urgent: false, model_used: "", draft: "", words: 0, safety_ok: false, issues: [], checked_by: "", dashes: 0, exclamations: 0, error: String(e).slice(0, 200) });
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
  const [a, b] = await Promise.all(Deno.args.slice(1, 3).map(async (f) => JSON.parse(await Deno.readTextFile(f))));
  console.table([summarize(a.requested, a), summarize(b.requested, b)]);
  console.log("\nReviews where the two models differ on the safety check:");
  for (const ra of a.rows as Row[]) {
    const rb = (b.rows as Row[]).find((x) => x.id === ra.id)!;
    if (ra.safety_ok !== rb.safety_ok) {
      console.log(`#${ra.id} (${ra.rating} stars): ${a.requested} ${ra.safety_ok ? "pass" : "FAIL " + ra.issues.join("; ")} | ${b.requested} ${rb.safety_ok ? "pass" : "FAIL " + rb.issues.join("; ")}`);
    }
  }
} else {
  await run();
}
