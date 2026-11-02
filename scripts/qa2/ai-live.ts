// QA 2 (2 Nov 2026): two small live AI checks on the real models, run by hand only (Actions, "QA 2 live", Run workflow).
// EVAL_LIVE stays false. Each part stops starting new calls once its budget is spent, and every call's cost is printed.
//   1. AI Answers 1: Scout's check_facts extraction on the ten fixture answers (tests/fixtures/ai-accuracy/answers.json),
//      through the same code path as production (liveExtractor, then compare), scored against each fixture's expectation.
//   2. Post drafting: five invented businesses through the production post prompt (postSystem, the Growth agent's
//      draft_post step), each draft scored by code against the post rubric (checkPost, Kabsi's draft length, no dashes or
//      exclamation marks, the search phrase early, nothing outside the owner's facts).
// Needs ANTHROPIC_API_KEY. Run: deno run --allow-env --allow-read --allow-net scripts/qa2/ai-live.ts --budget-answers 0.4 --budget-posts 0.6
import fx from "../../tests/fixtures/ai-accuracy/answers.json" with { type: "json" };
import {
  compare,
  EXTRACT_SCHEMA,
  EXTRACT_SYSTEM,
  extractUser,
  type KnowledgeRow,
  parseClaims,
  recordFromKnowledge,
} from "../../supabase/functions/_shared/visibility/ai/accuracy.ts";
import {
  draftMessage,
  message,
  meterCost,
  newMeter,
  noDashes,
  parseJson,
  task,
} from "../../supabase/functions/_shared/ai.ts";
import { postSystem, type PostLoc } from "../../supabase/functions/_shared/posts.ts";
import { checkPost } from "../../supabase/functions/_shared/posts/checks.ts";

const arg = (n: string, d: string) => {
  const i = Deno.args.indexOf(`--${n}`);
  return i >= 0 ? Deno.args[i + 1] : d;
};
/** A budget is a plain number of US dollars, 0 or more; anything else stops the run before any call (a NaN would never stop). */
function budget(name: string, dflt: string): number {
  const raw = arg(name, dflt);
  const n = /^\d+(\.\d+)?$/.test(raw.trim()) ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n < 0) {
    console.log(
      `--${name} must be a number of US dollars like 0.4 (got "${raw}"); nothing was run`,
    );
    Deno.exit(2);
  }
  return n;
}
const BUDGET_ANSWERS = budget("budget-answers", "0.4");
const BUDGET_POSTS = budget("budget-posts", "0.6");
const usd = (micros: number) => micros / 1_000_000;
const out: Record<string, unknown> = { answers: [], posts: [] };

// ── 1. AI Answers extraction ──
let spentA = 0;
const REC = recordFromKnowledge(fx.knowledge as KnowledgeRow[]);
const CHECK = task("scout", "check_facts");
// The next call is started only when the budget has room for it, at the largest cost seen so far (at least 2 cents).
let worstA = 20_000;
let passA = 0,
  runA = 0;
for (const c of fx.cases) {
  if (spentA + usd(worstA) > BUDGET_ANSWERS) {
    console.log(`answers: budget reached at ${spentA.toFixed(4)} USD, stopped`);
    break;
  }
  // The production step (liveExtractor in accuracy.ts), with the meter kept here so a failed call's cost is counted too.
  const meter = newMeter("scout");
  let got: { claims: ReturnType<typeof parseClaims>; costMicros: number };
  try {
    const text = await message(
      CHECK.model,
      EXTRACT_SYSTEM,
      extractUser({ answer: c.answer, business: fx.business, area: "Williamsburg" }),
      CHECK.maxTokens,
      meter,
      { schema: EXTRACT_SCHEMA },
    );
    let claims: ReturnType<typeof parseClaims> = [];
    try {
      claims = parseClaims(parseJson(text));
    } catch {
      /* not the schema: states nothing, as in production */
    }
    got = { claims, costMicros: meterCost(meter) };
  } catch (e) {
    const cost = usd(meterCost(meter));
    spentA += cost;
    runA++;
    (out.answers as unknown[]).push({
      name: c.name,
      ok: false,
      costUsd: cost,
      error: String(e).slice(0, 200),
    });
    console.log(
      `answers | ERROR | ${c.name} | ${cost.toFixed(5)} USD | ${String(e).slice(0, 200)}`,
    );
    continue;
  }
  worstA = Math.max(worstA, got.costMicros);
  spentA += usd(got.costMicros);
  const r = compare(got.claims, REC, c.answer, fx.business);
  const diffs = r.differences.map((d) => ({
    fact: d.fact,
    detail: d.detail,
    said: d.said,
    day: d.day,
  }));
  const ok =
    JSON.stringify(diffs) === JSON.stringify(c.expect.differences) &&
    JSON.stringify([...r.agree].sort()) === JSON.stringify([...c.expect.agree].sort());
  runA++;
  if (ok) passA++;
  (out.answers as unknown[]).push({
    name: c.name,
    ok,
    costUsd: usd(got.costMicros),
    got: { differences: diffs, agree: r.agree },
    want: c.expect,
    claims: got.claims,
  });
  console.log(
    `answers | ${ok ? "pass" : "FAIL"} | ${c.name} | ${usd(got.costMicros).toFixed(5)} USD${ok ? "" : ` | got ${JSON.stringify({ differences: diffs, agree: r.agree })} want ${JSON.stringify(c.expect)}`}`,
  );
}
console.log(
  `answers: ${passA} of ${runA} match the fixture's expectation, ${spentA.toFixed(4)} USD`,
);

// ── 2. Post drafting ──
type Ex = {
  loc: Partial<PostLoc> & { name: string };
  keywords: string[];
  note: string;
  forbid: RegExp[];
  website: string | null;
};
const base = {
  id: "qa2",
  status: "active",
  place_id: null,
  time_zone: "America/New_York",
  google_account_id: null,
  google_location_id: null,
  post_slot: null,
  category: null,
  area: null,
};
const EXAMPLES: Ex[] = [
  {
    loc: {
      name: "Rose Lane Salon",
      category_label: "Hair salon",
      area: "Williamsburg",
      card: {
        services: "Haircuts, hair color, blow-dries",
        about: "A small salon with three chairs.",
      },
    },
    keywords: ["hair salon in Williamsburg"],
    note: "We now do balayage on Saturdays. Book with Maya.",
    forbid: [/\$\d|percent|%|discount|award|best|\d{3}[-. ]\d{4}/i],
    website: "https://roselanesalon.com",
  },
  {
    loc: {
      name: "Harbor Bakes",
      category_label: "Bakery",
      area: "Park Slope",
      card: { services: "Bread, pastries, birthday cakes", hours_note: "Closed on Mondays" },
    },
    keywords: ["bakery in Park Slope"],
    note: "Pumpkin loaf is back for the fall.",
    forbid: [/\$\d|every day|7 days|award|best|free/i],
    website: null,
  },
  {
    loc: {
      name: "Bright Smile Dental",
      category_label: "Dentist",
      area: "Austin",
      card: { services: "Cleanings, fillings, whitening", about: "Family dentist." },
    },
    keywords: ["dentist in Austin"],
    note: "We added early appointments at 7:30 on Tuesdays.",
    forbid: [/pain-free|painless|guarantee|results|best|\$\d/i],
    website: "https://brightsmile.example",
  },
  {
    loc: {
      name: "Taco Corner",
      category_label: "Mexican restaurant",
      area: "Logan Square",
      card: { services: "Tacos, burritos, catering", delivery: "Delivery through our website" },
    },
    keywords: ["tacos in Logan Square"],
    note: "New this week: a mushroom al pastor taco.",
    forbid: [/\$\d|best|award|every day|happy hour|beer|margarita/i],
    website: "https://tacocorner.example",
  },
  {
    loc: {
      name: "Iron Works Gym",
      category_label: "Gym",
      area: "Denver",
      card: { services: "Open gym, small group classes, personal training" },
    },
    keywords: ["gym in Denver"],
    note: "Our new kettlebell class starts on November 10 at 6 pm.",
    forbid: [/lose \d|weight loss|guarantee|best|\$\d|free trial/i],
    website: "https://ironworks.example",
  },
];
let worstP = 60_000;
let spentP = 0,
  passP = 0,
  runP = 0;
const DRAFT = task("growth", "draft_post");
for (const ex of EXAMPLES) {
  if (spentP + usd(worstP) > BUDGET_POSTS) {
    console.log(`posts: budget reached at ${spentP.toFixed(4)} USD, stopped`);
    break;
  }
  const loc = { ...base, ...ex.loc } as PostLoc;
  const meter = newMeter("growth");
  let raw: string;
  try {
    raw = (
      await draftMessage(postSystem(loc, ex.keywords), ex.note, DRAFT.maxTokens, meter, {
        effort: DRAFT.effort,
      })
    ).text;
  } catch (e) {
    const cost = usd(meterCost(meter));
    spentP += cost;
    runP++;
    (out.posts as unknown[]).push({
      name: ex.loc.name,
      ok: false,
      costUsd: cost,
      error: String(e).slice(0, 200),
    });
    console.log(
      `posts | ERROR | ${ex.loc.name} | ${cost.toFixed(5)} USD | ${String(e).slice(0, 200)}`,
    );
    continue;
  }
  worstP = Math.max(worstP, meterCost(meter));
  const text = noDashes(raw.replace(/^["“]|["”]$/g, "").trim()).slice(0, 1500);
  const cost = usd(meterCost(meter));
  spentP += cost;
  const allowedText = `${JSON.stringify(ex.loc.card)}\n${ex.note}`;
  const issues = checkPost(
    {
      type: "STANDARD",
      summary: text,
      title: null,
      terms: null,
      ctaType: null,
      ctaUrl: null,
    } as never,
    {
      allowedText,
      kabsiDraft: true,
      recent: [],
      categoryLabel: ex.loc.category_label ?? null,
      city: ex.loc.area ?? null,
      businessName: ex.loc.name,
      category: null,
      country: "US",
      website: ex.website,
    } as never,
  ).map((i) => i.code);
  const rubric = {
    rules: issues.length === 0,
    noDashOrBang: !/[–—!]/.test(raw),
    // The whole search phrase, in the first 80 characters, as the prompt asks.
    keywordEarly: (() => {
      const at = text.toLowerCase().indexOf(ex.keywords[0].toLowerCase());
      return at >= 0 && at + ex.keywords[0].length <= 80;
    })(),
    grounded: !ex.forbid.some((f) => f.test(text)),
    noHashtagOrEmoji: !/#\w|\p{Extended_Pictographic}/u.test(text),
  };
  const ok = Object.values(rubric).every(Boolean);
  runP++;
  if (ok) passP++;
  (out.posts as unknown[]).push({
    name: ex.loc.name,
    ok,
    costUsd: cost,
    rubric,
    issues,
    chars: text.length,
    text,
  });
  console.log(
    `posts | ${ok ? "pass" : "FAIL"} | ${ex.loc.name} | ${cost.toFixed(5)} USD | ${JSON.stringify(rubric)} ${issues.join(",")}\n  ${text.replace(/\n/g, " / ")}`,
  );
}
console.log(`posts: ${passP} of ${runP} pass the rubric, ${spentP.toFixed(4)} USD`);
out.total = { answersUsd: spentA, postsUsd: spentP };
await Deno.writeTextFile("qa2-ai-live.json", JSON.stringify(out, null, 1));
console.log(`total: ${(spentA + spentP).toFixed(4)} USD`);
