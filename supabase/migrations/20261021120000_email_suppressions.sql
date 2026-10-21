-- P0.4-08: one suppression list for email (K-118, G-22, K-102).
--
-- public.email_suppressions holds the addresses Kabsi must not mail: a permanent bounce or a spam complaint (scope '*',
-- every email), or an unsubscribe (scope = the one category of notice the person stopped). The outbox
-- (supabase/functions/_shared/notify-engine.ts) looks an address up before every send, so a suppressed address is never
-- sent to, whatever job asks. Rows are written only by the email function (the Resend webhook and the one-click
-- unsubscribe) with the service key; the browser has no access.
-- public.apply_unsubscribe(address, business, category) is the unsubscribe: it adds the suppression and, when the address
-- belongs to a member of that business, also sets their own choice for the category to off, so Settings shows the same.
--
-- Additive: one table, one function. Nothing is taken away and no row is changed.

create table public.email_suppressions (
  address text not null check (address = lower(address) and length(address) between 3 and 320),
  scope text not null default '*' check (scope = '*' or scope ~ '^[a-z][a-z_]{1,40}$'),
  reason text not null check (reason in ('bounce', 'complaint', 'unsubscribe')),
  created_at timestamptz not null default now(),
  primary key (address, scope)
);
comment on table public.email_suppressions is
  'P0.4-08 (K-118): addresses Kabsi must not mail. Scope * is every email; otherwise one category. Service role only.';
alter table public.email_suppressions enable row level security;
revoke all on public.email_suppressions from public, anon, authenticated;

create function public.apply_unsubscribe(p_address text, p_location uuid, p_category text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if p_category <> all (array['review_high_risk', 'review_new', 'profile_issue', 'approval_needed', 'weekly_report', 'trial', 'partner']) then
    raise exception 'cannot_unsubscribe';
  end if;
  insert into public.email_suppressions (address, scope, reason) values (lower(p_address), p_category, 'unsubscribe')
  on conflict (address, scope) do nothing;
  if p_location is not null then
    select m.user_id into v_user from public.location_members m join auth.users u on u.id = m.user_id
     where m.location_id = p_location and lower(u.email) = lower(p_address) limit 1;
    if v_user is not null then
      insert into public.notification_preferences (user_id, location_id, category, channel, frequency)
      values (v_user, p_location, p_category, 'email', 'off')
      on conflict (user_id, location_id, category, channel) do update set frequency = 'off', updated_at = now();
    end if;
  end if;
end $$;
revoke execute on function public.apply_unsubscribe(text, uuid, text) from public, anon, authenticated;
grant execute on function public.apply_unsubscribe(text, uuid, text) to service_role;
