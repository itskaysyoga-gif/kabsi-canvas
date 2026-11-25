-- FIX-3 (R-165): approve_publication named its idempotency key <target type>:<target>:<count of publications + 1>. Once retention removes
-- older publications of one target, the count falls below the highest key still stored and the next approval fails on
-- publications_idempotency_key. The suffix is now the highest stored numeric suffix for that target plus one (0 when none), so it can only
-- grow while a row of that target remains, and a removed row can never make it collide. Keys with a non-numeric tail (the replay fixture
-- filler rows) are ignored. Later migrations patch the function text in place (photo_post1, photos2, fix2, offer2), so this does the same:
-- approve_publication as it stands live, with only that one line replaced in its current text.
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.approve_publication(text, uuid, jsonb, uuid, text, integer)'::regprocedure);
  n := replace(d, $x$select count(*) into v_n from public.publications where target_type = p_target_type and target_id = v_target;$x$,
                  $x$select coalesce(max(((regexp_match(idempotency_key, ':([0-9]+)$'))[1])::integer), 0) into v_n
    from public.publications where target_type = p_target_type and target_id = v_target;$x$);
  if n = d then raise exception 'approve_publication: the key count line was not found'; end if;
  execute n;
end $$;
