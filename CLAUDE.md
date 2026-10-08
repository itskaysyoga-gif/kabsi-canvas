# Kabsi: instructions for Claude

Kabsi looks after a local business's Google Business Profile: a reply ready for every new review, the listing watched and kept right, photos and posts prepared, a Weekly Care Report, and nothing published without the owner's approval. Brand line: "Your reviews and listing. Taken care of."

## Read first, in this order

1. `docs/KABSI-PLAN.md` sections 1 (guardrails) and 2 (rules for every build chat), then the section for your task.
2. `docs/KABSI-PROGRESS.md`.
3. Only the decisions your task names, in `docs/source/` (KABSI-AUDIT K-01 to K-121, KABSI-GROWTH G-01 to G-47, KABSI-DESIGN, KABSI-VIDEO).

One task per chat. The task ID comes from the prompt. Nothing else is in scope.

## Rules that never bend

- Google's API policies, terms, brand rules and Gate A; Google's review rules (no gating, no incentives, no fake reviews, no per-staff quotas, owner consent before anything is published); the law and the privacy and security of customers' data. Until Gate A every Google call runs in mock mode.
- Every Google write goes through the one publication pipeline with the owner's approval. Never store an owner's Google token; never ask for a Google password or verification code.
- No em dashes, en dashes or exclamation marks anywhere. Product names from K-02 only; never Profile Score, Do now, Listing Shield or Put mine back.
- Only the design tokens (K-108). Phone first at 390 px.
- Secrets never appear in code, commits, logs, pull requests or screenshots.
- Every change that alters behaviour, price or wording updates `knowledge/kabsi-facts.md`.
- The Kabsi Google group ID lives only in `KABSI_GROUP_ID` in `src/lib/site.ts`; Lebanon-only wording only through `src/lib/region.ts`.

## Git and deploys

- `main` deploys the website on Vercel and every Edge Function and the Worker on push. Keep `main` working; never force-push, rebase, amend or squash pushed commits; never hand-edit `src/routeTree.gen.ts`.
- One branch and one pull request per task (`claude/<task-id>`). Migrations are new files, additive first; apply them yourself with the Supabase connector before merging, without asking.
- Run the checks in plan section 2.4, open the pull request, make sure CI is green, update `docs/KABSI-PROGRESS.md` on the branch, merge the pull request yourself (merge commit, never on red CI), run the After-merge checks you can, then give Hussein the PR link and a 3-line summary. Hussein runs the project (plan R-26).
- Stop and ask only before dropping tables or columns or deleting real data, before a step the task marks "Ask Hussein before", or when a task needs a manual step of Hussein's that PROGRESS does not record as done.
