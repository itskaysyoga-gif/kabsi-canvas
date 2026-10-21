-- P0.5-03 part B: the two private holiday functions are not callable by the browser roles (the rls_functions suite checks
-- that no function in private is executable by anon or authenticated). They run only inside the security definer
-- functions of the holiday concierge. Additive: two revokes, nothing dropped.
revoke execute on function private.holiday_region(text) from public, anon, authenticated;
revoke execute on function private.holiday_answer(uuid, uuid, text, text, text, text, date, date) from public, anon, authenticated;
