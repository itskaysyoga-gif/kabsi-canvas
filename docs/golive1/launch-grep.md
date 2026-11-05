# Go live 1: every remaining "launch" after part A4 (5 Nov 2026)

Command, run on branch `claude/golive1-a4` after the changes:

```
grep -rn -i "launch" src supabase/functions emails knowledge | grep -v node_modules | grep -v src/routeTree.gen.ts
```

41 hits. None is "At launch", "opens at launch" or "from launch" in a line a reader sees.

| Where | Hits | Why it stays |
|---|---|---|
| `src/components/assistant/assistant-widget.tsx`, `deferred-assistant.tsx`, `src/components/kabsi/site-chrome.tsx`, `page-signals.ts`, `src/components/onboarding/onboarding-shell.tsx`, `src/lib/after-paint.ts` | 28 | "launcher": Nora's round button (code names and comments), not the launch |
| `src/components/staff/validation-panel.tsx:164` | 1 | "Tested from launch day.": staff-only validation view (Scope 1), about the paid-demand track, never public |
| `supabase/functions/_shared/visibility/terms.ts:3, 32` | 2 | "launch market", "Launch markets": the UAE and the UK as first markets (30.16 section 2), code comments |
| `supabase/functions/_shared/onboarding/stages.ts:162` | 1 | the word "launch" inside a regular expression that spots an owner saying they launched a new service |
| `supabase/functions/_shared/whatsapp/conversations.test.ts:512` | 1 | a test name about the sender before owners are switched on; test code, never shown |
| `knowledge/facts/01-decisions-coming-and-changing.md:108` (and `knowledge/kabsi-facts.md:116`) | 2 | "only an idea for after launch": an assistant on the business's own number is not offered; true and says nothing opens at launch |
| `knowledge/facts/01-decisions-coming-and-changing.md:132` (and `kabsi-facts.md:140`) | 2 | "The Early access pricing label stays until the launch gate": a dated record of 22 Oct 2026 about pricing; the payment lines stay |
| `knowledge/facts/02-facts-that-change.md:11` (and `kabsi-facts.md:165`) | 2 | "Start free replaces Join early access only after the launch gate (plan R-02)": a call to action rule tied to payments |
| `knowledge/facts/06-pricing-and-payment.md:29` (and `kabsi-facts.md:433`) | 2 | "Card checkout through Creem ... opens at the launch gate": a payment line, kept exactly (30.28: card payments stay closed) |

Not in the list above because the command does not cover them: `scripts/polish3-shots.mjs` (an old screenshot script whose comment names NEARBY_ON) and `docs/` (plans and records keep their history).
