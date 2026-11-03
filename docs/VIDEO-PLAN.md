# Video plan (copied from kabsi-design-studio on 3 Nov 2026, Polish 2; the product video updated to lane R's decision 9)

Two videos: a product video and a founder video. Plan only: nothing is bought, recorded or published by a session.
The product video is made in this repo from the site's own components; Rashid records the founder video on his phone.
Rules for both: English only, captions burned in and as a file, no Arabic in any frame (R-61), no Google logo or
colours (Google's name only as plain words), no stars or avatars presented as customers, no ranking or results promise,
no exclamation marks or dashes in captions, every invented business and figure marked Example. Until a real video
exists no page says "Watch the demo"; the slots stay hidden.

## 1. Product video: "Your business on Google. Taken care of."

- **Purpose.** In 15 to 25 seconds, the whole loop for a cold visitor from a UK ad (lane R decision 9 of 3 Nov 2026):
  a detail found, a reply or post prepared, the owner's yes, Kabsi seeing it live on Google, and the weekly report.
- **Where (the slots are in the code, hidden until a real video exists).**
  - Home: `<div data-slot="product-video" hidden />` in the three-beats band, `Beats()` in
    `src/components/kabsi/d8-home.tsx` ("Kabsi prepares. You approve. Kabsi follows through."), shown inline, muted,
    with a poster.
  - How it works: `<div data-slot="product-video" hidden />` right under the hero (`PageHero`) in
    `src/components/kabsi/d8-how.tsx`, before "A week with Kabsi".
  - Social: Reels and Stories (9:16).
- **Length and format.** 20 seconds (15 to 25 allowed). Site: 16:9 and 1:1, MP4 (H.264) under 2 MB plus WebM,
  1080 px, poster JPEG under 80 KB, loads on tap or when in view (never in the first load: Home's script and LCP
  budgets hold). Reels: 9:16, 1080 by 1920, safe area 250 px top and bottom, captions inside it.
- **What must be real.** Kabsi's own screens as built (the WhatsApp-style messages, the Kabsi website screens, the
  state words Approved, Sent to Google, Live on Google, the weekly report's three parts), Kabsi's mark, fonts and
  colours, the line "Kabsi is independent and not affiliated with Google."
- **What may be Examples.** The business (Hollis Hair, Bristol, or Fade and Co, Leeds), the reviewer, the review, the
  post, the hours, the report's numbers. An "Example" badge stays on screen whenever an example shows.
- **Storyboard** (16:9 timing; 9:16 stacks the same frames):

| # | Time | Picture | Caption (burned in) |
| --- | --- | --- | --- |
| 1 | 0.0 to 2.5 s | A salon at opening time (licensed scene, no one presented as a customer), phone face up on the counter | Your business on Google. |
| 2 | 2.5 to 6.0 s | A detail found: "Hours. Google shows you closed on bank holiday Monday. You told me 10:00 to 16:00." with Use my hours and Keep Google's | Kabsi checks your details every day. |
| 3 | 6.0 to 10.0 s | Work prepared: a new review arrives and the reply is ready; then a post with the owner's photo, "Late appointments every Thursday" | A reply or a post, ready for you. |
| 4 | 10.0 to 12.5 s | The owner's yes: a thumb taps Yes; "Approved" with Undo | Nothing goes live without your yes. |
| 5 | 12.5 to 15.5 s | Kabsi sees it live: the status moves Approved, Sent to Google, Live on Google, then "See it on Google" | Kabsi checks it is live on Google. |
| 6 | 15.5 to 18.0 s | The weekly report card: what Kabsi did (6 replies live on Google, 1 post), what waits for your yes, one next step | Every Monday, your weekly report. |
| 7 | 18.0 to 20.0 s | Kabsi mark, "Check my business free", kabsi.co | Free check at kabsi.co. Free for 14 days once connected. No card. |

  Sound: a light music bed and taps, no voice in the site version; the Reels version may add an English voice reading
  the captions, with the same words.
- **How it is made.** Render the site's components (the hero phone and report card in d8-home.tsx, the demonstration
  on How it works) frame by frame in this repo (Playwright screenshots or a small canvas recorder), cut in any editor.
  No stock footage of a "customer". Nothing is bought for it.
- **Captions file.** WebVTT with the seven lines above, one per shot.
- **Thumbnail / poster.** Frame 5 (Live on Google done), the Example badge visible, the caption "Kabsi prepares. You
  approve. Kabsi follows through." No face, no star rating, no Google logo.

## 2. Founder video: Rashid, 30 to 45 seconds

- **Purpose.** A real person behind the product, for owners deciding whether to apply for Founding 25 or start the
  trial; the honest replacement for testimonials Kabsi does not have yet (30.21 section 3).
- **Where.** The Founding 25 section on Home (`Founder()` in src/components/kabsi/d8-home.tsx, "From the founder", beside the photo, on tap), /founding at the
  top of the form column, About. Social: Reels, pinned on Instagram and Facebook (SOCIAL_LINKS).
- **Length and format.** 40 seconds. Shot vertical 9:16 on a phone at 1080 by 1920, 30 fps, lit from a window;
  site version cropped 4:5 or 1:1 with the same captions. MP4 under 4 MB, poster JPEG.
- **What must be real.** Rashid himself, his own words, his real name on screen, the real Founding 25 terms (three
  months of Pro free, by application, no card, the places left as the counter shows that day, the real count only).
- **What may be Examples.** Any screen shown over his shoulder carries the Example badge; no real customer's
  business, review or name appears.
- **Storyboard:**

| # | Time | Picture | Caption |
| --- | --- | --- | --- |
| 1 | 0 to 4 s | Rashid, head and shoulders, plain wall | I'm Rashid Abou Hamzy. I built Kabsi. |
| 2 | 4 to 12 s | Rashid talking | A Google profile needs work every week: replies, hours, posts. Most owners have no time for it. |
| 3 | 12 to 20 s | Cut to the phone screen (Example badge): a reply ready, Yes tapped | Kabsi does that work and asks for your yes. Nothing goes live without it. |
| 4 | 20 to 30 s | Back to Rashid | I'm looking for 25 businesses to use Kabsi Pro free for three months and tell me what to make better. |
| 5 | 30 to 38 s | Rashid, then the /founding page on a phone | I read every application myself. No card, and nothing is charged by itself. |
| 6 | 38 to 40 s | Kabsi mark, kabsi.co/founding | Apply at kabsi.co/founding |

  The words are Rashid's to adjust; every claim stays inside knowledge/kabsi-facts.md (Founding 25 terms, no
  results promise, "Kabsi does the Google work; you tell Rashid what to make better.").
- **Captions file.** WebVTT, one cue per line above.
- **Thumbnail / poster.** Rashid looking at the camera, the caption "Founding 25: three months of Kabsi Pro,
  free." No badge, no stars, no logo but Kabsi's.

## 3. Checks before either video goes on the site

check:copy on the caption files, no frame with Arabic script or Google's logo, the Example badge wherever an
example shows, the poster under 80 KB, the video never in the first load (Home's script and LCP budgets hold),
captions on by default, and a transcript link beside the player for screen readers.
