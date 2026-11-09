-- RB-F (R-139): two additive pieces. No existing table, column or function changes.
--
-- 1. public.request_recent: the requests this person touched at this business in the last few minutes, newest first, each
--    with its latest effective activity (private.rb_latest). WhatsApp uses it for "not highlights, a trim" (the request
--    touched in the last 30 minutes) and for a typed Undo (the latest effective activity, inside the 10 minutes that
--    request_undo itself enforces). An Undo and a change already undone are not counted; the latest activity is returned
--    only when it is this person's own. Gate, membership and location as every request book function; service-only; STABLE,
--    so it writes nothing. Returns ids, numbers, kinds and times only, never a name or a customer's words.
--
-- 2. public.whatsapp_message_pricing: what Meta says about a delivered message's price, read from the status webhook
--    (statuses[].pricing): billable and category, and the pricing model. One row per WhatsApp message id. No phone, no
--    text, no person: RB-F reads it to count how each delivered reply is charged (messages per request against the
--    design's 4 or 5). Service-only, RLS on with no policies.

create function public.request_recent(p_location uuid, p_actor uuid, p_minutes integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare g record; v_rows jsonb;
begin
  g := private.rb_gate(p_location, p_actor);
  if g.reason is not null then return private.rb_refuse(g.reason); end if;
  if p_minutes is null or p_minutes not between 1 and 60 then return private.rb_refuse('invalid_input'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('request_id', s.id, 'number', s.number, 'kind', s.kind, 'touched_at', s.touched_at,
           'latest_activity_id', s.latest) order by s.touched_at desc, s.number desc), '[]'::jsonb)
    into v_rows
    from (select q.id, q.number, q.kind, max(a.created_at) as touched_at,
                 -- The latest effective change, only when it is this person's own: a typed Undo never reverses someone else's.
                 (select l.id from public.request_activities l where l.id = private.rb_latest(q.id) and l.actor_user_id = p_actor) as latest
            from public.request_activities a
            join public.customer_requests q on q.id = a.request_id and q.location_id = p_location
           where a.location_id = p_location and a.actor_user_id = p_actor
             and a.created_at > now() - make_interval(mins => p_minutes)
             -- An Undo, and a change that was undone, do not count as touching: a second "undo" goes to the next change back.
             and a.type <> 'undone'
             and not exists (select 1 from public.request_activities u where u.location_id = p_location and u.undo_of = a.id)
           group by q.id, q.number, q.kind
           order by max(a.created_at) desc, q.number desc
           limit 5) s;
  return jsonb_build_object('ok', true, 'rows', v_rows);
end $$;

revoke all on function public.request_recent(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.request_recent(uuid, uuid, integer) to service_role;

create table public.whatsapp_message_pricing (
  provider_id text primary key check (length(provider_id) between 3 and 200),
  billable boolean,
  category text check (category is null or category ~ '^[a-z][a-z_]{0,40}$'),
  pricing_model text check (pricing_model is null or pricing_model ~ '^[A-Za-z][A-Za-z_]{0,40}$'),
  recorded_at timestamptz not null default now()
);
alter table public.whatsapp_message_pricing enable row level security;
revoke all on public.whatsapp_message_pricing from anon, authenticated;
grant select, insert, update on public.whatsapp_message_pricing to service_role;

-- Read-back (select only):
--   select p.proname, p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'request_recent';                       expect: request_recent | true
--   select relrowsecurity from pg_class where relname = 'whatsapp_message_pricing';   expect: true
