<!-- Moved verbatim from docs/KABSI-PROGRESS.md on 24 Oct 2026 (docs diet, master plan 27.12). The current status page is docs/KABSI-PROGRESS.md. -->

## Rashid's decisions and inputs (plan section 5)

| # | Item | Status |
|---|---|---|
| D1 | Legal seller | Decided 4 Oct: Hussein Slim (Dubai) holds the Creem account and is the seller; Meta business details and verification under the same name (R-25). Hussein agreed to be named on Creem, Meta and the site; no written agreement |
| D2 | First real live customer | Decided 4 Oct: Abou Hamze Auto Center (Bakaata). Owner agreed 4 Oct; Kabsi Clients group added as Manager and hello@kabsi.co accepted (Business Profile Manager shows Abou Hamze Auto Center and Yawmiyati, both Verified) |
| I1 | US WhatsApp number | Settled 7 Oct by K-122 and set in P0.6-10. **22 Oct 2026: the number was deleted from Kapso; there is no Kabsi WhatsApp number now.** `WHATSAPP_NUMBER` in `supabase/functions/_shared/whatsapp-setting.ts` is empty until Rashid has a new Kabsi number in Kapso. **Changed 22 Oct 2026 (R-49): one Kapso account under rashid.abouhamzy@yawmiyati.com, project "Kabsi.co", hello@kabsi.co invited as owner; the new number comes in session 13b (see "Decision to confirm" in Where things stand for R-32)** |
| I2 | Real screenshots of Google's People and access steps | Desktop done 4 Oct (`public/help/manager-steps/desktop/`, blurred); phone still to come |
| I3 | Referral reward | Decided 4 Oct: one free month (P1-15 needs re-scoping: no Free plan and no partner audit links, 21 Oct) |
| D3 | NFC cards | Replaced 21 Oct (K-125): Kabsi sells no NFC cards anywhere |
| D4 | Governing law and seller wording | Decided 21 Oct: seller Hussein Slim, Dubai; law of the United Arab Emirates; a lawyer confirms before launch |
| D5 | When paid API calls may start (K-146) | **Changed 22 Oct 2026 by R-45 (replaces R-43's spend rule): AI on demand only.** `ANTHROPIC_API_KEY` (Supabase secrets) runs on a prepaid balance of about 3 US dollars, auto-reload off, no monthly top-up; `EVAL_LIVE` stays false (no live evaluation in CI); a live evaluation runs by hand only when a reply prompt changes, on 20 cases; the full 200-case run waits for a top-up before launch. Google opened `mybusiness.googleapis.com` on 22 Oct 2026, so the 30 Nov kill-gate is cleared. WhatsApp live sends to test numbers once a new Kabsi number exists **22 Oct 2026, R-46: about 100 US dollars of promotional credit until 17 Nov 2026, auto-reload off; full evaluations by hand only, never in CI on every change.** |
| D6 | Opening Kabsi Partners (K-127) | Not before live reviews work and the first founding customers |
