-- FIX-4 item 4 (25 Nov 2026): the staff Today page showed "11 stopped jobs to retry or cancel". None is current, so all 11
-- are cancelled the way public.staff_job_cancel does it (state failed, the reason in last_error, one audit row each). Only
-- jobs that are still dead are touched; nothing is deleted and no job is run.
--   237426 protection_check, Yawmiyati, 26 Oct: Google answered 404 for the listing then; 18 later checks succeeded.
--   494075, 462710, 478395 care_posts, Yawmiyati, 14 to 16 Nov: made before the 17 Nov outage, FIX-0 closed them; later ones succeeded.
--   370306, 224423, 224448, 224466, 347116, 320837 publish, Harbour Lane Coffee (a demo business): their publications are cancelled.
--   645452 billing_event, evt_bpaw...: a test-mode subscription.canceled for a business that no longer exists; its
--     subscription row went with the business, so there is nothing to apply and a retry fails the same way.
with todo as (
  select j.id, j.kind, j.state, j.attempts, j.location_id, j.last_error,
         case j.id
           when 237426 then 'stale, Google answered 404 for the listing on 26 Oct and 18 later checks succeeded'
           when 645452 then 'test-mode subscription.canceled for a business that no longer exists, nothing to apply'
           else 'stale, closed by FIX-0 (before the 17 Nov outage) or its publication is cancelled'
         end as why
    from public.jobs j
   where j.id in (237426, 494075, 462710, 478395, 370306, 224423, 224448, 224466, 347116, 320837, 645452)
     and j.state = 'dead'
), done as (
  update public.jobs j
     set state = 'failed', finished_at = now(),
         last_error = left('cancelled by staff (FIX-4), ' || t.why || '. Was: ' || coalesce(t.last_error, 'no error recorded'), 500)
    from todo t
   where j.id = t.id
  returning j.id, j.kind, j.attempts, j.location_id
)
select private.audit('system', null, 'staff_job_cancel', d.location_id, 'job', d.id::text,
         jsonb_build_object('state', 'dead', 'kind', d.kind, 'attempts', d.attempts), jsonb_build_object('state', 'failed'), 'staff', 'ok')
  from done d;
