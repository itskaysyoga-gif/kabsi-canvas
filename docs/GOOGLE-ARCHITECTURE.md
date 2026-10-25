# Google architecture on record (master plan 25.2 and 30.10)

How Kabsi reaches a business on Google, what it may do there, what it never does, the Google policy text that allows it, and how long each kind of data is kept. Written by session 19 rest from Google's pages as read on **24 Oct 2026**; the lane R decisions of 25 Oct 2026 (master plan 30.10, R-91) settle the points where a policy touched the design. When Google changes a page below, this file is read again before the next session that touches Google.

## 1. How Kabsi reaches a business

- The owner adds the **Kabsi business group** as **Manager** of their Business Profile (the group ID lives only in `KABSI_GROUP_ID` in `src/lib/site.ts`). The owner stays the owner.
- Kabsi's own Google account (hello@kabsi.co) acts through Kabsi's approved API project (856347937978) with one refresh token for that account, kept in Supabase secrets. **No owner's Google token is ever stored, and Kabsi never asks for a Google password or verification code.**
- Every call goes through `supabase/functions/_shared/google/` (the limiter at 300 a minute, the circuit breaker, 429 backoff, a plain message for NOT_FOUND and PERMISSION_DENIED). A demo business is always mock (R-17).
- Leaving: the owner disconnects in Settings and the disconnect job removes Kabsi's own Manager entry and reads it back (K-41); if Google refuses, staff do it by hand inside the follow-up window.

Google's text:

- "You can only use the Business Profile APIs to create, manage, and report on business listings that you either own or are authorized to manage on behalf of the business owner, or to develop tools for end-clients to similarly manage their listings." (Business Profile APIs policies)
- "If a client already has a Business Profile, ask them to invite you as a manager, not as an owner." and "all end customers must retain ownership or co-ownership of their Business Profile at all times." (third-party policies)
- "you have seven business days to provide them the ability to disassociate their Business Profile account from your services and developer project ... you must also relinquish and remove those permissions accordingly." (Business Profile APIs policies)

## 2. What Kabsi may do: only what the owner approved, one item at a time

- Every write (a reply, a post, a photo, special or regular hours, a put-back) goes through the one publication pipeline: the owner approves the exact item, a 10 second undo window passes, `claim_publication` claims it once and checks again that the plan, the approver's right and the business's state still allow it, then one write is sent and Google is read back. "Published" is shown only after the read back (25.3).
- Pro auto-fix is the only write without a per-item tap, and only for regular hours, special hours and the website, after the owner opted in for that field in writing; two reverts of a field in 30 days stop it (K-130).
- While Google needs action on a profile (suspended, verification, an ownership conflict, no Voice of Merchant) nothing is sent for that business (18.2).

Google's text:

- "If you respond to reviews on behalf of your end-client, you must receive their authorization first." (Business Profile APIs policies)
- "you must not automate or trigger review replies, Q&As, listing creations, listing edits, or other actions without the user's prior specific and express consent." (Business Profile APIs policies)
- "To respond to reviews on behalf of the end customer, you must have an explicit approval. Verbal consent isn't sufficient. If there's a conflict between the third-party and the merchant, you must provide a written or digital proof of consent." (third-party policies). Kabsi keeps the approval, who gave it, the channel and the time in `publications` and the audit log.

## 3. What Kabsi never does

- Never reverts Google's own changes by itself; the owner decides each one ("You may not use the Business Profile APIs to automatically revert changes made by Google.", Business Profile APIs policies; "When you take automated actions to discard suggested updates without consulting the merchant, you violate our terms.", third-party policies).
- Never starts a verification ("Verification options can only be initiated by a direct request from the owner of the location.") and never files an appeal for the owner.
- Never implies a relationship with Google ("Use of the Business Profile APIs doesn't create, suggest, or imply a partnership with, sponsorship by, or endorsement by Google."), never copies the Business Profile look ("must not replicate the look and feel of the Business Profile user interface"), never promises placement (the third-party policies list "Guarantees top placement on Google." as prohibited).
- Never gates reviews, offers rewards for reviews, sets per-staff quotas or writes reviews (Maps user-contributed content policy: "Discourage or prohibit negative reviews, or selectively solicit positive reviews from customers", "Merchants requesting that staff solicit a certain number of reviews").
- Never compares or shares one customer's Business Profile data with another customer ("You must not compare or share one customer's Business Profile-specific data with your other customers.", third-party policies).
- Never stores Places content beyond the place ID (section 5).

## 4. Rank and AI data next to Business Profile data

Google's text found on the pages read:

- "If your service provides reporting data from other profile management platforms, you must report the Business Profile data separately from the non-Business Profile data." (third-party policies, Insights)
- Places: "Always visually distinguish Google Maps Platform Content from other content", "It must always be clear to end users which content is provided by Google Maps." (Places API policies)
- Maps Platform Terms 3.2.3(a): "Customer will not export, extract, or otherwise scrape Google Maps Content for use outside the Services ... (iii) copy and save business names, addresses, or user reviews"; 3.2.3(c): "Customer will not create content based on Google Maps Content."
- No page read says anything else about showing third-party ranking data next to Business Profile data.

Decided (30.10): the Visibility Map and Competitor Watch use **only DataForSEO public results** for every business in them, the owner's own position included, even when a competitor is a Kabsi customer; Places is never used to build a rank. Reports, the dashboard and the PDF keep two labelled sections, **"From your Google Business Profile"** and **"From public Google Maps and AI checks by Kabsi"**, never mixed in one number or chart. The map image says **"Kabsi rank check, not provided by Google"**.

## 5. Retention per data type

The limit after a business leaves is 7 days, and backups are kept 21 days, so the worst case is 28 days (30.10.1, 25 Oct 2026). The policy text: "You cannot pre-fetch, cache, index, or store any content provided through the Business Profile APIs ("Content") for use outside of your Business Profile project except for limited amounts of Content ... It must be stored temporarily for no more than 30 calendar days." (Business Profile APIs policies). Decided (30.10): managing that same business for that same owner is use inside Kabsi's project, so Business Profile content may be kept while the business is connected and managed by Kabsi, used for nothing else, and deleted within 30 days after it leaves. Places: "Customer may cache (a) place_id from Places API" and "You can therefore store place ID values indefinitely." (Maps Service Specific Terms, Places API policies); latitude and longitude for up to 30 days; nothing else.

| Data | Source | Kept now | Rule (30.10) | State |
|---|---|---|---|---|
| Place ID | Places | While the business is in Kabsi | Allowed indefinitely | OK |
| Free scan public facts (rating, hours, phone, website, category, photos) | Places | Fetched live for each check, the email and the WhatsApp copy; not stored | Never cached | Fixed in session 19 rest (was 24 hours) |
| Category and area of a business | Places | Read live when a post is written; not stored | Never stored | Fixed in session 19 rest (was stored up to 30 days) |
| Daily rating and review count for the weekly change | Business Profile (reviews list) | 30 days | Kept while connected | Fixed in session 19 rest (was read from Places) |
| Review text and reviewer name | Business Profile | 30 days after Google last returned it, then blanked | May be kept while connected | Stricter than allowed; unchanged |
| Review ids, stars, dates, reply state | Business Profile | Life of the account | While connected, deleted within 30 days after leaving | OK (see the leaving rows) |
| Profile values Kabsi read (Protection before and after, Google's raw responses) | Business Profile | 30 days | While connected | Stricter; unchanged |
| Performance numbers and search terms | Business Profile | 30 days in report copies, read again when needed | While connected | Stricter; unchanged |
| Google's state (VoiceOfMerchantState summary) | Business Profile | Latest only | While connected | OK |
| Photos the owner uploaded | Owner | 30 days after they are on Google | Owner's own | OK |
| Drafts and approved reply text | Kabsi, about Google content | Blanked with their review's content | Same as review text | OK |
| AI prompts | Kabsi | Not stored; `ai_runs` keeps hashes, models and check names only. Review text goes to Anthropic only to draft (processor, no training) | Never used for training | OK |
| Audit log | Kabsi | 24 months, content fields blanked per the rows above | Proof of approvals | OK |
| Pub/Sub events | Google notifications | Resource names only, no text | While connected | OK |
| Visibility results (map grids, competitor rows, AI answers) | DataForSEO and AI checks | Map grids, the public top 20 per point (rank, name, cid, place ID, categories, rating, review count, photo count, coordinates; no address, phone, hours or review text), competitor picks and snapshots (V1, 25 Oct 2026); AI answers not built (V2) | Kept while the business uses Kabsi; deleted 30 days after it leaves; DataForSEO results cached 7 days | Built for maps: `private.purge_visibility_after_leaving`, daily 02:59 UTC |
| Free scan email and WhatsApp proof rows | Visitor | Address or number hash, place ID, consent words, page, time | Not Google content | OK |
| **After access is lost** (Kabsi removed as Manager on Google) | All Business Profile content | Deleted 7 days after access was lost (reviews, listing rows, rating snapshots, report copies, the Coach read, Google's state) | Within 30 days, backups included (30.10.1: 7 days plus 21 days of backups) | Fixed in session 19 rest |
| **After the owner disconnects in Settings** | All Business Profile content | Deleted 7 days after (a disconnect marks access lost); the rating snapshots, weekly report copies, the Coach's read and Google's state that were left before are now included | Within 30 days, backups included | Fixed in session 19 rest (`private.purge_after_leaving` and `run_retention`, daily; the limit is the `google_data_after_access_lost` row, 7 days) |
| **After the account is closed** | Everything | Deleted 7 days after the request | Within 30 days, backups included | OK |
| Weekly encrypted backups (R2) | Everything in the database | Newest 3 weekly sets (21 days) | Within 30 days after leaving, backups included | Fixed in session 19 rest (30.10.1): a business that left is purged after 7 days and the last backup holding it expires 21 days later, 28 days at most |
| Exports | Owner | No export is built yet | Owner's own copy | When an export is built, it holds only the owner's own business |
| Business name, address and country chosen at sign-up | Places search, picked and confirmed by the owner | Until the first successful Business Profile sync | Nothing from Places but place_id | Fixed in session 19 rest (30.10.1): the first successful sync overwrites them from the Business Profile; UX 1 removes Places from onboarding |
| Places content already stored before 25 Oct (2 cache rows, 4 rating snapshots, 3 Places categories) | Places | Up to 30 days | Not stored | Removed by `supabase/manual/20261025_places_data_purge.sql` (Rashid runs it) |

## 6. Notices Kabsi owes the owner

- "If your tool makes any changes to an end-client's account, such as when you add a new manager to the account, provide notice to the end-client of the change within 48 hours after the change is made. Make this notice separate and distinct from any other notices that Business Profile might automatically provide" (Business Profile APIs policies). Kabsi sends the access email at once and a WhatsApp message when the owner has connected WhatsApp, when Kabsi becomes Manager and when that access changes or ends.
- "If you charge a management fee, you must let end customers know that Business Profile is a service provided at no extra cost. At a minimum, you must inform new customers in writing before you manage their profile and disclose the existence of this fee on customer invoices." and the "Working with a third party" notice, https://support.google.com/business/answer/7163406 (third-party policies). The onboarding Manager step and the access email say "Google Business Profile is free from Google. Kabsi is an independent paid service." with that link; the footer, the pricing page, the terms and the invoices carry it in Web 2 and session 10.

## 7. Pages read (24 Oct 2026)

| Page | Address | Date on the page |
|---|---|---|
| Business Profile APIs policies | https://developers.google.com/my-business/content/policies | Last updated 28 Aug 2026 |
| Business Profile APIs Terms of Service | https://developers.google.com/my-business/content/terms | Last updated 28 Aug 2026 |
| Business Profile third-party policies | https://support.google.com/business/answer/7353941 | Not shown |
| Business Profile Additional Terms | https://support.google.com/business/answer/9292476 | Last modified 17 Jul 2025 |
| Google APIs Terms of Service | https://developers.google.com/terms | Last modified 9 Nov 2021 |
| Google Maps Platform Terms of Service | https://cloud.google.com/maps-platform/terms | Last modified 26 Aug 2026 |
| Maps Service Specific Terms | https://cloud.google.com/maps-platform/terms/maps-service-terms | Last modified 15 Oct 2026 |
| Places API policies | https://developers.google.com/maps/documentation/places/web-service/policies | Last updated 21 Oct 2026 |
| Maps user-contributed content policy | https://support.google.com/contributionpolicy/answer/7400114 | Not shown |
| Working with a third party | https://support.google.com/business/answer/7163406 | Not shown |
