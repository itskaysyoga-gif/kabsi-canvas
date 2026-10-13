-- P0.3-01: removing a fact is real (K-120.5). Run in the Supabase SQL editor by Hussein (it holds a DELETE).
--
-- 1. knowledge_confirms is tied to its business: when a business is removed (delete_location_now), its open
--    questions go with it.
-- 2. public.remove_fact(fact): the owner or a manager, signed in, removes one fact of About your business: the row,
--    every earlier version and any question about it. Nothing of the value is kept, the audit log included (it
--    records the key, the fact id and how many versions went). Returns that number.

alter table public.knowledge_confirms
  add constraint knowledge_confirms_location_id_fkey foreign key (location_id)
  references public.locations(id) on delete cascade;

create function public.remove_fact(p_fact uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare f public.knowledge_facts := private.fact_for_owner(p_fact); n integer;
begin
  delete from public.knowledge_confirms where location_id = f.location_id and slot = f.slot;
  delete from public.knowledge_facts where location_id = f.location_id and slot = f.slot;
  get diagnostics n = row_count;
  perform private.audit('user', auth.uid(), 'fact_removed', f.location_id, 'knowledge_facts', f.id::text, null,
    jsonb_build_object('key', f.key, 'fact_id', f.id, 'versions', n), 'dashboard', 'removed');
  return n;
end $$;

revoke execute on function public.remove_fact(uuid) from public, anon;
grant execute on function public.remove_fact(uuid) to authenticated;
