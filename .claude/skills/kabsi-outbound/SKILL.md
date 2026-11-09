---
name: "kabsi-outbound"
description: "Use for Kabsi Outbound (master plan 30.19 section 5 as changed by 30.39, R-119): Kabsi's own plain-text emails to UK registered companies, filled from approved templates, approved by Rashid in one daily batch at kabsi.co/staff/outbound, sent through Zoho as rashid@getkabsi.com, with suppression, stops and the 90-day deletion. Harvey (kabsi-harvey) only builds the list."
---

# Kabsi Outbound

The rules are master plan 30.19 section 5 as changed by 30.39 (R-119), with 30.37 and 30.38 for the contact list. Later sections win. The code is in Kabsi itself: tables `outbound_*` (Supabase), the functions `outbound-prepare`, `outbound-send` and `outbound-inbox`, and the staff page kabsi.co/staff/outbound. Harvey (itskaysyoga-gif/kabsi-harvey, private) stays the list builder; its own sending is never switched on.

## The lock
- `outbound_settings.sending_open` starts false and `test_mode` true. Nothing in code, no RPC and no staff page can open sending: a trigger refuses it to anyone but a lane R migration. Sending opens only when Rashid says start in the lane R chat.
- In test mode only fictional example.com businesses are drafted, and mail goes only to `OUTBOUND_TEST_RECIPIENTS`.
- A stop (any complaint, or bounces above 3 percent of the last 100 sends) sets `sending_open` false with `stopped_reason` and alerts Rashid; only lane R clears it.

## Who
- The UK only (30.45 item 5, R-142): `OPEN_COUNTRIES` in `outbound/rules.ts` and the database check on `open_countries` hold only GB; the UAE and every other country stay off. Sending opens only when Rashid says start, after card payments open. Only registered companies that Harvey's register shows Active on Companies House's free Basic Company Data file at most 40 days old (30.39 item 12; no Companies House API key), with the company number recorded, and an email the business publishes on its own domain.
- The six salon industries first, in this order: hair salon, barbershop, beauty salon, nail salon, lash and brow studio, spa and massage (`SALON_INDUSTRIES`), then the other trades. Sources: the business's own website, Companies House, OpenStreetMap (through Harvey). Never Google scraping, Places, the Business Profile API, bought lists or directories.
- Never anyone suppressed (address, domain and parent domains, sha256 of the lower-cased value, the same rule as Harvey), never a Kabsi customer, applicant or partner, never anyone written to before.

## The emails (docs/COPY.md section 65, word for word)
- Plain text, UTF-8, no tracking, no image, no link but kabsi.co and kabsi.co/privacy, a mailto List-Unsubscribe with the subject "no thanks". Sent as Rashid Abou Hamzy <rashid@getkabsi.com> through Zoho (SMTP on 465; IMAP 993 to read). Never Resend, never kabsi.co as the sender.
- Email 1 and the follow-up are signed "Rashid Abou Hamzy, founder of Kabsi" and "kabsi.co", with the footer of 30.19 section 5. No Facebook or Instagram address and no "Drafted with Nora" in these two (30.39 item 6). The reply to a clear yes is filled from its template (COPY 65), carries the Facebook and Instagram addresses of R-59 and is signed without Nora, because a template wrote it (30.39 item 11).
- Email 1 and the follow-up offer only the free Google check and Google care, never Founding 25 or a price. The reply to a yes adds the founding price sentence (the first 30 paying businesses), never "25 founding businesses" (R-142).
- One detail per Email 1, the first that is true on the page read at draft time; none true means no draft. Filled from the templates with no AI call.
- The follow-up goes on day 4 or 5 in the same thread and is cancelled by any reply, bounce or suppression at that business. No second follow-up.

## Approval and timing
- Rashid approves every email: one batch a day, Approve all after reading, and approving Email 1 approves its follow-up.
- Ramp: 3 a day in week 1, 5 in week 2, then 10; at most 300 a calendar month; weekdays 9:00 to 17:00 in the recipient's time zone; at least 20 minutes apart.
- A person's reply is never answered automatically. For a clear yes the free check runs inside places_daily_cap and Rashid's reply is drafted with the personal check link; anything else waits for him with no draft.

## Data
- No reply: deleted 90 days after the last email, its domain coded on the never-contact list (reason contacted). A no or a bounce keeps only the hash. A yes becomes a contact under the privacy page.
- Opt-outs and bounces also go, as hashes, to kabsi-harvey's `kabsi/suppression.txt`, so Harvey deletes them and never adds them again.
- Logs, PRs and reports carry counts only, never a business name, address, email or phone. Harvey's dashboard reads the views `outbound_dashboard_counts` and `outbound_dashboard_days` (numbers and dates only).

## Deliverability (30.39 item 8)
Google Postmaster Tools and Cloudflare DMARC Management for getkabsi.com, a 2048-bit DKIM key, 10 out of 10 at mail-tester.com for Email 1 before the first real send. Never a warm-up service.

## Kill gate
Fewer than 3 replies that lead to a check or a trial in the first 300 emails ends Outbound.

## Never
- No claims about rankings, reviews gained or revenue; no industry statistics (plan 2.11, K-53, K-112). No Google password, code or token asked for. Nothing offered for a review.
- No secret in code, logs or reports. The keys live in Supabase secrets: ZOHO_SMTP_PASSWORD, HARVEY_REPO_TOKEN (and OUTBOUND_TEST_RECIPIENTS). There is no Companies House key.
