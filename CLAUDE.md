# Kabsi: instructions for Claude

Kabsi looks after a local business's Google Business Profile: a reply ready for every new review, the listing watched and kept right, photos and posts prepared, a Weekly Care Report, and nothing published without the owner's approval. Brand line: "Your reviews and listing. Taken care of." Kabsi does not use Lovable.

## Read first, in this order

1. `CLAUDE.md` (this file).
2. `docs/KABSI-PLAN.md`, the plan index (under 40 KB): the guardrails list, section 2 (rules for every build chat) and the decision table with status. The full text of a guardrail, the task cards and everything else that used to be in the plan are in `docs/plan/archive/`; the index section "Where everything went" says which file.
3. `docs/KABSI-MASTERPLAN.md`, the always-read core. Later sections win over earlier ones where they differ: 30 over 29 over 28 over 27 over everything older; an older section that a newer one replaces starts with a "Replaced by" or "Changed by" line.
4. `docs/KABSI-PROGRESS.md`, the one-page status (under 10 KB) with the WhatsApp ladder. Its history is in `docs/progress/archive/`.
5. Only what the task names: its card in `docs/plan/archive/`, and the decisions it names in `docs/source/` (KABSI-AUDIT K-01 to K-146, KABSI-GROWTH G-01 to G-47, KABSI-DESIGN, KABSI-VIDEO).

One task per chat. The task ID comes from the prompt. Nothing else is in scope.

## Rules that never bend

- Google's API policies, terms, brand rules and Gate A; Google's review rules (no gating, no incentives, no fake reviews, no per-staff quotas, owner consent before anything is published); the law and the privacy and security of customers' data. Until Gate A every Google call runs in mock mode.
- Every Google write goes through the one publication pipeline with the owner's approval. Never store an owner's Google token; never ask for a Google password or verification code.
- No em dashes, en dashes or exclamation marks anywhere. Product names from K-02 only; never Profile Score, Do now, Listing Shield or Put mine back.
- Only the design tokens (K-108). Phone first at 390 px.
- Facebook and Instagram links appear everywhere through the one `SOCIAL_LINKS` constant (R-59).
- No Arabic is shown anywhere public: website, marketing, ads, facts, llms files, guides, screenshots, Outbound (R-61).
- Staff alerts go to WhatsApp, never Slack (R-64); existing Slack code stays until session 13b part 2 removes it.
- Secrets never appear in code, commits, logs, pull requests or screenshots.
- Every change that alters behaviour, price or wording updates the facts: edit the numbered file in `knowledge/facts/`, then run `node scripts/build-kb.mjs`, which writes `knowledge/kabsi-facts.md`, `public/llms-full.txt` and `public/llms.txt` (never edit those three by hand). Team-only notes go in `knowledge/internal/` and never reach Nora or the site.
- The Kabsi Google group ID lives only in `KABSI_GROUP_ID` in `src/lib/site.ts`. There is no Lebanon-only wording (K-123); country rules that the law or consent need go in `src/lib/region.ts` when a task adds them.

## Git and deploys

- `main` deploys the website on Vercel and every Edge Function and the Worker on push. Keep `main` working; never force-push, rebase, amend or squash pushed commits; never hand-edit `src/routeTree.gen.ts`.
- One branch and one pull request per task (`claude/<task-id>`). Migrations are new files, additive first; apply them yourself with the Supabase connector before merging, without asking.
- Run the checks in plan section 2.4, open the pull request, make sure CI is green, update `docs/KABSI-PROGRESS.md` on the branch, merge the pull request yourself (merge commit, never on red CI), run the After-merge checks you can, then give Rashid the session report below. Rashid runs the project (plan R-41).
- Stop and ask only before dropping tables or columns or deleting real data, before a step the task marks "Ask Rashid before", or when a task needs a manual step of Rashid's that PROGRESS does not record as done. Creem account steps are Hussein's.

## Session report (master plan 25.6)

End every session with this report, in this order, in plain words:

1. The pull request link.
2. A 3-line summary: what changed, why, what to look at.
3. Tests actually run: the exact commands, and what each printed (pass, fail, count). A check that could not run is listed as not run, with the reason.
4. Verified live, and how: the request, query or screen you checked after the deploy, with the result. Nothing else is "live".
5. Manual steps left for Rashid, each with the exact click path or SQL file and what to expect. Creem account steps are Hussein's.
6. Known limits: what is not covered, what was not run live, what a later session must do.

A merged pull request or a passing mock test is never called "live". The status column of the review decisions (Approved, Building, Merged, Verified live, Retired) moves only with evidence: a pull request number, a check, a live response.
