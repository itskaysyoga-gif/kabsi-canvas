# Kabsi facts: how they are kept

This folder is for the team's notes about the facts. Nothing in it is ever read by the generator, so nothing in it reaches Nora, the website, `knowledge/kabsi-facts.md`, `public/llms-full.txt` or `public/llms.txt`.

## The split (master plan 27.12)

- `knowledge/facts/` holds the public facts that Nora and the site use, one numbered file per section of the old single file, plus `llms.txt` (the short file). The files are joined in file-name order.
- `knowledge/internal/` holds notes: why a line says what it says, open questions about a fact, wording that is not decided. A note goes here when it must not be shown to an owner or to an AI search engine.
- `knowledge/kabsi-facts.md`, `public/llms-full.txt` and `public/llms.txt` are generated. Do not edit them by hand.

## Changing a fact

1. Edit the numbered file in `knowledge/facts/` (the file name says the section).
2. Run `node scripts/build-kb.mjs`. `node scripts/build-kb.mjs --check` fails when an output is out of date; `tests/knowledge-build.test.ts` and CI do the same.
3. Every change that alters behaviour, price or wording updates the facts in the same pull request (K-104). Features not built yet carry **[COMING]**, removals still in force carry **[CHANGING]**; the card that builds or removes them changes the marker.
4. Nora's evaluation (`node scripts/nora-eval/run-nora-eval.ts --stub pass`) reads the generated facts through `scripts/kb-lib.mjs`.

## House rules for the facts

No em dashes, en dashes or exclamation marks; no Arabic shown in public facts (R-61); Facebook and Instagram links only from the one list (R-59); prices only as in `src/lib/site.ts`; never an industry statistic or a claim about what Google rewards (K-144).

## Notes

None yet. When the first team-only note is needed, add it here as its own file and link it from this list.
