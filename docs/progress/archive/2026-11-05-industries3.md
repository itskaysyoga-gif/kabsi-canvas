# Industries 3 (5 Nov 2026, master plan 30.33 item 2)

The 20 industry pages short, scannable and fully linked. Ran on Opus beside Style 1 (every other public page) and App 5 (the signed-in site). No price, plan, billing, WhatsApp or database change.

## Pull requests

| Part | PR | What |
| --- | --- | --- |
| A | see the session report | The template (d9-industry.tsx): "What people search for" is one answer line, chips and one line; "Your Google profile, as a [trade] owner" two to four cards; the review, categories, holidays and photos groups short cards; Read next with three guides as photo cards (Style 1's guide photos) (getIndustryGuides picks them on the server: the page's picks, then guides that name the page, then the newest) and six related businesses, 2 by 3 on a phone and 3 by 2 from 768 px, with "See every business"; /for 2 columns below 1024 px and 4 from 1024 px; every card grid centred so no card sits alone in a last row. The 20 content files and their claim sheets ("Industries 3" section in each). Each page's own share image (public/og/industries/<slug>.jpg, scripts/industry-og.mjs; og:image and twitter:image). Facts 09, COPY.md 56, DESIGN.md, LATER. |
| B | docs | PROGRESS, this file, the live checks |

## Word counts per page (the rendered main text of the local production build, before and after)

The total falls less than the reading blocks did, because Read next now shows six businesses and three guides where it showed two and two. The longest paragraph is the number Rashid asked about.

| Page | Words before | Words after | Longest paragraph before | after |
| --- | --- | --- | --- | --- |
| auto-repair | 1571 | 1225 | 62 | 24 |
| bakery | 1492 | 1176 | 60 | 24 |
| barbershop | 1236 | 1001 | 78 | 25 |
| cafe | 1543 | 1181 | 54 | 24 |
| car-wash | 1165 | 1067 | 59 | 24 |
| dental-clinic | 1338 | 1189 | 60 | 25 |
| florist | 1125 | 1013 | 67 | 25 |
| gym-and-fitness | 1571 | 1217 | 58 | 25 |
| hair-salon | 1271 | 1021 | 87 | 25 |
| lash-and-brow-studio | 1221 | 1058 | 65 | 25 |
| medical-and-aesthetic-clinic | 1588 | 1226 | 56 | 24 |
| nail-salon | 1235 | 1006 | 117 | 24 |
| optician | 1123 | 1035 | 58 | 25 |
| pet-grooming | 1205 | 1052 | 71 | 25 |
| physiotherapy | 1533 | 1228 | 57 | 24 |
| restaurant | 1252 | 1000 | 93 | 24 |
| spa-and-massage | 1587 | 1232 | 57 | 25 |
| tattoo-studio | 1183 | 1058 | 53 | 23 |
| veterinary-clinic | 1162 | 1031 | 60 | 25 |
| yoga-and-pilates-studio | 1164 | 1054 | 62 | 23 |

## Independent check

A fresh agent given only the diff, the facts, the claim sheets and the never-say lists confirmed five findings, all fixed before merge:
1. Six lines said Kabsi changes the booking or order link after the owner's yes (cafe, bakery, medical and aesthetic, physiotherapy, spa twice). Facts 2.1: Kabsi does not edit the booking link on Google yet. Now: the owner checks the link when the page or provider changes.
2. Dental FAQ: "a named team member" gets no draft. Facts 13: only a complaint naming a team member. Fixed.
3. Medical and aesthetic, physiotherapy: a treatment outcome review said "no draft". Facts 13: medical reviews are medium (a careful draft); only injury, reaction, illness or safety is high. Fixed: "A careful draft that names no treatment. A reaction (an injury) gets no draft."
4. Seven answers said "drafts every reply" while high risk reviews get no draft. Now "prepares review replies".
5. Spa: "Boxing Day 28 December" without the year or the move. Now "Christmas Day 25 December 2026, Boxing Day moved to Monday 28, New Year 1 January."
Each fix has a line in its claim sheet ("fixed after the independent check").

## Changed tests and workflows (for lane R)

- tests/website-industry.test.ts: the 600-word floor per page became 250 words of the page's own text (30.33 item 2 cuts the pages to cards); the 40 percent similarity check is unchanged. LATER row for lane R.
- tests/website-home.test.ts: the head check accepts the industry route's `image: \`industries/${i.slug}\`` beside a fixed image name.
- tests/industries2.test.ts: six related trades; the never-say check also reads the new cards.
- New: tests/industries3.test.ts (25 and 15 word limits, groups of 2 to 4 cards, the no-draft card, six related, three guides and the server pick, the share images) and tests/e2e/industries3.spec.ts (the same limits on the rendered pages, six businesses and three guides, no lone card at 360, 390, 768, 1024, 1280 and 1440 px, /for 2 then 4 columns, a filtered /for centred).

## Decisions to confirm (lane R)

- The share image shows the page's H1, which says "on Google" (the prompt asked for the H1; the copy skill says Google's name never sits in a headline graphic). The guide covers of Guides 3 already carry Google in their titles.
- The four Design 8 pages and the Industries 2 trades keep only "Your Google profile" cards (they had no review, holiday or photo groups); three of them carry the hard review rule as a profile card (lash and brow, tattoo, pet grooming, vet, yoga).
- Auto repair and dental clinic gained a no-draft review card (a safety problem; an injury) from facts 13, because the review group must keep the no-draft rule.
- "booking app" became "booking system" in two questions (lash and brow, yoga), because "app" is on the never-say list.

## Found, not done

- The `story` and the rest of `d8` in the content files are not shown on any page (dead data kept).
- Two pages picked two guides with the same photo (Style 1 lets a photo serve two guides); the picks changed and tests/industries3.test.ts now asks three photos for three guides.
- Several old claim sheet rows (cafe rows 21 and 37) still say "a route to a person at Kabsi"; the pages now follow facts 13 and cite it.
