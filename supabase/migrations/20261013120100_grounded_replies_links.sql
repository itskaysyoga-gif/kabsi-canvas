-- P0.3-02: the three new tables go with their business (K-40: owner data is deleted with the business). Run in the
-- Supabase SQL editor by Hussein (the file holds ON DELETE clauses). It removes no data when run.

alter table public.ai_runs
  add constraint ai_runs_location_id_fkey foreign key (location_id) references public.locations(id) on delete cascade;
alter table public.style_edits
  add constraint style_edits_location_id_fkey foreign key (location_id) references public.locations(id) on delete cascade;
alter table public.style_offers
  add constraint style_offers_location_id_fkey foreign key (location_id) references public.locations(id) on delete cascade;
