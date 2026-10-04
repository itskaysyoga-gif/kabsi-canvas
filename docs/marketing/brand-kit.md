# Kabsi brand kit for video

Set up once on higgsfield.ai before the first video (VIDEO Part 4 "Brand kit"). Every value here comes from the design tokens in `src/styles.css` (K-108) and the VIDEO plan. Do not add colours or fonts.

## Logo

- File: `public/kabsi-mark.svg` in the repo (the round mark: black ring, yellow disc, black dot). Export a 1024 px transparent PNG from it for Higgsfield.
- Dark version: the mark as it is, on black or carbon.
- Light version: the same mark on sand. The mark already carries its own black ring, so it reads on both.
- The word "Kabsi" next to the mark is set in Lalezar, white on dark, black on sand.
- Never put Google's logo, a Maps pin or a Google screen next to the Kabsi logo.

## Colours

| Name   | Hex     | Use in video                                                                                   |
| ------ | ------- | ---------------------------------------------------------------------------------------------- |
| Black  | #000000 | Backgrounds, end card                                                                          |
| Carbon | #0B0B0B | Backgrounds for text scenes (G11b)                                                             |
| Sand   | #F6F4EF | Light text scenes (G11a), carousel backgrounds                                                 |
| Yellow | #FFD60A | Only the one action: the button on the end card, the "needs you" highlight. Never a background |
| Green  | #1F8A5B | "All caught up", "Posted"                                                                      |
| Red    | #D93025 | Only a real problem (a 1-star review tag)                                                      |
| White  | #FFFFFF | Captions and text on dark                                                                      |

## Fonts

- Titles: Lalezar (regular). Big hook text and the end card main line only.
- Everything else: Readex Pro. Captions in Readex Pro SemiBold.
- Both are open-licence (SIL OFL). Download from Google Fonts (fonts.google.com, "Lalezar" and "Readex Pro") and upload to the Higgsfield brand kit. The repo carries only the web subsets, without SemiBold.
- If the Higgsfield plan does not accept custom fonts: save the caption style as a preset with the closest clean built-in sans-serif and use it in every video. Never mix fonts between videos.

## Caption style (save as preset "Kabsi captions")

- Readex Pro SemiBold, white, 56 to 64 px on a 1080 px wide frame.
- Soft black box behind the text (black at about 60% opacity, rounded corners).
- Centred, inside the safe area: keep 270 px clear at the top, 672 px at the bottom and 65 px on each side of a 1080 x 1920 frame.
- Every word read against the shot sheet before export.

## Words

| Item                                                  | Text                                                |
| ----------------------------------------------------- | --------------------------------------------------- |
| Main line                                             | Your reviews and listing. Taken care of.            |
| Sign-off                                              | We watch your listing. You run your business.       |
| CTA before the launch gate (now)                      | Join early access at kabsi.co                       |
| CTA once the Profile Check is live (P0.4-01)          | Free Google Profile Check at kabsi.co               |
| CTA after the launch gate (P0.7-07)                   | Start free. 14 days, no card.                       |
| Not-affiliated line (website videos, ad descriptions) | Kabsi is not affiliated with Google.                |
| AI presenter tag                                      | AI presenter                                        |
| AI presenter line in ads                              | Presenter is AI-generated.                          |
| Scene tag in paid versions                            | Illustrative scene                                  |
| Product recording tag                                 | Demo data (shown by the app itself on demo screens) |
| Not live yet tag                                      | Early access                                        |

## End cards (make once in the Higgsfield editor, save as assets)

All four: 2 seconds, black background, the Kabsi mark centred, the main line under it in Lalezar, kabsi.co under that in Readex Pro.

| Asset name              | Button (yellow, black text) | Use                                                  |
| ----------------------- | --------------------------- | ---------------------------------------------------- |
| End card, early access  | Join early access           | Every video until the Profile Check is live          |
| End card, Profile Check | Free Profile Check          | From P0.4-01 until the launch gate                   |
| End card, start free    | Start free                  | After the launch gate (P0.7-07) and in every paid ad |
| End card, partner       | Apply as a partner          | V13 and W5 only (partner campaign and Partners page) |

## Voice

- Name in Higgsfield Audio: "Kabsi voice". One voice for every voice-over and for Leah.
- Warm, calm, unhurried, mid-30s, neutral international English, about 150 words a minute (15 seconds is about 35 words).
- Audition with the Video 3 script; save the best voice and never switch.
- Generate one sentence at a time; write numbers as words ("nineteen dollars", "two-star").
- Fallback: ElevenLabs on a paid plan with commercial rights, same voice, files uploaded to Higgsfield.

## Music

Meta Sound Collection or a paid licence that covers ads. Low, light, modern; under the voice at about -20 dB. Never a trending track in an ad.

## Pace and sizes

- A new shot every 1.5 to 2.5 seconds on social; 3 to 5 seconds on website videos.
- Export 1080 x 1920 (9:16) first, then Reframe to 1080 x 1350 (4:5) for feed ads and 1920 x 1080 (16:9) for the website. H.264, 30 fps.
- Paid cuts: 9:16 at 10 to 15 seconds, 9:16 Stories under 10 seconds, 4:5 feed. Longer cuts (20 to 35 seconds) are organic and retargeting only.

## File names

`K-V01-hookA-9x16-v1.mp4`: video number, hook variant, ratio (`9x16`, `4x5`, `16x9`), version. Stills: `G01-v1.png`. Clips: `H01-v1.mp4`. Screen recordings: `S01-take1.mov`.

## Characters

| Code | Who                                                                                                                                                                                                                 | Rules                                                                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1   | Leah, Kabsi's AI presenter. Early 30s, shoulder-length brown hair, light natural make-up, olive crewneck (default) or navy shirt, no logos. Locations: bright co-working space (default), café corner, small office | Always disclosed as AI ("AI presenter" tag for the first 3 seconds). Never a customer, an owner or the founder. Soul 2.0: 8 reference stills, then a Soul ID |
| C2   | Ella, café owner. Early 40s, dark apron over a grey sweater, hair tied back                                                                                                                                         | Silent actor. Never speaks, never endorses, never says she uses Kabsi. "Illustrative scene" tag in paid versions. Soul 2.0 references, then a Soul ID        |

## Rules that apply to every video

- Product screens are real phone recordings of the demo workspace (sign in as the demo login, businesses Harbour Lane Coffee and Juniper Hair Studio). AI never draws or animates the Kabsi app or a Google screen. Zooms and highlight boxes in the editor are fine.
- Say "Google" in words only. No Google logo, no Maps pin, no recreated Google screen.
- Hook in the first 2 seconds, in picture and on-screen text; Kabsi's name and one approved claim by second 3; burned-in captions on every video.
- Only claims from the claims table in `feature-truth.md`. A feature that is not live for a new customer today carries the "Early access" tag and stays organic.
- Customers in scenes use their own phone. Never show rewards for reviews, asking only happy customers, "leave us 5 stars" or staff names on cards.
- No paid ads until P0.7-07 records "Paid ads may start".
