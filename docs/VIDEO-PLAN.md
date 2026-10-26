# Kabsi video plan (lane R, 26 Oct 2026, master plan 30.18)

Who does what: Rashid records the footage and runs the video tool (Claude Code on Hussein's Claude account, working in
Rashid's own GitHub repo); the tool edits, adds voice-over and subtitles and commits the files; lane R reviews every
video before it is used; Rashid posts. Copy this file into the video tool's repo as its brief. kabsi-canvas wins if they
ever differ.

## 1. Rules every video follows (no exceptions)

- Words: plain English for owners, the kabsi-copy rules: no em dashes, en dashes or exclamation marks, never "spot",
  "grid", "pin", "listing", "visibility" or "app" for Kabsi. Every claim must be in https://kabsi.co/llms-full.txt.
- Never say or show: top of Google, more customers or bookings, guaranteed results, fully automatic, set and forget,
  Google-approved or Google partner, we remove bad reviews. Kabsi publishes nothing without the owner's yes: every
  demo shows the Yes.
- No Arabic anywhere in frame, in voice or in captions (R-61). Blur, crop or re-record: business logos in Arabic
  script (Yawmiyati's), map and street labels, contact names, keyboards, browser tabs, signs, captions.
- Always hidden in recordings: Google's logo and its four colours, account photos, email addresses, phone numbers,
  contact suggestions, other people's photos on a listing, notifications, the recorder's own toolbar.
- Google's name only as plain words. Never Google's logo, colours or anything suggesting Google approves or partners
  with Kabsi. Small print on ads and explainers: "Kabsi is independent and not affiliated with Google."
- WhatsApp: the glyph only from simple-icons, unaltered, only where it means WhatsApp. No WhatsApp logo animation.
- No invented proof: no testimonials, star ratings, user counts or logos. No actors or AI-made people presented as owners
  or customers. Invented example businesses carry the "Example" badge on screen. Real owners appear only from the
  Founding 25, with written consent, saying their own words.
- Faces: only people who agreed in writing (Rashid, consenting owners and staff). Stock clips need a licence that allows
  ads (Pexels or Unsplash video, or the platform's own library); keep the licence link in the video's folder.
- Voice: one voice for every product video. Either Rashid's own voice, or one AI voice chosen once (calm, adult, neutral
  British English) and never changed. Never clone anyone else's voice. Turn on the platform's AI label where it asks
  for one (TikTok and YouTube for realistic synthetic voice or people).
- Music: only tracks with a licence for commercial use (the platform's commercial library, YouTube Audio Library, or a
  royalty-free licence saved in the folder). Music sits under the voice at about -20 LUFS; voice at -14 LUFS.

## 2. Brand kit for the tool

- Colours (from src/styles.css in kabsi-design-studio): Kabsi yellow #FFD60A (one highlight per screen, never body
  text), night #0C0C0B, carbon #161614, paper #F5F3EE, ink #111111, mute #B8B3A8, green #1F8A5B (approved, published),
  red #D93025 (only for a problem). Black and yellow lead; everything else is support.
- Type: Bricolage Grotesque for titles, Manrope for captions and body (both open licence, from Google Fonts).
- Logo: the yellow ring mark and the word "kabsi", from kabsi-design-studio public/ (never redrawn, never recoloured).
- Captions: Manrope SemiBold, white on a night box at 80 percent, at most 2 lines and 32 characters a line, one word in
  yellow at most, never covering the thing being tapped. Website videos use WebVTT caption files, never burned in.
  Social videos burn the captions in and also ship an SRT.
- Safe zone for 1080 x 1920: keep text out of the top 220 px, the bottom 420 px and the right 120 px.
- Tap rings: a soft dark ring (#111827 at 30 percent) for half a second on each tap or click, the same as the access
  recordings.
- End card (3 seconds): the mark, "Your business on Google. Taken care of.", "Free check at kabsi.co".

## 3. Formats

| Use | Size | Length | Sound | Captions | File |
| --- | --- | --- | --- | --- | --- |
| Website loop | 1080 wide max, 9:16 or 16:9 | 8 to 16 s | none | HTML or WebVTT | H.264 MP4, under 1.5 MB, plus a WebP poster |
| Website explainer | 1920 x 1080 and 1080 x 1920 | 45 to 90 s | voice | WebVTT | H.264 MP4, under 12 MB |
| Reels, TikTok, Shorts | 1080 x 1920, 30 fps | 15 to 35 s | voice and music | burned in, plus SRT | H.264 MP4 |
| Meta feed ads | 1080 x 1350 (4:5) and 1080 x 1920 | 15 s | voice, works muted | burned in | H.264 MP4 |
| YouTube how-to | 1920 x 1080 | 45 to 120 s | voice | SRT | H.264 MP4 |

The hook is in the first 2 seconds. Every social video works with the sound off.

## 4. The catalogue

Status: done, ready to make, waits for footage, or later.

### Website (W)
| ID | Video | Goal | Story | Footage | Status |
| --- | --- | --- | --- | --- | --- |
| W1 | Hero loop: "A review, ready for your yes" | Home hero, ads A1 | A WhatsApp message arrives with a new review and a drafted reply, the owner taps Yes, "Published on your Google profile" appears. Example business, Example badge. | Screen capture of the design studio's demo chat at 390 px | ready to make |
| W2 | How Kabsi works (60 s) | How it works page, YouTube | Reviews waiting and hours wrong, Kabsi on WhatsApp, three jobs (replies, details, posts and photos), you approve every one, the Monday receipt, free check. | Design studio screens, B-roll of an owner on the phone at work, W1 | ready to make |
| W3 | Access: add on a phone, remove on a phone, add on a computer | Manager steps, onboarding, Security | Done by lane R on 26 Oct. | Rashid's recordings | done |
| W3b | Access: add in the Google Maps app | Manager steps (if it works) | Paste the ID in the Maps app's Add manager. | A fresh recording, see section 6 | waits for footage |
| W4 | One loop per wave 1 industry (12) | Each industry page | That page's WhatsApp story animated, with its Example business and one of its photos. | Design studio pages, the industry photos | with Content 1 |
| W5 | Meet the founder (45 s) | About, Founding 25, the "A person helps" block | Rashid on camera: who he is, why Kabsi, what Manager access allows, how to reach him on WhatsApp. | Talking head, section 6 | waits for footage |
| W6 | The free check (20 s) | Home, Free check page, ads A2 | Type the business, the nearby result, "Check my business free". | Screen capture of kabsi.co after Web 2 | later (Web 2) |
| W7 | The Monday Results Report (15 s) | How it works, Pricing | The work receipt: what Kabsi did, what waits for a yes, one next step. | The redesigned email (Email 1) | later (Email 1) |
| W8 | You keep the keys (20 s) | Security | Never a password, you stay the owner, remove Kabsi any time (uses W3 remove). | W3 | ready to make |

### How-to (H): one for each guide in master plan 30.16, 45 to 120 s, YouTube and the guide page
| ID | Video | Footage |
| --- | --- | --- |
| H1 | How to reply to a Google review (and what not to write) | Screen recording of replying on Yawmiyati (hide list applies) |
| H2 | How to set holiday hours on Google | Screen recording of special hours |
| H3 | Photos that bring customers in, by trade | Industry photos and the phone camera |
| H4 | How to fix wrong hours, phone or address | Screen recording of Edit profile |
| H5 | How to choose your Google category | Screen recording of the category field |
| H6 | How to ask for reviews the right way (no gating, no rewards) | Design studio's review link and QR card |
| H7 | How to give someone access to your Google profile | W3 |

### Social (S): three posts a week, rotating series, English only
| ID | Series | One post is |
| --- | --- | --- |
| S1 | 10-second reply | One trade's review arriving and the reply ready, from W1 and W4 |
| S2 | One Google fix | One tip from a guide, 15 to 25 s, ending on the guide |
| S3 | Where you show up | The nearby check for an Example business: three places, who came first, one count |
| S4 | Building Kabsi | Rashid, weekly, 30 s: what changed this week and why |
| S5 | Seasons | Hours and posts before Ramadan, Eid, Christmas and summer, in English |
| S6 | Straight answers | "Does Kabsi need my password? No." One question a post, from the FAQ |
| S7 | Founding 25 | While places are open: what the 25 get and how to apply |

### Ads (A): after the launch gate, one at a time (30.15 section 6)
| ID | Ad | Cuts |
| --- | --- | --- |
| A1 | Show the work: "Your Google reviews and updates, ready to approve on WhatsApp." | W1 with voice, 15 s, 9:16 and 4:5, one variant per wave 1 industry with its own photo, two hooks each |
| A2 | The free nearby check | W6, 15 s |
| A3 | Retargeting: finish setting up | W3 add, 10 s: "Five taps on Google, and Kabsi can start." |

## 5. The prompt for the video tool (paste one per video, fill the brackets)

```
You are making one Kabsi video. Read VIDEO-PLAN.md in this repo first and follow every rule in sections 1 to 3.
Video: [ID and name from section 4]. Use: [where it goes]. Format: [from section 3].
Inputs in inputs/[ID]/: [list the files Rashid added].
Story, beat by beat: [the story from section 4, with the seconds for each beat].
Voice-over script (English, plain, no em dashes or exclamation marks): [the script, or "write it from the story in
under N words and put it in out/[ID]/script.txt for lane R"].
Before you render: list every frame that shows Arabic script, a logo, a face, an email, a phone number, a contact name
or a notification, and blur or crop each. Then render, and make a contact sheet at 2 frames a second.
Output in out/[ID]/: the video(s), captions (SRT or WebVTT), the poster frame, the contact sheet, script.txt,
licences.txt (music and stock clips) and checklist.md answering each rule of section 1 with yes or no.
Commit and push. Do not post anywhere.
```

## 6. What Rashid records

- Phone screen recordings: Do Not Disturb on, phone and Google account in English, a clean home screen, full battery
  icon, slow taps with a one-second pause on every screen and three seconds on the last. Paste IDs from Kabsi's Copy
  button, never type them.
- W3b, the Google Maps app (re-record): first remove the Kabsi Clients group on the computer (an "access lost" alert and
  email will come; that is expected), then in the Maps app: your profile picture, Your Business Profiles, Yawmiyati, the
  three dots, Settings (Business Profile settings), Managers, Add, paste 5481006796. If "Kabsi Clients, Business Profile
  group" appears, choose it, Manager, Add, and hold three seconds on the Pending screen. Then accept the invitation by hand as on 26 Oct (Arabic-script addresses still wait for a person, Access 2). If it does not appear, stop and
  tell lane R: the steps will not mention the Maps app. The contact suggestions will show and lane R blurs them.
- Computer recordings: browser window only (no other tabs, no bookmarks bar), the page zoomed to 125 percent, recorded
  at the screen's full resolution, the recorder's toolbar outside the window. A fresh "add" recording while Kabsi is
  not yet a Manager replaces the current one later, so the last screen shows Pending.
- W5, the founder: phone at eye level on a stand, 4K 30 fps, a window in front of you, a clip-on microphone, a plain
  background with nothing written on it, 45 seconds, then a few seconds of silence. Lane R writes the script first.
- B-roll: a few 5-second clips of a phone in hand at a real business, only with the owner's written okay and no shop
  name, sign or customer face in frame.

## 7. Review and delivery

1. The tool pushes out/[ID]/ and Rashid pastes the folder link to lane R.
2. Lane R checks the contact sheet and the checklist against section 1, then approves or sends notes once.
3. Approved website videos go to kabsi-design-studio src/assets/video (and later kabsi-canvas through Web 2) with their
   captions; approved social videos are posted by Rashid with the caption text from script.txt.
4. Names: kabsi-[id]-[short-name]-[size].mp4, for example kabsi-w1-hero-1080x1920.mp4.

## 8. Order

1. Now: W3b re-record (Rashid), W1 and W8 (the tool), W5 script (lane R) then recording (Rashid).
2. With Web 2: W2 and W6. With Content 1: W4 for the finished industry pages. With Email 1: W7.
3. After the launch gate: S1 to S7 at three a week, then A1, A2 and A3 in that order.
