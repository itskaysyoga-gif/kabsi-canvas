The plan is `docs/KABSI-PLAN.md` and progress is `docs/KABSI-PROGRESS.md`. Read the guardrails and section 2 (rules for every build chat) of the plan, then `docs/KABSI-MASTERPLAN.md`, before changing anything; the task cards are in `docs/plan/archive/` and the progress history in `docs/progress/archive/`. Nora's facts are written in `knowledge/facts/` and built into `knowledge/kabsi-facts.md` by `node scripts/build-kb.mjs`. Use only the design tokens.

- If a task adds visitor-region logic (only what the law or consent needs, K-123), keep it in `src/lib/region.ts` so hydration-safe detection stays consistent across public and signed-in pages.
- Keep shared Manager invite instructions in `ManagerAccessInstructions` so onboarding and the public handoff page stay aligned.
