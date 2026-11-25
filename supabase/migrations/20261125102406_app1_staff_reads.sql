-- APP-1: three staff reads for the redone Today and Conversations pages. Additive only: create or replace, revoke, grant.
-- Every function checks is_staff() first and returns nothing to anyone else.
--
-- 1. staff_today() keeps its two keys (caps, refusals_24h) and adds one count for the Today queue: free trials that end
--    in the next 3 days. A count only, no business data.
-- 2. staff_chat_last(ids): the last message of each listed Nora chat, cut to 160 characters, for the chat list.
-- 3. staff_chat_thread(id): the messages of one Nora chat, oldest first, at most 200, for the thread view.

create or replace function public.staff_today() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'checked_at', now(),
    'caps', jsonb_build_object(
      'dataforseo_usd', coalesce((select nullif(value, '')::numeric from public.app_settings
                                   where key = 'provider_cap_dataforseo_usd'), 0),
      'ai_visibility_usd', coalesce((select nullif(value, '')::numeric from public.app_settings
                                      where key = 'provider_cap_ai_visibility_usd'), 0)
    ),
    'refusals_24h', coalesce((
      select jsonb_agg(jsonb_build_object('title', e.title, 'at', e.created_at) order by e.created_at desc)
        from public.ops_events e
       where e.created_at > now() - interval '24 hours'
         and (e.dedupe_key like 'dataforseo_refused:%'
              or e.dedupe_key like 'cap:%'
              or e.dedupe_key like 'ai_cap:%')
    ), '[]'::jsonb),
    'trials_ending_3d', (
      select count(*) from (
        select distinct on (s.organization_id) s.organization_id, s.trial_ends_at
          from public.subscriptions s
         where s.trial_started_at is not null
         order by s.organization_id, s.trial_started_at desc
      ) t
       where t.trial_ends_at > now() and t.trial_ends_at <= now() + interval '3 days'
    )
  );
end;
$$;

comment on function public.staff_today() is
  'App 5 and APP-1: the spend caps, the provider refusals of the last 24 hours and the trials ending, for the staff Today page. Staff only.';

revoke all on function public.staff_today() from public, anon;
grant execute on function public.staff_today() to authenticated;

create or replace function public.staff_chat_last(p_ids uuid[])
returns table (conversation_id uuid, role text, content text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select distinct on (m.conversation_id) m.conversation_id, m.role, left(m.content, 160), m.created_at
      from public.chat_messages m
     where m.conversation_id = any((coalesce(p_ids, '{}'::uuid[]))[1:300])
     order by m.conversation_id, m.id desc;
end;
$$;

comment on function public.staff_chat_last(uuid[]) is
  'APP-1: the last message of each listed Nora chat (at most 300 ids, 160 characters), for the staff chat list. Staff only.';

revoke all on function public.staff_chat_last(uuid[]) from public, anon;
grant execute on function public.staff_chat_last(uuid[]) to authenticated;

create or replace function public.staff_chat_thread(p_conversation uuid)
returns table (id bigint, role text, content text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select x.id, x.role, x.content, x.created_at from (
      select m.id, m.role, m.content, m.created_at
        from public.chat_messages m
       where m.conversation_id = p_conversation
       order by m.id desc
       limit 200
    ) x
    order by x.id asc;
end;
$$;

comment on function public.staff_chat_thread(uuid) is
  'APP-1: the messages of one Nora chat, oldest first, the last 200, for the staff thread view. Staff only.';

revoke all on function public.staff_chat_thread(uuid) from public, anon;
grant execute on function public.staff_chat_thread(uuid) to authenticated;
