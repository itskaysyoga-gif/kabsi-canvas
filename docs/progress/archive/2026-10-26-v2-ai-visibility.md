# V2, AI Visibility (26 Oct 2026)

Branch `claude/v2-ai-visibility`. Master plan 27.3 item 2, 27.4, 27.10, 28.1, 28.6 (Scout, Insights), 30.9 item 3, 30.10; docs/COPY.md 0.1, 2, 19, 20.

## Provider check (step 1, read 26 Oct 2026; links and numbers are in the kabsi-data-providers skill)
- DataForSEO LLM Responses: ChatGPT and Perplexity live endpoints (`/v3/ai_optimization/chat_gpt|perplexity/llm_responses/live`), one task per call, up to 120 seconds, 30 concurrent live tasks per platform. Price: 0.0006 USD a live task plus the model maker's charge (`money_spent`; `cost` is the total). Annotations carry title and url, so domain and title are recorded. DataForSEO's terms have no clause on storing responses.
- Gemini grounding with Google Maps: 25 USD per 1000 grounded prompts on 2.5 Flash (500 a day free), 14 USD per 1000 search queries on Gemini 3 and newer (5000 a month free), English only. Additional Terms: results may be shown only to the end user who initiated the prompt, unmodified, with the Google Maps Links; no caching or storing except 90 days "only to evaluate and optimize the display" or 6 months in that end user's chat history; no scraping, exporting or training on Google Maps Data.

## Does a rule block recording "named or not, position, competitors named, sources cited"? For lane R
- ChatGPT and Perplexity (DataForSEO): no. Built and recorded in full.
- Gemini with Google Maps grounding: yes, partly. Google Maps Data includes the output text and links, Kabsi runs the prompt on a schedule rather than the owner "initiating" it, and nothing may be stored beyond 90 days. Built to the strictest reading: Gemini rows keep only the measured facts (named, position, competitor names, a count of sources), never the answer text or the Maps links, expire after 90 days (a trigger refuses a Gemini answer row), and Gemini is OFF (`ai_visibility_gemini = off`) until lane R decides. Options for lane R: (a) accept the strict reading and switch it on, (b) use Gemini with Google Search grounding instead (its terms were not read), (c) drop Gemini. Nothing else in V2 depends on it.

## Decisions after the first report (master plan 30.14, PR 235)
Gemini stays off and out of every public line: the facts (files 01 and 11), /privacy and /terms now name only ChatGPT and Perplexity (the FAQ about Gemini in Business Profile stays); the Gemini code path stays off (`ai_visibility_gemini = off`). Lane R applied `20261026100000_ai_visibility.sql` with `apply_migration`. A second migration, `20261026110000_ai_visibility_spend_service_only.sql` (applied by this session), makes `ai_visibility_spend()` service role only, because `rls_functions.sql` lists every browser-callable function; the three tables have victim rows in `supabase/tests/_fixtures.psql` and a control in `rls_tables.sql`. Nora's questions n65 and n67 follow the new facts.

## What was built
- `_shared/visibility/ai/`: `providers.ts` (DataForSEO ChatGPT and Perplexity, Gemini, parsers), `analyze.ts` (named, position, competitors matched to the business's competitor list, sources), `prompts.ts` (customers' words from category, area and the confirmed search; plan limits), `mock.ts`, `numbers.ts` (share, trend, top competitors and sources, the owner's line, the report block), `run.ts` (tick, one run as a job, cap, 80 percent alert, free scan check), `deps.ts` (database, owner line through the outbox).
- `_shared/google/gemini/generate.ts`: the Gemini call, inside the Google layer (K-34).
- `_shared/insights/ai-visibility.ts`: sources turned into actions ("A list on timeout.com names three of your competitors.").
- `visibility` function: `/ai-tick` (cron), `/ai-summary` (member or staff), `/ai-calibrate` (internal); the keyword confirm now also makes the plan's prompts. `api` function: job `ai_visibility_run` (cap waits a day, permanent errors stop, last try marks failed). `staff-alerts.ts`: two new urgent kinds, `ai_visibility_80` and `ai_visibility_cap` (one line, 13b part 2's alert path).
- Migration `20261026100000_ai_visibility.sql`: `ai_visibility_prompts`, `ai_visibility_runs`, `ai_visibility_answers` (RLS: members of the business and staff read; no API writes), settings `ai_visibility_mode = mock`, `ai_visibility_gemini = off`, `ai_visibility_free_scan = off`, `provider_cap_ai_visibility_usd = 5`, `ai_visibility_spend()` for the staff cost page, crons `kabsi_ai_visibility_tick` and `kabsi_purge_ai_expired`, the 30 day purge now covers the AI tables. pgTAP: `supabase/tests/ai_visibility.sql`.
- Map line (`scan.ts`): "We searched 'bakery' on Google Maps from 49 places around your bakery, like a customer standing there. You came up in the top 3 from 18 of them. To the east, Harbor Bakes comes up first." The business type comes from the public Maps category. The map image carries the legend sentence of COPY.md 2.
- Facts 01 and 11 rewritten and rebuilt (K-104).

## Tests run
- `npm run typecheck`: passed. `npm run lint:changed`: no lintable files changed. `npm test`: 63 files, 495 tests passed. `npm run build`: passed. `npm run check:tokens`, `check:google` (after moving the Gemini call into the Google layer), `check:repo`, `check:anon`: passed.
- `bash scripts/deno-check.sh`: every function type-checks; Deno tests 794 passed, 0 failed (22 new in `_shared/visibility/ai/ai.test.ts`, the map line and legend tests updated); eval 15 passed; Nora stub gate passed.
- Not run: `supabase test db` (no local Supabase here; `supabase/tests/ai_visibility.sql` is written and runs in CI).

## Spend
No live provider call was made. 0 US dollars of the 1 US dollar provider budget and 0 of the 2 US dollars Anthropic budget. Fixtures are written to each provider's documented response shape; real answers from the calibration replace or join them when it runs.

## Not done in this session, and why
- The migration was not applied: the Supabase connector's `execute_sql` timed out waiting for approval once (working-fast rule: no second try). The SQL is `supabase/migrations/20261026100000_ai_visibility.sql`; the lane R chat or Rashid applies it with `execute_sql` and registers version `20261026100000` in `supabase_migrations.schema_migrations`.
- Calibration (30.9 item 3) needs the migration and the deploy first (the keys are only in Supabase secrets). Only Yawmiyati is a real business in the database; the two others have to be named, see the steps in the session report.

## After merge: calibration (30.9 item 3), 26 Oct 2026
Merged as PR 234 (merge commit 3e05499, Deploy run 110 green). `ai_visibility_mode` stayed `mock` throughout: the internal route `/visibility/ai-calibrate` makes its own live calls (still under the cap check and recorded in `provider_spend`), so the setting never had to be switched. Gemini is off, so no Gemini call was made. Businesses are calibration fixtures only (Yawmiyati in Beirut, Tartine Bakery in San Francisco, Dishoom Shoreditch in London); no owner saw anything.

Spend: 8 live calls through DataForSEO, 0.143 USD of the 1 USD budget (ChatGPT `gpt-4.1-mini` with web search about 0.030 USD a call, Perplexity `sonar` about 0.006 USD a call). 0 USD Anthropic.

| Business and prompt | ChatGPT said | Kabsi recorded (first run) | Perplexity said | Kabsi recorded (first run) |
|---|---|---|---|---|
| Yawmiyati, "best bakery in Beirut" | 8 bakeries, not Yawmiyati | not named (right); competitors empty (wrong: bold links not read); sources "google.com" x8 (wrong: Maps place links) | 6 bakeries, not Yawmiyati | not named (right); 5 competitors, 4 with a location suffix, the first pick in prose missed |
| Yawmiyati, "best cafe near Mirna Chalouhi Beirut" | 5 cafes, not Yawmiyati | not named (right); competitors empty; Maps links as sources | 5 cafes, not Yawmiyati | not named (right); the street "Mirna Chalouhi" not recorded as a rival (right, by luck), first pick missed |
| Tartine Bakery, "best bakery in the Mission San Francisco" | Kahnfections first, Tartine second | named, position 1 (wrong, it is 2); competitors empty | Tartine first | named, position 1 (right); 4 rivals |
| Dishoom Shoreditch, "best Indian restaurant in Shoreditch London" | Dishoom first | named, position 1 (right); competitors empty | Dishoom first | named, position 1 (right); a street address recorded as a rival (wrong) |

What was wrong and is fixed in this follow-up (`analyze.ts`, `providers.ts`): ChatGPT's `**[Name](url)**` form is now read, so competitors and the position follow the order in the answer; Google Maps search links are not sources; names are cut at the comma, dash, "or" or "in <place>" so "Ichkhanian Bakery, Zoukak El-Blat" is "Ichkhanian Bakery"; bold prose picks count; a street address, a label ending in a colon and the area the customer asked about are not businesses. The real answers are saved as `tests/fixtures/ai-visibility/real-*.json` (ChatGPT texts cut at the last whole item) and three new tests check them. What the providers showed about the three businesses: neither provider knew Yawmiyati for either prompt (a real result, not a recording fault); both named Dishoom first; both named Tartine, ChatGPT second.

Costs per prompt: ChatGPT 0.030 plus Perplexity 0.006 USD, so Essentials (3 prompts a month) costs about 0.11 USD and Pro (10 prompts every 2 weeks) about 0.78 USD a month, both under 15 percent of the plan price (27.4).

Leftover: the settings row `ai_calibration_v2` (holds the 8 answers) could not be deleted (the connector's delete prompt timed out once). Lane R: `delete from public.app_settings where key = 'ai_calibration_v2';`.
