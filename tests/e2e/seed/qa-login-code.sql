-- QA 1 (master plan 30.12): an admin-made one-time sign-in code for a QA account, so the journeys never use a real inbox.
-- Supabase Auth checks an email code against a hash of the address plus the code (SHA-224) in auth.one_time_tokens; this makes
-- that row for a random code and returns the code. It works for the QA accounts only (@test.local, @resend.dev). One row per account
-- (an upsert, no delete), so the connector runs it without asking. Replace the address, run it with
-- the Supabase connector, and pass the code as KABSI_QA_CODE_DEMO, KABSI_QA_CODE_OWNER or KABSI_QA_CODE_UI. It lasts 30 minutes
-- and works once.
with target as (
  select id, email from auth.users
  where lower(email) = lower('qa-demo@test.local') -- or delivered+kabsi-qa@resend.dev
    and (email like '%@test.local' or email like '%@resend.dev')
), pick as (select lpad((floor(random() * 900000) + 100000)::int::text, 6, '0') as code),
made as (
  insert into auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, expires_at)
  select gen_random_uuid(), t.id, 'recovery_token', encode(sha224((t.email || p.code)::bytea), 'hex'), t.email, now() + interval '30 minutes'
  from target t, pick p
  on conflict (user_id, token_type) do update set token_hash = excluded.token_hash, relates_to = excluded.relates_to, expires_at = excluded.expires_at, updated_at = now()
  returning user_id, token_hash
), stamped as (
  update auth.users u set recovery_sent_at = now(), recovery_token = m.token_hash from made m where u.id = m.user_id returning u.id
)
select p.code, (select count(*) from stamped) as accounts from pick p;
