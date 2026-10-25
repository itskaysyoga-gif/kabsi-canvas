-- QA 1 (master plan 30.12): an admin-made one-time sign-in code for a QA account, so the journeys never use a real inbox.
-- Supabase Auth checks an email code against a hash of the address plus the code (SHA-224) in auth.one_time_tokens; this makes
-- that row for a code of our choosing and returns the code. It works for the QA accounts only (@test.local, @resend.dev).
-- Run with the Supabase connector after replacing the address. The code lasts 30 minutes and is used once.
-- Usage: KABSI_QA_CODE_DEMO=<code> or KABSI_QA_CODE_OWNER=<code> in the environment of `npx playwright test`.
with target as (
  select id, email from auth.users
  where lower(email) = lower('qa-demo@test.local') -- or delivered+kabsi-qa@resend.dev
    and (email like '%@test.local' or email like '%@resend.dev')
), pick as (select lpad((floor(random() * 900000) + 100000)::int::text, 6, '0') as code),
cleared as (delete from auth.one_time_tokens where user_id in (select id from target) and token_type = 'recovery_token'),
made as (
  insert into auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, expires_at)
  select gen_random_uuid(), t.id, 'recovery_token', encode(sha224((t.email || p.code)::bytea), 'hex'), t.email, now() + interval '30 minutes'
  from target t, pick p returning user_id
), stamped as (
  update auth.users u set recovery_sent_at = now() where u.id in (select user_id from made) returning u.id
)
select p.code, (select count(*) from stamped) as accounts from pick p;
