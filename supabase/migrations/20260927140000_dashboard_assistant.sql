-- D260: About your business fields (whitelisted, size-capped), "I'll handle it" from the dashboard,
-- plans that end are ended, and the website assistant's conversations and contacts.

-- 1. Knowledge card: only known keys, each with a length limit, the whole card under 16 KB.
create or replace function public.update_knowledge_card(p_location uuid, p_card jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  k text; v jsonb;
  limits constant jsonb := jsonb_build_object(
    'signature', 80, 'signature_ar', 80, 'tone', 10, 'tone_notes', 200, 'contact_phone', 30,
    'about', 400, 'services', 600, 'price_notes', 300, 'booking', 200, 'payment_methods', 200,
    'hours_note', 200, 'service_area', 200, 'delivery', 200, 'parking', 200, 'accessibility', 200,
    'wifi', 100, 'languages', 120, 'policies', 400, 'mention', 600, 'avoid', 400);
begin
  if not public.is_member(p_location) then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(p_card) <> 'object' then raise exception 'knowledge card must be an object'; end if;
  if pg_column_size(p_card) > 16384 then raise exception 'knowledge card is too large'; end if;
  for k, v in select * from jsonb_each(p_card) loop
    if jsonb_typeof(v) = 'null' then
      null;
    elsif k = 'custom_rules' then
      if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) > 10 then raise exception 'custom_rules: up to 10'; end if;
    elsif k = 'staff_names' then
      if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) > 20 then raise exception 'staff_names: up to 20 names'; end if;
    elsif k = 'faqs' then
      if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) > 8 then raise exception 'faqs: up to 8'; end if;
    elsif k = 'delivery' and jsonb_typeof(v) = 'boolean' then
      null;
    elsif limits ? k then
      if jsonb_typeof(v) <> 'string' then raise exception '%: must be text', k; end if;
      if length(v #>> '{}') > (limits ->> k)::int then raise exception '%: too long', k; end if;
    else
      raise exception 'unknown field: %', k;
    end if;
  end loop;
  if p_card ? 'tone' and p_card ->> 'tone' not in ('warm', 'formal', 'short') then raise exception 'tone: warm, formal or short'; end if;
  update public.locations set knowledge_card = p_card where id = p_location;
end $$;

-- 2. "I'll handle it myself" from the dashboard (email links already had it).
create or replace function public.handle_review_offline(p_review uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_loc uuid;
begin
  select location_id into v_loc from public.reviews where id = p_review;
  if v_loc is null or not public.is_member(v_loc) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.reviews set state = 'handled_offline' where id = p_review and state in ('new','drafted','blocked');
end $$;
revoke execute on function public.handle_review_offline(uuid) from public, anon;
grant execute on function public.handle_review_offline(uuid) to authenticated;

-- 3. Plans end when their time is up; the business status follows (a paid renewal starts next).
create or replace function public.end_expired_plans() returns int
language plpgsql security definer set search_path = '' as $$
declare v_loc uuid; n int := 0;
begin
  for v_loc in
    update public.plans set status = 'ended'
     where status = 'active' and ends_at is not null and ends_at <= now()
    returning location_id
  loop
    perform public.refresh_location_status(v_loc);
    n := n + 1;
  end loop;
  if n > 0 then insert into public.jobs_log (job, ok, detail) values ('plans_expiry', true, jsonb_build_object('ended', n)); end if;
  return n;
end $$;
revoke execute on function public.end_expired_plans() from public, anon, authenticated;
select cron.schedule('kabsi_plans_expiry', '7 * * * *', $$select public.end_expired_plans()$$);

-- 4. Website and dashboard assistant (D261). Service-only tables: the assistant Edge Function is the only
--    reader and writer. Contacts are the mailing list from day one (consent recorded per contact).
create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  contact_id uuid,
  surface text not null default 'site' check (surface in ('site','app')),
  first_page text,
  status text not null default 'open' check (status in ('open','handoff','closed')),
  handoff_reason text,
  message_count int not null default 0,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  cache_read int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chat_conversations_visitor on public.chat_conversations (visitor_id, updated_at desc);
create index chat_conversations_user on public.chat_conversations (user_id, updated_at desc);

create table public.chat_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  page text,
  created_at timestamptz not null default now()
);
create index chat_messages_conversation on public.chat_messages (conversation_id, id);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  business_name text,
  phone text,
  country text,
  city text,
  business_type text,
  interest text,
  marketing_consent boolean not null default false,
  source text not null default 'assistant',
  conversation_id uuid references public.chat_conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index contacts_email on public.contacts (lower(email));
alter table public.chat_conversations add constraint chat_conversations_contact
  foreign key (contact_id) references public.contacts(id) on delete set null;

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.contacts enable row level security;
revoke all on public.chat_conversations, public.chat_messages, public.contacts from anon, authenticated;

-- Staff read the contact list and handed-off conversations (for /staff).
create or replace function public.staff_contacts(p_limit int default 200)
returns table (id uuid, email text, name text, business_name text, phone text, country text, city text,
  business_type text, interest text, marketing_consent boolean, source text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select c.id, c.email, c.name, c.business_name, c.phone, c.country, c.city, c.business_type,
    c.interest, c.marketing_consent, c.source, c.created_at
    from public.contacts c order by c.created_at desc limit least(greatest(p_limit, 1), 1000);
end $$;
revoke execute on function public.staff_contacts(int) from public, anon;
grant execute on function public.staff_contacts(int) to authenticated;

-- Retention: assistant conversations 12 months after the last message.
create or replace function public.purge_old_chats() returns int
language sql security definer set search_path = '' as $$
  with d as (delete from public.chat_conversations where updated_at < now() - interval '12 months' returning 1)
  select count(*)::int from d
$$;
revoke execute on function public.purge_old_chats() from public, anon, authenticated;
select cron.schedule('kabsi_chat_retention', '41 3 * * *', $$select public.purge_old_chats()$$);
