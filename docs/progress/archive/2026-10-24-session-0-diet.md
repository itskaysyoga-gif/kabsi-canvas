### Session 0 part 2: the docs diet (branch claude/session-0-diet, 24 Oct 2026, Sonnet)

Master plan 27.12 and R-85. Docs, one generator script and the tests that read the facts. No product code, migration or Edge Function changed. Text was moved, never deleted: every non-empty line of the old plan and of the old PROGRESS is in the index, the status page or an archive file (checked by script before the commit).

## What moved where

- `docs/KABSI-PLAN.md` (386,044 bytes) is now an index (29,641 bytes): the guardrails by title, section 2 (rules for every build chat) and section 3 in full, the decision table R-01 to R-89 with status, a short order of work, and a table of where everything went. The rest moved word for word to `docs/plan/archive/` (19 files, 372,641 bytes, one per original section; each starts with a one-line comment saying where it came from). Rules 2.2 and 2.7 gained a paragraph each about the new facts and status procedure.
- `docs/KABSI-PROGRESS.md` (756,697 bytes) is now the one-page status (5,890 bytes) with the WhatsApp ladder of master plan 25.5. Its old sections moved word for word to `docs/progress/archive/` (12 files, 758,499 bytes with this one): where-things-stand, rashids-decisions-and-inputs, steps-only-rashid-can-do, tasks, after-merge, evidence, found-not-done, decisions-to-confirm, found-not-done-by-p0-1-02a, test-data-to-delete-at-go-live, log.
- `knowledge/kabsi-facts.md` (167,930 bytes) was split by section into `knowledge/facts/` (16 numbered files plus `llms.txt`, 174,152 bytes). One generator, `node scripts/build-kb.mjs` (library `scripts/kb-lib.mjs`), joins them into the combined facts file, `public/llms-full.txt` and `public/llms.txt`. The outputs are byte for byte what they were before the split (`git status` showed no change to them), so Nora, the site and the llms files are unchanged. `--check` fails when an output is out of date. `knowledge/internal/` has a README that explains the rules; it holds no notes yet because nothing in the old file was written only for the team, and it is never read by the generator.
- Tests now read the facts through the generator: `tests/helpers/facts.ts` (`readText`), used by nora-sync, website-home, prices, claims-k144, whatsapp, whatsapp-privacy, free-tool-busy and onboarding-help; the Nora runner uses `buildFacts()`; new `tests/knowledge-build.test.ts` proves the committed copies equal the generator output and that notes never reach an output. `tests/whatsapp.test.ts` now also skips the two archive folders in its old-number scan. `scripts/deno-check.sh` copies the generator and `knowledge/facts` into its scratch folder; the Nora gate in `ci.yml` also fires on changes to `knowledge/facts/` and `scripts/kb-lib.mjs`.
- Read-first pointers updated: `CLAUDE.md` (read-first list and the facts rule), `README.md`, `AGENTS.md`, the `kabsi-build-session` and `kabsi-copy` skills, `docs/platforms.md`.

## Sizes (bytes, before on main after Session 0 part 1, then after)

| File | Before | After |
|---|---|---|
| docs/KABSI-PLAN.md | 386,044 | 29,641 |
| docs/KABSI-PROGRESS.md | 756,697 | 5,890 |
| knowledge/kabsi-facts.md | 167,930 | 167,930 (generated) |
| public/llms-full.txt | 168,269 | 168,269 (generated) |
| CLAUDE.md | 3,188 | 4,034 |
| docs/KABSI-MASTERPLAN.md | 101,296 | 101,296 |

## Checks run

`npx vitest run` (434 pass, 56 files), `npm run typecheck`, `node scripts/build-kb.mjs --check`, `node scripts/nora-eval/run-nora-eval.ts --stub pass` (gate passed), eslint on every changed script and test file. Not run locally: `deno check` (no Deno in the session; CI runs `scripts/deno-check.sh`), `npm run build` and the database suite (no code or function changed).

## Found, not done

- Facts that mention card IDs and build history (the 21 Oct block in `knowledge/facts/01-decisions-coming-and-changing.md`) read like team notes, but Nora's evaluation rests on them, so they stayed public. Moving them to `knowledge/internal/` is a wording job for a later facts session.
- The archive keeps its original headings and numbering, so a search for "section 7" finds both the index and the archive. The index (section 8) is the map.
