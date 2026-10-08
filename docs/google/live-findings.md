# Live Google findings (P0.7-01)

What the first real, read-only Google calls showed, 8 Oct 2026. Calls made as `hello@kabsi.co` (scope `business.manage`) through the internal function `google-capture`, which sends GET requests only and reads only Yawmiyati and Abou Hamze Auto Center (written consent from both owners, on file in the hello@kabsi.co inbox). Nothing was written to Google. `google_mode()` stayed `mock` the whole time and the `GOOGLE_MODE` secret is not set.

The redacted responses are in `tests/fixtures/google/live/`. Each file names the URL, the time, the status and Google's reference page. Personal data was removed before anything left Supabase: reviewer and person names, review and reply text, photo addresses, phone numbers, email addresses, admin names, personal account names and the organisation's postal address.

## Blocked on Google: reviews, posts and media

`mybusiness.googleapis.com` (the Google My Business API, v4) serves reviews, local posts and media. It is **not enabled** in project 856347937978:

- Hussein's enable attempt (8 Oct) fails with PERMISSION_DENIED `servicemanagement.services.bind`, and the API's Library page does not load.
- The live reviews list call on Yawmiyati (8 Oct, 15:24:45 UTC) returned **HTTP 403 PERMISSION_DENIED, reason SERVICE_DISABLED**, service `mybusiness.googleapis.com`, consumer `projects/856347937978`. The message reads "Google My Business API has not been used in project 856347937978 before or it is disabled." See `reviews.list.error.json`.
- Posts and media use the same service, so they were not called; they would fail the same way.

Reading (not confirmed): Google has not opened this API to the project. Gate A seems to have covered the v1 APIs only. The fix is on Google's side, through case 1-4624000041157 or the Business Profile API contact form. Until then, P0.7-01 stays open for reviews, posts and media, and P0.7-04 (the switch to live) cannot go ahead.

## What was read, and the status of each call

Thirty calls, 15 per profile, all **200** (15:43 to 15:44 UTC), plus the inventory and the one 403 above. No 429; the quota was not near its limit.

| Module | Call | Fixture |
|---|---|---|
| accounts | accounts list, group invitations, group admins | `accounts.list.json`, `accounts.invitations.json`, `accounts.admins.json` |
| admins | location admins | `admins.list.<profile>.json` |
| locations | location get, every field in the read mask | `locations.get.<profile>.json` |
| updates | getGoogleUpdated, same read mask | `updates.getGoogleUpdated.<profile>.json` |
| attributes | location attributes; attribute metadata for the location | `attributes.get.yawmiyati.json`, `attributes.metadata.yawmiyati.json`, `attributes.metadata.abouhamze.extra.json` |
| performance | 11 daily metrics over 31 days; monthly search keywords for July to September | `performance.dailyMetrics.yawmiyati.json`, `performance.searchKeywords.<profile>.json` |
| placeActions | action links; allowed action types | `placeActions.list.yawmiyati.json`, `placeActions.typeMetadata.<profile>.json` |
| verifications | verifications list; Voice of Merchant state | `verifications.list.<profile>.json`, `verifications.voiceOfMerchant.yawmiyati.json` |
| notifications | notification setting of the Kabsi Clients group | `notifications.get.json` |
| reviews | reviews list (403, blocked) | `reviews.list.error.json` |
| posts, media | not called (same blocked service) | none yet |

## Answers to the card's questions

1. **Does an invitation expose the role?** Not seen live. The Kabsi Clients group has no pending invitation, because both profiles were accepted earlier, so Google returned `{}`. Google's reference gives an Invitation a `role` field. To confirm on the next real invitation (P0.4-03 or P0.7-05).
2. **Can a Manager remove its own access through the admins API?** Partly answered. On both locations the admins list shows Kabsi Clients as `MANAGER`, with its own admin resource `locations/<id>/admins/113746201522792609010`. That is the name `locations.admins.delete` would take, and Kabsi can read it. Whether Google lets a Manager delete itself needs a real delete, which is a write. Test it in P0.7-05 or P0.2-02 on Yawmiyati with Hussein's yes (K-41 open risk stays open).
3. **Which attribute names hold the chat and social links?**
   - Chat: `attributes/url_whatsapp`, `attributes/url_facebook_messenger`, `attributes/url_text_messaging` (all URL type), and `attributes/preferred_messaging_service` (ENUM: `facebook_messenger`, `rcs_for_business`, `text_messaging`, `whatsapp`, shown as "Primary chat").
   - Social: `attributes/url_facebook`, `url_instagram`, `url_linkedin`, `url_pinterest`, `url_tiktok`, `url_twitter` ("X (Twitter)"), `url_youtube`. Google groups all of them under "Place page URLs".
   - Booking and ordering links also show up as attributes: `attributes/url_appointment` (repeatable) on both, and `attributes/url_shop_online` ("Place an order link") on Abou Hamze.
   - These are the same for both categories (media company, auto parts store) in Lebanon. Neither profile has any attribute set: `attributes.get` returns only the name.
4. **Can products be written?** No, as far as the APIs go. None of the enabled Business Profile APIs has a products resource, and no captured response mentions products. Product upload goes through the assisted task in K-117.4. This rests on the API reference and the responses, not on a write.
5. **Does moderation state appear on replies?** Blocked. Replies live in the v4 reviews API, which answers 403 SERVICE_DISABLED (K-116.1 stays open).

## The other dagger items and open risks

- **K-117.2 Services through the Business Information API.** Abou Hamze's `metadata.canModifyServiceList` is `true`, so Google says the service list is editable for that profile. Yawmiyati does not carry the flag. Neither profile has `serviceItems` set. The write itself is not tested.
- **K-117.5 Description rules.** Confirmed: Abou Hamze's live description holds a phone number and a superlative ("Your best place for all your spare parts need"). Kabsi's description drafts must not copy either.
- **K-117.1 Search terms.** Monthly keywords come back as Google shows them. Low counts arrive as `insightsValue.threshold: "15"` (a string, meaning under 15), not as a value. One Abou Hamze keyword is in Arabic, and another names a different area ("ouzai"), which matches the confusion K-117.1 describes.
- **K-117.3 Action links.** Neither profile has an action link (`{}`). Allowed types: Yawmiyati `APPOINTMENT`; Abou Hamze `APPOINTMENT` and `SHOP_ONLINE`.
- **K-116.8 (appeals timing) and K-116.10 (Q&A retired).** No API call can show either; not checked. `mybusinessqanda` is enabled but unused.
- **K-37 Pub/Sub for group-held locations.** The Kabsi Clients group account has its own notification setting, readable now and empty (only the name, no `pubsubTopic`). So the setting sits at the group level, where Kabsi would set it. Setting it is a write: P0.7-03.
- **D293 (the group flow, API side).** Confirmed. `accounts.list` shows three accounts: the personal account (0 locations), the Kabsi Clients `LOCATION_GROUP` (both profiles, role `PRIMARY_OWNER`, `permissionLevel` `OWNER_LEVEL`) and the `kabsi.co` `ORGANIZATION` (0 locations, primary owner of the group). The group's API name is `accounts/113746201522792609010`. The 5481006796 shown in Google's screens is its `accountNumber`, not its name.

## Shapes the mocks must match (for P0.7-01b)

- **Empty lists come back as `{}`,** not as an empty array: invitations, placeActionLinks. A location with no attributes returns only `name`.
- **Unset fields are left out.** `locations.get` returns only the fields that have values, whatever the read mask asks for.
- **getGoogleUpdated** returns `{location}` alone when nothing differs (Yawmiyati). On Abou Hamze it also returns `diffMask: "latlng,websiteUri"`, and `locations.get` carries `metadata.hasGoogleUpdated: true`. Google shows `https://autoabouhamze.com/` where the owner's value is the Facebook page, plus a slightly moved pin. No `pendingMask` key appeared. This is the real input for Google Protection (P0.2-04).
- **Daily metrics.**
  - The series come back in a different order from the request.
  - Every day of the range has an entry; a day with nothing has a `date` and no `value`.
  - Values are strings.
  - 31-day sums for Yawmiyati: direction requests 55, desktop search 21, mobile search 14, mobile maps 14, desktop maps 8, everything else 0. For Abou Hamze: mobile search 87, direction requests 38, mobile maps 27, desktop search 24, desktop maps 14, calls 6, website clicks 2.
- **Category display names** come back with 13 `moreHoursTypes` per category, the same list for both categories.
- **Verifications.** Yawmiyati has one `COMPLETED`, `AUTO` (2018). Abou Hamze has one `COMPLETED`, `SMS` and one `FAILED`, `SMS` (2019). Voice of Merchant is `hasVoiceOfMerchant: true, hasBusinessAuthority: true` on both.
- **Location admins.**
  - Yawmiyati: `PRIMARY_OWNER` plus Kabsi Clients as `MANAGER`.
  - Abou Hamze: `PRIMARY_OWNER`, `OWNER` and Kabsi Clients as `MANAGER`.
  - The group's own admin list shows the `kabsi.co` organisation as `PRIMARY_OWNER`.

## Notes on the capture

- `google-capture` keeps a fixed list of GET URLs and refuses any host outside the Business Profile APIs. It is guarded by the internal cron secret, like `health`.
- Before merge it was deployed through the connector as versions 1 to 3, with trimmed copies of four shared files. The merge redeploys it from the repo.
- The redaction filter was tightened twice while capturing:
  - Version 1 blanked the project number in the 403 message. Restored in the fixture from the same response's metadata.
  - Version 2 blanked category and attribute display names. They were captured again with version 3.
  - Version 3 missed a bare 8-digit phone number inside a free-text description. It was removed from the fixture by hand, and the repo filter now removes 7 to 11 digit runs in free text (test in `capture.test.ts`).
- The `net._http_response` rows of these calls (ids 14940, 14941, 14968, 14969, 14972, 14973) hold the function's redacted output. Two of them (14969, 14973) still carry Abou Hamze's public business number inside the description, which version 2 and 3 missed. Deleting them through the connector timed out twice (8 Oct); pg_net removes response rows on its own after its time to live (6 hours by default).
