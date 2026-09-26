# Kabsi go-live runbook (Phase 11)

Run this the day Google approves Business Profile API access (case 1-4624000041157). Each step ends with a
check Claude verifies with a real query, request or log. Secrets are pasted by Rasheed into Supabase, never
into chat.

## 1. Google OAuth for hello@kabsi.co (Rasheed, 15 min)

1. Google Cloud project `smiling-chess-505915-b7` → APIs & Services → OAuth consent screen: External, app
   name Kabsi, publish to **In production** (testing-mode refresh tokens expire after 7 days).
2. Credentials → Create OAuth client ID → Web application. Authorized redirect URI:
   `https://developers.google.com/oauthplayground`.
3. Open https://developers.google.com/oauthplayground → gear icon → "Use your own OAuth credentials" →
   paste the client ID and secret. Scope: `https://www.googleapis.com/auth/business.manage`. Sign in as
   **hello@kabsi.co**, exchange the code, copy the **refresh token**.
4. Supabase → Edge Functions → Secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`.

**Check (Claude):** `call_internal('health')` → `google_token: ok, scope business.manage` and
`google_accounts: ok, N account(s)`. Before the quota is granted this shows 429 with a zero quota.

## 2. APIs enabled (D234)

My Business Account Management, My Business Business Information, Google My Business API (v4), Business
Profile Performance, Places API (New). **Check:** health shows accounts ok; a Performance call for Yawmiyati
returns 200.

## 3. Clear mock data (Claude)

Mock businesses carry `google_location_id = 'locations/mock-…'`. For each one:

```sql
delete from reply_drafts where review_id in (select id from reviews where location_id = :id);
delete from reviews where location_id = :id;
delete from listing_changes where location_id = :id;
delete from listing_baselines where location_id = :id;
update locations set google_account_id = null, google_location_id = null, access_granted_at = null,
  reviews_synced_at = null, backlog_emailed_at = null, status = 'access_pending' where id = :id;
```

Also delete the test data listed in KABSI-STATE.md.

## 4. Flip to live

1. Supabase secret `GOOGLE_MODE=live`.
2. `update app_settings set value = 'live' where key = 'google_mode';` (hides the Test mode banner).

**Check:** health `google_mode: live`; the banner is gone on /app.

## 5. First real business: Yawmiyati

| Step | Expected | Check |
|---|---|---|
| Rasheed adds hello@kabsi.co as Manager | access job accepts within 5 min | `access_granted_at` set, real `locations/…` id, "Access received" email |
| First sync | up to 20 unanswered reviews drafted, one summary email | `reviews` rows with real ids, `reply_drafts`, `emails` kind backlog |
| Rasheed posts one reply from the email | reply live on Google | `publications.status = live`, reply visible on Maps |
| Post: Rasheed approves one post | post live or in review | `publications` row, post visible on the profile |
| Listing Shield | baseline stored on the first hourly check | `listing_baselines` row with real values |
| Keywords | search terms from the Performance API | Posts → Suggest phrases shows "search" chips |
| Weekly report | Monday 09:00 email | `weekly_reports` row |

Do **not** test Shield revert or special hours on the real listing unless Rasheed chooses a harmless change.

## 6. After go-live

- Partner billing starts on its own on the next 1st (D239).
- Sender: `app_settings.email_from` = `Kabsi <hello@kabsi.co>` once the kabsi.co domain is verified in Resend.
- Domain switch (D215): `SITE_URL`, `sitemap.xml`, `robots.txt`, Supabase Site URL, Worker `APP_ORIGIN`,
  `APP_URL` secret.
- Pub/Sub notifications stay off (D250) until polling is too slow or quota is tight.
