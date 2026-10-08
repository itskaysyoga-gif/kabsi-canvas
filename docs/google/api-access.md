# Google API access (P0.7-01a)

Which Google API serves which Kabsi module, in which service, with what quota. Written 8 Oct 2026 from Hussein's Google Cloud Console readings. Nothing here comes from a live call: Google stays in mock mode (`google_mode()` reads `mock`, 8 Oct 2026) until P0.7-04.

## Project

| Item | Value | Source |
|---|---|---|
| Project | `smiling-chess-505915-b7` | Hussein, Cloud Console |
| Project number | 856347937978 | Hussein confirmed 7 Oct 2026 |
| Gate A | Approved 5 Oct 2026 (case 1-4624000041157), 300 requests per minute | PROGRESS, plan R-27 |
| Credential Kabsi uses | `hello@kabsi.co`, one central Manager account, through `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REFRESH_TOKEN` (Supabase secrets, not yet set) | `supabase/functions/_shared/google/client.ts` |

## Module to API map

The base URLs are the constants in `supabase/functions/_shared/google/client.ts`; nothing else in the repo may call `googleapis.com`.

| Kabsi module | Folder in `_shared/google/` | Google service | Base URL | Enabled | Requests per minute |
|---|---|---|---|---|---|
| Accounts, invitations, location admins | `accounts`, `admins` | My Business Account Management API | `mybusinessaccountmanagement.googleapis.com/v1` | Yes | 300 (Hussein, 7 Oct) |
| Locations, hours, profile fields, attributes, Google updates | `locations`, `attributes`, `updates` | My Business Business Information API | `mybusinessbusinessinformation.googleapis.com/v1` | Yes | 300 (Hussein, 7 Oct) |
| Review list, review reply | `reviews` | Google My Business API (v4) | `mybusiness.googleapis.com/v4` | Yes, enabled 7 Oct | 300 (Hussein, 8 Oct) |
| Local posts | `posts` | Google My Business API (v4) | `mybusiness.googleapis.com/v4` | Yes, enabled 7 Oct | 300 (Hussein, 8 Oct) |
| Photos and media | `media` | Google My Business API (v4) | `mybusiness.googleapis.com/v4` | Yes, enabled 7 Oct | 300 (Hussein, 8 Oct) |
| Notifications | `notifications` | My Business Notifications API | `mybusinessnotifications.googleapis.com/v1` | Yes | 300 (Hussein, 7 Oct) |
| Place action links | `placeActions` | My Business Place Actions API | `mybusinessplaceactions.googleapis.com/v1` | Yes | 300 (Hussein, 7 Oct) |
| Verification state | `verifications` | My Business Verifications API | `mybusinessverifications.googleapis.com/v1` | Yes | 300 (Hussein, 7 Oct) |
| Performance and search keywords | `performance` | Business Profile Performance API | `businessprofileperformance.googleapis.com/v1` | Listed as enabled in the plan (section 13 inventory); quota not recorded | Not recorded, to read in P0.7-01 |
| Business search in `/start` | `places` | Places API (New) | `places.googleapis.com/v1` | Yes, separate key `PLACES_API_KEY`, works before Gate A | Separate quota, see P0.2-06 |

Notes:

- Hours are written through Business Information (`updateMask`), not through a separate hours API.
- Questions and Answers is on Hussein's quota list (300) but no module in `_shared/google/` uses it. Nothing to wire.
- The v4 reviews, posts and media service is shown in the console as the Google My Business API. The card asks to check the exact name against Google's Business Profile "Latest updates" page; that check is a web read and is left for P0.7-01, which meets the real responses anyway.
- Hussein's readings are screenshots-by-statement: no `gcloud services list --enabled` output and no screenshot path is in the repo yet.

## What is confirmed and what is not

Confirmed by Hussein: project number; 300 requests per minute on Account Management, Business Information, Notifications, Place Actions, Q&A and Verifications (7 Oct); the Google My Business API enabled (7 Oct); its quota 300 requests per minute (8 Oct).

Not done, on purpose: no live Google call was made by P0.7-01a. The card's last "Done when" line (one read-only call each to reviews, posts and media returning 200) moves to P0.7-01, whose first live call needs Hussein's yes. The Performance API quota is read there too.

## Rules that stay

- Every call runs in mock mode until P0.7-04 switches `google_mode()` to live.
- No Google password, code or token is asked for or stored in a chat, a file or a commit.
- Every Google write goes through the one publication pipeline with the owner's approval.
