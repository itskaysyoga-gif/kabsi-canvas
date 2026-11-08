-- Demo pack part 3 (R-125): the two sample drafts that Kabsi flags as unsafe no longer offer anything free. They now promise
-- a callback and a remake that Kabsi has no fact for, which is the kind of draft the owner is meant to read before approving.
-- Update only, two demo reply drafts; ends with an assert that no non-demo draft changed.
do $drafts$
declare
  v_before text;
begin
  select md5(coalesce(string_agg(to_jsonb(d)::text, '|' order by d.id::text), '')) into v_before from public.reply_drafts d
    where not exists (select 1 from public.reviews v join public.locations l on l.id = v.location_id where v.id = d.review_id and l.is_demo);
  update public.reply_drafts set body = 'Thank you, Ben. Theo will remake the mocha for you the next time you come in. Maya and the Harbour Lane team',
      safety_notes = jsonb_build_array('The reply promises something Kabsi has no fact for.')
    where review_id = 'de300000-0000-4000-9000-101000001023' and version = 1 and safety_ok = false;
  update public.reply_drafts set body = 'Thank you, Cleo. Rosa on our front desk will call you tomorrow to put this right. Ines, Juniper Hair Studio',
      safety_notes = jsonb_build_array('The reply promises something Kabsi has no fact for.')
    where review_id = 'de300000-0000-4000-9000-101000002026' and version = 1 and safety_ok = false;
  if v_before is distinct from (select md5(coalesce(string_agg(to_jsonb(d)::text, '|' order by d.id::text), '')) from public.reply_drafts d
      where not exists (select 1 from public.reviews v join public.locations l on l.id = v.location_id where v.id = d.review_id and l.is_demo)) then
    raise exception 'demo pack drafts: a non-demo reply draft changed';
  end if;
end
$drafts$;
