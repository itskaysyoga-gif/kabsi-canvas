---
name: "kabsi-outbound"
description: "Use for Kabsi Outbound (master plan 30.19 section 5 as changed by 30.39, R-119, and the OUTBOUND-3 pilot): Kabsi's own plain-text emails to US businesses and UK registered companies, filled from approved templates, approved by Rashid once a week at kabsi.co/staff/outbound, sent through Zoho as rashid@getkabsi.com with the CAN-SPAM postal address, behind the DNS and mail-tester gates, with suppression, stops, the kill gate and the 90-day deletion. Harvey (kabsi-harvey) only builds the list."
---

# Kabsi Outbound

The rules are master plan 30.19 section 5 as changed by 30.39 (R-119), with 30.37 and 30.38 for the contact list, and the OUTBOUND-3 task (the pilot, the US first, 25 Nov 2026), which wins where they differ. The code is in Kabsi itself: tables `outbound_*` (Supabase), the functions `outbound-prepare`, `outbound-send` and `outbound-inbox` (rules in `supabase/functions/_shared/outbound/`), and the staff page kabsi.co/staff/outbound. Harvey (itskaysyoga-gif/kabsi-harvey, private) stays the list builder; its own sending is never switched on.

## The lock
- `outbound_settings.sending_open` stays false and `test_mode` true. Nothing in code, no RPC and no staff page can open sending: a trigger refuses it to anyone but a lane R migration, and even lane R only while `dns_ok` is true and `mail_tester_score` is 10. Sending opens only when lane R writes that migration, after Rashid says the mailbox is ready.
- In test mode only fictional example.com businesses are drafted (one US, three UK), and mail goes only to `OUTBOUND_TEST_RECIPIENTS`.
- A stop (any complaint, bounces above 3 percent of the last 100 sends, or the kill gate) sets `sending_open` false with `stopped_reason` and alerts Rashid on WhatsApp; only lane R clears it.

## Who
- `OPEN_COUNTRIES` in `outbound/rules.ts` and the database check on `open_countries` allow only US and GB. Every other country stays off.
- The US: any open business (Harvey's `business_status` not closed) with an email on its own website's domain, in the eight first tier industries plus auto repair and cleaners (`SERVICE_INDUSTRIES`). No company check (CAN-SPAM). The recipient's time zone comes from the register's `time_zone` (a US zone) or its `state`; a row with neither is refused.
- The UK: unchanged. Registered companies Active on Companies House's free Basic Company Data file at most 40 days old (30.39 item 12; no API key), company number recorded, own-domain email, the eight first tier industries only.
- The queue takes one beauty, one food, one service business in turn. Sources: the business's own website, Companies House, OpenStreetMap (through Harvey). Never Google scraping, Places, the Business Profile API, bought lists or directories.
- Never anyone suppressed (address, domain and parent domains, sha256 of the lower-cased value, the same rule as Harvey), never a Kabsi customer, applicant or partner, never anyone written to before.

## CAN-SPAM (every US email)
- Honest From (Rashid Abou Hamzy <rashid@getkabsi.com>, no other Reply-To) and an honest subject ("<business>'s Google profile"; Email 1 never says Re: or Fwd:).
- The sender's valid postal address in every US footer, from the Supabase secret `OUTBOUND_POSTAL_ADDRESS` that Rashid sets (one line, with a number, no link-like text: write "PO Box"). With no valid address set, no US email is drafted and nothing sends at all. A US draft whose footer does not carry the current address is failed for a person, never sent.
- A working opt-out honoured at once: "Reply 'no thanks'" in the body and a mailto List-Unsubscribe; outbound-inbox (every 10 minutes) suppresses the address and the business's own domain, cancels everything queued, and the hash is kept forever (retention never deletes `outbound_suppression`).

## The emails (docs/COPY.md section 65, word for word, with its OUTBOUND-3 block)
- Plain text, UTF-8, no tracking, no image, no link but kabsi.co and kabsi.co/privacy (the follow-up may add the private founding link). Sent through Zoho (SMTP 465; IMAP 993 to read). Never Resend, never kabsi.co as the sender.
- Email 1: one true detail from the business's own website (the first true on the page read at draft time; none true means no draft), what Kabsi does for the Google profile in two lines, the free check question, never a price. Signed "Rashid Abou Hamzy, founder of Kabsi" and "kabsi.co", no Facebook or Instagram, no "Drafted with Nora".
- The follow-up on day 4 or 5 in the same thread adds the founding line while places remain: 19 US dollars a month for the first 12 months, then 29, with the private link (US recipients read "$19"). Cancelled by any reply, bounce or suppression at that business. No second follow-up.
- US spelling for US recipients ("barbershops", "your hours"); the templates carry no dates.
- The reply to a clear yes: the check link, `TRIAL_LINE`, the R-59 social addresses, signed without Nora; US replies end with the postal address footer.
- Filled from the templates with no AI call.

## Approval and timing (once a week)
- `kabsi_outbound_prepare` runs every 2 hours on Sundays and fills the coming Monday to Friday, each day up to that day's cap, at most 20 page reads a run. On Monday the staff page shows the week's emails grouped by day; Rashid reads them and taps Approve all once (up to 100). Approving Email 1 approves its follow-up.
- Approved emails send by themselves on weekdays 9:00 to 17:00 in the recipient's time zone, at least 20 minutes apart, on the ramp: 5 a day in week 1, then 10, at most 300 a calendar month.
- A reply cancels the follow-up. A person's reply is never answered automatically: for a clear yes the free check runs inside places_daily_cap and Rashid's reply is drafted; anything else waits for him.

## Deliverability
- The send path refuses to run (`dns_not_ready`) until SPF (one record, Zoho included, ~all or -all), DKIM (selector `zmail`, an RSA key of at least 2048 bits) and DMARC (a policy) for getkabsi.com read correctly over DNS over HTTPS, checked right before each send and recorded for the staff page.
- mail-tester.com, test mode only: `select public.call_internal('outbound-send', '{"action":"mail_tester","address":"<id>@srvN.mail-tester.com"}')` sends the fictional US Email 1 there; then `{"action":"mail_tester_score"}` reads and records the score. 10 of 10 is required before lane R opens sending. Never a warm-up service. Google Postmaster Tools and Cloudflare DMARC Management stay on.

## Kill gate
`outbound_check_kill_gate()` runs before every send: once the 300th Email 1 is 14 days old, fewer than 3 replies that led to a check or a trial (the `interested` tally) ends Outbound with a stop and a WhatsApp alert to Rashid.

## Data
- No reply: deleted 90 days after the last email, its domain coded on the never-contact list (reason contacted). A no or a bounce keeps only the hash. A yes becomes a contact under the privacy page.
- Opt-outs and bounces also go, as hashes, to kabsi-harvey's `kabsi/suppression.txt`.
- Logs, PRs and reports carry counts only, never a business name, address, email or phone. Harvey's dashboard reads `outbound_dashboard_counts` and `outbound_dashboard_days` (numbers and dates only).

## Never
- No claims about rankings, reviews gained or revenue; no industry statistics. No Google password, code or token asked for. Nothing offered for a review.
- No secret in code, logs or reports. Supabase secrets: ZOHO_SMTP_PASSWORD, HARVEY_REPO_TOKEN, OUTBOUND_TEST_RECIPIENTS, OUTBOUND_POSTAL_ADDRESS. There is no Companies House key.
