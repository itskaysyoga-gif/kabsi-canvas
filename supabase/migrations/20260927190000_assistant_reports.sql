-- D261: every assistant conversation is classified and reported by email to the Kabsi team once it goes quiet.
-- Filterable columns (country, category, intent, lead temperature, sentiment, language, device) and staff views.

alter table public.chat_conversations
  add column country text,             -- ISO country name or code: from the network edge, else what the visitor said
  add column country_source text check (country_source in ('network','visitor','timezone')),
  add column timezone text,            -- browser time zone, e.g. Europe/Madrid
  add column browser_language text,    -- e.g. es-ES
  add column device text check (device in ('mobile','tablet','desktop')),
  add column referrer text,
  add column language text,            -- language the visitor wrote in (ISO code)
  add column category text check (category in ('pricing','how_it_works','setup','cards','partners','reviews_help',
    'google_policy','account','billing','bug','privacy','other')),
  add column intent text check (intent in ('buyer','existing_customer','partner','support','researching','other')),
  add column lead_temperature text check (lead_temperature in ('hot','warm','cold')),
  add column sentiment text check (sentiment in ('positive','neutral','negative')),
  add column business_type text,
  add column summary text,
  add column next_step text,
  add column classified_at timestamptz,
  add column reported_at timestamptz,
  add column report_count int not null default 0;

create index chat_conversations_report_due on public.chat_conversations (updated_at) where message_count > 0;
create index chat_conversations_filters on public.chat_conversations (country, category, intent, lead_temperature);

-- One row per conversation with the contact, for staff filtering and CSV export.
create or replace view public.chat_report with (security_invoker = true) as
select c.id, c.created_at, c.updated_at, c.surface, c.status, c.first_page, c.country, c.timezone, c.language,
       c.device, c.category, c.intent, c.lead_temperature, c.sentiment, c.business_type, c.summary, c.next_step,
       c.message_count, c.handoff_reason, c.reported_at,
       k.email, k.name, k.business_name, k.phone, k.city, k.marketing_consent,
       l.name as signed_in_business
  from public.chat_conversations c
  left join public.contacts k on k.id = c.contact_id
  left join public.locations l on l.id = c.location_id;
revoke all on public.chat_report from anon, authenticated;

-- Staff: conversations with filters (any filter may be null = all).
create or replace function public.staff_chats(p_country text default null, p_category text default null,
  p_intent text default null, p_temperature text default null, p_days int default 30, p_limit int default 200)
returns setof public.chat_report
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select * from public.chat_report r
   where (p_country is null or r.country ilike p_country)
     and (p_category is null or r.category = p_category)
     and (p_intent is null or r.intent = p_intent)
     and (p_temperature is null or r.lead_temperature = p_temperature)
     and r.updated_at > now() - make_interval(days => greatest(p_days, 1))
   order by r.updated_at desc limit least(greatest(p_limit, 1), 1000);
end $$;
revoke execute on function public.staff_chats(text, text, text, text, int, int) from public, anon;
grant execute on function public.staff_chats(text, text, text, text, int, int) to authenticated;

-- Staff: counts by country, category, intent and temperature for the last N days.
create or replace function public.staff_chat_stats(p_days int default 30)
returns table (dimension text, value text, conversations bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  with c as (select * from public.chat_conversations where updated_at > now() - make_interval(days => greatest(p_days, 1)) and message_count > 0)
  select 'country'::text, coalesce(c.country, 'unknown'), count(*) from c group by 2
  union all select 'category'::text, coalesce(c.category, 'unclassified'), count(*) from c group by 2
  union all select 'intent'::text, coalesce(c.intent, 'unclassified'), count(*) from c group by 2
  union all select 'temperature'::text, coalesce(c.lead_temperature, 'unclassified'), count(*) from c group by 2
  order by 1, 3 desc;
end $$;
revoke execute on function public.staff_chat_stats(int) from public, anon;
grant execute on function public.staff_chat_stats(int) to authenticated;

-- Where chat reports go (comma-separated). Change with one update, no deploy.
insert into public.app_settings (key, value) values ('assistant_report_to', 'hello@kabsi.co')
  on conflict (key) do nothing;

-- Reports: every 5 minutes, conversations quiet for 10 minutes that have new messages since the last report.
select cron.schedule('kabsi_chat_reports', '*/5 * * * *', $$select public.call_internal('assistant/report')$$);
