-- THROWAWAY (P0.1-07 proof only, never merged or applied): a policy that lets every signed-in user read every business.
create policy p on public.locations for select using (true);
