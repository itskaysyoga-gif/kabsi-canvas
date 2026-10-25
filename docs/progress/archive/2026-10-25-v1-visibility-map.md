# V1, Visibility Map engine (25 Oct 2026)

Branch `claude/laughing-rubin-1fyjwe`. Master plan 27.3 items 1, 3 and 4; 27.10; 28.2; 30.10 points 2, 3, 4 and 9; DESIGN.md map tokens; docs/COPY.md sections 20 and 21.

## What was built
- `supabase/functions/_shared/visibility/`: `grid.ts` (7 by 7 points with @turf/destination, radius by trade, Web Mercator placement, the side a set of cells leans to), `dataforseo.ts` (Maps SERP standard queue and live client, the parser that keeps public fields only, who is who by cid, place ID, then name), `mock.ts` (fictional businesses, same answer every time), `locate.ts` (the grid centre from one DataForSEO live search, never Places), `scan.ts` (average rank with 20+ as 21, top 3 count, who beats the business where, the WhatsApp line, the competitor offer list, the review race line, the category check), `map-image.ts` and `png.ts` (satori plus resvg, palette PNG), `geoapify.ts` (static base map, plain ground without a key), `run.ts` (start due grids, collect, finish).
- Edge Function `visibility`: `/tick` (x-cron-secret), `/keyword` (owner, manager or staff; 27.4 limits from entitlements), `/picks` (3 on Essentials, 5 on Pro, only businesses seen in the latest grid), `/image` (member, staff or internal).
- Migration `20261025200000_visibility_map.sql`: `visibility_keywords`, `visibility_scans`, `visibility_points`, `competitor_picks`, `competitor_snapshots` (members and staff read; no writes for signed-in users), `provider_spend` with `provider_spend_room` and `provider_spend_add`, settings `dataforseo_mode = mock` and `provider_cap_dataforseo_usd = 10`, cron `kabsi_visibility_tick` (every 5 minutes, calls the function only when work is due) and `kabsi_purge_visibility` (daily 02:59 UTC, 30 days after leaving).
- Skill `kabsi-data-providers`. Facts 01 and 11 updated and rebuilt.

## Map image
1080 x 1080. Pins: map-rank-top 1 to 3, map-rank-mid 4 to 10, map-rank-low 11 to 20 with a 2 px kb-amber ring, map-rank-none "20+"; the rank in every pin; the Kabsi mark byte for byte as the business pin with its rank under it; legend "1 to 3", "4 to 10", "11 to 20", "Not in top 20"; "Kabsi rank check, not provided by Google." and "Map: Geoapify, © OpenStreetMap contributors." Sizes measured: 33.7 KB on the plain ground, 37.9 KB and 102 KB on two busy test bases (limit 250 KB, enforced in code).

## Policy checks (27.10)
- Google, third-party ranks next to Business Profile data: the record in docs/GOOGLE-ARCHITECTURE.md section 4 stands (report Business Profile data separately; distinguish Google Maps content; no Places content stored). V1 follows 30.10: ranks only from DataForSEO, separate storage (visibility tables hold no Business Profile data), the credit line on the image. The retention table row is updated.
- Kapso (from Kapso's pricing pages and docs, 25 Oct 2026; Kapso's live pricing page not read directly): Free 0 US dollars (2,000 messages, 1 number), Pro 25 US dollars a month (100,000 messages, 3 numbers, extra numbers 10 each), Platform 299 US dollars a month (1,000,000 messages, 50 numbers, extra numbers 5 each). Coexistence (the WhatsApp Business app stays usable alongside the API) is a connection type in Kapso's setup flow. Whether coexistence numbers have their own cap was not found. Meta's template fees are billed by Meta. Front Desk only; nothing changes for launch.

## Tests run
- `bash scripts/deno-check.sh`: every function type-checks; Deno tests 718 passed, 0 failed (19 new in `_shared/visibility/visibility.test.ts`); eval 15 passed; Nora stub gate passed.
- `npm test`: 62 files, 480 tests passed (7 new in `tests/visibility-map.test.ts`).
- `npm run typecheck`, `npm run check:tokens`, `npm run check:google`, `npm run check:repo`, `npm run check:anon`, `npm run lint:changed` (0 errors), `npm run build`: all passed.

## Spend
No DataForSEO, Geoapify or Anthropic call was made. 0 US dollars.

## Geoapify key, clicks for Rashid
1. myprojects.geoapify.com, sign up with hello@kabsi.co (free plan, no card).
2. "Create a project", name it Kabsi.
3. Open the project, "API keys", copy the key.
4. Supabase dashboard, project kabsi-prod, Edge Functions, Secrets, "Add new secret": `GEOAPIFY_API_KEY`, paste, Save.
Expect: the next `/visibility/image` is drawn on a light grey street map.

## Known limits
See docs/LATER.md rows added by V1: WhatsApp image send (13b part 2), keyword confirm in WhatsApp and the suggestion, the category proposal as an approval (V4), reply rate and posts (V4), the Geoapify pin alignment check, the calibration of 30.9 point 3, the dashboard tab (Web 2).
