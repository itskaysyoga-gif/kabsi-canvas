# business.manage verification package (P0.7-02)

Everything Google asks for when it verifies the sensitive scope `https://www.googleapis.com/auth/business.manage` for Kabsi's "Connect with Google" route (K-92, built later as P1-18). Written 22 Oct 2026 against Google's page "Sensitive scope verification" (developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification, read 22 Oct 2026). `business.manage` is a sensitive scope, not a restricted one, so no paid security assessment is needed (K-113.6).

Status on 22 Oct 2026: the text is ready to paste. **It cannot be submitted yet**, for the reasons in "What blocks submitting" below. Every contact address in this package is hello@kabsi.co. No personal address goes into any Google console.

## What the scope is for, in one paragraph

An owner taps "Connect with Google" and approves Google's consent screen once. Kabsi uses the resulting access token for a few minutes, only to (1) list the owner's Business Profile accounts and locations with their role and verification state, (2) invite Kabsi's own business group as a Manager on the locations the owner ticks, and (3) confirm the invitation is accepted. Kabsi then revokes the token. Kabsi does not request offline access, so Google issues no refresh token, and Kabsi stores nothing from the owner's token. All later work on the profile (reading reviews, posting replies the owner approves) runs through Kabsi's own Manager access held by its business group, never through the owner's token.

## Scope justification (paste into "Data access", scope business.manage)

> Kabsi (kabsi.co) helps a local business keep its Google Business Profile looked after: it prepares a reply for each new review, watches the listing for changes, and publishes only what the owner approves. Kabsi works through Manager access that the owner gives to Kabsi's own business group, which is how Google's own Business Profile access is meant to be shared.
>
> The `business.manage` scope is used once per owner, for the single purpose of adding Kabsi's business group as a Manager on the locations the owner chooses. After the owner approves Google's consent screen, Kabsi (1) lists the owner's accounts and locations with their role and verification state (Account Management API, Verifications API) so the owner can tick the profiles to connect, (2) invites Kabsi's business group as Manager on each ticked location (`locations.admins.create`), and (3) checks that the invitation was accepted from Kabsi's own account. Kabsi then revokes the owner's token at `https://oauth2.googleapis.com/revoke`.
>
> Kabsi requests online access only. No refresh token is issued, none is stored, and the access token is kept in server memory for the length of the request and discarded. Kabsi does not read reviews, post, or change the listing with the owner's token.
>
> Why no narrower scope: the Business Profile APIs accept only `business.manage` (the older `plus.business.manage` is deprecated), and inviting an administrator on a location needs it. The owner can remove Kabsi at any time in Google (People and access), or in Kabsi under Settings, Disconnect Kabsi from Google.
>
> Data handling: Kabsi's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements. Google user data is not used for advertising or retargeting, is not sold or transferred, and is not used to develop, improve or train generalized AI or machine learning models. People at Kabsi read it only with the owner's consent, for security, or as the law requires.

Facts behind each sentence, with where to check them in the repo:

| Claim | Where it is decided or built |
|---|---|
| One consent, token used once, then revoked, nothing stored | K-92 points 1 to 4; P1-18 (not built yet) |
| Online access only, no refresh token | to be built that way in P1-18; the build chat must confirm `access_type` is not `offline` and say so in PROGRESS before this text is submitted |
| Kabsi's later work uses its own Manager access, not the owner's token | K-04, K-92; `supabase/functions/_shared/google/client.ts` uses only the central account of hello@kabsi.co |
| No Google data for ads, no sale, no training | K-113 point 7; `/privacy` |
| Owner can remove Kabsi any time | K-113 points 1 and 2; Settings, Disconnect Kabsi from Google (P0.2-02) |

## The privacy page (checked 22 Oct 2026)

- `https://kabsi.co/privacy` answers 200 and carries the Limited Use sentence **word for word**: "Kabsi's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements." Read from the live page on 22 Oct 2026 by fetching the page text; the source is `LIMITED_USE` in `src/routes/privacy.tsx`.
- Google requires the privacy page to be on the same domain as the home page and linked from the consent screen. `https://kabsi.co/` (public, describes Kabsi, links to `/privacy` and `/terms` in its footer; checked 22 Oct 2026) and `https://kabsi.co/privacy` share the domain `kabsi.co`.
- Google requires the page to say how the app accesses, uses, stores and shares Google user data, and that Kabsi's use stays inside what the page says. Re-read `/privacy` before submitting and again after any change to it. Two points a reviewer may press, and the true answers:
  - Review text read through Kabsi's Manager access goes to Kabsi's AI provider (Anthropic's API) only to draft a reply for that owner; Anthropic does not train on it; Kabsi trains no model. `/privacy` says so. This is separate from the owner's `business.manage` token, which never touches review text.
  - Kabsi keeps review text and reviewer details for 30 days (K-30, K-113 point 3), and stores no aggregate built from review text.

## Demo video script

Google requires an unlisted YouTube video, in English, that shows: the OAuth grant flow including the consent screen with the app name; the browser address bar with the OAuth client ID visible; and what the scope does inside the app. Upload to YouTube Studio as **Unlisted** and paste the link in the verification form. Record on a test owner account, never a real customer's.

Length about 3 minutes. One take, screen only, voice or captions in English, browser zoom large enough to read the address bar.

| # | On screen | Say or caption |
|---|---|---|
| 1 | kabsi.co home page, address bar visible, then the connect screen in the app | "This is Kabsi. An owner connects their Google Business Profile so Kabsi can look after their reviews and listing." |
| 2 | The Kabsi screen before the consent screen: "Google will ask you to let Kabsi manage your listing. We use this once, to add Kabsi as a manager, then we disconnect. You can remove Kabsi any time." Tap Connect with Google | "Before Google's screen, Kabsi explains in plain words what happens." |
| 3 | Google's consent screen. Pause three seconds with the address bar in frame so `client_id=` can be read, the app name "Kabsi" and the requested scope ("See, edit, create and delete your Google Business Profile") visible | "This is Google's consent screen. The address bar shows the OAuth client ID. The app name is Kabsi and the scope is business.manage." |
| 4 | Approve. Back in Kabsi: the list of the test owner's profiles with role and verification state; tick one | "Kabsi uses the token to list the owner's profiles with their role and verification state. The owner ticks the ones to connect." |
| 5 | Kabsi shows "Adding Kabsi as a manager", then the profile switches to connected. Cut to Google Business Profile, People and access: Kabsi Clients shown as Manager | "Kabsi invites its own business group as Manager and checks the invitation was accepted. Here it is in Google, under People and access." |
| 6 | Kabsi shows "Kabsi has let go of your Google sign-in". Then Google Account, Third-party access: Kabsi no longer listed | "Kabsi then revokes the token. Kabsi stores nothing from it. Kabsi no longer appears in the account's third-party access." |
| 7 | Kabsi Settings, Disconnect Kabsi from Google; then Google People and access with Kabsi removed | "The owner can remove Kabsi at any time, in Kabsi or in Google." |
| 8 | `kabsi.co/privacy`, scroll to the Limited Use sentence and hold on it | "Kabsi's privacy page carries the Google API Services User Data Policy Limited Use sentence." |

The video can only be recorded on a build that has the "Connect with Google" route (P1-18) or a staging route that does steps 2 to 6. Steps 5 and 6 show real Google screens, so the test owner must be a real Google account with a test Business Profile (Kabsi's own, never an owner's).

## Exact steps in the Google Cloud console (Rashid, signed in with a kabsi.co account that is Owner of the project)

Project `smiling-chess-505915-b7` (number 856347937978). The console menu is called Google Auth Platform (older: APIs and Services, OAuth consent screen).

1. **Contacts.** Branding: user support email hello@kabsi.co. Audience / Contact information: developer contact hello@kabsi.co. If any personal address is still listed anywhere in the project, remove it first (plan section 5, step 4, R-32).
2. **Branding.** App name Kabsi, logo (the Kabsi mark), application home page `https://kabsi.co`, privacy policy `https://kabsi.co/privacy`, terms of service `https://kabsi.co/terms`, authorised domain `kabsi.co`. Save, then **Publish branding**. Google requires a published branding status before data access can be verified.
3. **Domain.** Search Console: `kabsi.co` verified as a domain property by an account that is Owner or Editor of the Cloud project (use a kabsi.co account). Confirm in Search Console, Settings, Ownership verification.
4. **Audience.** User type External. Publishing status moves from Testing to In production when Google approves; do not switch it before the verification is submitted.
5. **Data access.** Add scope `https://www.googleapis.com/auth/business.manage` (listed under sensitive scopes). Paste the scope justification above into the justification field. The basic scopes (openid, email, profile) used by sign-in need no verification (R-11).
6. **Client.** The "Connect with Google" route needs its own OAuth client (Web application), separate from "Kabsi sign-in" (basic scopes) and from the client that holds the hello@kabsi.co capture token, so rotating one never breaks another. Its client ID is the one that appears in the video's address bar. Create it when P1-18 is built; do not reuse the capture client.
7. **Verification center.** Open Verification center, press the verification button (its name moves; follow Google's own page), paste the video link, tick that the privacy page and home page are live, add hello@kabsi.co as the contact for Google's questions, submit.
8. **Afterwards.** Google answers by email to hello@kabsi.co. First answer is typically 3 to 5 business days (Google's own words); with questions, 2 to 4 weeks (K-113.6). Answer Google's questions within a day: review pauses while Google waits. A compliant result is valid for 7 days, so publish the app in production inside that window. Record the submit date and every answer in PROGRESS.

## What blocks submitting (22 Oct 2026)

1. **The demo video needs P1-18 or a staging route.** "Connect with Google" is not built. The plan keeps it P1 after verification (plan section 6), which is a circle: Google verifies the route, the route needs a test build to be recorded. The card allows "a staging route". The way out is a small build card, for the lane R chat to order: a staging page on a Vercel preview that runs steps 2 to 6 for a test owner and stores nothing. Until that exists no video can be recorded.
2. **Search Console ownership of kabsi.co and the contacts** (plan section 5, step 4) are not recorded as done in PROGRESS. Rashid checks both.
3. **The OAuth client for the route** (step 6 above) does not exist yet.
4. **mybusiness.googleapis.com is still closed** (403 SERVICE_DISABLED on 22 Oct 2026, case 1-4624000041157). This does not touch the invite flow, which uses the Account Management API (open, 300 requests a minute), but if a Google reviewer asks to see the full product working, reviews and posts cannot be shown live. Say in the form that the invite flow is the only use of the scope.

## Questions Google may ask, with the true answers

- Why not use the narrower scope? There is none; see the justification.
- Do you store refresh tokens? No. Online access only; the access token is discarded after the invite is confirmed and revoked.
- Do you use the data to train models or for ads? No (K-113 point 7). Review text drafted through Anthropic's API is covered above.
- Does anyone at Kabsi read the data? Only with the owner's consent, for security, or as the law requires.
- Can the owner remove access? Yes, in Google (People and access, Third-party access) and in Kabsi (Settings, Disconnect Kabsi from Google, removes Kabsi at once; 7 business days is the outer bound, K-113 point 2).
- Is a Workspace admin able to block this? Yes; then the manual route (K-93) is used, which needs no scope.
