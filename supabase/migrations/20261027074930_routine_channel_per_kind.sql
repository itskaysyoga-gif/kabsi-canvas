-- Email 1, after the independent review: the routine channel per kind of message. WhatsApp carries a new review only while
-- the person's WhatsApp review alerts are on, and the Results Report only while its WhatsApp report is on
-- (whatsapp_optins.review_alerts, digest_optin); otherwise the email goes, so a routine message is never lost.
-- And the first reply Kabsi saw on Google per business, aggregated in the database (no row cap), timed from its approval,
-- which never changes (updated_at moves when retention redacts a payload). Additive only.

create or replace function public.routine_channel_of(p_user uuid, p_category text) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.routine_channels r where r.user_id = p_user and r.channel = 'whatsapp')
     and exists (
       select 1 from public.whatsapp_optins o
       where o.user_id = p_user and o.state = 'active'
         and ((p_category = 'review_new' and o.review_alerts) or (p_category = 'weekly_report' and o.digest_optin))
     )
    then 'whatsapp' else 'email' end;
$$;
revoke all on function public.routine_channel_of(uuid, text) from public, anon, authenticated;
grant execute on function public.routine_channel_of(uuid, text) to service_role;

create or replace function public.first_replies_on_google(p_locations uuid[]) returns table (location_id uuid, first_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.location_id, min(p.approved_at)
  from public.publications p
  where p.location_id = any (p_locations) and p.target_type = 'review_reply' and p.state = 'verified'
  group by p.location_id;
$$;
revoke all on function public.first_replies_on_google(uuid[]) from public, anon, authenticated;
grant execute on function public.first_replies_on_google(uuid[]) to service_role;
