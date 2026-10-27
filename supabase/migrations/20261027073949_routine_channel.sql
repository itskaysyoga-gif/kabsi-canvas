-- Email 1 (master plan 30.15 section 6, docs/LATER.md "routine channel"): one stored routine channel per owner, email or
-- WhatsApp. The notification engine reads it, so a routine message (new reviews, the Monday Results Report) goes to one
-- place, never both; urgent items keep their own rules. Settings' "Where your routine messages go" saves it through
-- set_routine_channel. WhatsApp can be chosen only while the person's WhatsApp is connected, and a stopped WhatsApp falls
-- back to email (routine_channel_of), so a routine message is never lost. Additive only.

create table if not exists public.routine_channels (
  user_id uuid primary key references auth.users (id) on delete cascade,
  channel text not null default 'email' check (channel in ('email', 'whatsapp')),
  updated_at timestamptz not null default now()
);
comment on table public.routine_channels is
  'Email 1: where a person''s routine messages go (new reviews, the Results Report): email or whatsapp, never both. Written only by set_routine_channel; read by the notification engine through routine_channel_of.';

alter table public.routine_channels enable row level security;
create policy routine_channels_own_read on public.routine_channels for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.routine_channels from anon, authenticated;
grant select on public.routine_channels to authenticated;

-- The signed-in person sets their own channel. WhatsApp only while their WhatsApp is connected (whatsapp_optins active).
create or replace function public.set_routine_channel(p_channel text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_channel is null or p_channel not in ('email', 'whatsapp') then
    raise exception 'unknown channel' using errcode = '22023';
  end if;
  if p_channel = 'whatsapp' and not exists (select 1 from public.whatsapp_optins o where o.user_id = v_user and o.state = 'active') then
    raise exception 'whatsapp_not_connected' using errcode = 'P0001';
  end if;
  insert into public.routine_channels (user_id, channel, updated_at) values (v_user, p_channel, now())
  on conflict (user_id) do update set channel = excluded.channel, updated_at = now();
  return p_channel;
end;
$$;
revoke all on function public.set_routine_channel(text) from public, anon;
grant execute on function public.set_routine_channel(text) to authenticated;

-- What the engine reads: 'whatsapp' only when chosen and WhatsApp is still connected, otherwise 'email'.
create or replace function public.routine_channel_of(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.routine_channels r where r.user_id = p_user and r.channel = 'whatsapp')
     and exists (select 1 from public.whatsapp_optins o where o.user_id = p_user and o.state = 'active')
    then 'whatsapp' else 'email' end;
$$;
revoke all on function public.routine_channel_of(uuid) from public, anon, authenticated;
grant execute on function public.routine_channel_of(uuid) to service_role;

-- Email 1 (COPY.md 25, onboarding): "Kabsi also sent it to your email." shows under the setup link only once a setup
-- email carrying the link really went to the signed-in person for this business.
create or replace function public.my_setup_link_emailed(p_location uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_member(p_location) and exists (
    select 1 from public.notifications n
    where n.location_id = p_location and n.user_id = (select auth.uid())
      and n.kind in ('life_no_access_1h', 'life_no_access_24h', 'life_no_access_72h') and n.email_state = 'sent'
  );
$$;
revoke all on function public.my_setup_link_emailed(uuid) from public, anon;
grant execute on function public.my_setup_link_emailed(uuid) to authenticated;
