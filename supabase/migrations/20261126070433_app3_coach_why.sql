-- APP-3 item 2 (R-169, 26 Nov 2026): the "Fill in your profile details" card drops its second sentence ("Kabsi never
-- suggests anything about who you are or who owns the business."). The rule itself stands (K-83); only the words change.
-- The detector private.coach_tasks writes the reason on every run, so its text is changed in place, and the open tasks
-- that hold the old reason take the new one now.
do $do$
declare d text;
begin
  select pg_get_functiondef('private.coach_tasks(uuid)'::regprocedure) into d;
  if position('Kabsi never suggests anything about who you are or who owns the business.' in d) = 0 then
    raise exception 'coach_tasks text not found';
  end if;
  execute replace(d, ' Kabsi never suggests anything about who you are or who owns the business.', '');
end $do$;

update public.tasks
   set why = 'Details such as payment options and accessibility help customers decide.'
 where dedupe_key = 'profile_gap:coach_attributes'
   and state in ('open', 'snoozed')
   and why like '%who owns the business%';
