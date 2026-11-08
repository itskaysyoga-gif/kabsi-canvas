-- Request book, PR A: the shared core (product decision of 8 Nov 2026, Build decisions tab). Additive only: eight new
-- tables, two trigger guards, no change to any existing table, function, route or Google path, and nothing calls them yet.
--
-- One workflow for every kind of business: a customer wants something (an enquiry, an appointment or a job). Words and
-- fields per trade live in pack files (PR C), so these tables carry no trade-specific terms.
--
-- Service-only, as the repo's other service tables: RLS on, no policies, no grants to anon or authenticated. service_role
-- reads but cannot write, so only the PR B functions (SECURITY DEFINER, owned by postgres) can change a row.
--
-- Real customer data is refused here, not by convention: location_packs.state is 'off' or 'test', real_data_allowed has a
-- check that forces false, and customer_identifiers takes only reserved fictional phones and emails. A later migration,
-- after the customer data controls and legal review, is the only way to lift this.
--
-- Rollback is by switches. Nothing here is dropped as a rollback once rows exist.

-- 1. Which pack a business uses, and whether the request book is on for it. No row or state 'off' means off.
create table public.location_packs (
  location_id uuid primary key references public.locations (id) on delete cascade,
  pack text not null check (pack ~ '^[a-z][a-z0-9_]{1,40}$'),
  pack_version integer not null default 1 check (pack_version > 0),
  state text not null default 'off' check (state in ('off', 'test')),
  real_data_allowed boolean not null default false check (real_data_allowed = false),
  capabilities text[] not null default '{}',
  next_number integer not null default 1 check (next_number > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.location_packs is
  'Request book: pack, state and numbering per business. real_data_allowed is forced false until the customer data controls and legal review exist.';

-- 2. A customer of a business. Scoped to one location; a blank name stays blank, nothing is guessed.
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  display_name text check (length(display_name) between 1 and 200),
  name_key text check (length(name_key) <= 200),
  last_seen_at timestamptz,
  erased_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, id)
);
create index customers_location_name_idx on public.customers (location_id, name_key) where erased_at is null;
comment on table public.customers is 'Request book: a customer of one business. Never shared between locations.';

-- 3. A way to recognise a customer. Not unique: a family or a fleet can share one phone, so a match is only ever a suggestion.
create table public.customer_identifiers (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null,
  customer_id uuid not null,
  kind text not null check (kind in ('phone', 'email', 'external')),
  value text not null check (length(value) between 3 and 320),
  created_at timestamptz not null default now(),
  foreign key (location_id, customer_id) references public.customers (location_id, id) on delete cascade,
  unique (customer_id, kind, value)
);
create index customer_identifiers_lookup_idx on public.customer_identifiers (location_id, kind, value);

create function private.customer_identifiers_guard() returns trigger
language plpgsql set search_path = '' as $$
declare v_real boolean;
begin
  select p.real_data_allowed into v_real from public.location_packs p where p.location_id = new.location_id;
  if coalesce(v_real, false) then
    return new;
  end if;
  -- Test mode: the North American 555-0100 to 555-0199 range and the reserved email domains cannot belong to anyone.
  if (new.kind = 'phone' and new.value ~ '^\+1[2-9][0-9]{2}55501[0-9]{2}$')
     or (new.kind = 'email' and new.value ~* '@(example\.(com|org|net)|[a-z0-9-]+\.(test|example|invalid))$') then
    return new;
  end if;
  raise exception 'request_book: real customer data is not allowed' using errcode = '23514';
end $$;
revoke all on function private.customer_identifiers_guard() from public, anon, authenticated;
create trigger customer_identifiers_guard before insert or update on public.customer_identifiers
  for each row execute function private.customer_identifiers_guard();

-- 4. What arrived, before anyone saved it. Every way in (typed now; forward, form or a booking system later) lands here.
create table public.request_intakes (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  source text not null check (source in ('typed', 'form', 'forward', 'voice', 'screenshot', 'import', 'integration')),
  raw_text text check (length(raw_text) <= 8000),
  field_evidence jsonb not null default '{}' check (jsonb_typeof(field_evidence) = 'object'),
  state text not null default 'pending' check (state in ('pending', 'confirmed', 'discarded', 'expired')),
  provider_message_id text check (length(provider_message_id) <= 200),
  created_by uuid,
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now(),
  unique (location_id, id)
);
create unique index request_intakes_message_uniq on public.request_intakes (location_id, provider_message_id)
  where provider_message_id is not null;
create index request_intakes_expiry_idx on public.request_intakes (expires_at) where state = 'pending';

-- 5. One thing a customer wants. Kinds are data; there is one workflow. No column can claim that availability was
-- checked or that a booking exists anywhere else: the external reference only says where a record came from.
create table public.customer_requests (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  number integer not null check (number > 0),
  kind text not null check (kind in ('enquiry', 'appointment', 'job')),
  status text not null,
  outcome text,
  closed_at timestamptz,
  customer_id uuid not null,
  summary text not null check (length(summary) between 1 and 1000),
  -- Where it came from: how it reached Kabsi, and where the customer got in touch.
  entry_method text not null check (entry_method in ('typed', 'form', 'forward', 'voice', 'screenshot', 'import', 'integration')),
  origin_channel text not null default 'unknown' check (origin_channel in
    ('whatsapp', 'instagram', 'facebook', 'phone', 'walk_in', 'google', 'website', 'referral', 'booking_system', 'other', 'unknown')),
  intake_id uuid,
  -- When: the words the customer used, kept apart from a time someone actually set.
  requested_window_text text check (length(requested_window_text) <= 200),
  starts_at timestamptz,
  ends_at timestamptz,
  -- Two independent facts. Customer confirmation is always staff recording what the customer told them.
  staff_confirmed_at timestamptz,
  staff_confirmed_by uuid,
  customer_confirmed_at timestamptz,
  customer_confirmed_recorded_by uuid,
  -- Who follows up, what next, by when.
  follow_up_user_id uuid,
  next_action text check (length(next_action) <= 300),
  next_action_due_at timestamptz,
  -- Optional link to a record elsewhere, for future intake and integrations.
  external_system text check (external_system ~ '^[a-z][a-z0-9_]{1,40}$'),
  external_id text check (length(external_id) between 1 and 200),
  converted_from_request_id uuid,
  pack text not null check (pack ~ '^[a-z][a-z0-9_]{1,40}$'),
  pack_version integer not null check (pack_version > 0),
  details jsonb not null default '{}' check (jsonb_typeof(details) = 'object'),
  row_version integer not null default 1 check (row_version > 0),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, id),
  unique (location_id, number),
  -- These three act only when a whole business is deleted. A customer is erased by clearing its fields, never by deleting it.
  foreign key (location_id, customer_id) references public.customers (location_id, id) on delete cascade,
  foreign key (location_id, intake_id) references public.request_intakes (location_id, id) on delete set null (intake_id),
  foreign key (location_id, converted_from_request_id) references public.customer_requests (location_id, id)
    on delete set null (converted_from_request_id),
  foreign key (location_id, follow_up_user_id) references public.location_members (location_id, user_id)
    on delete set null (follow_up_user_id),
  constraint customer_requests_kind_status check (
    (kind = 'enquiry' and status in ('new', 'contacted', 'closed')
      and (outcome is null or outcome in ('converted', 'lost', 'voided')))
    or (kind = 'appointment' and status in ('requested', 'closed')
      and (outcome is null or outcome in ('attended', 'no_show', 'cancelled', 'voided')))
    or (kind = 'job' and status in ('waiting', 'active', 'ready', 'closed')
      and (outcome is null or outcome in ('completed', 'cancelled', 'no_show', 'voided')))),
  constraint customer_requests_closed check (
    (status = 'closed') = (outcome is not null) and (status = 'closed') = (closed_at is not null)),
  constraint customer_requests_confirm_kind check (
    kind = 'appointment' or (staff_confirmed_at is null and customer_confirmed_at is null)),
  constraint customer_requests_confirm_time check (
    (staff_confirmed_at is null and customer_confirmed_at is null) or starts_at is not null),
  constraint customer_requests_staff_who check ((staff_confirmed_at is null) = (staff_confirmed_by is null)),
  constraint customer_requests_customer_who check (
    (customer_confirmed_at is null) = (customer_confirmed_recorded_by is null)),
  constraint customer_requests_times check (ends_at is null or (starts_at is not null and ends_at >= starts_at)),
  constraint customer_requests_external check ((external_system is null) = (external_id is null))
);
create index customer_requests_open_idx on public.customer_requests (location_id, kind, status) where status <> 'closed';
create index customer_requests_customer_idx on public.customer_requests (location_id, customer_id);
create index customer_requests_due_idx on public.customer_requests (location_id, next_action_due_at)
  where next_action_due_at is not null and status <> 'closed';
create index customer_requests_follow_up_idx on public.customer_requests (location_id, follow_up_user_id)
  where follow_up_user_id is not null;
create index customer_requests_intake_idx on public.customer_requests (location_id, intake_id) where intake_id is not null;
-- A voided conversion (an Undo) keeps its link for history and does not stop the enquiry being converted again.
create unique index customer_requests_converted_uniq on public.customer_requests (location_id, converted_from_request_id)
  where converted_from_request_id is not null and outcome is distinct from 'voided';
create unique index customer_requests_external_uniq on public.customer_requests (location_id, external_system, external_id)
  where external_system is not null;
comment on table public.customer_requests is
  'Request book: one thing a customer wants. Written only by the request_* functions. Records what staff stated, never an external booking.';

-- 6. What happened, in order. Append only, and no personal values: those sit in request_activity_values.
create table public.request_activities (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null,
  request_id uuid not null,
  type text not null check (type in ('created', 'status_changed', 'confirmation_changed', 'corrected',
    'converted_out', 'converted_in', 'undone')),
  from_status text,
  to_status text,
  from_outcome text,
  to_outcome text,
  flags text[] not null default '{}',
  actor_user_id uuid not null,
  actor_role text not null check (actor_role in ('owner', 'manager', 'staff')),
  tool text not null check (tool ~ '^[a-z][a-z_]{1,62}$'),
  undo_of uuid unique,
  related_request_id uuid,
  created_at timestamptz not null default now(),
  unique (location_id, id),
  foreign key (location_id, request_id) references public.customer_requests (location_id, id) on delete cascade
);
create index request_activities_request_idx on public.request_activities (location_id, request_id, created_at desc);

-- 7. Before and after values, apart from the timeline so that erasure can clear them and keep the event.
create table public.request_activity_values (
  activity_id uuid not null,
  location_id uuid not null,
  field text not null check (field ~ '^[a-z][a-z_]{1,62}$'),
  before_value jsonb,
  after_value jsonb,
  cleared_at timestamptz,
  primary key (activity_id, field),
  foreign key (location_id, activity_id) references public.request_activities (location_id, id) on delete cascade
);
create index request_activity_values_location_idx on public.request_activity_values (location_id, activity_id);

-- Append only, while the parent exists. When a business is deleted the parent is already gone in the same statement, so
-- the existing deletion job (delete_location_now) keeps working.
create function private.request_activities_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from public.customer_requests r where r.id = old.request_id) then
    return old;
  end if;
  raise exception 'request_activities is append-only' using errcode = '42501';
end $$;
revoke all on function private.request_activities_guard() from public, anon, authenticated;
create trigger request_activities_guard before update or delete on public.request_activities
  for each row execute function private.request_activities_guard();

create function private.request_activity_values_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if not exists (select 1 from public.request_activities a where a.id = old.activity_id) then
      return old;
    end if;
    raise exception 'request_activity_values may only be cleared' using errcode = '42501';
  end if;
  if (new.activity_id, new.location_id, new.field) is distinct from (old.activity_id, old.location_id, old.field)
     or new.before_value is not null or new.after_value is not null or new.cleared_at is null then
    raise exception 'request_activity_values may only be cleared' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function private.request_activity_values_guard() from public, anon, authenticated;
create trigger request_activity_values_guard before update or delete on public.request_activity_values
  for each row execute function private.request_activity_values_guard();

-- 8. One result per idempotency key. Ids only: never a name, a phone or a customer's words.
create table public.tool_executions (
  location_id uuid not null references public.locations (id) on delete cascade,
  idempotency_key text not null check (length(idempotency_key) between 1 and 200),
  tool text not null check (tool ~ '^[a-z][a-z_]{1,62}$'),
  tool_version integer not null default 1 check (tool_version > 0),
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  result jsonb not null,
  cost_usd numeric(10, 6) check (cost_usd >= 0),
  actor_user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (location_id, idempotency_key)
);

-- Service-only. RLS on with no policy; browser roles get nothing; service_role reads, and only the functions write.
do $$
declare t text;
begin
  foreach t in array array['location_packs', 'customers', 'customer_identifiers', 'request_intakes', 'customer_requests',
                           'request_activities', 'request_activity_values', 'tool_executions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role', t);
    execute format('grant select on table public.%I to service_role', t);
  end loop;
end $$;
