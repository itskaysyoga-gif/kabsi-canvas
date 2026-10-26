-- Access 2: accepting invitations whose address Google writes in the listing's own script.
--
-- 1. public.invitation_lookups: one row per Google invitation that needed a Places lookup, kept 24 hours, so one stuck
--    invitation costs at most one Places Text Search a day, never one per 5-minute run. Only the outcome is kept: the
--    place ID Places confirmed (place IDs may be kept, Maps Platform Terms 3.2.3(b)) or null, and Kabsi's own reason.
--    No Places name or address is stored. claim() takes the row before the lookup, so a crash after the call still
--    counts as that day's lookup.
-- 2. public.google_listings: the Google listings Kabsi has managed. For a business's own listing, Google's own title,
--    address and place ID from the grant (the saved copy a re-invitation is matched against first). For every listing,
--    when it was first and last seen and, if Kabsi removed itself, when (removed_at): a listing that matches no business
--    in Kabsi and was not managed before is removed by the access job.
--
-- Service role only, RLS on with no policies, like the other job tables. Additive: two new tables and three functions.

create table public.invitation_lookups (
  invitation text primary key check (invitation like 'accounts/%/invitations/%'),
  place_id text,
  reason text,
  checked_at timestamptz not null default now()
);
alter table public.invitation_lookups enable row level security;
revoke all on public.invitation_lookups from public, anon, authenticated, service_role;
grant select on public.invitation_lookups to service_role;

-- Claim an invitation for today's lookup. Answers {"claimed": true} when the caller may ask Places now, or the remembered
-- outcome ({"claimed": false, "place_id": ..., "reason": ...}) when it was looked up in the last 24 hours. Rows older
-- than two days are cleared on the way.
create function public.invitation_lookup_claim(p_invitation text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.invitation_lookups;
begin
  delete from public.invitation_lookups where checked_at < now() - interval '2 days';
  insert into public.invitation_lookups as l (invitation, reason, checked_at) values (p_invitation, 'looking up', now())
  on conflict (invitation) do update set place_id = null, reason = 'looking up', checked_at = now()
    where l.checked_at < now() - interval '24 hours'
  returning * into v;
  if found then return jsonb_build_object('claimed', true); end if;
  select * into v from public.invitation_lookups where invitation = p_invitation;
  return jsonb_build_object('claimed', false, 'place_id', v.place_id, 'reason', v.reason);
end $$;

-- The outcome of the lookup just made.
create function public.invitation_lookup_save(p_invitation text, p_place_id text, p_reason text) returns void
language sql security definer set search_path = '' as $$
  update public.invitation_lookups set place_id = p_place_id, reason = left(p_reason, 200) where invitation = p_invitation
$$;

-- Give the claim back when nothing was sent to Google (today's Places cap was reached).
create function public.invitation_lookup_release(p_invitation text) returns void
language sql security definer set search_path = '' as $$
  delete from public.invitation_lookups where invitation = p_invitation and place_id is null and reason = 'looking up'
$$;

revoke execute on function public.invitation_lookup_claim(text), public.invitation_lookup_save(text, text, text),
  public.invitation_lookup_release(text) from public, anon, authenticated;
grant execute on function public.invitation_lookup_claim(text), public.invitation_lookup_save(text, text, text),
  public.invitation_lookup_release(text) to service_role;

create table public.google_listings (
  google_location_id text primary key check (google_location_id like 'locations/%'),
  place_id text,
  location_id uuid references public.locations (id) on delete set null,
  title text,
  address text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  removed_at timestamptz
);
create index google_listings_location_idx on public.google_listings (location_id) where location_id is not null;
alter table public.google_listings enable row level security;
revoke all on public.google_listings from public, anon, authenticated, service_role;
grant select, insert, update on public.google_listings to service_role;

-- Kabsi's own Google listings that have no business row in Kabsi, which the access job must never remove (comma
-- separated Google location names): the Abou Hamze Auto Center test profile (written consent, 8 Oct 2026).
insert into public.app_settings (key, value) values ('access_keep_listings', 'locations/1850906632456176734')
on conflict (key) do nothing;
