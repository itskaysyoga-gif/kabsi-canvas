# Kabsi status

One page, under 10 KB. Updated 25 Nov 2026 (SITE-8). History is word for word in `docs/progress/archive/`. The plan index is `docs/KABSI-PLAN.md`, the core is `docs/KABSI-MASTERPLAN.md`, the order of work is plan section 7.

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
- Test checkouts (Creem test mode), not run by a build session (they need the owner's own session and a Staff session; `2026-11-25-pilot-ready.md`): sign in as Yawmiyati's owner, run `update public.organizations set billing_test = true where id = (select organization_id from public.locations where id = '9803ee99-fee8-4c6a-abb4-1a830fcbb438');` (expect 1 row), start the trial checkout on the Plan page (29, 14 days, Creem test card 4111 1111 1111 1111), then in Staff, Programs accept one Founding 25 place, "Link for the founding price", and start the 19 checkout. Tell a session, which reads the subscription and webhook rows and sets `billing_test` back to false.
- Paid AI key with a hard cap; Kapso Pro; Creem live with your yes (Hussein: verification and payout). Never switched by a build session.
- Two more authorized listings for the launch tests (the checklist names three; only Yawmiyati is connected).
- OUTBOUND-3: set the Supabase secret OUTBOUND_POSTAL_ADDRESS (one line, "PO Box" not "P.O. Box"); then a session runs the mail-tester check (skill kabsi-outbound); tell lane R when the mailbox is ready.
- Still open from before: Sentry budget, main's protection, the 13b part 2 secrets and SQL, Ready 2's SQL, Voice 2's eval, Close 1's PR 499 (see the moved file).

## Open After merge checks and findings

- After merge checks that a session could not run (they need a phone or a person) are in `docs/progress/archive/after-merge.md`. The first session of each kind reads the ones for its own area before starting.
- Ops 1 part B left one test row `bounced@resend.dev` in `email_suppressions` (archive entry).
- Found, not done: `docs/progress/archive/found-not-done.md`. Decisions to confirm: `docs/progress/archive/decisions-to-confirm.md`.

## Recent entries (newest first)

- 25 Nov 2026, FIX-5: the bot check never leaves a dead button. Sign in: "Send me a code" is active once tapped, says "Checking your connection" with the spinner while the check finishes and sends when it passes; the check script starts at /login page load. Free check: same waiting state on /scan, "Save my place" and "Send me this report"; the search box starts the check on focus, press or input. A tap-needed box gets the line "Tap the box to confirm you are a person"; no pass in 15 seconds shows "This is taking longer than usual." with Try again. New event `bot_check_finished` (surface, outcome, ms). Not yet verified live. Record: `docs/progress/archive/2026-11-25-fix5.md`.
- 25 Nov 2026, SITE-8 (PR 618, R-167): Home, How it works, Pricing, /for and the trade pages scannable. Short headlines, one trust list, full trial terms only in the price band, Google's points one line each with a Sources footnote, trade hero lines of their own. Visible words: Home 782 to 497, How it works 449 to 282, Pricing 472 to 357, trades about 500 to 340. Glance scores up on every page (How it works 5.5 to 7.0). `2026-11-25-site8.md`.
- 25 Nov 2026, SITE-7 (PR 614): seven new Pexels License trade photos (bakery, vet, physiotherapy, car wash, lash and brow, cleaners) and a sharper bakery post photo; restaurant share image is the chef owner; drawn app screens sit whole inside their phone frames; How it works and /for reworked; Home's script 204.86 to 201.1 KB (Pricing 208 to 205.7). Five fresh reviews: best scores 8.3 to 8.7, last round 7.9 to 8.5; the open asks are in LATER. `2026-11-25-site7.md`.
- 25 Nov 2026, SITE-6 (PR 611): header with "For your business" (every trade, icon and line, loaded on demand), How it works, Pricing, Guides, Log in and "Free Google check"; each trade page shows Kabsi's Home with that trade's hours, post and reply; bright restaurant hero; How it works and /for tightened; Nora steps aside from photos. Review round 3: Home, Pricing, barbershop, restaurant 8.5 or more; How it works 8.3, /for 8.2. `2026-11-25-site6.md`.
- 25 Nov 2026, APP-1 (PR 610): owner Home in three parts (the yes with one tap, This week receipt, Google profile health strip), Plan on one plan with the free trial line, staff Today in urgency order under a health strip, Conversations list and thread, a short retry line for failed reads. Migrations app1_staff_reads and app1_trials_ending_unpaid applied. Scores 8 to 9 per screen. `2026-11-25-app1.md`.
- 25 Nov 2026, FIX-4: sign-in notice button cut to 20 characters (new test over every WhatsApp button), mail-tester reader fixed (JSON URL and `mark` is 0), Rashid's phone off the three demo businesses, job health read made fast enough for Staff Today, 11 stopped jobs cancelled with reasons, Outbound `preview` action. `2026-11-25-fix4.md`.
- 25 Nov 2026, SITE-5 (PR 607): one example business (Maple Street Salon) on the site and in Kabsi's screens, a block and three questions per trade with its own screen, Pricing with its own content, faq-data on one plan at 29 with a card trial (price guard covers it), a licensed salon owner hero. Review round 4: Home, Pricing, barbershop 8.5; restaurant and How it works 8. `2026-11-25-site5.md`.
- 25 Nov 2026, FIX-3 (PR 606): publication idempotency key from the highest stored suffix, Harvey's metro, priority_score and us_eligible read, /privacy and facts say the US pilot, kill gate counts checks run or trials started (not yes replies), demo business weekly hours for replay line 16.3. `2026-11-25-fix3.md`.
- 25 Nov 2026, SITE-4 (PR 603): life on the public site: 13 licensed photos, Kabsi's own screens in phone frames, scroll rise, count up and typing dots (reduced motion respected), two tints, Nora off the hero; Home inside its 205 KB budget. Review scores in `2026-11-25-site4.md`.
- 25 Nov 2026, OUTBOUND-3: Outbound reopens for the pilot, US and GB, approved once a week; CAN-SPAM postal address (OUTBOUND_POSTAL_ADDRESS, not set yet: nothing sends), DNS and mail-tester gates, kill gate, jobs scheduled again; sending still locked, test mode on. `2026-11-25-outbound3.md`.
- 25 Nov 2026, APP-2 (R-166): Posts is up to 2 a month with no choice; the plan card after the trial says "Add a card to keep Kabsi" and opens the Creem checkout; staff "Start trial"; "Where you show up" off the owner navigation (route goes to Home, R-163); old-reviews card uses the short retry line; failed jobs store the real error; billing events for a deleted business close as business_deleted; cron history pruned to 14 days (309,687 to 103,994 rows) with a daily job; master plan 30.56; old PRs 4 to 11 and 207 closed. `2026-11-25-app2.md`.
- 25 Nov 2026, PILOT-READY (R-165): one price everywhere (29, extra location 29, the trial line), GATE-2 wording in COPY.md section 93 and the facts, replay harness rebound to the demo businesses with per-phone locks and `launch_16_18`. Replay harness run on production: 10 scenarios pass, launch lines 16 to 18 pass except the rewrite and the hours week (see the file); test checkouts waiting for Rashid. `2026-11-25-pilot-ready.md`.
- Older entries: `2026-11-24-progress-moved.md` and the files it names.

## How a session updates this page

1. Change "Where things stand", the ladder (only with proof, in the Proof column), "Open for Rashid" and "Recent entries" as needed. Keep this page under 10 KB: drop the oldest recent entry when you add one.
2. Put long evidence (commands run, outputs, SQL read-backs, After merge results, found not done, decisions to confirm) in one new file, `docs/progress/archive/<yyyy-mm-dd>-<session>.md`, and link it in one line under "Recent entries".
3. Use the session report of master plan 25.6: the pull request link, a 3-line summary, the tests actually run (exact commands), what was verified live and how, manual steps left for Rashid, known limits. A merged pull request or a passing mock test is never called live.
4. No em dashes, en dashes or exclamation marks.
