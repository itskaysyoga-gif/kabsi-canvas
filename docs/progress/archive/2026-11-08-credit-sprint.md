# Credit sprint (R-129, 8 Nov 2026)

Lane R decision R-129: the promotional Anthropic credit (about 78 US dollars) ends on 17 Nov 2026. At most 65 US dollars of it is spent, all through the existing GitHub Actions workflows that hold the secret ANTHROPIC_API_KEY. Every model call is started by hand (no schedule, no switch left on). The key was never printed, copied or asked for.

## Ledger

Real cost is the cost the run itself printed (drafts, Nora's answers and the judge, from the token counts). Running total stops at 65.

| # | Date (UTC) | Run | Part | What | Budget (USD) | Real cost (USD) | Running total (USD) |
|---|---|---|---|---|---|---|---|
| 1 | 8 Nov 08:43 | [42464112623](https://github.com/itskaysyoga-gif/kabsi-canvas/actions/runs/42464112623) | A | Eval live on main, default budgets: replies (27.9 cut, 164 cases, judged) and Nora (88 questions, judged) | 5 + 2.5 | 0.689 + 2.507 = 3.196 | 3.20 |

## A. Baseline (run 1, main at 924e219)

Judge: claude-haiku-4-5-20251001. Scores are means of 1 to 5.

| Prompt version | Cases | Ready / judged | grounded | answers | voice | language | safety | length | overall | Gate |
|---|---|---|---|---|---|---|---|---|---|---|
| reply.v3 | 164 | 107 judged | 4.95 | 4.40 | 4.16 | 4.94 | 4.93 | 4.96 | 4.72 | blocked: 2 Spanish replies signed "The Corner Loaf team" (I-017, I-018); 0 invented facts, 0 followed injections, 0 compensation, 0 health breaks, high-risk routing 33 of 33 |

| Prompt version | Questions | Judged | accurate | helpful | honest | style | overall | Gate |
|---|---|---|---|---|---|---|---|---|
| nora | 88 | 22 (the 2.5 USD budget was reached while judging) | 4.86 | 4.45 | 5.00 | 4.68 | 4.75 | blocked: 3 honesty findings (n63, n66, n67: a [COMING] item not called not available yet), 9 rule findings (en11, en18, en28, en39 twice, en48, ar60, n62 twice) |

Reading of the baseline:
- Replies: the one gate failure is the sign-off language on Spanish replies (the code check reads the last line). Voice (4.16) and answers (4.40) are the lowest criteria, as in every earlier run.
- Nora: her answers cost about 2.25 USD for 88 questions, so a fully judged run needs about 2.8 USD. The judge's most common note on the 22 it scored is the closing question asking for the visitor's name and business, which it reads as off the question.
