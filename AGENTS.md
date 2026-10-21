The plan is `docs/KABSI-PLAN.md` and progress is `docs/KABSI-PROGRESS.md`. Read section 1 (guardrails) and section 2 (rules for every build chat) of the plan before changing anything. Nora's facts file is `knowledge/kabsi-facts.md`. Use only the design tokens.

- If a task adds visitor-region logic (only what the law or consent needs, K-123), keep it in `src/lib/region.ts` so hydration-safe detection stays consistent across public and signed-in pages.
- Keep shared Manager invite instructions in `ManagerAccessInstructions` so onboarding and the public handoff page stay aligned.
