-- Definer review (R-126, 8 Nov 2026): close the SECURITY DEFINER functions that the browser roles could run but no page
-- calls. The inventory is docs/progress/archive/2026-11-08-definer-review.md; the reviewed allowlist is
-- supabase/tests/_definer_allowlist.psql and supabase/tests/definer_allowlist.sql fails on any function outside it.
--
-- staff_contacts: the old contacts list (names, emails, phones); no staff page reads it since the CRM moved.
-- staff_founding_matches: the Founding 25 owner match (Sec 1); the staff panel does not call it yet.
-- set_protection_autofix: the Pro auto-fix opt-in; no owner page offers it yet and the switch is off by policy.
-- The page that later calls one of them grants it back in its own migration, with its line in the allowlist.
-- Additive in effect: no table, column or row changes; service_role keeps EXECUTE (Edge Functions are untouched).
revoke execute on function public.staff_contacts(integer) from public, anon, authenticated;
revoke execute on function public.staff_founding_matches(uuid) from public, anon, authenticated;
revoke execute on function public.set_protection_autofix(uuid, text, boolean, text) from public, anon, authenticated;

-- Part D: the 59 tables with RLS on and no policy are service-only on purpose (no page reads them; the list and the
-- reason per table are in the record). One of them still granted SELECT, REFERENCES and TRIGGER to authenticated
-- (no policy let a row through, but the grant has no use): closed. No view or invoker function reads it.
revoke all on table public.action_tokens from anon, authenticated;
