// RB-C2 guards for the request book's code half (supabase/functions/_shared/request-book).
//   1. No shared file uses a trade word. Only packs may: a pack is where a trade lives (build-decisions: "Kinds are data").
//   2. Nothing under whatsapp/ imports request-book yet. The code is dark until a later session wires it, with Rashid's go.
// And a check that the code's lists agree with the database migrations of PR A, PR B and RB-C1.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  KINDS,
  ORIGIN_CHANNELS,
  INTAKE_SOURCES,
  OPEN_STATUSES,
  OUTCOMES,
} from "../supabase/functions/_shared/request-book/types";
import {
  CORRECTABLE_FIELDS,
  STAFF_CORRECTABLE_FIELDS,
  UNDO_WINDOW_MINUTES,
  moveRule,
} from "../supabase/functions/_shared/request-book/policy";
import { TOOLS, UNDO_BUTTON } from "../supabase/functions/_shared/request-book/tools/registry";
import { KNOWN_REFUSALS } from "../supabase/functions/_shared/request-book/replies/index";

const ROOT = join(__dirname, "..");
const BOOK = join(ROOT, "supabase/functions/_shared/request-book");
const FUNCTIONS = join(ROOT, "supabase/functions");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".ts")) out.push(p);
  }
  return out;
}

export const TRADE_WORDS = /\b(salons?|garages?|vehicles?|plates?|mileage|gyms?)\b/i;

/** Lines of a file that import or re-export something from request-book. */
export function importsRequestBook(src: string): boolean {
  return /(?:from|import)\s*\(?\s*["'][^"']*request-book[^"']*["']/.test(src);
}

describe("RB-C2 guard: no shared file uses a trade word", () => {
  // Only a pack file, <id>.v<N>.ts, the fixture packs of the tests and packs/index.ts (the one list of which pack files
  // Kabsi ships, which has to name them) may hold a trade word. The schema is shared code and is scanned like the rest.
  const isPack = (rel: string) =>
    /^packs\/[a-z_]+\.v\d+\.ts$/.test(rel) ||
    rel === "packs/index.ts" ||
    rel.startsWith("packs/test-fixtures/");
  const shared = walk(BOOK).filter((f) => !isPack(relative(BOOK, f)) && !f.endsWith(".test.ts"));

  it("finds the shared files it is meant to scan", () => {
    const names = shared.map((f) => relative(BOOK, f));
    expect(names).toEqual(
      expect.arrayContaining([
        "types.ts",
        "policy.ts",
        "index.ts",
        "tools/registry.ts",
        "replies/index.ts",
        "replies/words.ts",
        "intake/adapter.ts",
        "normalize/phone.ts",
        "normalize/dates.ts",
        "normalize/vocabulary.ts",
        "packs/schema.ts",
      ]),
    );
    expect(names.some((n) => /\.v\d+\.ts$/.test(n))).toBe(false);
    expect(shared.length).toBeGreaterThanOrEqual(13);
  });

  it("the pattern catches each trade word, in either case and as a plural", () => {
    for (const w of ["salon", "Salons", "garage", "vehicle", "Plates", "mileage", "gym", "GYMS"])
      expect(TRADE_WORDS.test(`the ${w} here`), w).toBe(true);
    for (const ok of ["template", "plated", "garageV1", "gymnast", "vehicular", "salonV1"])
      expect(TRADE_WORDS.test(`the ${ok} here`), ok).toBe(false);
  });

  it("no shared file contains one", () => {
    const hits: string[] = [];
    for (const f of shared) {
      readFileSync(f, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (TRADE_WORDS.test(line)) hits.push(`${relative(ROOT, f)}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(hits).toEqual([]);
  });

  it("the packs do hold them, which is where they belong", () => {
    const packs = walk(join(BOOK, "packs")).filter(
      (f) => /\.v1\.ts$/.test(f) && !f.includes("test-fixtures"),
    );
    expect(packs.map((f) => relative(BOOK, f)).sort()).toEqual([
      "packs/garage.v1.ts",
      "packs/gym.v1.ts",
      "packs/salon.v1.ts",
    ]);
    const all = packs.map((f) => readFileSync(f, "utf8")).join("\n");
    expect(TRADE_WORDS.test(all)).toBe(true);
  });
});

describe("RB-C2 guard: the source holds no Arabic script and no dash, only escapes", () => {
  it("every character in every file of the folder is plain ASCII", () => {
    const hits: string[] = [];
    for (const f of walk(BOOK)) {
      readFileSync(f, "utf8")
        .split("\n")
        .forEach((line, i) => {
          // eslint-disable-next-line no-control-regex
          if (/[^\x00-\x7f]/.test(line)) hits.push(`${relative(ROOT, f)}:${i + 1}`);
        });
    }
    expect(hits).toEqual([]);
  });
});

describe("RB-C2 guard: nothing under whatsapp/ imports request-book yet", () => {
  const whatsappDirs = [
    join(FUNCTIONS, "_shared/whatsapp"),
    ...readdirSync(FUNCTIONS)
      .filter((n) => /whatsapp/i.test(n) && n !== "_shared")
      .map((n) => join(FUNCTIONS, n)),
  ];

  it("scans the whatsapp code it is meant to scan", () => {
    const files = whatsappDirs.flatMap((d) => walk(d));
    expect(files.length).toBeGreaterThan(20);
    expect(files.some((f) => f.endsWith("router.ts"))).toBe(true);
  });

  it("the pattern catches an import, an export from and a dynamic import", () => {
    expect(importsRequestBook(`import { TOOLS } from "../request-book/tools/registry.ts";`)).toBe(
      true,
    );
    expect(importsRequestBook(`export * from "../request-book/index.ts"`)).toBe(true);
    expect(importsRequestBook(`const m = await import("../request-book/index.ts");`)).toBe(true);
    expect(importsRequestBook(`import "../request-book/index.ts";`)).toBe(true);
    expect(importsRequestBook(`// the request book comes later: request-book`)).toBe(false);
    expect(importsRequestBook(`import { x } from "../hours.ts";`)).toBe(false);
  });

  it("no file there imports it", () => {
    const hits = whatsappDirs
      .flatMap((d) => walk(d))
      .filter((f) => importsRequestBook(readFileSync(f, "utf8")))
      .map((f) => relative(ROOT, f));
    expect(hits).toEqual([]);
  });
});

describe("RB-C2: the code's lists agree with the database", () => {
  const core = readFileSync(
    join(ROOT, "supabase/migrations/20261108174647_request_book_core.sql"),
    "utf8",
  );
  const fns = readFileSync(
    join(ROOT, "supabase/migrations/20261108183317_request_book_functions.sql"),
    "utf8",
  );
  const reads = readFileSync(
    join(ROOT, "supabase/migrations/20261108200837_request_book_reads.sql"),
    "utf8",
  );
  const quoted = (s: string) => [...s.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]!);

  it("kinds, statuses and outcomes", () => {
    expect(quoted(core.match(/check \(kind in \(('enquiry'[^)]*)\)\)/)![1]!)).toEqual([...KINDS]);
    const c = core.match(
      /constraint customer_requests_kind_status check \(([\s\S]*?)\),\n {2}constraint customer_requests_closed/,
    )![1]!;
    for (const kind of KINDS) {
      const part = c.split(`kind = '${kind}'`)[1]!.split("or (kind")[0]!;
      const [statusPart, outcomePart] = part.split("outcome is null or outcome in");
      const statuses = quoted(statusPart!.match(/status in \(([^)]*)\)/)![1]!);
      expect(statuses, kind).toEqual([...OPEN_STATUSES[kind], "closed"]);
      expect(quoted(outcomePart!.match(/\(([^)]*)\)/)![1]!), kind).toEqual([...OUTCOMES[kind]]);
    }
  });

  it("origin channels and intake sources", () => {
    expect(
      quoted(
        core.match(
          /origin_channel text not null default 'unknown' check \(origin_channel in\s*\(([^)]*)\)/,
        )![1]!,
      ),
    ).toEqual([...ORIGIN_CHANNELS]);
    expect(quoted(core.match(/source text not null check \(source in \(([^)]*)\)\)/)![1]!)).toEqual(
      [...INTAKE_SOURCES],
    );
  });

  it("the fields request_correct accepts, and the ones staff may change", () => {
    const correct = fns.slice(fns.indexOf("create function public.request_correct"));
    const list = quoted(
      correct.match(/v_allowed text\[\] := array\[([^\]]*)\]/)![1]!.replace(/\s+/g, " "),
    );
    expect(list).toEqual([...CORRECTABLE_FIELDS]);
    expect(quoted(correct.match(/v_any_role text\[\] := array\[([^\]]*)\]/)![1]!)).toEqual([
      ...STAFF_CORRECTABLE_FIELDS,
    ]);
  });

  it("the Undo window", () => {
    expect(fns).toContain(`interval '${UNDO_WINDOW_MINUTES} minutes'`);
  });

  it("the table of moves: every allowed move in the migration is allowed in the code, with the same flags", () => {
    const rule = fns.slice(
      fns.indexOf("create function private.rb_rule"),
      fns.indexOf("-- The only place request fields are written"),
    );
    // The plain moves and the one skipped step.
    for (const triple of [
      "'enquiry', 'new', 'contacted'",
      "'job', 'waiting', 'active'",
      "'job', 'active', 'ready'",
      "'job', 'ready', 'active'",
    ])
      expect(rule).toContain(triple);
    expect(rule).toContain("('job', 'waiting', 'ready')");
    // Every flag the migration can write is one the code knows.
    const sqlFlags = [
      ...new Set([...rule.matchAll(/array\['([a-z_]+)'\]/g)].map((m) => m[1]!)),
    ].sort();
    expect(sqlFlags).toEqual([
      "arrival_not_recorded",
      "attended_before_time",
      "attended_without_time",
      "no_show_before_time",
    ]);
    const codeFlags = new Set<string>();
    for (const kind of KINDS)
      for (const from of OPEN_STATUSES[kind])
        for (const o of [null, ...OUTCOMES[kind]]) {
          for (const to of [...OPEN_STATUSES[kind], "closed"])
            for (const [passed, set] of [
              [false, false],
              [false, true],
              [true, true],
            ] as const) {
              const r = moveRule({ kind, from, to, outcome: o }, passed, set);
              r.flags.forEach((f) => codeFlags.add(f));
            }
        }
    expect([...codeFlags].sort()).toEqual(sqlFlags);
    expect(fns).toContain("v_flags := array['confirmations_cleared']");
    expect(fns).toContain("array['reopened']");
  });

  it("every reason the database gives has words in the replies, except the question it asks instead", () => {
    const reasons = new Set(
      [...(fns + reads).matchAll(/rb_refuse\('([a-z_]+)'/g)].map((m) => m[1]!),
    );
    reasons.add("disabled");
    reasons.add("not_member");
    const missing = [...reasons].filter(
      (r) => !KNOWN_REFUSALS.includes(r) && r !== "needs_confirmation",
    );
    expect(missing).toEqual([]);
  });

  it("every database function a tool names exists, and only the service role may run it", () => {
    const names = new Set([
      ...TOOLS.capture.database,
      ...TOOLS.find.database,
      ...TOOLS.list_open.database,
      ...TOOLS.update.database,
      ...TOOLS.correct.database,
      ...TOOLS.summarize.database,
      UNDO_BUTTON.database,
    ]);
    for (const n of names) {
      expect(`${fns}\n${reads}`, n).toMatch(new RegExp(`create function public\\.${n}\\(`));
      expect(`${fns}\n${reads}`, n).toMatch(
        new RegExp(`grant execute on function public\\.${n}\\([^)]*\\) to service_role`),
      );
    }
  });
});

describe("RB-D guard: the extraction step is a new prompt, outside the reply prompt folder, with no network", () => {
  const extract = readFileSync(join(BOOK, "extract.ts"), "utf8");
  const promptsDir = join(FUNCTIONS, "_shared/ai/prompts");

  it("keeps its prompt in the request book, so the reply Prompt gate (a change under ai/prompts) is untouched", () => {
    expect(extract).toContain("buildPrompt");
    for (const f of readdirSync(promptsDir)) {
      expect(readFileSync(join(promptsDir, f), "utf8"), f).not.toMatch(
        /owner_message|already_arranged/,
      );
    }
    const ci = readFileSync(join(ROOT, ".github/workflows/ci.yml"), "utf8");
    expect(ci).toContain("grep -q '^supabase/functions/_shared/ai/prompts/'");
  });

  it("calls no network, reads no secret and imports no model client: the model is an injected function", () => {
    expect(extract).not.toMatch(/\bfetch\s*\(|Deno\.env|ANTHROPIC|api\.anthropic|ai\/client/);
    expect(extract).toMatch(/export type Ask = /);
  });

  it("uses the small check model, from the one place model ids live", () => {
    expect(extract).toMatch(/EXTRACT_MODEL = MODELS\.check/);
    expect(extract).not.toMatch(/claude-[a-z]+-\d/);
  });

  it("has no word that claims a fact in the lines it writes itself", () => {
    const lines = extract.split("\n").filter((l) => /finish\(|lines\.push\(/.test(l));
    expect(lines.length).toBeGreaterThan(5);
    for (const l of lines) expect(l, l).not.toMatch(/\b(booked|available|confirmed)\b/i);
  });
});
