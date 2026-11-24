-- PROOF-2 fix: link_taps is read by the reports (service role) only; the browser reads taps through RLS. Removing the signed-in
-- grant keeps it off the reviewed list of browser-callable definer functions.
revoke execute on function public.link_taps(uuid, timestamptz, timestamptz) from authenticated;
