---
name: "kabsi-data-providers"
description: "Use for any Kabsi work on the Visibility Map, Competitor Watch, the category check, the free scan's rank part, AI Visibility data, or a paid data provider (DataForSEO, Geoapify, Gemini grounding): where ranks may come from, what may be stored, the spend cap, mock mode, fixtures and the map image (master plan 27.3, 27.10, 28.1, 28.2, 30.10)."
---

# Kabsi data providers

Kabsi measures where a business shows up. These rules keep that within Google's policies and the budget. The code is in `supabase/functions/_shared/visibility/` and the Edge Function `visibility`; the tables are in `supabase/migrations/20261025200000_visibility_map.sql`.

## Where data may come from (30.10, never bend)
- Ranks and competitor rows come only from **DataForSEO's public Google Maps results**, for every business on the map, the owner's own position included, even when a competitor is a Kabsi customer.
- Never build a rank, a competitor row or a centre point from **Places** (only place_id may be stored) or from the **Business Profile** (one customer's Google data is never set next to another business). The grid's centre comes from one DataForSEO live search (`locate.ts`).
- Keep only the public fields in `dataforseo.ts` `MapsItem`: rank, name, cid, place ID, categories, rating, review count, photo count, coordinates. No address, phone, hours, snippets, images or review text.
- Reports keep two labelled sections, "From your Google Business Profile" and "From public Google Maps and AI checks by Kabsi"; never one number or chart from both. Every map says "Kabsi rank check, not provided by Google."
- Visibility results are kept while the business uses Kabsi and deleted 30 days after it leaves (`private.purge_visibility_after_leaving`, daily).

## Money
- DataForSEO: Maps standard queue 0.06 cents a point (a 7 by 7 map about 3 cents), live 0.2 cents a call (`COST_MICROS`). Every live call goes through `provider_spend_room` first and `provider_spend_add` after; the monthly cap is `app_settings.provider_cap_dataforseo_usd` (10 at the start). At 80 percent staff get one WhatsApp alert; at the cap new maps pause a day and staff are told.
- Build and test with the mock (`mock.ts`) and the fixtures in `tests/fixtures/dataforseo/`. A session spends live credit only on the one live check it reports, and says how much.
- Geoapify Static Maps, free plan (3000 credits a day, a map is about 2): `GEOAPIFY_API_KEY`. No key, no failure: the map draws on a plain ground. Never OpenStreetMap's own tile servers.
- New provider: add its cap row `provider_cap_<name>_usd`, record spend through the same two functions, and a mock.

## Modes
- `app_settings.dataforseo_mode` is `mock` until Rashid says live. The demo business is always mock (R-17).
- Credentials (`DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `GEOAPIFY_API_KEY`) live in Supabase secrets only; never in code, logs or reports.

## The map image (DESIGN.md, docs/COPY.md section 21)
- 1080 x 1080 palette PNG under 250 KB (`png.ts`), satori plus resvg like the review graphic.
- Pins: map-rank-top 1 to 3 (white number), map-rank-mid 4 to 10, map-rank-low 11 to 20 with a 2 px kb-amber ring, map-rank-none "20+". The rank is printed in every pin. Never red against green.
- The Kabsi mark (public/kabsi-mark.svg, byte for byte) is the business pin, with its own rank under it. Legend in words. Credit and map attribution on the image.

## Wording
- WhatsApp line from docs/COPY.md section 20: "Your first map is ready. You are top 3 in 18 of 49 spots for 'bakery'. Harbor Bakes beats you east of Yawmiyati." Buttons "Show me" / "Later". Measured, never promised (K-144): no "because of Kabsi", no ranking promises.
- Competitor alert: "Smile Clinic got 14 reviews this month. You got 3." Never claim a competitor did anything to the owner's listing.
- The category check is a proposal the owner approves through the one publication pipeline, never an automatic change.

## Calibration (30.9 point 3)
Before the first map goes to a real owner: for 3 real businesses, the grid's centre rank must match a manual Maps search from that spot. Record the result in PROGRESS.
