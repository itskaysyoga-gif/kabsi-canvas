# Mock against real Google responses (P0.7-01b)

Every difference found between a mock module of `supabase/functions/_shared/google/` and the real responses captured on 8 and 22 Oct 2026 from Kabsi's own two profiles (Yawmiyati and Abou Hamze Auto Center, `tests/fixtures/google/live/`), and what was changed. Written 22 Oct 2026. The contract test is `supabase/functions/_shared/google/contract.test.ts` (run by `scripts/deno-check.sh` and CI). It does two things for every module that has a real response:

1. **Shape.** Every field the mock returns must exist in the real response with the same type. A mock may leave a field out; Google also leaves unset fields out.
2. **Parser.** The production functions in `index.ts` run on the real fixture and on the mock's answer, with `fetch` standing in for Google (a stub that fails the test if anything other than a GET is sent). Both must give the same kind of result, and the real one must give the values the fixture holds.

No production parser was changed to fit a mock. In every case below the real shape was already read correctly; the mock was the part that differed, so only mocks (and their own tests) changed.

## Changed in the mocks

| Module | Real (fixture) | Mock before | Changed to |
|---|---|---|---|
| attributes `getAttributes` | A location with no attributes returns only `name` (`attributes.get.yawmiyati.json`) | `attributes: []` as well | `{ name }` only. `coachNumbers` already reads a missing list as 0. |
| accounts `listAccounts` | The group is `role: "PRIMARY_OWNER"`, `permissionLevel: "OWNER_LEVEL"` (`accounts.list.json`) | `role: "OWNER"` | `PRIMARY_OWNER` with `permissionLevel`. `Account` in `types.ts` gains `permissionLevel` and `accountNumber` (both are in the real answer). The mock invents no `accountNumber`. |
| admins `listLocationAdmins` | Every admin entry has `account`, the owner's too (`admins.list.*.json`) | The owner entry had no `account` | Owner entry carries `account: "accounts/mock-owner"`. `removeKabsiEntries` still picks only entries whose account Kabsi manages (tested on both real lists). |
| updates `getGoogleUpdated` | Always returns the whole `location`; `diffMask` only when something differs (`updates.getGoogleUpdated.yawmiyati.json` has no `diffMask`) | `{ location: { name } }` when nothing differs | The whole mock location, with `diffMask` only on a difference. |
| locations `getLocation` | A location Google changed carries `metadata.hasGoogleUpdated: true` in `locations.get` (Abou Hamze), and the location inside `getGoogleUpdated` never does | Never set | `locationFromFields(..., withUpdateFlag)`: `getLocation` sets the flag when the mock listing has a difference, `getGoogleUpdated` does not. The live parser asks for `getGoogleUpdated` only when the flag is set, so the mock's answer now takes the same path through it (tested). |
| performance `dailyMetrics` | A day with nothing has a `date` and no `value` (`performance.dailyMetrics.yawmiyati.json`) | `value: "0"` on every day | `date` only. `dailyFigures` reads a missing value as 0, so Insights and the Weekly Care Report see the same zeros. `mocks.test.ts` was changed to say so. |

## Differences kept on purpose

| Module | Difference | Why it stays |
|---|---|---|
| locations (mock `listLocations`) | Real: the two profiles under the group. Mock: `{}` | Mock mode has no Google locations; businesses are created by the app. The parser handles both (tested). |
| locations (`regularHours`) | Real: `periods` with days and times. Mock: absent, hours kept as display text | The mock listing is edited as text by staff (P0.1-13b). Regular hours written through the pipeline are stored in Google's shape in `profile.regular_hours`. |
| locations (`metadata`) | Real: `placeId`, `mapsUri`, `newReviewUri`, `canDelete`, `hasVoiceOfMerchant`, `canModifyServiceList` | Mock sets only `hasGoogleUpdated`. Nothing in the mock path reads the others. |
| locations (`phoneNumbers`) | Real: an object. The fixtures hold the string `[removed]` because the capture filter blanks phone numbers | The test treats `[removed]` as matching any value. The mock returns the documented object. |
| locations (`specialHours`) | Neither profile has special hours, so no real `specialHours` exists | Checked against the documented shape only (`tests/fixtures/google/locations.get.json`). To verify in P0.7-05, when a special-hours period is written. |
| accounts (extra fields) | Real group has `accountNumber`; the organisation has `organizationInfo` | Not read by Kabsi. |
| admins | Real `admin` is a person's email (blanked in fixtures); mock says "Business owner" and "Kabsi Clients" | Display text only; no code reads it. |
| verifications | Real methods `AUTO` and `SMS`, a `FAILED` entry; mock one `COMPLETED` `EMAIL` | Same fields and types. Kabsi reads only `state`. |
| performance (`searchKeywordsMonthly`) | Real: keywords with `insightsValue.threshold: "15"` for low counts, Arabic text; mock: `{}` | Mock mode shows labelled Example figures (P0.5-05), never invented keywords. The parser handles the real shape (tested: threshold read as 15, Arabic kept). |
| performance (`dailyMetrics` order) | Real series come back in a different order from the request | The parser keys by metric name, so order does not matter (tested). |
| placeActions | Real: `{}` for both profiles; `placeActionTypeMetadata` allowed types per profile | Mock `{}`. Type metadata is not read by any module yet. |
| categories | Real: a `displayName` filter returns every category whose name contains the text ("Auto parts store" also returns "Used auto parts store"); mock: exact match only | The Coach's lookup picks the exact match from the real list (tested), so both give the same answer. |
| notifications, invitations | Same as real (`{ name }` and `{}`) | None needed. |

## Paging, rate limits and errors

- **Paging.** `locations.list` (two locations) and the keyword list returned no `nextPageToken`; `accounts.list` none either. The loops in `index.ts` stop on a missing token (tested for locations). A page with a token has not been seen.
- **Rate limits.** No 429 was seen in any read call so far (limit 300 a minute). The retry and breaker code (`client.ts`, `limits.test.ts`) stands on Google's documented behaviour, not on a real 429.
- **Error shape.** The one real error is the 403 SERVICE_DISABLED body (`reviews.list.error.json`, `v4.probe.*.json`): `error.code`, `error.status` `PERMISSION_DENIED`, `details[].reason` `SERVICE_DISABLED`, `metadata.service`, `metadata.consumer`. `gbp()` turns any non-2xx into `google <status> <url>: <body>`, which is what `removeKabsiEntries` matches on (`google 403 `, `google 404 `); the mock admins use the same message form.

## Not comparable yet: reviews, local posts, media

`mybusiness.googleapis.com` is closed for project 856347937978 (403 SERVICE_DISABLED on 8 Oct and again on 22 Oct 2026, six of six calls on 22 Oct). There is no real response for:

- **reviews** (`reviews.list`, `reviews.get`, reply update): the wire shape of a review, the average rating and total, the reply object, moderation state on replies (K-116.1), `orderBy`, paging.
- **local posts** (`create`, `list`, `get`): `state` values, event and offer fields, `searchUrl`.
- **media** (`startUpload`, `create`, `list`): the data reference, `googleUrl`, `thumbnailUrl`, the dimensions.

Those mocks (`reviews/mock.ts`, `posts/mock.ts`, `media/mock.ts`) are still modelled on Google's documented responses (`tests/fixtures/google/reviews.*.json`, `posts.*.json`, `media.*.json`), checked by `mocks.test.ts`. The contract test fails on purpose the day a real `reviews.list.<profile>.json`, `posts.list.<profile>.json` or `media.list.<profile>.json` appears next to the 403 probes, so that module's shape and parser cases get added then. Until Google opens the service, **P0.7-04 (the switch to live) should not be treated as proven for reviews, posts and photos**: they have run only against the documented shape.

## How to rerun after Google opens the service

1. `google-capture` ops `reviews` and `v4` for both profiles (same as 22 Oct, read-only, through SQL with the cron secret kept inside the database).
2. Save the redacted answers as `reviews.list.<profile>.json`, `posts.list.<profile>.json`, `media.list.<profile>.json`, remove `v4.probe.*.json` and `reviews.list.error.json`.
3. Add the shape and parser cases to `contract.test.ts`; fix mock and parser together where they differ and say which here.
