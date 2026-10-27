-- Sec 1 (master plan 30.15 section 8): email action links, the database's own guards behind the Edge checks
-- (supabase/functions/_shared/sec1/email-links.test.ts). A link acts only for its recipient and only on its own
-- business, only hashes are stored, and a holiday link without an expiry never works. email_approvals.sql holds the
-- rest (GET changes nothing, POST once, expiry, sign-in for the high-risk kinds).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-' || right(id::text, 2), status = 'active'
 where id in ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c2');
insert into public.subscriptions (organization_id, plan, state)
select organization_id, 'pro', 'active' from public.locations where id = '00000000-0000-4000-8000-0000000000c2';
insert into public.reviews (id, location_id, google_review_id, star_rating, review_created_at, state, risk) values
  ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-0000000000c2', 'mail-b-1', 5, now(), 'drafted', 'low'),
  ('00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-0000000000c1', 'mail-a-2', 5, now(), 'drafted', 'low');
insert into public.reply_drafts (review_id, version, body, source, safety_ok)
values ('00000000-0000-4000-8000-000000000602', 1, 'Thank you for coming.', 'ai', true);

-- 1. A link of business A cannot skip a review of business B, even if its target names one.
insert into public.action_tokens (token_hash, location_id, user_id, action, target_type, target_id, expires_at)
values ('mail-cross', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', 'skip', 'review',
        '00000000-0000-4000-8000-000000000601', now() + interval '1 hour');
select throws_ok($$ select public.use_action_link('mail-cross', 'skip', null, null, null) $$, 'P0001', null,
  'a link of business A cannot skip a review of business B');
select is((select state from public.reviews where id = '00000000-0000-4000-8000-000000000601'), 'drafted', 'B''s review is untouched');

-- 2. Another signed-in account cannot act in the recipient's name, on a low-risk link too.
insert into public.action_tokens (token_hash, location_id, user_id, action, target_type, target_id, expires_at)
values ('mail-low-other', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', 'post', 'review',
        '00000000-0000-4000-8000-000000000602', now() + interval '1 hour');
select throws_ok($$ select public.use_action_link('mail-low-other', 'post', 'Thank you for coming.', '00000000-0000-4000-8000-0000000000b2', null) $$,
  'P0001', 'wrong_account', 'another account signed in cannot approve in the recipient''s name');
select is((select count(*) from public.publications where target_id = '00000000-0000-4000-8000-000000000602'), 0::bigint, 'nothing was approved');
select is((select used_at from public.action_tokens where token_hash = 'mail-low-other'), null, 'and the link is still unused');
select is(public.use_action_link('mail-low-other', 'post', 'Thank you for coming.', null, null) ->> 'done', 'approved',
  'the link itself, with no other session, still works for its recipient');

-- 3. Only hashes are stored, and the GET helper is read-only.
select is((select count(*) from information_schema.columns
            where table_schema = 'public' and table_name in ('action_tokens', 'holiday_prompts', 'photo_upload_links', 'whatsapp_actions')
              and column_name ~ 'token' and column_name not in ('token_hash', 'token_expires_at')), 0::bigint,
  'link tables keep the hash and the expiry, never the token');
select is((select provolatile from pg_proc where oid = 'public.action_link_view(text,uuid)'::regprocedure), 's', 'the link page''s read is STABLE');
select is((select provolatile from pg_proc where oid = 'private.action_link_needs_sign_in(text,text,text)'::regprocedure), 's',
  'the sign-in helper it uses is STABLE');

-- 4. A holiday link with no expiry never works.
insert into public.holidays (id, country, region, name, starts_on, ends_on, kind, estimated, source, verified_on)
values ('00000000-0000-4000-8000-0000000006d1', 'GB', 'england-and-wales', 'Sec1 holiday', current_date + 5, current_date + 5,
        'public', false, 'https://example.test/gb', current_date);
insert into public.holiday_prompts (location_id, holiday_id, token_hash, token_expires_at)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000006d1', 'hol-noexp', null);
select throws_ok($$ select public.use_holiday_link('hol-noexp', 'normal', null, null, null, null, null) $$, 'P0001', 'link_expired',
  'a holiday link without an expiry never works');
select is(public.holiday_link_view('hol-noexp') ->> 'status', 'expired', 'and its page says so, offering nothing');

select * from finish();
rollback;
