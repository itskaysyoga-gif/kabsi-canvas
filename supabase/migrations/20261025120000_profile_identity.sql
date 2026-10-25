-- Session 19 rest (master plan 30.10.1): the name, address and country a business picked from the Places search at
-- sign-up are replaced from its own Business Profile on the first successful sync (api/jobs.ts adoptProfileIdentity).
-- This column records when that happened, so it happens once. Additive: one new column.
alter table public.locations add column if not exists profile_identity_at timestamptz;
