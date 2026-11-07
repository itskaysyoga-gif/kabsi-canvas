-- R-123 part A foundation: an auditor identity that does not inherit admin reads.
-- The browser stays locked out of existing staff reads until masking is complete.
-- Do not broaden public.is_staff() in this migration.

alter table public.staff drop constraint staff_role_check;
alter table public.staff
  add constraint staff_role_check check (role in ('admin', 'installer', 'auditor'));

create table private.audit_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint audit_access_created_before_expiry check (created_at < expires_at)
);

alter table private.audit_access enable row level security;
revoke all on table private.audit_access from public, anon, authenticated;

create or replace function private.is_auditor()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
     and exists (
       select 1
       from private.audit_access a
       join public.staff s on s.user_id = a.user_id and s.role = 'auditor'
       join auth.users u on u.id = a.user_id
       where a.user_id = auth.uid()
         and a.expires_at > now()
         and (u.banned_until is null or u.banned_until <= now())
     );
$$;

revoke all on function private.is_auditor() from public, anon, authenticated;
comment on function private.is_auditor() is
  'R-123: checked only in trusted code, and false immediately on expiry or ban';

-- The dedicated login already exists in Auth on production.
-- An absent Auth user on the local test stack intentionally inserts no row.
with target as (
  select id from auth.users where email = 'chatgpt-audit@kabsi.co'
), operator as (
  select user_id from public.staff where role = 'admin' order by created_at, user_id limit 1
)
insert into public.staff (user_id, name, role)
select t.id, 'Temporary audit reviewer', 'auditor'
from target t
on conflict (user_id) do nothing;

with target as (
  select u.id
  from auth.users u
  join public.staff s on s.user_id = u.id and s.role = 'auditor'
  where u.email = 'chatgpt-audit@kabsi.co'
), operator as (
  select user_id from public.staff where role = 'admin' order by created_at, user_id limit 1
)
insert into private.audit_access (user_id, expires_at, created_by)
select t.id, timestamptz '2026-11-14 23:59:00+00', o.user_id
from target t cross join operator o
on conflict (user_id) do update
  set expires_at = excluded.expires_at
  where private.audit_access.expires_at < excluded.expires_at;
