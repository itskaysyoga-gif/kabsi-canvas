-- Scope 1 (30 Oct 2026, master plan 30.19 section 3 item 5): WhatsApp messages get a deletion date, 12 months after
-- they were sent or received. A new source in private.retention_sources_apply(): whatsapp_messages by created_at. The
-- outbox is already shorter (whatsapp_tick deletes its rows at 30 days, clear_sent_alert_texts blanks a sent text after a
-- day), so it gets no block. The function is replaced whole, as before, with this block added; the daily job, the dry run
-- and the alert-text clearing (sec2_approvals_cards) are unchanged. Additive only: create or replace.
create or replace function private.retention_sources_apply() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb := '{}'::jsonb; n integer;
  d_found_dec constant int := 90; d_found_wait constant int := 180; d_partner constant int := 90;
  d_jobs constant int := 30; d_events constant int := 90; d_product constant int := 30; d_ops constant int := 90;
  d_follow constant int := 180; d_notes constant int := 366; d_ai constant int := 366; d_log constant int := 60;
  d_lost int := coalesce(private.retention_days('google_data_after_access_lost'), 7);
begin
  delete from public.founding_applications
   where coalesce(delete_after, decided_at + make_interval(days => case status when 'declined' then d_found_dec else d_found_wait end))
         < now()
     and status in ('declined', 'waitlisted');
  get diagnostics n = row_count; v := v || jsonb_build_object('founding_applications', n);

  delete from public.partner_accounts
   where status = 'declined' and coalesce(delete_after, decided_at + make_interval(days => d_partner)) < now()
     -- A partner with any money record is kept (payment records follow tax law, not this rule).
     and not exists (select 1 from public.partner_referrals r where r.partner_id = partner_accounts.id)
     and not exists (select 1 from public.partner_commissions c where c.partner_id = partner_accounts.id)
     and not exists (select 1 from public.partner_payouts o where o.partner_id = partner_accounts.id);
  get diagnostics n = row_count; v := v || jsonb_build_object('partner_applications', n);

  delete from public.jobs where state in ('succeeded', 'dead', 'failed')
     and coalesce(finished_at, created_at) < now() - make_interval(days => d_jobs);
  get diagnostics n = row_count; v := v || jsonb_build_object('jobs', n);

  delete from public.google_events where received_at < now() - make_interval(days => d_events);
  get diagnostics n = row_count; v := v || jsonb_build_object('google_events', n);

  delete from public.product_events where created_at < now() - make_interval(days => d_product)
     and (sent_at is not null or created_at < now() - make_interval(days => d_product * 2));
  get diagnostics n = row_count; v := v || jsonb_build_object('product_events', n);

  delete from public.whatsapp_number_health where checked_at < now() - make_interval(days => d_ops);
  get diagnostics n = row_count; v := v || jsonb_build_object('number_health', n);
  delete from public.invitation_lookups where checked_at < now() - make_interval(days => d_ops);
  get diagnostics n = row_count; v := v || jsonb_build_object('invitation_lookups', n);
  delete from public.whatsapp_actions where coalesce(used_at, expires_at) < now() - make_interval(days => d_ops);
  get diagnostics n = row_count; v := v || jsonb_build_object('whatsapp_buttons', n);
  delete from public.webhook_rejections where hour < now() - make_interval(days => d_ops);

  delete from public.staff_followups where done_at < now() - make_interval(days => d_follow);
  get diagnostics n = row_count; v := v || jsonb_build_object('staff_followups', n);

  delete from public.notifications where created_at < now() - make_interval(days => d_notes);
  get diagnostics n = row_count; v := v || jsonb_build_object('notifications', n);

  delete from public.ai_runs where created_at < now() - make_interval(days => d_ai);
  get diagnostics n = row_count; v := v || jsonb_build_object('ai_runs', n);

  -- The photo files of a business that left: due now; the photo_files job removes them from Storage.
  update public.photos p set file_due_at = now()
    from public.locations l
   where l.id = p.location_id and p.file_due_at is null and p.file_deleted_at is null
     and ((l.access_removed_at < now() - make_interval(days => d_lost) and (l.access_granted_at is null or l.access_granted_at < l.access_removed_at))
       or (l.access_lost_at < now() - make_interval(days => d_lost) and l.access_granted_at is null));
  get diagnostics n = row_count; v := v || jsonb_build_object('photo_files_due', n);
  if n > 0 then
    insert into public.jobs (kind, location_id, dedupe_key) values ('photo_files', null, 'photo_files')
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing;
  end if;

  delete from public.deletion_log where deleted_at < now() - make_interval(days => d_log);
  get diagnostics n = row_count; v := v || jsonb_build_object('deletion_log', n);

  -- Scope 1 (30.19): a WhatsApp message is deleted 12 months after it was sent (received, for an incoming one).
  -- Nothing younger is touched. The outbox needs no block: private.whatsapp_tick() already deletes its rows after 30 days
  -- and clear_sent_alert_texts() blanks a sent text after one day, both sooner than 12 months.
  delete from public.whatsapp_messages where created_at < now() - interval '12 months';
  get diagnostics n = row_count; v := v || jsonb_build_object('whatsapp_messages', n);

  return v;
end $$;
revoke all on function private.retention_sources_apply() from public, anon, authenticated;
