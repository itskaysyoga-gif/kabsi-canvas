# KABSI, VIDEO PRODUCTION PLAN (Higgsfield)

Status: **planning only, nothing generated.** Execute this plan later when Higgsfield credits are bought. All costs below are real Higgsfield `get_cost` preflight numbers pulled 27 Sep 2026 (no credits spent) unless marked **[estimate]**. Credit-to-USD rate was not queried (would need `show_plans_and_credits`); check the live package price before buying.

Source facts: `claude/KABSI-SPEC.md` §1 (product paragraph, prices, market), §3 (honesty rules) and `KABSI-BRAND.md` (colour, type, motion, imagery rules). This file does not change either doc.

---

## 0. Hard rules (apply to every shot, script and overlay below)

- No promises of more reviews, ratings, rankings or SEO results. No invented numbers or testimonials.
- Never imply Google affiliation. No Google logo, no Google "G", no gold stars, no cedar.
- No review gating, no "leave us 5 stars", no rewards for reviews. Taps/scans are **opens**, not reviews.
- No em dashes in any on-screen text, caption or VO script. Use commas or full stops. Number ranges like 2 to 4 seconds are written out or with a plain hyphen, never , .
- **No faces.** Hands are fine. No real brands or real businesses shown as customers. Any example review or reply on screen is labelled **"Example"**.
- UI screens (inbox, draft, Post button, Shield alert, report) must be **real product screen recordings**, never AI-generated UI. AI video is used only for b-roll (hands, objects, places) composited around real screen capture. See §1.
- Footer/legal line available for any video that names Kabsi + Google together: "Kabsi is independent and not affiliated with Google."
- Market is US, Europe, worldwide (D256): no Lebanese street signage, food or phone formats in anything public-facing. Examples use generic or fictional settings and `+1 (555) …` style numbers. The one exception is V21 (Lebanon field-team tool), which is internal-only, not published.
- Languages for UI/caption variants: English, Spanish, Arabic, French, in that order (D256).

---

## 1. Production pipeline (screen recording + AI b-roll)

Every demo video is built the same way:

1. **Record the real screen.** Use the actual Kabsi app (mock Google mode is fine) on a phone (mobile screens, 9:16) and desktop browser (16:9) with a real screen recorder (QuickTime/OBS on desktop, iOS/Android built-in on phone). Capture the exact flow: review arrives → draft shown → owner taps Post/Edit/Skip, or Shield alert → Put mine back, etc. This footage is never AI-generated.
2. **Clean the recording.** Trim to the exact tap sequence, crop out browser chrome/notification bar clutter, blur or replace any real email address/name with the "Example" test account.
3. **Generate AI b-roll separately** in Higgsfield (hands, counters, cards, places) per the shot lists below.
4. **Composite in an editor** (Premiere/DaVinci/CapCut): AI b-roll opens the scene (2 to 3 s), cuts to the real screen recording as the phone/laptop is picked up or the screen is tapped (use a simple hand-holds-phone AI shot as the bridge, or a plain frame/mockup overlay if no bridge shot), captions burned in per language, VO or on-screen text added, end card with the CTA.
5. **Never** ask any Higgsfield model to draw the Kabsi UI, Google review UI, star ratings or the Google logo. If a generated shot drifts into showing a fake UI, logo or stars, discard it and regenerate without that element in the prompt.

---

## 2. Higgsfield model & cost reference

Pulled live via `models_explore` + `generate_video(get_cost:true)`. All figures are **credits**, no dollars spent.

| Model | Config tested | Duration | Credits | Credits/sec | Best for |
|---|---|---|---|---|---|
| `kling3_0` (std, sound **off**) | text-to-video | 6 s | **7.5** | 1.25 | Cheapest general b-roll: hands, places, objects, no baked-in audio (VO/music added in edit) |
| `kling3_0` (std, sound **on**) | text-to-video | 6 s | **10.5** | 1.75 | Same, when ambient sound (café hum, bell) should be baked in |
| `minimax_h3` (2K) | image/product shot | 5 s | **10** | 2.0 | Product shots: NFC card rotation, macro, studio light, 2K crisp |
| `seedance_2_5` (t2v, 720p, 16:9, audio on) | text-to-video | 6 s | **42** | 7.0 | Premium hero-quality shots when budget allows |
| `seedance_2_5` (t2v, 1080p, 9:16, audio on) | text-to-video | 8 s | **96** | 12.0 | Highest-fidelity vertical hero shot |
| `marketing_studio_video` | one-click ad, 9:16, 720p | 15 s (min duration) | **75** | 5.0 | Built-in hooks/captions for paid social ad cuts (full budget tier only) |

**Model choice used throughout this plan:** `kling3_0` std, sound off, 6 s clips as the default for all b-roll (cheapest, good motion, sound/VO added in the edit). `minimax_h3` 2K for the NFC card product shots (needs crisp still-ish product detail). `seedance_2_5` reserved for the two shots that carry the brand furthest (home hero loop, explainer opener) if the recommended/full budget allows the upgrade. `marketing_studio_video` only in the full tier, for the Meta/paid-social cut-downs that want built-in caption/hook tooling.

Every shot list below states the model + settings to paste into `generate_video`. Duration, aspect ratio and count are the only things that change per shot.

---

## 3. Style guide for video (from KABSI-BRAND.md)

- **Colour:** Kabsi Yellow `#FFD60A` for buttons/CTA text only, one accent per scene, never a large area. Carbon `#0B0B0B` for hero backdrops. Sand `#F6F4EF` for dashboard-context scenes. Black text on yellow always. Signal Red `#D93025` only for the urgent-label UI moment (dashboard screen recording itself, not painted into b-roll). Posted Green `#1F8A5B` only for the real "Live on Google ✓" UI state.
- **Type:** Lalezar for any burned-in headline text, Readex Pro for captions/body/VO text on screen. Sentence case. No diacritics in Lalezar. Caption line length short, phone-legible.
- **Motion:** allowed = one-time tap ripple, one-time 8px rise on card/text entrances, hover/press states, slow push-ins, gentle parallax-free pans. Forbidden = spinning loops, glitch effects, counters ticking up, WebGL, typewriter text, autoplaying loops longer than a few seconds without a cut.
- **Imagery:** plain places and objects, hands only, no people's faces, no real brand logos, no stars, no Google "G", no testimonials, no numbers claimed as real. Fictional/generic settings only (fictional café, fictional bakery, no country-specific signage).
- **Sound:** soft, warm, unobtrusive. No stock "corporate" trumpet stabs. A single soft UI tap/chime sound effect on the Post-tap moment is the only "branded" sound cue; keep it consistent across every demo.
- **Labelling:** any on-screen review, star rating or reply shown as an example carries a small "Example" tag, always visible, never removable by a cut.

---

## 4. Video catalog

Each entry: ID · name · purpose/placement · length · aspect ratios · shot list (model + paste-ready prompt) · VO/caption script · sound notes · credit estimate · priority · done-when check.

### V01, Home hero loop
**Purpose/placement:** Silent looping backdrop behind the `/` hero headline ("Your Google Business Profile, taken care of."), replaces/supplements the current static `HeroBackdrop` photo (D256).
**Length:** 4 to 6 s, seamless loop. **File size target: under 3 MB** (aggressive H.264 compression, no audio track).
**Aspect ratios:** 16:9 desktop, 9:16 mobile crop of the same source (shoot 16:9, crop centre for mobile).

Shot list:
| # | Model + settings | Prompt |
|---|---|---|
| 1 | `kling3_0`, `mode: std`, `sound: off`, `duration: 6`, aspect `16:9` | "Slow steady push in on a pair of hands wiping down a small counter in a plain modern shop, soft warm morning light, shallow depth of field, no people's faces visible, no logos, no readable text anywhere in frame, calm and quiet mood, subtle film grain, loopable motion" |

VO/caption: none (silent hero, no text baked into the video; headline is real HTML on top).
Sound notes: none, must be silent (autoplay muted loop).
Credit estimate: 7.5 credits (1 generation; budget 2 to 3 re-rolls to get a clean loop point = ~15 to 22.5 credits actual spend).
Priority: **P0**.
Done-when: exported MP4 (H.264) and WebM both under 3 MB, loops with no visible seam for 3 consecutive cycles, plays muted and autoplays on the live `/` page without layout shift.

---

### V02, 60 to 90 s explainer
**Purpose/placement:** `/how-it-works` hero slot and YouTube/LinkedIn/site embed; the single video that explains the whole product end to end.
**Length:** 75 s target (60 to 90 s range).
**Aspect ratios:** 16:9 master, 9:16 re-cut for social (see V20 for the cut-downs).

Structure (screen recording + b-roll, per §1): hook (0 to 5 s) → problem (5 to 15 s) → review arrives + draft + Post (15 to 35 s, real screen recording) → also drafts posts, checks photos, hours (35 to 50 s) → Listing Shield alert + revert (50 to 62 s) → Monday report (62 to 68 s) → NFC/QR card + CTA (68 to 75 s).

Shot list (b-roll only; screen-recording segments are captured separately, not generated):
| # | Model + settings | Prompt |
|---|---|---|
| 1 (hook) | `seedance_2_5`, `mode: t2v`, `resolution: 720p`, `aspect_ratio: 16:9`, `duration: 6`, `generate_audio: false` | "Hands scrolling a phone at a small shop counter, a new notification glows softly on the screen edge (no readable text, no logos), warm natural light, cinematic shallow focus, no faces" |
| 2 (problem) | `kling3_0`, `std`, `sound: off`, `duration: 6` | "A shop owner's hands (no face) juggling a phone and a notepad at a counter, slightly stressed pacing, plain modern shop, no text or logos visible, natural light" |
| 3 (bridge into screen recording) | `kling3_0`, `std`, `sound: off`, `duration: 6` | "Close-up hands picking up a phone off a counter and turning the screen toward camera, screen glow only, no UI detail rendered, no logos, soft daylight" |
| 4 (also drafts posts) | `kling3_0`, `std`, `sound: off`, `duration: 6` | "Hands arranging fresh bakery items on a shelf, camera slowly pans, warm bakery light, no faces, no text, no logos" |
| 5 (Shield) | `kling3_0`, `std`, `sound: off`, `duration: 6` | "Close-up of a hand gently placing a small storefront sign back into its holder, calm deliberate motion, plain shopfront, no readable text, no faces" |
| 6 (report/CTA) | `kling3_0`, `std`, `sound: off`, `duration: 6` | "Hands tapping a small NFC card against a phone on a counter, soft click of contact implied by motion, no logos, no faces, warm tidy counter, shallow depth of field" |

VO script (no em dashes, sample; final copy owner/marketing to approve):
"Every Google review gets a reply, drafted for you, in the reviewer's language. You just tap Post, Edit or Skip. Nothing goes to Google without your say. Kabsi also drafts posts, checks your photos, and keeps your hours up to date. If something on your listing changes without you, Listing Shield tells you, and one tap puts it back. Every Monday, a simple report lands in your inbox. Add an NFC or QR card, and one tap opens your Google review page for any customer. Kabsi. Your Google Business Profile, taken care of."

Sound notes: soft ambient shop bed under b-roll, ducked under VO; a single soft UI tap sound at each Post/approve moment in the screen-recorded segments; no music sting on logo end card, just a clean fade.
Credit estimate: 6 shots × 7.5 = **45 credits** at the budget (kling3_0) setting, or swap shot 1 to the tested `seedance_2_5` 720p config (42 credits) for a stronger opener = **~80 credits** if upgrading just the hook. Plan for 1 retry per shot on average: budget **~90 to 100 credits** actual spend.
Priority: **P0**.
Done-when: single 16:9 MP4, 75 s ±10 s, VO and captions synced, every on-screen "review" labelled Example, no Google logo/stars anywhere, passes a full watch-through against §3 (no promises, no numbers, no em dashes on screen).

---

### V03, Demo: review arrives → draft → Post
**Purpose/placement:** `/app` onboarding tour, homepage `InboxDemo` companion video, sales/partner deck.
**Length:** 20 to 30 s.
**Aspect ratios:** 9:16 (phone, primary) and 16:9 (dashboard, secondary cut).

Shot list:
| # | Model + settings | Prompt |
|---|---|---|
| 1 (open) | `kling3_0`, `std`, `sound: off`, `duration: 6`, aspect `9:16` | "Phone resting on a counter, screen lights up with a soft notification glow, no readable text, no logos, hands nearby but not touching phone, warm daylight, still camera" |
| 2 (bridge to tap) | `kling3_0`, `std`, `sound: off`, `duration: 6`, aspect `9:16` | "Close-up hand picking up a phone and thumb hovering above the screen, natural motion, no UI rendered, no faces, soft light" |

Real screen recording (captured, not generated): open email/app notification → review shown → drafted reply in reviewer's language, labelled "Example" → owner taps Post → confirmation state ("Live on Google" Posted Green pill, from the real app, mock mode acceptable).

VO/caption script: "A new review comes in. A reply is already drafted, in the reviewer's language. Read it, edit it if you want, then tap Post. That's it, nothing is sent until you approve it."

Sound notes: one soft chime on notification, one soft tap sound on Post.
Credit estimate: 2 shots × 7.5 = **15 credits** (budget 1 retry: ~20 to 22.5 actual).
Priority: **P0**.
Done-when: real screen capture shows an actual drafted reply and a real Post tap resulting in the app's own "Live on Google" state; exported 9:16 clip plays cleanly on a phone at native size.

---

### V04, Demo: Listing Shield alert → Put mine back
**Purpose/placement:** `/app/settings` Shield tab explainer, `/how-it-works`, sales deck.
**Length:** 20 to 25 s. **Aspect ratios:** 9:16 primary, 16:9 secondary.

Shot list:
| # | Model + settings | Prompt |
|---|---|---|
| 1 | `kling3_0`, `std`, `sound: off`, `duration: 6`, aspect `9:16` | "Close-up of a hand adjusting a small sign or label on a counter, then a second hand nudges it slightly out of place, calm lighting, no faces, no text, no logos" |
| 2 | `kling3_0`, `std`, `sound: off`, `duration: 6`, aspect `9:16` | "Hand gently pushing the same sign back into its original position, satisfied deliberate motion, same counter and light as previous shot for continuity, no faces, no text" |

Real screen recording: Shield alert email/app card showing a changed field (e.g. phone number, mock data) with two buttons, **Put mine back** / **Keep the new one**; owner taps Put mine back; app shows the field restored.

VO/caption script: "If something on your listing changes without you, Kabsi tells you right away. One tap puts your details back the way you had them."

Sound notes: one soft alert tone on the change card, one soft confirm tap on Put mine back.
Credit estimate: 2 × 7.5 = **15 credits** (budget ~20 actual with a retry).
Priority: **P1**.
Done-when: screen recording shows a real before/after diff and a real one-tap revert result; copy never says "locks" or "blocks" (banned terms, D218).

---

### V05, Demo: weekly post draft
**Purpose/placement:** `/app` Posts tab, marketing site "Keep your profile fresh" section.
**Length:** 15 to 20 s. **Aspect ratios:** 9:16 primary.

Shot list:
| # | Model + settings | Prompt |
|---|---|---|
| 1 | `kling3_0`, `std`, `sound: off`, `duration: 6`, aspect `9:16` | "Hands arranging pastries or products on a shop shelf, tidy and calm, warm light, no faces, no text, no logos, shallow depth of field" |

Real screen recording: weekly post draft card with suggested keyword phrase, owner reviews and taps Post (or Edit).

VO/caption script: "Every week, Kabsi drafts a Google post using what's true about your business. You approve it before it goes live."

Sound notes: one soft tap on Post.
Credit estimate: 1 × 7.5 = **7.5 credits**.
Priority: **P1**.
Done-when: on-screen draft text contains no invented facts (matches a real knowledge-card fact from the test account) and no keyword-stuffing that reads as a ranking claim.

---

### V06, Demo: special hours
**Purpose/placement:** `/app/settings` Hours tab, help centre.
**Length:** 12 to 18 s. **Aspect ratios:** 9:16 primary.

Shot list:
| # | Model + settings | Prompt |
|---|---|---|
| 1 | `kling3_0`, `std`, `sound: off`, `duration: 6`, aspect `9:16` | "Hand flipping a small closed sign in a shop window, or turning a plain wall clock, calm afternoon light, no faces, no readable text, no logos" |

Real screen recording: setting a holiday/special hours range, tap to approve, hours updated confirmation.

VO/caption script: "Closing early for a holiday? Set your special hours once, and approve when Kabsi sends them to Google."

Sound notes: one soft confirm tap.
Credit estimate: 1 × 7.5 = **7.5 credits**.
Priority: **P1**.
Done-when: recorded flow shows a real date range set and a real approval tap.

---

### V07, Demo: Monday report
**Purpose/placement:** `/app/report`, weekly report email preview, sales deck.
**Length:** 15 to 20 s. **Aspect ratios:** 16:9 primary (report reads better wide), 9:16 secondary.

Shot list:
| # | Model + settings | Prompt |
|---|---|---|
| 1 | `kling3_0`, `std`, `sound: off`, `duration: 6`, aspect `16:9` | "Hands opening a laptop on a plain desk on a Monday morning, coffee cup nearby, calm light through a window, no faces, no readable text, no logos" |

Real screen recording: the actual weekly report page/email, showing rating and change, reviews replied, taps (labelled "opens, not reviews"), no invented numbers, pulled from the test account's real data.

VO/caption script: "Every Monday, a simple report: your rating, your reviews, and how many people opened your review page. Just facts, no guesswork."

Sound notes: none beyond a soft page-open sound.
Credit estimate: 1 × 7.5 = **7.5 credits**.
Priority: **P1**.
Done-when: every number on screen is pulled live from the test/mock account (no placeholder digits typed into the design), and the taps line reads "opens, not reviews".

---

### V08 to V15, 8 industry clips
**Purpose/placement:** `/for/$slug` industry-page hero visuals (motion version of the existing photo hero) and the homepage `BusinessGrid` hover states.
**Length:** 6 to 8 s each, loopable.
**Aspect ratios:** 16:9 (page hero) + 1:1 (grid tile hover, centre-cropped from the same source).

One shot list pattern repeats per industry (2 shots each: an establishing pan + a close-up hands detail), all `kling3_0`, `std`, `sound: off`, `duration: 6`, aspect `16:9`.

| ID | Industry | Prompt A (establishing) | Prompt B (hands detail) |
|---|---|---|---|
| V08 | Restaurants | "Slow pan across a plain restaurant dining area, empty of people, warm evening light, no logos, no readable menus, tidy tables" | "Hands folding a cloth napkin at a table, warm light, no faces, no text" |
| V09 | Cafés and bakeries | "Slow pan across a café counter with pastries, steam softly rising from a cup, no people, no logos, no readable signage" | "Hands placing a loaf of bread into a paper bag, warm bakery light, no faces, no text" |
| V10 | Clinics and dentists | "Slow pan across a clean, plain clinic reception desk, soft clinical light, no people, no logos, no readable signage" | "Hands organizing a small stack of forms on a clinic desk, calm light, no faces, no readable text" |
| V11 | Salons and barbers | "Slow pan across a tidy salon station with mirror and chair, soft warm light, no people, no logos, no readable signage" | "Hands arranging scissors and a comb neatly on a salon counter, no faces, no text" |
| V12 | Hotels and guesthouses | "Slow pan across a small plain hotel lobby, soft warm light, no people, no logos, no readable signage" | "Hands placing a room key card on a lobby counter, no faces, no text, no logos" |
| V13 | Garages and auto repair | "Slow pan across a clean garage bay, tools neatly organized, soft daylight through a bay door, no people, no logos, no readable signage" | "Hands holding a wrench near a car engine bay, calm deliberate motion, no faces, no text" |
| V14 | Shops and boutiques | "Slow pan across a small plain boutique shop floor, neatly folded clothing on shelves, soft light, no people, no logos, no readable signage" | "Hands folding a garment on a shop counter, calm light, no faces, no text" |
| V15 | Florists | "Slow pan across a small flower shop counter with buckets of flowers, soft natural light, no people, no logos, no readable signage" | "Hands trimming stems and arranging flowers in a vase, no faces, no text, no logos" |

VO/caption script: none needed on the loop itself; each page already carries its own headline/summary in HTML. If a caption is added for social use, keep it to the page's existing "In short" line (D259), never a promise line.
Sound notes: silent, autoplay-muted loops (same treatment as V01).
Credit estimate per industry: 2 × 7.5 = 15 credits. **8 industries × 15 = 120 credits** total (budget ~150 with retries).
Priority: **P1** (build the 8 together as one batch once V01 to V07 land).
Done-when: each of the 8 pages has a looping muted hero clip under 3 MB, no two industries visually collide (each reads as its own trade at a glance), passes the D256 "no Lebanese-specific" and "no faces" check.

---

### V16, Social reels (hook in 2 s), EN / ES / AR variants
**Purpose/placement:** Instagram Reels, TikTok, YouTube Shorts, organic social calendar.
**Length:** 15 to 20 s each. **Aspect ratio:** 9:16 only.

Footage is generated once per concept and reused across the three language variants (only captions/VO change per language, per D256 order EN, ES, AR, French added later if the concept performs).

Concept A, "One tap opens the review page":
| # | Model + settings | Prompt |
|---|---|---|
| 1 | `kling3_0`, `std`, `sound: off`, `duration: 6`, aspect `9:16` | "Extreme close-up, a hand taps a small NFC card against the back of a phone, quick natural motion, soft click implied, no faces, no logos, clean counter background" |
| 2 | `kling3_0`, `std`, `sound: off`, `duration: 6`, aspect `9:16` | "Phone screen lifts into frame, soft glow, no readable UI rendered, hand steady, no faces, no logos" |

Concept B, "Reply drafted for you":
| # | Model + settings | Prompt |
|---|---|---|
| 1 | `kling3_0`, `std`, `sound: off`, `duration: 6`, aspect `9:16` | "Hands typing quickly then stopping and relaxing, a phone rests beside a coffee cup, calm shop counter, no faces, no logos, no readable text" |
| 2 | `kling3_0`, `std`, `sound: off`, `duration: 6`, aspect `9:16` | "Close-up hand tapping a phone screen once, deliberate satisfied motion, no UI rendered, no faces, no logos" |

Real screen recording inserted at second 2 (the 2-second hook rule): the actual Post button tap and the "Live on Google" state, both concepts.

Caption/VO scripts (no em dashes; same meaning, localize naturally rather than translate word for word; AR right-to-left captions):
- EN: "One tap. Your Google review page, open. Nothing posted without you."
- ES: "Un toque. Se abre tu pagina de reseñas de Google. Nada se publica sin tu aprobacion."
- AR: "كبسة واحدة. تفتح صفحة تقييمك على Google. ما بينشر شي بدون موافقتك."

Sound notes: trending-audio-safe (silent b-roll, VO/captions carry the message so it works muted-first per platform norms); one soft tap SFX at the hook moment.
Credit estimate: 2 concepts × 2 shots × 7.5 = **30 credits** of footage, reused across all language cuts → 6 finished videos (2 concepts × 3 languages) for 30 credits total generation spend (budget ~40 with retries).
Priority: **P2**.
Done-when: hook (the tap or the "Live on Google" reveal) lands inside the first 2 seconds on every language cut; each language's captions are reviewed by a native speaker for the honesty-rule wording, not a literal machine translation.

---

### V17, Partner pitch video
**Purpose/placement:** `/partners` page, DM/email to prospective card-seller partners, Lebanon field-team onboarding of new resellers.
**Length:** 45 to 60 s. **Aspect ratios:** 16:9 primary (deck/email embed), 9:16 cut for IG DM.

Shot list:
| # | Model + settings | Prompt |
|---|---|---|
| 1 | `kling3_0`, `std`, `sound: off`, `duration: 6` | "Hands arranging a small stack of NFC cards on a clean desk next to a laptop, calm workspace light, no faces, no logos, no readable text" |
| 2 | `kling3_0`, `std`, `sound: off`, `duration: 6` | "Close-up hand tapping a card against a phone at a shop counter, quick natural motion, no faces, no logos" |
| 3 | `minimax_h3`, `resolution: 2K`, `duration: 5`, aspect `1:1` | "Product shot, a small NFC card with a QR code standing upright on a wooden counter, slow rotation, soft studio light, no people, no logos, no brand marks, crisp detail" |
| 4 | `kling3_0`, `std`, `sound: off`, `duration: 6` | "Hands reviewing a simple printed invoice or ledger sheet at a desk, calm and organized, no faces, no readable numbers, no logos" |

Real screen recording inserted: the partner dashboard (businesses table, invite link, invoice list).

VO/caption script: "Your clients already need Google. Now you can take care of it. Invite a business, they tap through setup, you see status and taps in one place. Wholesale pricing per active location, paid in USDT, founding partners locked in for a year."

Sound notes: calm, professional bed, no music sting, one soft tap SFX at shot 2.
Credit estimate: 3 × 7.5 (kling3_0) + 1 × 10 (minimax_h3) = **32.5 credits** (budget ~45 with retries).
Priority: **P1**.
Done-when: pricing stated on screen matches spec exactly ($8/active location/month, $6 founding for 12 months) and never shows a per-owner price on the partner cut (partners see wholesale only, per current `/partners` copy rules).

---

### V18, NFC card product shots
**Purpose/placement:** `/pricing` card render section, `/app/cards`, Instagram product posts, partner sales kit.
**Length:** 4 individual 4 to 6 s clips (not a single video; a small stock library to drop into any page/post).
**Aspect ratios:** 1:1 (Instagram grid) and 9:16 (Stories/Reels cover).

Shot list, all `minimax_h3`, `resolution: 2K`, `duration: 5`:
| # | Aspect | Prompt |
|---|---|---|
| 1 | `1:1` | "Product shot, a small plain NFC card with a subtle QR code, standing upright on a wooden counter, slow full rotation, soft studio light, no people, no brand marks, no logos, crisp detail, shallow depth of field" |
| 2 | `9:16` | "Macro shot, a hand's fingertip approaching an NFC card resting on a counter, extreme close focus on the card's surface and QR code, no readable brand marks, soft light, no face" |
| 3 | `1:1` | "Product shot, an NFC card standing in a simple card holder next to a coffee cup, cozy counter styling, soft daylight, no people, no logos" |
| 4 | `9:16` | "Slow dolly past a small stand displaying one NFC card upright, plain minimal background, soft even light, no people, no logos, clean commercial product look" |

VO/caption: none (b-roll library; captions added per placement, e.g. "Example card, code DEMO24" per the brand rule that the only mock-up code shown anywhere is DEMO24).
Sound notes: none; silent product loops.
Credit estimate: 4 × 10 = **40 credits** (budget ~50 with retries for clean rotation loops).
Priority: **P0**.
Done-when: 4 clean clips delivered, card artwork in every shot matches the real KABSI-STICKER-SPEC design (composite the real card art onto the generated surface in post if the AI model can't render the exact design; do not let the model invent card artwork), and the visible code (if any) is `DEMO24` only.

---

### V19, Onboarding help: adding a Manager
**Purpose/placement:** `/start` Access step, help centre article, email attachment to a stuck signup.
**Length:** 30 to 45 s. **Aspect ratios:** 9:16 primary (matches the phone-based Google Business Profile app flow most owners use), 16:9 desktop-Google-Business-Profile-website cut as a second version.

Shot list:
| # | Model + settings | Prompt |
|---|---|---|
| 1 | `kling3_0`, `std`, `sound: off`, `duration: 6` | "Hands holding a phone, thumb hovering over the screen, focused calm expression implied by posture only, no face visible, plain desk background, no logos" |

Real screen recording (the bulk of this video): the actual Google Business Profile app/website flow of inviting Kabsi business group ID `5481006796` as a Manager, step by step, captured live (this is Google's own UI, screen-recorded, not generated or redrawn) plus Kabsi's own "waiting for access" status screen.

VO/caption script: "Open your Google Business Profile, go to Managers, and add hello at kabsi dot co. We'll email you the moment access is granted, usually within a day."

Sound notes: one soft confirm tap when the invite is sent.
Credit estimate: 1 × 7.5 = **7.5 credits**.
Priority: **P0**.
Done-when: every step shown matches Google's current live Business Profile UI at recording time (re-record if Google changes the flow before publish); Kabsi's own screens shown are real, not mocked art.

---

### V20, Meta ad cut-downs
**Purpose/placement:** Meta/Instagram/TikTok paid ads, various durations.
**Length:** 6 s, 15 s and 30 s cuts. **Aspect ratios:** 9:16 and 1:1.

This is an **edit-only** deliverable: re-cuts of V02 (explainer) and V03 (review demo) footage already generated, no new AI generation required. If a dedicated ad-native cut is wanted with Higgsfield's built-in caption/hook tooling instead of a manual re-edit, use the tested config below (full budget tier only):

| # | Model + settings | Prompt / note |
|---|---|---|
| 1 [optional, full tier] | `marketing_studio_video`, `aspect_ratio: 9:16`, `resolution: 720p` (default 15 s min duration, audio on) | "Vertical ad: a hand taps a small NFC card, phone lights up, quick cut to a real drafted Google review reply on screen labelled Example, bold yellow caption overlays, no faces, no Google logo", 75 credits, tested |

VO/caption: reuse V02/V03 lines, trimmed to fit; the 6 s cut is caption-only (no VO fits), built around the strongest single moment (the Post tap).
Sound notes: same soft tap SFX; music bed only on the 15 s and 30 s cuts.
Credit estimate: **0 credits** (manual re-edit of existing footage) or **75 credits** per Marketing Studio cut if that route is chosen.
Priority: **P2**.
Done-when: each cut passes Meta's ad-copy review mentally against §3 (no ranking/review promises) before it is ever submitted to Meta's ad system.

---

### V21, Lebanon field-team card video
**Purpose/placement:** Internal only, shown by the Lebanon field team on a phone/tablet during a cash/Whish/OMT sale; not published on the public site or social (per D256, public assets stay Lebanon-free; this one tool is exempt because it is not public-facing).
**Length:** 30 to 40 s. **Aspect ratios:** 9:16 (field rep's phone).

Shot list:
| # | Model + settings | Prompt |
|---|---|---|
| 1 | `kling3_0`, `std`, `sound: on`, `duration: 6` | "Hands presenting a small NFC card across a shop counter, warm friendly gesture, ambient shop sound implied, no faces, no logos" |
| 2 | `kling3_0`, `std`, `sound: on`, `duration: 6` | "Close-up hand tapping the card against a phone, satisfied confirming motion, soft ambient shop sound, no faces, no logos" |
| 3 | `kling3_0`, `std`, `sound: off`, `duration: 6` | "Hands counting cash or handling a small payment receipt at a counter, calm and businesslike, no faces, no readable numbers, no logos" |

Real screen recording: the phone opening the real Google review page after the tap (this is the actual public Google page opening, screen-recorded, not a mock).

VO/caption script (Arabic and English both useful for the field team's own reference, not for the customer-facing card itself): "One tap, and any customer's phone opens straight to your Google review page. Twenty dollars, one time, yours to keep."

Sound notes: light ambient shop sound on shots 1 and 2 (baked in via `sound: on`), silent on shot 3.
Credit estimate: 2 × 10.5 + 1 × 7.5 = **28.5 credits** (budget ~35 with a retry).
Priority: **P2**.
Done-when: field rep can play it on a phone with no internet (downloaded, not streamed) and it never states a price other than the current spec price ($20 card).

---

## 5. Production order

1. **V01** hero loop (cheapest, immediate homepage lift, tests the loop/compression pipeline once).
2. **V19** onboarding help (unblocks real signups stuck on the Manager-invite step, cheapest demo).
3. **V03** review → draft → Post demo (the single most-shown proof point; needed before V02 can reuse its screen recording).
4. **V02** 60 to 90 s explainer (reuses V03's screen capture; biggest single lift for conversion).
5. **V18** NFC card product shots (unblocks `/pricing`, Instagram, partner kit).
6. **V04, V05, V06, V07** the remaining four product demos (batch together, same recording session as V03).
7. **V17** partner pitch (reuses V18 product shot + a new partner-dashboard recording).
8. **V08 to V15** 8 industry clips (one batch job, same prompt pattern, run together).
9. **V16** social reels (reuses the tap/Post moments already captured for V03).
10. **V21** Lebanon field-team video (internal, whenever the field team next needs fresh material).
11. **V20** Meta ad cut-downs (pure re-edit, do last, after the source footage above exists; add the Marketing Studio cut only if the full budget tier is funded).

## 6. Budget tiers (credits; USD unknown, check current Higgsfield package price before buying)

| Tier | Scope | Generation credits (as-tested configs) | With ~25% retry buffer |
|---|---|---|---|
| **Minimum** | P0 only: V01, V02, V03, V18, V19 | 7.5 + 45 + 15 + 40 + 7.5 = **115** | **~145** |
| **Recommended** | P0 + P1: + V04, V05, V06, V07, V08–V15, V17 | 115 + 15 + 7.5 + 7.5 + 7.5 + 120 + 32.5 = **305.5** | **~380** |
| **Full** | P0 + P1 + P2: + V16, V20 (footage-only), V21 | 305.5 + 30 + 0 + 28.5 = **364** | **~455**; add 75 more if the optional Marketing Studio ad cut in V20 is used → **~530** |

Buy credits at the **Recommended** tier at minimum; it covers every public-facing asset (hero, explainer, all 5 demos, all 8 industry pages, partner pitch) and leaves the social/internal extras (P2) as a clean top-up later.

## 7. File naming and delivery specs

**Naming:** `kabsi-{video-id}-{short-slug}-{aspect}-{lang}.{ext}`, e.g. `kabsi-v02-explainer-16x9-en.mp4`, `kabsi-v08-restaurants-1x1.webm` (omit `-{lang}` when a video has no language variant).

**Delivery per video:**
- MP4, H.264, matching the target aspect ratio, audio AAC where used.
- WebM (VP9) sibling for browser `<video>` tags.
- One poster frame JPEG/WebP, same basename + `-poster.jpg`, for the `poster` attribute and social thumbnails.
- `.vtt` caption file per language variant for any video with VO or on-screen dialogue (V02, V03, V04, V05, V06, V07, V16, V19), same basename + `-{lang}.vtt`.
- Upload target: Supabase Storage public bucket `site`, path `v2/video/{video-id}/{filename}`, same one-year cache convention as the existing photo assets (D255/D256), served through a `SiteVideo` component analogous to the existing `SiteImg`.
- **Reduced-motion fallback:** every autoplaying video (V01 hero loop, V08 to V15 industry loops) needs a static poster-frame-only fallback shown when `prefers-reduced-motion: reduce` is set, matching the existing `useSectionRise`/reduced-motion handling already in `PublicLayout`. Demos with VO/controls (V02 to V07, V16, V19) are exempt since they are user-initiated, not autoplaying.
- Every published page's `sitemap.xml` gets a matching `<video:video>` entry once a video goes live, mirroring the existing image sitemap entries (D259).

---

**Not done in this pass (by design):** no Higgsfield credits were spent; no files were generated; no repo or project files were edited. `models_explore` and `generate_video(get_cost:true)` calls above are real, live-queried costs, not guesses, except items explicitly marked [estimate] (retry buffers, and any config not directly tested such as `kling3_0_turbo` or `seedance_2_5` at other durations, which will cost roughly in proportion to the per-second rates in §2).
