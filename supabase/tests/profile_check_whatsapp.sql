-- Run: supabase test db
-- The proof of consent for "Send my check to WhatsApp" (item D, 22 Oct 2026): server only, with the words, the page and the
-- time stored, and no phone number column.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select ok((select relrowsecurity from pg_class where oid = 'public.profile_check_whatsapp'::regclass), 'RLS is on for profile_check_whatsapp');
select ok(not exists (select 1 from unnest(array['anon', 'authenticated', 'public']) r, unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) p
    where has_table_privilege(r, 'public.profile_check_whatsapp', p)), 'visitors and signed-in users cannot touch it');
select ok(has_table_privilege('service_role', 'public.profile_check_whatsapp', 'INSERT')
      and has_table_privilege('service_role', 'public.profile_check_whatsapp', 'UPDATE'), 'the service role writes the proof and the outcome');
select ok(not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profile_check_whatsapp'
    and column_name in ('phone', 'phone_number', 'number', 'msisdn')), 'the number itself is not stored');

insert into public.profile_check_whatsapp (phone_hash, place_id, consent_text, page)
values ('0123456789abcdef0123456789abcdef', 'ChIJaaaaaaaaaaaaaaaa', 'Send my Google Profile Check to this WhatsApp number as one message. I understand Kabsi will not message me again unless I ask.', '/');
select is((select state from public.profile_check_whatsapp limit 1), 'pending', 'a new row starts pending');
select is((select consent_language from public.profile_check_whatsapp limit 1), 'en', 'the language of the words is stored');
select is((select created_at from public.profile_check_whatsapp limit 1), now(), 'the time is stored with the proof');
select throws_ok($$insert into public.profile_check_whatsapp (phone_hash, place_id, consent_text, page, state)
  values ('0123456789abcdef0123456789abcdef', 'ChIJaaaaaaaaaaaaaaaa', 'x', '/', 'delivered')$$, '23514', null, 'only the known states are allowed');

select * from finish();
rollback;
