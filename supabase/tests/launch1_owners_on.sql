-- Launch 1 part C (master plan 30.35): whatsapp_owners_on() returns only the one boolean of app_settings, signed-in
-- people may call it and visitors may not.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);
select ok(has_function_privilege('authenticated', 'public.whatsapp_owners_on()', 'execute'), 'signed-in people may read it');
select ok(not has_function_privilege('anon', 'public.whatsapp_owners_on()', 'execute'), 'visitors may not');
select is((select prosecdef from pg_proc where proname = 'whatsapp_owners_on'), true, 'security definer');
insert into public.app_settings (key, value) values ('whatsapp_owners_on', 'true')
  on conflict (key) do update set value = excluded.value;
select is(public.whatsapp_owners_on(), true, 'true when switched on');
update public.app_settings set value = 'false' where key = 'whatsapp_owners_on';
select is(public.whatsapp_owners_on(), false, 'false when switched off');
-- app_settings itself stays closed to the browser.
select ok(not has_table_privilege('authenticated', 'public.app_settings', 'select'), 'app_settings is not readable from the browser');
select * from finish();
rollback;
