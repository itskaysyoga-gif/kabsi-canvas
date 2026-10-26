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

## AI Visibility providers (V2, checked 26 Oct 2026)
Code: `supabase/functions/_shared/visibility/ai/`. Tables: `ai_prompts`, `ai_runs`, `ai_answers`. Mock until `app_settings.ai_visibility_mode = live`; the demo business is always mock.

**DataForSEO LLM Responses (ChatGPT and Perplexity)**
- Docs: [overview](https://docs.dataforseo.com/v3/ai_optimization/overview/), [ChatGPT live](https://docs.dataforseo.com/v3/ai_optimization/chat_gpt/llm_responses/live/), [Perplexity live](https://docs.dataforseo.com/v3/ai_optimization/perplexity/llm_responses/live/), [models](https://docs.dataforseo.com/v3/ai_optimization/chat_gpt/llm_responses/models/), [pricing](https://dataforseo.com/pricing/ai-optimization/llm-responses).
- Endpoints: `POST /v3/ai_optimization/chat_gpt/llm_responses/live` and `/perplexity/llm_responses/live`. Perplexity is live only; ChatGPT, Claude and Gemini also have task_post / tasks_ready / task_get (standard queue, up to 72 hours). One task per live call; up to 120 seconds.
- Request: `user_prompt` (max 500 characters), `model_name`, `web_search` (ChatGPT, default false; Perplexity sonar models search by default), `web_search_country_iso_code`, `web_search_city`, `max_output_tokens`, `tag`.
- Response: `items[].sections[].text` with `annotations[] {title, url, ...}` (null when web search is off), `fan_out_queries`, `money_spent` (the model provider's charge, USD) and `cost` (task price plus `money_spent`).
- Price: live task 0.0006 USD plus the model provider's charge (`money_spent`); standard 0.0002 plus a 0.01 prepayment, refunded down to the real cost. Kabsi uses live and records `cost` of every call.
- Limits: up to 10000 calls a minute, 30 concurrent live tasks per account for each platform.
- Storage: DataForSEO's terms of service (read 26 Oct) have no clause on storing responses. Kabsi keeps the answer text of ChatGPT and Perplexity only while the business uses Kabsi (30.10.9). The model makers' own API terms were not read; lane R decides if that matters before launch.

**Gemini grounding with Google Maps**
- Docs: [Maps grounding](https://ai.google.dev/gemini-api/docs/maps-grounding), [pricing](https://ai.google.dev/gemini-api/docs/pricing), [Additional Terms](https://ai.google.dev/gemini-api/terms) (section "Grounding with Google Maps").
- Price: Gemini 2.5 Flash, 500 requests a day free, then 25 USD per 1000 grounded prompts, billed only when at least one Maps result comes back. Gemini 3 and newer: 5000 free a month, then 14 USD per 1000 search queries the model runs. Plus tokens (2.5 Flash 0.30 in, 2.50 out per million). Not on Pro for the free tier. English prompts only. Off unless the request enables the `googleMaps` tool.
- Terms (Additional Terms, read 26 Oct): results may be shown only to "the end user who initiated the prompt", unmodified, with the Google Maps Links directly after the text. Google Maps Data is the output text, its metadata and the links. You may not "cache or store Google Maps Grounded Results" except up to 90 days "only to evaluate and optimize the display", or in an end user's chat history up to 6 months. You may not "scrape or export any Google Maps Data" or train on it. Google keeps prompts and output 30 days.
- What this means for Kabsi (lane R decision pending, see the V2 record): Gemini rows never keep answer text, Maps links or titles. They keep only the measured facts (named or not, position, competitors named, a count of sources) and are deleted after 90 days (`expires_at`). Gemini runs stay off (`ai_visibility_gemini = off`) until lane R decides that a scheduled, owner-approved prompt Kabsi runs on the owner's behalf and reports as a count is inside "the end user who initiated the prompt". ChatGPT and Perplexity are not affected.
- Never put Gemini Maps content in a report, a WhatsApp line or an image beyond the count; "Gemini named you" is a measured fact from the run, not Google Maps content.

## Calibration (30.9 point 3)
Before the first map goes to a real owner: for 3 real businesses, the grid's centre rank must match a manual Maps search from that spot. Record the result in PROGRESS.
