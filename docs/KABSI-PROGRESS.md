# Kabsi status

One page, under 10 KB. Updated 24 Oct 2026 by Clean 1 (master plan 28.9); first written by Session 0 (the docs diet, master plan 27.12). The history that used to live here (about 750 KB: tasks, After merge checks, evidence, found not done, decisions to confirm, the log) was moved word for word to `docs/progress/archive/`; nothing was deleted. The plan index is `docs/KABSI-PLAN.md`, the core is `docs/KABSI-MASTERPLAN.md`, the order of work is plan section 7.

## Where things stand

- Built and live: sessions 1 to 16, 18, 20, 20a, 20b, hotfix 20h and the 22 Oct sync session. Google is live on Yawmiyati; the first real reply was published and verified; the post removal was verified on Google (23 Oct). kabsi.co runs on Vercel; Creem is the only payment route (test mode, not open). Evidence: `docs/progress/archive/evidence.md` and `where-things-stand.md`.
- Merged 23 and 24 Oct, docs and config only: Session 19 PR 0 (PR 196, the master plan and skills), Ops 1 part A (PR 197, Dependabot, gitleaks, docs/SECRETS.md), Session 0 part 1 (PR 198, master plan sections 20 to 29, decisions R-67 to R-89, the new order of work, the facts lines).
- Session 0 is complete (PR 198 and PR 199, the docs diet).
- Clean 1 (master plan 28.9, PR 200, merged and verified live 24 Oct): unused code, packages, Edge Functions, a script, a page and a skill removed, the Lovable leftovers gone, the database drops written for Rashid. Detail: `docs/progress/archive/2026-10-24-clean-1.md`.
- Next: Wave A: session 19 rest, session 13b part 1, Ops 1 part B.
- No customer is live yet. The launch gate (master plan 27.13) is not started.

## WhatsApp ladder (master plan 25.5)

The facts say "WhatsApp is live" only when the last step is done.

| Step | Done | Proof |
|---|---|---|
| Number acquired | 23 Oct 2026 | +1 205-745-6874 connected in the Kapso project Kabsi.co; Kapso health check Passed 10:17 Beirut (master plan 9.8) |
| Profile set | 23 Oct 2026 | Photo, about, email, address, website and description live; the display name "Kabsi" is waiting for Meta's approval (master plan 9.8) |
| Webhook verified | not yet | Session 13b part 1 registers the webhook with KAPSO_WEBHOOK_SECRET |
| Templates approved | not yet | Session 13b part 1 submits them through Kapso's API |
| Inbound tested | not yet | The 100-conversation suite, then a live pass on Rashid's phone |
| Outbound tested | not yet | A live send to Kabsi's own test phones |
| Owners switched on | not yet | After the launch gate |

## Open for Rashid (as last recorded; the full table is `docs/progress/archive/steps-only-rashid-can-do.md`)

- GitHub repository settings: Dependabot alerts and Dependabot security updates are done (marked 24 Oct by Clean 1, as Rashid asked). Open: Secret Protection (secret scanning and push protection), which Rashid confirms himself.
- Clean 1: run `supabase/manual/20261024_clean1_drops.sql` after a yes to its list (two empty or backup tables, two unused functions).
- Supabase Auth: leaked-password protection; paste the four `emails/auth/*.html` templates (the footer changed again).
- Google Cloud: Places quotas and budget alerts; contacts and owners on kabsi.co addresses only.
- Supabase Pro with point-in-time recovery and Vercel Pro, before the first payment and before card payments open.
- Hussein (Creem only): the Creem account, products and live keys; test keys and the webhook secret in Supabase before session 10.
- A lawyer reads /terms and /privacy; later the partner terms (master plan 29.8).
- Master plan 19.6: two-step verification everywhere, recovery codes offline, the second Kabsi Google account, the R2 bucket for backups.
- V1 needs a free Geoapify key (GEOAPIFY_API_KEY, master plan 28.2); the DataForSEO top-up and Gemini billing come at the launch gate, when the lane R chat says.

## Open After merge checks and findings

- After merge checks that a session could not run (they need a phone or a person) are in `docs/progress/archive/after-merge.md`. The first session of each kind reads the ones for its own area before starting.
- Found, not done: `docs/progress/archive/found-not-done.md`. Decisions to confirm: `docs/progress/archive/decisions-to-confirm.md`.
- New in Session 0 part 1: the facts file still says Kabsi has no WhatsApp number (session 13b part 1 changes it); the session report format of master plan 25.6 is not yet in CLAUDE.md and the kabsi-build-session skill; the master plan has no 10.2.1 or 10.2.2 numbering, so the plan and trial changes sit at the top of its section 10.
- Still open from session 18 (moved to session 19 rest): the post Undo test on the prepared Update (tap the Update's own Approve, not "Approve the month"), P0.7-03 Pub/Sub, and check that yawmiyati.com answers before the Update goes live.

## Recent entries (newest first)

- 24 Oct 2026, Ops 1 part B, PR 0: master plan section 30 committed and recorded as R-90; the 30.1 fixes applied to sections 23 and 27.14. Docs only. The rest of Ops 1 part B follows on claude/ops-1b-2.
- 24 Oct 2026, Clean 1 (master plan 28.9): detail `docs/progress/archive/2026-10-24-clean-1.md`. Tracked files 1,255 to 1,204 (11.59 MB to 11.27 MB), npm packages 438 to 364.
- 24 Oct 2026, Session 0 part 2: docs diet (detail: `docs/progress/archive/2026-10-24-session-0-diet.md`). Plan index 29 KB, status page 5.8 KB; facts split into `knowledge/facts/` and `knowledge/internal/` with one generator (`node scripts/build-kb.mjs`). File sizes are in the pull request.
- 24 Oct 2026, Session 0 part 1 (PR 198): master plan 20 to 29. Detail: `docs/progress/archive/evidence.md`, entry "Session 0 part 1".
- 23 Oct 2026, Ops 1 part A (PR 197). Detail: `docs/progress/archive/evidence.md`, entry "Ops 1 part A".
- 23 Oct 2026, Session 19 PR 0 (PR 196). Detail: `docs/progress/archive/evidence.md`, entry "Session 19 PR 0".

## How a session updates this page

1. Change "Where things stand", the ladder (only with proof, in the Proof column), "Open for Rashid" and "Recent entries" as needed. Keep this page under 10 KB: drop the oldest recent entry when you add one.
2. Put long evidence (commands run, outputs, SQL read-backs, After merge results, found not done, decisions to confirm) in one new file, `docs/progress/archive/<yyyy-mm-dd>-<session>.md`, and link it in one line under "Recent entries".
3. Use the session report of master plan 25.6: the pull request link, a 3-line summary, the tests actually run (exact commands), what was verified live and how, manual steps left for Rashid, known limits. A merged pull request or a passing mock test is never called live.
4. No em dashes, en dashes or exclamation marks.
