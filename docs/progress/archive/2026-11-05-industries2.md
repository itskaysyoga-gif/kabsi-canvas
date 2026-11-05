# Industries 2 (5 Nov 2026, master plan 30.31 item 6 and 30.32)

Every industry page on the Design 9 template, one flat list of industries with no category pages, and nine new industries.
Ran on Opus beside Guides 4 and Fix 3. No price, plan, billing or WhatsApp change.

## Pull requests

| Part | PR | What |
| --- | --- | --- |
| A | 392 | The 17 photos lane R chose from Rashid's 5 Nov upload (3:2 wide, 2:3 tall, 1600 and 800 px WebP q72, logos and lettering blurred), B-006 4:5 crops and 2:3 crops, docs/PHOTOS.md, photos-2026-11-05/ removed. The new photos live in photos-more.ts so Home's first screen stays under its script budget (the speed gate measured 206 KB against 205 before the move). |
| B | 395 | /for as one flat, alphabetical list with a filter; the group pages answer 301 to /for (vercel.json and the route) and left the sitemap; one Design 9 template (d9-industry.tsx) for every industry page; the 11 indexed pages and the dental clinic page rewritten; Highlight component and its DESIGN.md rule; Home's pick cards on the 4:5 crops; facts 01 and 09; COPY.md section 52 |
| C | this PR | The dental clinic page indexed (its claim sheet) and eight new pages: lash and brow studios, tattoo studios, pet groomers, vet clinics, car washes and detailing, florists, opticians, yoga and pilates studios; nine claim sheets; industry_search_terms rows; facts 09 trade notes 7.9 to 7.15 and the hard review rule; llms.txt lists all 20 pages; /for/florists forwards to /for/florist; the public e2e suite reads the sitemap pages again |

## Search words (30.32 item 4)

The DataForSEO balance read 0.31 US dollars after Scan 2, above the 0.25 line, but POST /visibility/balance and /terms need the internal key, which the session does not have, so no volume call was made (0 US dollars spent). Each page's query is Google's own category name with "Google Business Profile", in the title, the H1 line, the answer paragraph and the description (tests/industries2.test.ts). The list is in COPY.md section 52. LATER row: recheck with volumes after the top-up.

## Migration

`supabase/migrations/20261105152727_industries2_search_terms.sql`, applied with apply_migration (version 20261105152727, name industries2_search_terms). Read back: 9 rows per market (AE and GB), source lane_r_approved, checked 2026-11-05: car-wash=car wash, dental-clinic=dentist, florist=florist, lash-and-brow-studio=eyelash salon, optician=optician, pet-grooming=pet groomer, tattoo-studio=tattoo shop, veterinary-clinic=veterinarian, yoga-and-pilates-studio=yoga studio.

## Independent checks

- Claim sheets: an agent wrote the nine sheets from the page files, checking each category name on a live Google profile page. It found unsupported lines (hard reviews worded as "a calm draft" where the code gives high risk reviews no draft; "Flower delivery" not shown by Google; a two-photo post; busy season questions; Christmas Eve questions; "never" for other systems), all fixed; a second pass found none left, plus unsourced claims about customers, which were rewritten.
- Copy check: a fresh agent given only the page lines, the facts and the never-say lists confirmed and the session fixed: the watch Example showed Keep my information and Google is right as WhatsApp buttons (on WhatsApp, Put it back covers hours and the website only), now the choice on kabsi.co; "approve on WhatsApp" for hours; Example posts with words the owner never gave; "never" for clinic systems (facts: not available today); Christmas Eve; "runs your profile"; the trade notes of facts 09 (7.1, 7.9 to 7.15) now say what the code does: illness, injury, allergy and safety reviews are high risk, no draft, a checklist and a holding reply only when asked (risk.ts).

## Tests run

- `npx tsc --noEmit`: pass. `npm run lint:changed`: 0 errors. `npm test`: 104 files, 1151 tests passed (part C). `npm run build`: pass.
- Playwright against the local production build at 390 and 1440 with axe: public (every sitemap page, 84 tests), smoke and check2: all passed except the hair salon picture, whose baseline was renewed on purpose (parts B and C). Before the e2e fix the public suite visited only 4 pages after Guides 4 part C moved the sitemap list.
- Screenshots: docs/industries2/ (/for and the 20 pages, 390 full width and 1440 at half scale, WebP).

## Live (part B, deployment dpl_6Y1opDkB5ewQ51j43ZnVn9TY1Ubm, READY)

curl on kabsi.co: /for, /for/hair-salon, /for/barbershop, /for/dental-clinic 200; /for/beauty-and-wellness, /for/food-and-drink, /for/health, /for/auto, /for/fitness-and-sport 301 to https://kabsi.co/for; /for/barbershop title "Barber shop Google Business Profile help | Kabsi"; the sitemap holds /for and the 11 pages and no group page. Part C's live checks: the session report.

## Changed tests and workflows (for lane R)

sitemap.test, website-industry.test, web5.test and website-home.test follow the removed groups and the new template (same checks); tests/e2e/public.spec.ts reads src/content/sitemap-pages.json; lighthouserc.json adds /for/florist (report only). New: tests/industries2.test.ts.

## Found, not done

- industry_search_terms rows of 27 Oct use plural keys that the pages never send (LATER row).
- The dental clinic Content 1 story (not shown on the page) still uses buttons that differ from the WhatsApp ones.

## Decisions to confirm (lane R)

- The watch Example on industry pages shows the kabsi.co choice, not a WhatsApp chat, because WhatsApp's Put it back covers hours and the website only.
- Industry page names in headlines: "lash studio" and "yoga studio" (the full names made "What Kabsi watches for a ..." 9 words).
- The florist Example moved to Bristol, because Kabsi's holiday list covers England and Wales, not Scotland.
