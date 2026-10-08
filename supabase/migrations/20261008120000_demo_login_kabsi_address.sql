-- P0.1-06c (R-32, R-17): the demo login moves from a personal address to hello+demo@kabsi.co, which lands in the
-- hello@kabsi.co mailbox. The demo user keeps its id, so its memberships of Harbour Lane Coffee and Juniper Hair Studio
-- and all demo data stay as they are; only the address changes. The old address is read from app_settings and is never
-- written in the repository. Nothing is removed.
--
-- private.move_demo_login, in this order:
--   1. app_settings.demo_login_email gets the new address first, so is_demo_login and is_demo_user answer for it.
--   2. The demo user (auth.users and its email identity) gets the new address, same id.
--   3. Log rows that carried the old address (the demo weekly emails, chat report subjects, the Slack signup line) get
--      the new address in its place, so no table keeps the personal address.
-- On a fresh database (CI) there is no demo login: only the setting is written.

create or replace function private.move_demo_login(p_new text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_new constant text := lower(trim(p_new));
  v_old text := public.demo_login_email();
  v_pat text;
  v_user uuid;
begin
  if v_new is null or v_new !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'move_demo_login: % is not an email address', p_new;
  end if;

  if v_old is not null and v_old <> v_new then
    select u.id into v_user from auth.users u where lower(u.email) = v_old;
    if exists (select 1 from auth.users u where lower(u.email) = v_new and u.id is distinct from v_user) then
      raise exception 'move_demo_login: another account already uses the new address';
    end if;
  end if;

  insert into public.app_settings (key, value, updated_at) values ('demo_login_email', v_new, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();

  if v_old is null or v_old = v_new then
    return;
  end if;

  if v_user is not null then
    update auth.users set email = v_new, updated_at = now() where id = v_user;
    update auth.identities
       set identity_data = jsonb_set(identity_data, '{email}', to_jsonb(v_new)), updated_at = now()
     where user_id = v_user and provider = 'email';
  end if;

  -- Case-insensitive replace of the old address inside log text.
  v_pat := regexp_replace(v_old, '([.+*?^$()\[\]{}|\\])', '\\\1', 'g');
  update public.emails
     set to_address = regexp_replace(to_address, v_pat, v_new, 'gi'),
         subject = regexp_replace(subject, v_pat, v_new, 'gi'),
         dedupe_key = regexp_replace(dedupe_key, v_pat, v_new, 'gi')
   where to_address ~* v_pat or subject ~* v_pat or dedupe_key ~* v_pat;
  update public.ops_events
     set title = regexp_replace(title, v_pat, v_new, 'gi')
   where title ~* v_pat;
end $$;

revoke execute on function private.move_demo_login(text) from public, anon, authenticated, service_role;

select private.move_demo_login('hello+demo@kabsi.co');
