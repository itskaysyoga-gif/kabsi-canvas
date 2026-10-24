<!-- Moved verbatim from docs/KABSI-PLAN.md on 24 Oct 2026 (docs diet, master plan 27.12). The index is docs/KABSI-PLAN.md. -->

## 11. Wave P0.5: content and proof

Goal: photos, posts and hours go through the same loop, and the Weekly Care Report proves the work every Monday from the audit log.

Done when (wave): a photo goes from a phone to Google (mock) with metadata stripped; a post of each type is drafted only from verified facts and passes the checks; a holiday task appears 21 days ahead; the report counts only audited actions.

### P0.5-01 Photo engine, cover and logo

**Changed 21 Oct 2026 (K-136, K-129).** Add: video files (the engine accepts them and keeps them out of the photo-only rules; publishing details stay P1-17); counts by type (exterior, interior, team, work, products) for the Profile Coach; an upload entry point that the WhatsApp handler (P0.8-03) calls, so photos sent to the Kabsi number become uploads in the photo engine (Pro: "WhatsApp photo drop").

- Decisions: K-23, K-78, K-81 (GPS note), K-116.6, K-60 guard, A6 (via the pipeline).
- Touches: private Storage bucket per business with 5-minute signed URLs for members only; upload from the app (camera or gallery, up to 20) and a revocable staff upload link per business that only accepts uploads; a processing job outside the request path: real file-signature check (JPEG, PNG, HEIC, WebP), 20 MB limit, no animated files, convert to JPEG, fix orientation, resize to Google's limits, strip all metadata including GPS; quality checks in code (brightness, blur by Laplacian variance, resolution at least 720 by 720, near-duplicate by perceptual hash); vision model classification into Google's photo categories and flags (children's faces, other people's screens, text-heavy flyers, screenshots, stock-looking or AI-generated images, other brands' logos); plain explanations; one batch card "3 photos are ready" with Approve all or one by one; publish by uploading bytes through `_shared/google/media` and the pipeline; original deleted 30 days after publishing (retention); "Cover and logo" strip with the preferred cover and logo and their checks, worded "your preferred cover photo"; freshness and category-gap detectors creating tasks; the photo screen says Kabsi removes location data from every photo.
- Depends on: P0.1-13b, P0.3-05, P0.2-01.
- Model: Opus (storage access and processing).
- Done when: an uploaded test JPEG with GPS EXIF comes out with no EXIF (checked with exiftool output in PROGRESS); a renamed PDF with a .jpg name is refused; a dark photo gets "This photo is dark."; a staff link uploads without an account and stops working when revoked; approve-all publishes once per photo through the pipeline (mock).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.5-01, then docs/KABSI-PROGRESS.md. Do only task P0.5-01. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-23, K-78 and K-116 point 6 in docs/source/KABSI-AUDIT.md. Never generate or edit a photo beyond orientation and basic exposure. Processing runs in a job, never in the request. Split into two pull requests if needed: pipeline and storage first, screen second.
```

### P0.5-02 Posts: three types, checks and the month view

- Decisions: K-24, K-80, K-116.3, K-116.5, K-116.12, K-102 (post drafting rule), K-113.3, R-19.
- Touches: `_shared/posts.ts` and the Content, Updates screen: Update, Offer (start, end, terms required, only offers the owner typed, optional code and redeem link) and Event (title, start and end, owner's events only); up to 1,500 characters, one real photo, one button; drafts lead with one concrete thing, 150 to 300 characters; two a month by default (1 or 4 by choice); when nothing true is known Kabsi asks one question instead of writing filler; checks before the owner sees it: no phone numbers, emails or social handles, no links except the owner's own domain in the button, no prices or offers not in Business Knowledge, no superlatives, no keyword stuffing (more than two repeats of category or city), no health, safety or results claims, not more than 70 percent similar to any post in the last 90 days, category rules (no medical outcome claims for clinics, no Offer posts for hotels and lodging, no alcohol promotion where restricted); month view with prepared, waiting, published and skipped; "Approve the month" or one by one; scheduled publishing from Kabsi's own queue through the pipeline; recurring posts only for real recurring things; `posts-weekly` replaced by a care-routine job.
- Depends on: P0.5-01, P0.3-02.
- Model: Sonnet.
- Done when: tests for every check; an Offer without dates is refused; a hotel cannot get an Offer draft; a business with no recent facts gets the one question, not a post; approving the month publishes each post at its time through the pipeline (mock).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.5-02, then docs/KABSI-PROGRESS.md. Do only task P0.5-02. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-24, K-80 and K-116 points 3, 5 and 12. Never invent an offer, price, event, service, policy, staff member or hours. Do not market scheduling as a feature.
```

### P0.5-03 Hours: one editor and the holiday calendar

- Decisions: K-21, K-82 (more hours types: P1), D236.
- Touches: one editor for regular hours, special hours, temporary closure and reopening date, with a calendar, published through the pipeline; the **holiday hours concierge** (K-131): public holidays for every launch country (US, UK, Canada, Australia, Ireland, New Zealand, Singapore, UAE) from the `date-holidays` npm package plus Islamic dates; five days before a holiday Kabsi asks the owner on WhatsApp (quick replies, once P0.8-03 has merged) or by email: normal hours, closed, or custom hours; the answer is the approval and Kabsi publishes `specialHours` through the pipeline; a typed custom time is read back and confirmed first; never assume holiday hours; Ramadan month-long hours option where observed; the email links each answer to a confirm page; the build chat checks the package against an official source for the eight countries and records it. No Lebanon row (K-123). Replaces the hand-kept holiday table and the 21-day task.
- Depends on: P0.3-05, P0.1-13b.
- Model: Sonnet.
- Done when: a test business in the UK is asked five days before the next UK bank holiday; "Closed" creates a special-hours publication through the pipeline with the answer recorded as the approval; "Custom" reads the time back before it publishes; regular hours edits go through the pipeline and Protection treats the result as the approved value; the email path works with WhatsApp absent.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.5-03, then docs/KABSI-PROGRESS.md. Do only task P0.5-03. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-21 in docs/source/KABSI-AUDIT.md. Holiday dates come from a maintained table checked against an official source for each country, with the source noted per row.
```

### P0.5-04 The Weekly Care Report

**Changed 21 Oct 2026 (K-135, K-136, K-138, K-143).** The report also carries the Growth agent's weekly task plan (what is missing on the profile, from the Profile Coach, at most three lines), "How people found you" (search terms, from P0.5-05) and, monthly and for Pro, the "What customers say" block once P0.8-08 has merged. Kabsi's own counts still come only from `audit_events`. No industry statistics (2.11).

- Decisions: K-28, K-72, K-115 (visible routine), K-09, G-29 (retention engine), D222 (adapted: no quotes, R-19).
- Touches: report builder reading only `audit_events` for Kabsi's counts: headline "Kabsi took care of 8 things this week", reviews (new, replies published, average rating), Google Profile (checked N times, changes found and how they were resolved, or "No important changes"), content (updates and photos published), customer activity (views, calls, website clicks, directions, against the week before; mock until live, labelled), what needs you (nothing, or at most 3 lines with one button each), time saved estimate with the formula one tap away (5 minutes a reply, 15 an update, 10 a photo batch, 10 a profile check that found something), never money; sent Monday 08:00 local; kept in Insights; Google numbers in older copies re-fetched on view or dropped after 30 days.
- Depends on: P0.4-08, P0.1-10, P0.5-05 for the activity block (stub until then).
- Model: Sonnet.
- Done when: for the demo and Yawmiyati, every count in a generated report matches a SQL count on `audit_events` for the same week (both pasted in PROGRESS); no review text appears in the report; the time-saved line links to its formula.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.5-04, then docs/KABSI-PROGRESS.md. Do only task P0.5-04. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-28 and K-72. Every number Kabsi claims as its own work comes from the audit log; nothing is estimated except the labelled time-saved line.
```

### P0.5-05 Insights: one sentence and four tiles

**Changed 21 Oct 2026 (K-138).** Adds the monthly search terms report (Pro): Performance API search keyword impressions shown in Insights as "How people found you this month" with the top terms, counts under Google's threshold as "fewer than 15", nothing kept past 30 days, mock until live. The Done when gains a retention test for the terms. P1-09b no longer carries search terms.

- Decisions: K-26, K-40 (30-day storage), R-18.
- Touches: `_shared/google/performance` (daily metrics; mock until live), Insights screen: headline "217 customers interacted with your Google profile this month, 12% more than last month", tiles for calls, website clicks, directions, views against last month, the weekly reports archive, "See details" with daily charts for owners and partners who want them; figures fetched on demand, cached at most 30 days; mock figures always labelled "Example" outside the demo workspace.
- Depends on: P0.1-11, P0.3-08.
- Model: Sonnet.
- Done when: the screen renders from the mock module with the "Example" label; no performance figure is stored past 30 days (retention test); search-term counts below Google's threshold show "fewer than 15".
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.5-05, then docs/KABSI-PROGRESS.md. Do only task P0.5-05. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-26 in docs/source/KABSI-AUDIT.md. Never claim a cause for a change. Use the dataviz rules: one simple chart style, readable on a phone.
```
