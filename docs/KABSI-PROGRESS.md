# Kabsi status

One page, under 10 KB. Updated 25 Nov 2026 (PILOT-READY). History is word for word in `docs/progress/archive/`. The plan index is `docs/KABSI-PLAN.md`, the core is `docs/KABSI-MASTERPLAN.md`, the order of work is plan section 7.

## Where things stand

Files named in this list are in `docs/progress/archive/`.

- Built and live: sessions 1 to 16, 18, 20, 20a, 20b, hotfix 20h and the 22 Oct sync session. Google is live on Yawmiyati (first real reply and post removal verified, 23 Oct). kabsi.co on Vercel; Creem the only payment route (test mode). Evidence: `evidence.md`.
- No customer is live yet. Before the first Meta ad (30.35 item 5): the DataForSEO top-up, Vercel Pro and the open lines of `docs/launch1/readiness.md`. Before the first paying business: Kapso Pro and the rest of 30.19 section 6 (30.28).

## WhatsApp ladder (master plan 25.5)

The facts say "WhatsApp is live" only when the last step is done. Done 5 Nov 2026: the number is +1 205 745 6874 in its one setting.

| Step | Done | Proof |
|---|---|---|
| Number acquired | 23 Oct 2026 | +1 205-745-6874 connected in the Kapso project Kabsi.co; Kapso health check Passed 10:17 Beirut (master plan 9.8) |
| Profile set | 23 Oct 2026 | Photo, about, email, address, website and description live; the display name "Kabsi" is waiting for Meta's approval (master plan 9.8) |
| Webhook verified | 25 Oct 2026 | Rashid's live phone test: his 12 messages reached Kabsi's function through the registered Kapso webhook (Fix 1, request 49115); his chat export confirms them |
| Templates approved | 29 Oct 2026 | Every account and approval notice has an approved Utility template (lane R, request 58250): the 13 replacements and new names read APPROVED and UTILITY; the sender switches to them on its hourly status read. Earlier reads: 55390, 55676, 57544 |
| Inbound tested | 25 Oct 2026 | Rashid's live test: 12 messages in, each handled (chat export); the suite (now 231 WhatsApp cases) passes in CI |
| Outbound tested | 25 Oct 2026 | Rashid's live test: 11 replies delivered to his phone (chat export); 28 Oct: template `kabsi_staff_alert` delivered to the staff phone, request 55442 |
| Owners switched on | 5 Nov 2026 | `whatsapp_owners_on` true at 04:32:11 UTC (Rashid's yes, Go live 1); `kabsi_work_update_v2` delivered to Yawmiyati's owner phone at 04:31:08 UTC (request 72591) |

## Open for Rashid

The long list as it stood before GATE-2 is word for word in `2026-11-24-progress-moved.md`; the full table is `steps-only-rashid-can-do.md`. Before the pilot (launch checklist section 2), in order:

- GATE-2 phone test: send the messages in `2026-11-24-gate2-phone-test.md` from your owner phone to +1 205 745 6874, then tell a session "phone test done". Step 22 needs 24 hours of silence before Monday 30 Nov's weekly note.
- GATE-2 test checkouts (Creem test mode): mark one test business with `update public.organizations set billing_test = true where id = (select organization_id from public.locations where id = '9803ee99-fee8-4c6a-abb4-1a830fcbb438');` (expect 1 row), and for the founding checkout link one accepted Founding 25 place to it in Staff, Programs, Founding 25. Then a session runs the two checkouts with `billing-creem/test-run` and the test card 4111 1111 1111 1111, and you set it back to false.
- Paid AI key with a hard cap; Kapso Pro; Creem live with your yes (Hussein: verification and payout). Never switched by a build session.
- Two more authorized listings for the launch tests (the checklist names three; only Yawmiyati is connected).
- Still open from before: Sentry budget, main's protection, the 13b part 2 secrets and SQL, Ready 2's SQL, Voice 2's eval, Close 1's PR 499 (see the moved file).

## Open After merge checks and findings

- After merge checks that a session could not run (they need a phone or a person) are in `docs/progress/archive/after-merge.md`. The first session of each kind reads the ones for its own area before starting.
- Ops 1 part B left one test row `bounced@resend.dev` in `email_suppressions` (archive entry).
- Found, not done: `docs/progress/archive/found-not-done.md`. Decisions to confirm: `docs/progress/archive/decisions-to-confirm.md`.

## Recent entries (newest first)

- 25 Nov 2026, SITE-4 (PR 603): life on the public site: 13 licensed photos, Kabsi's own screens in phone frames, scroll rise, count up and typing dots (reduced motion respected), two tints, Nora off the hero; Home inside its 205 KB budget. Review scores in `2026-11-25-site4.md`.
- 25 Nov 2026, PILOT-READY (R-165): one price everywhere (29, extra location 29, the trial line), GATE-2 wording in COPY.md section 93 and the facts, replay harness rebound to the demo businesses with per-phone locks and `launch_16_18`. Live runs and the test checkouts: `2026-11-25-pilot-ready.md`.
- 24 Nov 2026, GATE-2 (R-164): WhatsApp report answers on PROOF-2's functions, onboarding in three steps then the card trial, Founding 25 to the 19 checkout, the month-13 switch and its email, the first-day 90-day list, the pilot kit, Creem test products set up. Launch tests mostly not run (see the file). `2026-11-24-gate2.md`.
- 24 Nov 2026, SITE-3 (R-164 item 7): one section system on every public page, Home redone (phone scenes, Google-sourced problem band, a week with Kabsi, full-width price), SITE-2 finished, free check without rank or AI, three guides public. `2026-11-24-site3.md`.
- 24 Nov 2026, SITE-2 (blueprint 3.1): industry pages on one template, guides cleaned and 3 added, free check result and tool pages brought to 3.1; `2026-11-24-site2.md`.
- 24 Nov 2026, SITE-1 (R-163, PR 594): Home in nine sections, one price card at 29, src/lib/offer.ts. `2026-11-24-site1.md`.
- 24 Nov 2026, OFFER-2 (R-163): one plan at 29 with a 14-day card trial, founding 19 private, costly jobs off, 2 posts a month, WhatsApp Google-care tools. `2026-11-24-offer2.md`.
- 24 Nov 2026, PROOF-2: link watch, short weekly summary, monthly report, placement links. `2026-11-24-proof2.md`.
- Older entries: `2026-11-24-progress-moved.md` and the files it names.

## How a session updates this page

1. Change "Where things stand", the ladder (only with proof, in the Proof column), "Open for Rashid" and "Recent entries" as needed. Keep this page under 10 KB: drop the oldest recent entry when you add one.
2. Put long evidence (commands run, outputs, SQL read-backs, After merge results, found not done, decisions to confirm) in one new file, `docs/progress/archive/<yyyy-mm-dd>-<session>.md`, and link it in one line under "Recent entries".
3. Use the session report of master plan 25.6: the pull request link, a 3-line summary, the tests actually run (exact commands), what was verified live and how, manual steps left for Rashid, known limits. A merged pull request or a passing mock test is never called live.
4. No em dashes, en dashes or exclamation marks.
