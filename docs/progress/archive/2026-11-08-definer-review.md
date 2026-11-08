# Definer review, 8 Nov 2026 (R-126)

Branch `claude/definer-review`. Lane R decision R-126: the Supabase security advisor showed 123 SECURITY DEFINER functions executable by `authenticated`, one by `anon` (`suggest_take`) and 59 tables with RLS on and no policy. Budget: no paid call, no model call, no Google call, no WhatsApp send.

## What was found

- 457 SECURITY DEFINER functions in `public` (320) and `private` (137). Nothing in `private` is executable by `anon` or `authenticated` (and the schema has no usage grant). Outside `public` and `private` the only definer functions are Supabase's own (`storage`, `vault`, `pgbouncer`), none executable by the browser roles.
- The 123 that `authenticated` could run matched the repo's list in `supabase/tests/rls_functions.sql` exactly (no drift between the repo and production).
- 119 of them have a caller: a page in `src/` (115), an RLS policy (`is_member`, `has_location_role`, `is_org_member`, `can_see`, `is_staff`) or a computed column the Posts page selects (`photo_sig`).
- 4 had no caller anywhere: `staff_contacts`, `staff_founding_matches`, `set_protection_autofix` (revoked, below) and `staff_set_google_writes` (kept, below).
- `suggest_take` is anon's one exception (30.39 item 11). It refuses every call without the 64-character route key from Vault (`public.internal_secret('suggest_route_key')`), checks the visitor id format and the limits' ranges, and returns only `allowed` and `reason`; it reads no business, review or person. The kabsi.co route `/api/suggest` (`src/server/suggest-deps.ts`) is its only caller. It leaks nothing beyond what the public /scan page shows (the suggestions themselves come from the Edge Function, never from this function).
- Each of the 119 bodies was read by an independent agent for the caller check and the business of the row it acts on. No function lets a member of one business read or change another: every function that takes a row id (review, report, task, invite, card code, prompt, style offer, knowledge question, notification ids) reads that row's own business and checks the caller's role on it. The design questions it raised are listed under Decisions to confirm; none is a cross-business hole.

## What changed

Migration `supabase/migrations/<version>_definer_review.sql` (applied with apply_migration, read back below):

1. `revoke execute ... from public, anon, authenticated` on `staff_contacts(integer)`, `staff_founding_matches(uuid)` and `set_protection_autofix(uuid,text,boolean,text)`. The service role keeps them. A page that later calls one grants it back in its own migration with its allowlist line.
2. `revoke all on public.action_tokens from anon, authenticated`: the one no-policy table that still granted SELECT, REFERENCES and TRIGGER to `authenticated` (no row could pass RLS; the grant had no use). No view or invoker function reads it.

Tests:

- `supabase/tests/_definer_allowlist.psql`: the reviewed allowlist, one line per role and function with its reason and its caller (120 for `authenticated`, 1 for `anon`).
- `supabase/tests/definer_allowlist.sql` (new): fails when any SECURITY DEFINER function in any app schema (every schema but the ones Supabase and Postgres manage, so a new schema is covered) is executable by `anon` or `authenticated` without its allowlist line; fails on a stale line; anon's only line is `suggest_take`; the three revoked stay revoked; and the owner of business B is refused by `set_routine_delivery` and told nothing by `my_setup_link_emailed` on business A (both had only a stranger test before), with a control on B's own business.
- `rls_functions.sql` reads its list from the allowlist (one place); its non-member test per function is unchanged. `sec1_tenant_matrix.sql` keeps running every owner call as the owner, manager and staff of the other business and as Kabsi staff.
- `protection_autofix.sql` and `sec1_roles_approvals.sql` grant the revoked function back inside their own rolled-back transaction, so the rules a future page relies on stay tested. Listed for lane R as a test change.

## Inventory (part A)

One row per SECURITY DEFINER function in `public` and `private`, read from production on 8 Nov 2026. "Called by": browser = a file in `src/` (path without `src/`); Vercel route = `src/server/`; Edge = a function in `supabase/functions/`; trigger; cron = `cron.job`; RLS policies = how many policies call it; SQL = other functions whose body calls it. "Check" is for the functions the browser roles can run: staff admin (`private.is_staff_admin()`), `is_staff()` (admin staff rows only), installer (`private.is_installer()`), membership or role of the business (`has_location_role`, `is_member`, `can_see`, `feature_access` or `entitlements`, which raise for a non-member), the caller's own rows (`auth.uid()`), or the route key. "Writes" is a text match for insert, update or delete in the body.

| Schema | Function | EXECUTE before | EXECUTE after | Called by | Writes | Check |
|---|---|---|---|---|---|---|
| private | private.action_link_needs_sign_in(text,text,text) | none | none | SQL: action_link_view use_action_link | no | n/a: no API grant |
| private | private.activation_rows() | none | none | SQL: private.cohort_figures slow_start_due staff_activation | no | n/a: no API grant |
| private | private.ai_visibility_answers_guard() | none | none | trigger on ai_visibility_answers | no | n/a: no API grant |
| private | private.ai_visibility_tick() | none | none | cron: kabsi_ai_visibility_tick | no | n/a: no API grant |
| private | private.approval_policy(uuid,text) | none | none | SQL: list_team private.may_approve set_approval_policy | no | n/a: no API grant |
| private | private.audit(text,uuid,text,uuid,text,text,jsonb,jsonb,text,text,uuid) | none | none | Edge: _shared api coach content; SQL: answer_knowledge_confirm answer_style_offer approve_backlog +44 | yes | n/a: no API grant |
| private | private.audit_actor() | none | none | SQL: private.audit_concierge_task private.audit_location private.audit_member +1 | no | n/a: no API grant |
| private | private.audit_concierge_task() | none | none | trigger on concierge_tasks | yes | n/a: no API grant |
| private | private.audit_growth_event() | none | none | trigger on audit_events | no | n/a: no API grant |
| private | private.audit_location() | none | none | trigger on locations | no | n/a: no API grant |
| private | private.audit_member() | none | none | trigger on location_members,organization_members | yes | n/a: no API grant |
| private | private.audit_product_event() | none | none | trigger on audit_events | no | n/a: no API grant |
| private | private.audit_profile_change() | none | none | trigger on profile_changes | yes | n/a: no API grant |
| private | private.audit_publication() | none | none | trigger on publications | yes | n/a: no API grant |
| private | private.audit_review() | none | none | trigger on reviews | yes | n/a: no API grant |
| private | private.billing_events_partner_ledger() | none | none | trigger on billing_events | no | n/a: no API grant |
| private | private.clear_sent_alert_texts() | none | none | SQL: private.retention_sources | yes | n/a: no API grant |
| private | private.coach_status(uuid) | none | none | SQL: coach_checklist private.coach_tasks | no | n/a: no API grant |
| private | private.coach_tasks(uuid) | none | none | SQL: private.detect_profile_gaps | no | n/a: no API grant |
| private | private.cohort_figures(text) | none | none | SQL: staff_validation | no | n/a: no API grant |
| private | private.concierge_daily_tasks() | service_role | service_role | cron: kabsi_concierge_daily | yes | n/a: no API grant |
| private | private.concierge_overdue_alerts() | service_role | service_role | cron: kabsi_concierge_overdue | no | n/a: no API grant |
| private | private.creem_plan_price(text,text) | none | none | SQL: private.money_figures | no | n/a: no API grant |
| private | private.decision_delete_after() | none | none | trigger on founding_applications,partner_accounts | no | n/a: no API grant |
| private | private.detect_access_lost(uuid) | none | none | SQL: private.tasks_on_change run_task_detectors | no | n/a: no API grant |
| private | private.detect_expiring_plan(uuid) | none | none | SQL: run_task_detectors | no | n/a: no API grant |
| private | private.detect_failed_publishes(uuid) | none | none | SQL: private.tasks_on_change run_task_detectors | yes | n/a: no API grant |
| private | private.detect_holidays(uuid) | none | none | SQL: run_task_detectors | yes | n/a: no API grant |
| private | private.detect_knowledge_confirms(uuid) | none | none | SQL: private.tasks_on_change run_task_detectors | no | n/a: no API grant |
| private | private.detect_photo_drafts(uuid) | none | none | SQL: private.tasks_on_change run_task_detectors | yes | n/a: no API grant |
| private | private.detect_post_drafts(uuid) | none | none | SQL: private.tasks_on_change run_task_detectors | yes | n/a: no API grant |
| private | private.detect_profile_changes(uuid) | none | none | SQL: private.tasks_on_change run_task_detectors | no | n/a: no API grant |
| private | private.detect_profile_gaps(uuid) | none | none | SQL: run_task_detectors | no | n/a: no API grant |
| private | private.detect_review_tasks(uuid) | none | none | SQL: private.tasks_on_change run_task_detectors | no | n/a: no API grant |
| private | private.disconnect_location(uuid,text,uuid,text) | none | none | SQL: private.trial_sweep request_disconnect | yes | n/a: no API grant |
| private | private.dispatch_tick() | none | none | cron: kabsi_dispatch | yes | n/a: no API grant |
| private | private.end_expired_plans() | service_role | service_role | cron: kabsi_plans_expiry | yes | n/a: no API grant |
| private | private.entitled(uuid,text) | none | none | SQL: approve_publication claim_publication private.monthly_update_candidates +1 | no | n/a: no API grant |
| private | private.entitlements(uuid,uuid) | none | none | Edge: _shared api assistant visibility; SQL: ai_budget_take entitlements lifecycle_snapshots +9 | no | n/a: no API grant |
| private | private.fact_for_owner(uuid) | none | none | SQL: confirm_fact reject_fact remove_fact | no | n/a: no API grant |
| private | private.feature_plan(uuid) | none | none | SQL: care_report_inputs coach_read_due feature_access +5 | no | n/a: no API grant |
| private | private.first_task_done() | none | none | Edge: _shared; trigger on publications | yes | n/a: no API grant |
| private | private.founding_days(uuid) | none | none | SQL: private.entitlements private.start_trial private.trial_take | no | n/a: no API grant |
| private | private.founding_places_left_in(text) | none | none | SQL: billing_checkout_family founding_places_left | no | n/a: no API grant |
| private | private.founding_places_taken_in(text) | none | none | SQL: founding_places_taken private.founding_places_left_in | no | n/a: no API grant |
| private | private.founding_tick() | none | none | SQL: private.programs_daily | no | n/a: no API grant |
| private | private.google_circuit() | none | none | SQL: google_gate | yes | n/a: no API grant |
| private | private.google_writes_paused() | service_role | service_role | SQL: claim_publication google_writes_paused | no | n/a: no API grant |
| private | private.holiday_answer(uuid,uuid,text,text,text,text,date,date) | none | none | Edge: content; SQL: answer_holiday_as use_holiday_link | yes | n/a: no API grant |
| private | private.internal_user(uuid) | none | none | SQL: private.product_event private.subscription_product_event | no | n/a: no API grant |
| private | private.is_installer() | none | none | SQL: activate_card set_card_active | no | n/a: no API grant |
| private | private.is_staff_admin() | none | none | SQL: staff_founding_matches staff_set_google_writes | no | n/a: no API grant |
| private | private.job_stopped(jobs) | none | none | SQL: claim_jobs finish_job | no | n/a: no API grant |
| private | private.jobs_skip_disconnected() | none | none | trigger on jobs | no | n/a: no API grant |
| private | private.listing_change_mirror() | none | none | trigger on listing_changes | yes | n/a: no API grant |
| private | private.listing_change_supersede() | none | none | trigger on listing_changes | yes | n/a: no API grant |
| private | private.location_member_sync_org() | none | none | trigger on location_members | yes | n/a: no API grant |
| private | private.location_set_organization() | none | none | trigger on locations | no | n/a: no API grant |
| private | private.location_sync_card_facts() | none | none | trigger on locations | yes | n/a: no API grant |
| private | private.location_sync_tenancy() | none | none | trigger on locations | yes | n/a: no API grant |
| private | private.location_via_code() | none | none | trigger on locations | no | n/a: no API grant |
| private | private.locations_partner_attribute() | none | none | trigger on locations | no | n/a: no API grant |
| private | private.log_deletion() | none | none | trigger on chat_conversations,contacts,founding_applications,free_check_waitlist,locations,partner_accounts,profile_check_whatsapp | yes | n/a: no API grant |
| private | private.mark_access_removed(uuid,text,uuid,text) | none | none | SQL: record_disconnect_result staff_complete_followup | yes | n/a: no API grant |
| private | private.may_approve(uuid,text,uuid,boolean) | none | none | SQL: apply_profile_field apply_regular_hours approve_backlog +12 | no | n/a: no API grant |
| private | private.money_figures() | none | none | SQL: staff_validation | no | n/a: no API grant |
| private | private.monthly_update_candidates() | none | none | SQL: private.review_growth_due whatsapp_monthly_due | no | n/a: no API grant |
| private | private.move_demo_login(text) | none | none | none found | yes | n/a: no API grant |
| private | private.offer_care_posts() | none | none | cron: kabsi_care_posts | no | n/a: no API grant |
| private | private.offer_every(text,interval,interval) | none | none | SQL: private.produce_jobs | yes | n/a: no API grant |
| private | private.onboarding_facts(uuid) | none | none | Edge: _shared api; SQL: onboarding_due onboarding_facts onboarding_status | no | n/a: no API grant |
| private | private.onboarding_nudges() | none | none | cron: kabsi_onboarding_nudges | yes | n/a: no API grant |
| private | private.ops_watchdog() | service_role | service_role | cron: kabsi_ops_watchdog | no | n/a: no API grant |
| private | private.org_account_keys(uuid) | none | none | SQL: private.entitlements private.start_trial | no | n/a: no API grant |
| private | private.outbound_on_event() | none | none | trigger on outbound_events | no | n/a: no API grant |
| private | private.outbound_on_message() | none | none | trigger on outbound_messages | no | n/a: no API grant |
| private | private.outbound_retention() | none | none | cron: kabsi_outbound_retention | yes | n/a: no API grant |
| private | private.outbound_tally(date,text,integer) | none | none | SQL: private.outbound_on_event private.outbound_on_message | yes | n/a: no API grant |
| private | private.outbox_growth_event() | none | none | trigger on whatsapp_outbox | no | n/a: no API grant |
| private | private.owner_organization(uuid,text,boolean) | none | none | SQL: private.location_set_organization | yes | n/a: no API grant |
| private | private.partner_attribute(uuid) | none | none | SQL: private.locations_partner_attribute private.programs_daily | yes | n/a: no API grant |
| private | private.partner_ledger_event(bigint) | none | none | SQL: private.billing_events_partner_ledger | yes | n/a: no API grant |
| private | private.partner_payout_run(date) | none | none | cron: kabsi_partner_payout_run; SQL: staff_payout_run | yes | n/a: no API grant |
| private | private.partner_self_reason(uuid,uuid) | none | none | SQL: private.partner_attribute private.partner_ledger_event private.partner_trial_days | no | n/a: no API grant |
| private | private.partner_trial_days(uuid) | none | none | SQL: private.start_trial | no | n/a: no API grant |
| private | private.phone_role_growth_event() | none | none | trigger on phone_roles | no | n/a: no API grant |
| private | private.phone_role_staff_admin_only() | none | none | trigger on phone_roles | no | n/a: no API grant |
| private | private.photo_counts(uuid) | none | none | SQL: private.coach_status private.photo_gap_tasks | no | n/a: no API grant |
| private | private.photo_gap_tasks(uuid) | none | none | SQL: private.detect_profile_gaps | no | n/a: no API grant |
| private | private.photo_intake(uuid,text,text,uuid) | none | none | SQL: add_photo photo_upload | yes | n/a: no API grant |
| private | private.photo_posts_left(uuid) | none | none | SQL: whatsapp_photo_post_prepare | no | n/a: no API grant |
| private | private.places_autocomplete_cap() | none | none | SQL: places_take | no | n/a: no API grant |
| private | private.places_cap() | none | none | Edge: _shared; SQL: places_take | no | n/a: no API grant |
| private | private.post_answers_question() | none | none | trigger on gbp_posts | yes | n/a: no API grant |
| private | private.post_photo_sig(uuid) | none | none | SQL: approve_publication photo_sig private.whatsapp_item | no | n/a: no API grant |
| private | private.produce_jobs() | none | none | SQL: private.dispatch_tick | yes | n/a: no API grant |
| private | private.product_event(text,uuid,uuid,jsonb,text) | none | none | SQL: private.audit_growth_event private.audit_product_event private.outbox_growth_event +5 | yes | n/a: no API grant |
| private | private.profile_daily() | none | none | cron: kabsi_profile_daily | yes | n/a: no API grant |
| private | private.programs_daily() | none | none | cron: kabsi_programs_daily | no | n/a: no API grant |
| private | private.publication_verified_at() | none | none | trigger on publications | no | n/a: no API grant |
| private | private.purge_after_leaving() | none | none | cron: kabsi_purge_after_leaving | yes | n/a: no API grant |
| private | private.purge_ai_expired() | none | none | cron: kabsi_purge_ai_expired | yes | n/a: no API grant |
| private | private.purge_free_check_waitlist() | none | none | cron: kabsi_purge_free_check_waitlist | yes | n/a: no API grant |
| private | private.purge_free_checks() | none | none | cron: kabsi_purge_free_checks | yes | n/a: no API grant |
| private | private.purge_old_chats() | service_role | service_role | cron: kabsi_chat_retention | yes | n/a: no API grant |
| private | private.purge_places_cache() | none | none | cron: kabsi_places_cache_purge | yes | n/a: no API grant |
| private | private.purge_visibility_after_leaving() | none | none | cron: kabsi_purge_visibility | yes | n/a: no API grant |
| private | private.rate_take(text,integer,interval,boolean) | none | none | SQL: google_gate | yes | n/a: no API grant |
| private | private.reapply_deletions(jsonb) | none | none | none found | yes | n/a: no API grant |
| private | private.record_precheck() | none | none | trigger on free_checks | yes | n/a: no API grant |
| private | private.retention_days(text) | none | none | SQL: photo_processed private.profile_daily private.purge_after_leaving +3 | no | n/a: no API grant |
| private | private.retention_sources() | none | none | cron: kabsi_retention_sources | yes | n/a: no API grant |
| private | private.retention_sources_apply() | none | none | SQL: private.retention_sources | yes | n/a: no API grant |
| private | private.review_growth_due() | none | none | SQL: private.whatsapp_tick | no | n/a: no API grant |
| private | private.run_retention() | service_role | service_role | cron: kabsi_retention | yes | n/a: no API grant |
| private | private.scenario_resolve_on_access() | none | none | trigger on google_connections | yes | n/a: no API grant |
| private | private.send_product_events() | none | none | cron: kabsi_product_events | yes | n/a: no API grant |
| private | private.start_trial(uuid,integer) | none | none | SQL: grant_trial_if_eligible staff_founding_link | yes | n/a: no API grant |
| private | private.subscription_insert_event() | none | none | trigger on subscriptions | no | n/a: no API grant |
| private | private.subscription_product_event() | none | none | trigger on subscriptions | no | n/a: no API grant |
| private | private.subscriptions_keep_newest() | none | none | trigger on subscriptions | no | n/a: no API grant |
| private | private.sync_card_facts(uuid,uuid) | none | none | SQL: private.location_sync_card_facts | yes | n/a: no API grant |
| private | private.task_close_except(uuid,text,text[],jsonb,text) | none | none | SQL: private.detect_access_lost private.detect_expiring_plan private.detect_knowledge_confirms +4 | yes | n/a: no API grant |
| private | private.task_put(uuid,text,text,text,text,text,text,text,jsonb,jsonb,text,text,uuid) | none | none | SQL: ai_answer_finding category_task_from_scan post_question +13 | yes | n/a: no API grant |
| private | private.tasks_on_change() | none | none | trigger on gbp_posts,google_connections,knowledge_confirms,photos,profile_changes,publications,reviews | no | n/a: no API grant |
| private | private.trial_blocked(uuid) | none | none | SQL: grant_trial_if_eligible private.onboarding_nudges | no | n/a: no API grant |
| private | private.trial_sweep() | none | none | cron: kabsi_trial_sweep | yes | n/a: no API grant |
| private | private.trial_take(uuid,text,text) | none | none | SQL: approve_publication | yes | n/a: no API grant |
| private | private.user_product_event() | none | none | trigger on auth.users | no | n/a: no API grant |
| private | private.v4_whatsapp_due() | none | none | SQL: private.whatsapp_tick | no | n/a: no API grant |
| private | private.visibility_tick() | none | none | cron: kabsi_visibility_tick | no | n/a: no API grant |
| private | private.whatsapp_item(text,uuid) | none | none | SQL: whatsapp_action_create whatsapp_approve whatsapp_open_items | no | n/a: no API grant |
| private | private.whatsapp_member_roles(text,uuid) | none | none | SQL: whatsapp_bind | yes | n/a: no API grant |
| private | private.whatsapp_membership_sync() | none | none | trigger on location_members | yes | n/a: no API grant |
| private | private.whatsapp_phone_tz(text) | none | none | SQL: whatsapp_send_state | no | n/a: no API grant |
| private | private.whatsapp_task_wake() | none | none | trigger on tasks | yes | n/a: no API grant |
| private | private.whatsapp_tick() | none | none | cron: kabsi_whatsapp_tick | yes | n/a: no API grant |
| public | action_link_view(text,uuid) | service_role | service_role | Edge: api | no | n/a: no API grant |
| public | activate_card(text,uuid,text) | authenticated, service_role | authenticated, service_role | browser: lib/onboarding.ts | yes | is_staff(), installer, membership/role |
| public | activity_feed(uuid,integer) | authenticated, service_role | authenticated, service_role | browser: lib/home.ts lib/read-timeout.ts | no | is_staff(), membership/role |
| public | add_photo(uuid,text) | authenticated, service_role | authenticated, service_role | browser: lib/photos.ts | no | membership/role |
| public | advance_review_report(uuid,text) | authenticated, service_role | authenticated, service_role | browser: lib/review-report.ts | yes | membership/role |
| public | ai_agent_usage_add(uuid,text,text,bigint,bigint,bigint,bigint,bigint) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | ai_answer_finding(uuid,jsonb,text[]) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | ai_budget_take(uuid) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | ai_usage_add(uuid,bigint,bigint) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | ai_visibility_spend(integer) | service_role | service_role | none found | no | n/a: no API grant |
| public | answer_holiday_as(uuid,uuid,text,text,text,date,date) | service_role | service_role | Edge: content | no | n/a: no API grant |
| public | answer_knowledge_confirm(uuid,text) | authenticated, service_role | authenticated, service_role | browser: lib/knowledge.ts | yes | membership/role |
| public | answer_style_offer(uuid,boolean) | authenticated, service_role | authenticated, service_role | browser: lib/reviews.ts | yes | membership/role |
| public | apply_profile_field(uuid,uuid,text,text,text,jsonb) | service_role | service_role | Edge: coach | yes | n/a: no API grant |
| public | apply_regular_hours(uuid,uuid,text,text,jsonb) | service_role | service_role | Edge: content | yes | n/a: no API grant |
| public | apply_unsubscribe(text,uuid,text) | service_role | service_role | Edge: email | yes | n/a: no API grant |
| public | approve_backlog(uuid,jsonb) | authenticated, service_role | authenticated, service_role | browser: lib/backlog.ts | yes | membership/role |
| public | approve_publication(text,uuid,jsonb,uuid,text,integer) | service_role | service_role | Edge: _shared content; SQL: apply_profile_field apply_regular_hours approve_backlog +5 | yes | n/a: no API grant |
| public | approve_publication(text,uuid,text,uuid,text,integer) | service_role | service_role | Edge: _shared content; SQL: apply_profile_field apply_regular_hours approve_backlog +4 | no | n/a: no API grant |
| public | attach_free_check(uuid,text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | billing_checkout_family(uuid,text,text,text,text,uuid) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | billing_extras_sync(uuid) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | billing_owner_contacts(uuid) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | block_reply_draft(uuid,text,text,text[]) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | call_internal(text,jsonb) | service_role | service_role | cron: kabsi_chat_reports kabsi_health_jobs kabsi_outbound_prepare kabsi_whatsapp_health kabsi_staff_digest kabsi_outbound_send kabsi_outbound_inbox; SQL: cards_kv_sync private.ai_visibility_tick private.dispatch_tick +3 | no | n/a: no API grant |
| public | can_see(uuid,text) | authenticated, service_role | authenticated, service_role | RLS policies: 21 | no | membership/role |
| public | cancel_location_deletion(uuid) | authenticated, service_role | authenticated, service_role | browser: routes/_authenticated/app/settings.tsx | yes | membership/role |
| public | cancel_team_invite(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/team.ts | yes | membership/role |
| public | cards_kv_sync() | service_role | service_role | trigger on cards | yes | n/a: no API grant |
| public | care_report_inputs(uuid,timestamp with time zone,timestamp with time zone,text) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | category_task_from_scan(uuid) | service_role | service_role | Edge: visibility | yes | n/a: no API grant |
| public | choose_plan(uuid,text) | authenticated, service_role | authenticated, service_role | browser: lib/onboarding.ts | yes | membership/role |
| public | claim_free_check(uuid,text) | authenticated, service_role | authenticated, service_role | browser: lib/onboarding.ts | yes | membership/role |
| public | claim_jobs(integer,text) | service_role | service_role | Edge: api | yes | n/a: no API grant |
| public | claim_publication(uuid) | service_role | service_role | Edge: _shared api | yes | n/a: no API grant |
| public | claim_publication_check(uuid) | service_role | service_role | Edge: api | yes | n/a: no API grant |
| public | claim_team_invites() | authenticated, service_role | authenticated, service_role | browser: routes/_authenticated/app/index.tsx | yes | membership/role |
| public | clean_ai_text() | service_role | service_role | trigger on gbp_posts,reply_drafts | no | n/a: no API grant |
| public | clear_access_lost() | service_role | service_role | trigger on locations | no | n/a: no API grant |
| public | clear_old_report_numbers() | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | clear_onboarding_scenario(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/onboarding.ts | yes | membership/role |
| public | coach_checklist(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/coach.ts lib/read-timeout.ts | no | membership/role |
| public | coach_profile_put(uuid,integer,integer,integer,text) | service_role | service_role | Edge: api | yes | n/a: no API grant |
| public | coach_read_due(uuid) | service_role | service_role | Edge: api | no | n/a: no API grant |
| public | coach_read_failed(uuid,text) | service_role | service_role | Edge: api | yes | n/a: no API grant |
| public | coach_site_check_put(uuid,text,integer,jsonb) | service_role | service_role | Edge: coach | yes | n/a: no API grant |
| public | concierge_cap_guard() | service_role | service_role | trigger on locations | yes | n/a: no API grant |
| public | concierge_unbilled(uuid) | service_role | service_role | SQL: plan_summary private.entitlements | no | n/a: no API grant |
| public | confirm_business(uuid) | authenticated, service_role | authenticated, service_role | browser: components/onboarding/stages.tsx lib/onboarding.ts | yes | membership/role |
| public | confirm_business_details(uuid,jsonb) | authenticated, service_role | authenticated, service_role | browser: lib/confirm-details.ts | yes | membership/role |
| public | confirm_fact(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/knowledge.ts | yes | auth.uid() own rows |
| public | confirm_monthly_facts(uuid,uuid,text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | create_review_link(uuid,text) | authenticated, service_role | authenticated, service_role | browser: routes/_authenticated/app/cards.tsx | yes | membership/role |
| public | decide_profile_change(uuid,text,uuid,text) | service_role | service_role | Edge: _shared; SQL: protection_autofix use_action_link whatsapp_approve | yes | n/a: no API grant |
| public | delete_location_now(uuid) | service_role | service_role | Edge: api | yes | n/a: no API grant |
| public | demo_login_email() | service_role | service_role | SQL: email_allowed_for_location is_demo_login is_demo_user +1 | no | n/a: no API grant |
| public | draft_facts(uuid,text) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | email_allowed_for_location(uuid,text) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | enqueue_job(text,uuid,text,jsonb,timestamp with time zone) | service_role | service_role | Edge: _shared api; SQL: approve_publication invite_team_member private.disconnect_location +7 | yes | n/a: no API grant |
| public | entitlements(uuid,uuid) | authenticated, service_role | authenticated, service_role | browser: components/home/action-center.tsx components/layouts/app-layout.tsx lib/entitlements.ts +5; Edge: _shared api assistant visibility; SQL: ai_budget_take lifecycle_snapshots plan_summary +8 | no | is_staff(), membership/role |
| public | feature_access(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/feature-access.ts lib/read-timeout.ts; Edge: _shared coach insights review-graphic; SQL: coach_checklist start_review_report | no | is_staff(), membership/role |
| public | finish_job(bigint,text,boolean,text,boolean) | service_role | service_role | Edge: api | yes | n/a: no API grant |
| public | first_replies_on_google(uuid[]) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | first_task_candidates(uuid) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | founding_apply(jsonb) | service_role | service_role | Edge: programs | yes | n/a: no API grant |
| public | founding_places() | service_role | service_role | Edge: programs; SQL: staff_founding_decide staff_founding_overview | no | n/a: no API grant |
| public | founding_places_left() | service_role | service_role | Edge: billing-creem | no | n/a: no API grant |
| public | founding_places_taken() | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | give_back_rate_limit(text) | service_role | service_role | Edge: profile-snapshot | yes | n/a: no API grant |
| public | google_failure() | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | google_gate(text) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | google_mode() | authenticated, service_role | authenticated, service_role | browser: components/shared/test-mode-banner.tsx lib/onboarding.ts lib/read-timeout.ts; Edge: api; SQL: private.produce_jobs staff_concierge_convert staff_job_health +1 | no | none (returns a setting only) |
| public | google_writes_paused() | service_role | service_role | SQL: claim_publication | no | n/a: no API grant |
| public | grant_trial_if_eligible(uuid,boolean,integer) | service_role | service_role | SQL: staff_concierge_mark_posted staff_grant_trial start_paid_plans | no | n/a: no API grant |
| public | handle_review_offline(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/reviews.ts | yes | membership/role |
| public | has_location_role(uuid,text[]) | authenticated, service_role | authenticated, service_role | RLS policies: 3; SQL: activate_card activity_feed add_photo +47 | no | membership/role |
| public | hit_rate_limit(text,integer,integer) | service_role | service_role | Edge: _shared; SQL: activate_card suggest_take | yes | n/a: no API grant |
| public | holiday_calendar(uuid,integer) | authenticated, service_role | authenticated, service_role | browser: lib/holidays.ts lib/read-timeout.ts | no | membership/role |
| public | holiday_link_view(text) | service_role | service_role | Edge: api | no | n/a: no API grant |
| public | holiday_prompts_to_send(uuid) | service_role | service_role | Edge: api | no | n/a: no API grant |
| public | internal_secret(text) | service_role | service_role | Edge: _shared email google-capture health +1; SQL: call_internal suggest_take | no | n/a: no API grant |
| public | invitation_lookup_claim(text) | service_role | service_role | Edge: api | yes | n/a: no API grant |
| public | invitation_lookup_release(text) | service_role | service_role | Edge: api | yes | n/a: no API grant |
| public | invitation_lookup_save(text,text,text) | service_role | service_role | Edge: api | yes | n/a: no API grant |
| public | invite_team_member(uuid,text,text) | authenticated, service_role | authenticated, service_role | browser: lib/team.ts | yes | membership/role |
| public | is_demo_location(uuid) | service_role | service_role | SQL: email_allowed_for_location private.product_event private.subscription_product_event +2 | no | n/a: no API grant |
| public | is_demo_login(text) | service_role | service_role | none found | no | n/a: no API grant |
| public | is_demo_user(uuid) | service_role | service_role | none found | no | n/a: no API grant |
| public | is_member(uuid) | authenticated, service_role | authenticated, service_role | RLS policies: 12; SQL: feature_access handle_review_offline holiday_calendar +5 | no | membership/role |
| public | is_org_member(uuid,text[]) | authenticated, service_role | authenticated, service_role | RLS policies: 3 | no | membership/role |
| public | is_staff() | authenticated, service_role | authenticated, service_role | browser: components/auth/auth-provider.tsx lib/read-timeout.ts lib/reviews.ts; RLS policies: 57; SQL: activate_card activity_feed ai_visibility_spend +50 | no | is_staff() |
| public | lifecycle_snapshots(timestamp with time zone) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | list_my_notifications(uuid,integer) | authenticated, service_role | authenticated, service_role | browser: lib/notifications.ts lib/read-timeout.ts | no | membership/role |
| public | list_review_reports(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/read-timeout.ts lib/review-report.ts | no | is_staff(), membership/role |
| public | list_tasks(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/read-timeout.ts lib/tasks.ts; Edge: _shared assistant | no | is_staff(), membership/role |
| public | list_team(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/team.ts | no | membership/role |
| public | location_member_recipients(uuid) | service_role | service_role | Edge: api | no | n/a: no API grant |
| public | location_owner_emails(uuid) | service_role | service_role | none found | no | n/a: no API grant |
| public | manager_steps_target(uuid,uuid) | service_role | service_role | Edge: api | no | n/a: no API grant |
| public | mark_access_lost(uuid) | service_role | service_role | Edge: api | yes | n/a: no API grant |
| public | mark_holiday_prompt_sent(uuid,text,timestamp with time zone) | service_role | service_role | Edge: api | yes | n/a: no API grant |
| public | mark_notifications_read(uuid,uuid[]) | authenticated, service_role | authenticated, service_role | browser: lib/notifications.ts | yes | membership/role |
| public | mock_google_reply(text,text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | mock_listing_send(text,text,jsonb) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | mock_listing_set(text,text,jsonb) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | my_access(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/team.ts | no | membership/role |
| public | my_notification_prefs(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/notifications.ts lib/read-timeout.ts | no | membership/role |
| public | my_setup_link_emailed(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/onboarding.ts | no | membership/role |
| public | notification_recipients(uuid,text[]) | service_role | service_role | Edge: _shared api; SQL: lifecycle_snapshots private.onboarding_nudges | no | n/a: no API grant |
| public | onboarding_claim(uuid,text,jsonb) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | onboarding_due(integer) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | onboarding_facts(uuid) | service_role | service_role | Edge: _shared api; SQL: onboarding_due onboarding_status | no | n/a: no API grant |
| public | onboarding_resume(text) | service_role | service_role | Edge: api | no | n/a: no API grant |
| public | onboarding_setup_ok(uuid,uuid) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | onboarding_status(uuid) | authenticated, service_role | authenticated, service_role | browser: components/kabsi/d3-content-task.tsx components/kabsi/d3-settings-parts.tsx lib/home.ts +2 | yes | membership/role |
| public | ops_app_url() | service_role | service_role | SQL: ops_on_chat ops_staff_btn | no | n/a: no API grant |
| public | ops_claim(integer) | service_role | service_role | none found | yes | n/a: no API grant |
| public | ops_emit(text,text,text,text,jsonb,jsonb,text,text,text) | service_role | service_role | Edge: _shared api health visibility +1; SQL: ai_budget_take decide_profile_change google_failure +23 | yes | n/a: no API grant |
| public | ops_on_chat() | service_role | service_role | trigger on chat_conversations | yes | n/a: no API grant |
| public | ops_on_concierge_task() | service_role | service_role | trigger on concierge_tasks | yes | n/a: no API grant |
| public | ops_on_email() | service_role | service_role | trigger on emails | yes | n/a: no API grant |
| public | ops_on_job() | service_role | service_role | trigger on jobs_log | no | n/a: no API grant |
| public | ops_on_lead() | service_role | service_role | none found | no | n/a: no API grant |
| public | ops_on_location() | service_role | service_role | trigger on locations | yes | n/a: no API grant |
| public | ops_on_payment() | service_role | service_role | trigger on payments | no | n/a: no API grant |
| public | ops_on_plan() | service_role | service_role | trigger on plans | yes | n/a: no API grant |
| public | ops_on_publication() | service_role | service_role | trigger on publications | no | n/a: no API grant |
| public | ops_on_user() | service_role | service_role | trigger on auth.users | no | n/a: no API grant |
| public | outbound_check_stops(text) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | outbound_daily_cap(date) | service_role | service_role | none found | no | n/a: no API grant |
| public | outbound_is_suppressed(text) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | outbound_known_business(text,text) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | outbound_refresh_suppression() | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | outbound_reserve_slot(integer) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | outbound_stop(text) | service_role | service_role | Edge: _shared; SQL: outbound_check_stops | yes | n/a: no API grant |
| public | outbound_suppress(text,text,boolean) | service_role | service_role | Edge: _shared; SQL: outbound_refresh_suppression private.outbound_retention | yes | n/a: no API grant |
| public | owner_post_prepare(uuid,uuid,text,text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | partner_apply(jsonb) | service_role | service_role | Edge: programs | yes | n/a: no API grant |
| public | partner_places() | service_role | service_role | Edge: programs; SQL: staff_partners_overview | no | n/a: no API grant |
| public | photo_link_create(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/photos.ts | yes | membership/role |
| public | photo_link_location(text) | service_role | service_role | Edge: photos | no | n/a: no API grant |
| public | photo_link_revoke(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/photos.ts | yes | membership/role |
| public | photo_link_status(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/photos.ts lib/read-timeout.ts | no | membership/role |
| public | photo_processed(uuid,jsonb) | service_role | service_role | Edge: photos | yes | n/a: no API grant |
| public | photo_sig(gbp_posts) | authenticated, service_role | authenticated, service_role | browser: lib/posts.ts routes/_authenticated/app/posts.tsx; Edge: content | no | membership/role |
| public | photo_upload(uuid,text,text,uuid,text) | service_role | service_role | Edge: _shared photos | yes | n/a: no API grant |
| public | places_cache_get(text,text) | service_role | service_role | none found | no | n/a: no API grant |
| public | places_cache_put(text,text,jsonb) | service_role | service_role | none found | yes | n/a: no API grant |
| public | places_take(text) | service_role | service_role | Edge: _shared; SQL: suggest_take | yes | n/a: no API grant |
| public | plan_clock_ready(uuid) | service_role | service_role | SQL: plan_summary start_paid_plans | no | n/a: no API grant |
| public | plan_summary(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/plans.ts lib/read-timeout.ts | no | is_staff(), membership/role |
| public | plans_v2_on() | service_role | service_role | SQL: plan_summary | no | n/a: no API grant |
| public | post_month_plan(uuid,text) | service_role | service_role | Edge: api content | no | n/a: no API grant |
| public | post_prepare(uuid,text,text,uuid,jsonb) | service_role | service_role | Edge: api | yes | n/a: no API grant |
| public | post_question(uuid,text,text) | service_role | service_role | Edge: api | no | n/a: no API grant |
| public | postpone_job(bigint,text,timestamp with time zone,text) | service_role | service_role | Edge: api | yes | n/a: no API grant |
| public | propose_fact(uuid,text,text,jsonb,text,text,text[]) | service_role | service_role | none found | yes | n/a: no API grant |
| public | propose_monthly_facts(uuid,jsonb,text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | protection_autofix(uuid,text) | service_role | service_role | Edge: _shared; SQL: set_protection_autofix | yes | n/a: no API grant |
| public | provider_spend_add(text,integer,bigint) | service_role | service_role | Edge: _shared visibility | yes | n/a: no API grant |
| public | provider_spend_room(text,bigint) | service_role | service_role | Edge: _shared visibility | no | n/a: no API grant |
| public | publication_outcomes_due(integer) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | queue_health() | service_role | service_role | Edge: health | no | n/a: no API grant |
| public | record_disconnect_result(uuid,boolean,text) | service_role | service_role | Edge: api | yes | n/a: no API grant |
| public | record_draft_edit(uuid,uuid,text[],jsonb,text[]) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | record_google_state(uuid,jsonb,text) | service_role | service_role | Edge: api | yes | n/a: no API grant |
| public | record_product_event(text,uuid,uuid,jsonb,text) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | record_protection_check(uuid,jsonb) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | record_publication(uuid,text,text,text,text,text,jsonb,boolean) | service_role | service_role | Edge: _shared api; SQL: claim_publication | yes | n/a: no API grant |
| public | record_sync_result(uuid,boolean,text) | service_role | service_role | Edge: api | yes | n/a: no API grant |
| public | record_webhook_rejection(text,text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | refresh_location_status(uuid) | service_role | service_role | Edge: api; SQL: choose_plan mark_access_lost private.end_expired_plans +8 | yes | n/a: no API grant |
| public | reject_fact(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/knowledge.ts | yes | auth.uid() own rows |
| public | release_parked_searches() | service_role | service_role | Edge: visibility | yes | n/a: no API grant |
| public | remove_ai_prompt(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/insights.ts | yes | membership/role |
| public | remove_fact(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/knowledge.ts | yes | auth.uid() own rows |
| public | remove_member(uuid,uuid) | authenticated, service_role | authenticated, service_role | browser: lib/team.ts | yes | membership/role |
| public | rename_card(text,text) | authenticated, service_role | authenticated, service_role | browser: routes/_authenticated/app/cards.tsx | yes | membership/role |
| public | renewal_reminder_candidates() | service_role | service_role | Edge: api | no | n/a: no API grant |
| public | request_disconnect(uuid) | authenticated, service_role | authenticated, service_role | browser: routes/_authenticated/app/settings.tsx | no | membership/role |
| public | request_location_deletion(uuid) | authenticated, service_role | authenticated, service_role | browser: routes/_authenticated/app/settings.tsx | yes | membership/role |
| public | review_growth_stats(uuid,integer) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | routine_channel_of(uuid) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | routine_channel_of(uuid,text) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | run_task_detectors(uuid) | service_role | service_role | Edge: api coach | no | n/a: no API grant |
| public | save_ai_prompt(uuid,text,uuid) | authenticated, service_role | authenticated, service_role | browser: lib/insights.ts | yes | membership/role |
| public | save_consent(uuid,text) | authenticated, service_role | authenticated, service_role | browser: lib/onboarding.ts | yes | membership/role |
| public | save_fact(uuid,text,jsonb,uuid) | authenticated, service_role | authenticated, service_role | browser: lib/knowledge.ts lib/questions.ts; Edge: assistant; SQL: answer_style_offer | yes | membership/role |
| public | save_reply_draft(uuid,text,text,text,boolean,jsonb,text,text,uuid[],text,text,text[],boolean) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | save_signup_attribution(jsonb) | authenticated, service_role | authenticated, service_role | browser: lib/attribution.ts | yes | auth.uid() own rows |
| public | scenario_done(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/onboarding.ts | yes | membership/role |
| public | send_manager_steps(uuid,integer) | authenticated, service_role | authenticated, service_role | browser: lib/onboarding.ts | no | membership/role |
| public | set_approval_policy(uuid,text,text,text) | authenticated, service_role | authenticated, service_role | browser: lib/team.ts | yes | membership/role |
| public | set_auto_posts(uuid,boolean) | authenticated, service_role | authenticated, service_role | browser: lib/posts.ts | yes | membership/role |
| public | set_card_active(text,boolean) | authenticated, service_role | authenticated, service_role | browser: routes/_authenticated/app/cards.tsx | yes | is_staff(), installer, membership/role |
| public | set_member_role(uuid,uuid,text) | authenticated, service_role | authenticated, service_role | browser: lib/team.ts | yes | membership/role |
| public | set_notification_pref(uuid,text,text,text) | authenticated, service_role | authenticated, service_role | browser: lib/notifications.ts | yes | membership/role |
| public | set_onboarding_scenario(uuid,text,text) | authenticated, service_role | authenticated, service_role | browser: lib/onboarding.ts | yes | membership/role |
| public | set_onboarding_step(uuid,text) | authenticated, service_role | authenticated, service_role | browser: lib/onboarding.ts | yes | membership/role |
| public | set_post_cadence(uuid,integer) | authenticated, service_role | authenticated, service_role | browser: lib/posts.ts | yes | membership/role |
| public | set_protection_autofix(uuid,text,boolean,text) | authenticated, service_role | service_role | none found | yes | membership/role |
| public | set_review_link_mode(text,text) | authenticated, service_role | authenticated, service_role | browser: routes/_authenticated/app/cards.tsx | yes | membership/role |
| public | set_routine_channel(text) | authenticated, service_role | authenticated, service_role | browser: lib/notifications.ts | yes | auth.uid() own rows |
| public | set_routine_delivery(uuid,text) | authenticated, service_role | authenticated, service_role | browser: lib/notifications.ts | yes | membership/role |
| public | skip_review(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/reviews.ts | yes | membership/role |
| public | slow_start_due(integer) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | slow_start_release(uuid) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | special_hours_prepare(uuid,uuid,date,date,boolean,time without time zone,time without time zone,text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | staff_activation() | authenticated, service_role | authenticated, service_role | browser: components/staff/validation-panel.tsx | no | is_staff() |
| public | staff_business_diagnostics(uuid) | authenticated, service_role | authenticated, service_role | browser: components/staff/system-health-panel.tsx lib/system-health.ts | no | is_staff() |
| public | staff_chat_stats(integer) | authenticated, service_role | authenticated, service_role | browser: components/staff/chats-panel.tsx lib/read-timeout.ts | no | is_staff() |
| public | staff_chats(text,text,text,text,integer,integer) | authenticated, service_role | authenticated, service_role | browser: components/staff/chats-panel.tsx | no | is_staff() |
| public | staff_complete_followup(uuid,text) | authenticated, service_role | authenticated, service_role | browser: components/staff/followups-panel.tsx | yes | is_staff() |
| public | staff_concierge_add_review(uuid,integer,text,text,date,boolean) | authenticated, service_role | authenticated, service_role | browser: lib/concierge.ts | yes | is_staff() |
| public | staff_concierge_cancel_task(uuid,text,text) | authenticated, service_role | authenticated, service_role | browser: lib/concierge.ts | yes | is_staff() |
| public | staff_concierge_claim_task(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/concierge.ts | yes | is_staff() |
| public | staff_concierge_convert(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/concierge.ts | yes | is_staff() |
| public | staff_concierge_edit_review(uuid,integer,text,text) | service_role | service_role | none found | yes | n/a: no API grant |
| public | staff_concierge_mark_posted(uuid) | authenticated, service_role | authenticated, service_role | browser: lib/concierge.ts | yes | is_staff() |
| public | staff_concierge_queue() | authenticated, service_role | authenticated, service_role | browser: lib/concierge.ts | no | is_staff() |
| public | staff_concierge_task_done(uuid,text) | authenticated, service_role | authenticated, service_role | browser: lib/concierge.ts | yes | is_staff() |
| public | staff_contacts(integer) | authenticated, service_role | service_role | none found | no | is_staff() |
| public | staff_evidence_add(uuid,text,date,text,text,text) | authenticated, service_role | authenticated, service_role | browser: components/staff/evidence-panel.tsx | yes | is_staff() |
| public | staff_evidence_delete(uuid) | authenticated, service_role | authenticated, service_role | browser: components/staff/evidence-panel.tsx | yes | is_staff() |
| public | staff_founding_check(uuid,text,boolean,text) | authenticated, service_role | authenticated, service_role | browser: components/staff/founding-checklist.tsx | yes | is_staff() |
| public | staff_founding_checklist(uuid) | authenticated, service_role | authenticated, service_role | browser: components/staff/founding-checklist.tsx | no | is_staff() |
| public | staff_founding_decide(uuid,text,text) | authenticated, service_role | authenticated, service_role | browser: lib/programs.ts | yes | is_staff() |
| public | staff_founding_link(uuid,uuid) | authenticated, service_role | authenticated, service_role | browser: lib/programs.ts | yes | is_staff() |
| public | staff_founding_matches(uuid) | authenticated, service_role | service_role | none found | no | staff admin, membership/role |
| public | staff_founding_overview() | authenticated, service_role | authenticated, service_role | browser: lib/programs.ts | no | is_staff() |
| public | staff_grant_trial(uuid,integer) | authenticated, service_role | authenticated, service_role | browser: components/staff/businesses-panel.tsx | no | is_staff() |
| public | staff_job_cancel(bigint) | authenticated, service_role | authenticated, service_role | browser: components/staff/system-health-panel.tsx | yes | is_staff() |
| public | staff_job_health() | authenticated, service_role | authenticated, service_role | browser: components/staff/ops-panel.tsx lib/read-timeout.ts | no | is_staff() |
| public | staff_job_retry(bigint) | authenticated, service_role | authenticated, service_role | browser: components/staff/system-health-panel.tsx | yes | is_staff() |
| public | staff_mock_listing_edit(uuid,text,text) | authenticated, service_role | authenticated, service_role | browser: routes/_authenticated/app/shield.tsx | yes | is_staff() |
| public | staff_mock_review(uuid,integer,text,text) | authenticated, service_role | authenticated, service_role | browser: lib/reviews.ts | yes | is_staff() |
| public | staff_operations() | authenticated, service_role | authenticated, service_role | browser: components/staff/operations-panel.tsx | no | is_staff() |
| public | staff_outbound_approve(uuid) | authenticated, service_role | authenticated, service_role | browser: components/staff/outbound-panel.tsx; SQL: staff_outbound_approve_all | yes | is_staff() |
| public | staff_outbound_approve_all(uuid[]) | authenticated, service_role | authenticated, service_role | browser: components/staff/outbound-panel.tsx | no | is_staff() |
| public | staff_outbound_edit(uuid,text,text) | authenticated, service_role | authenticated, service_role | browser: components/staff/outbound-panel.tsx | yes | is_staff() |
| public | staff_outbound_reply_done(bigint) | authenticated, service_role | authenticated, service_role | browser: components/staff/outbound-panel.tsx | yes | is_staff() |
| public | staff_outbound_skip(uuid) | authenticated, service_role | authenticated, service_role | browser: components/staff/outbound-panel.tsx | yes | is_staff() |
| public | staff_partner_decide(uuid,text,text,text) | authenticated, service_role | authenticated, service_role | browser: lib/programs.ts | yes | is_staff() |
| public | staff_partner_payout_details(uuid,text,text) | authenticated, service_role | authenticated, service_role | browser: lib/programs.ts | yes | is_staff() |
| public | staff_partners_overview() | authenticated, service_role | authenticated, service_role | browser: lib/programs.ts | no | is_staff() |
| public | staff_payout_run(date) | authenticated, service_role | authenticated, service_role | browser: lib/programs.ts | no | is_staff() |
| public | staff_payout_sent(uuid,text) | authenticated, service_role | authenticated, service_role | browser: lib/programs.ts | yes | is_staff() |
| public | staff_payouts_approve(date) | authenticated, service_role | authenticated, service_role | browser: lib/programs.ts | yes | is_staff() |
| public | staff_set_concierge(uuid,boolean) | authenticated, service_role | authenticated, service_role | browser: lib/concierge.ts | yes | is_staff() |
| public | staff_set_google_writes(boolean,text) | authenticated, service_role | authenticated, service_role | Edge: _shared | yes | staff admin |
| public | staff_system_health() | authenticated, service_role | authenticated, service_role | browser: components/staff/system-health-panel.tsx lib/read-timeout.ts | no | is_staff() |
| public | staff_today() | authenticated, service_role | authenticated, service_role | browser: routes/_authenticated/staff/index.tsx; Edge: _shared | no | is_staff() |
| public | staff_validation() | authenticated, service_role | authenticated, service_role | browser: components/staff/validation-panel.tsx | no | is_staff() |
| public | start_location(text,text,text,text,text) | authenticated, service_role | authenticated, service_role | browser: lib/onboarding.ts | yes | membership/role |
| public | start_paid_plans(uuid) | service_role | service_role | SQL: refresh_location_status | yes | n/a: no API grant |
| public | start_review_report(uuid,text,text[]) | authenticated, service_role | authenticated, service_role | browser: lib/review-report.ts | yes | membership/role |
| public | suggest_take(text,text,integer,integer,integer,boolean) | anon, service_role | anon, service_role | Vercel route: server/suggest-deps.ts | no | route key |
| public | task_action(uuid,text) | authenticated, service_role | authenticated, service_role | browser: lib/tasks.ts | yes | membership/role |
| public | team_invite_for_email(uuid) | service_role | service_role | Edge: api | no | n/a: no API grant |
| public | undo_holiday_link(text,uuid) | service_role | service_role | Edge: api | yes | n/a: no API grant |
| public | undo_publication(uuid,uuid) | service_role | service_role | Edge: _shared content; SQL: undo_holiday_link use_action_link whatsapp_undo | yes | n/a: no API grant |
| public | update_knowledge_card(uuid,jsonb) | none | none | none found | no | n/a: no API grant |
| public | update_notification_settings(uuid,text[],smallint,text,integer) | authenticated, service_role | authenticated, service_role | browser: routes/_authenticated/app/settings.tsx | yes | membership/role |
| public | use_action_link(text,text,text,uuid,uuid) | service_role | service_role | Edge: api | no | n/a: no API grant |
| public | use_action_link(text,text,text,uuid,uuid,integer) | service_role | service_role | Edge: api; SQL: use_action_link | yes | n/a: no API grant |
| public | use_holiday_link(text,text,text,text,date,date,uuid) | service_role | service_role | Edge: api | no | n/a: no API grant |
| public | whatsapp_action_create(uuid,text,uuid) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_approve(text,text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_attach_code(text,text,text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_bind(text,text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_connect_start(text) | authenticated, service_role | authenticated, service_role | browser: lib/whatsapp-owner.ts | yes | membership/role |
| public | whatsapp_conversation_set(text,jsonb) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_disconnect() | authenticated, service_role | authenticated, service_role | browser: lib/whatsapp-owner.ts | yes | auth.uid() own rows |
| public | whatsapp_google_action_due() | service_role | service_role | Edge: whatsapp; SQL: private.whatsapp_tick | no | n/a: no API grant |
| public | whatsapp_health_record(text,text,text,text,jsonb) | service_role | service_role | Edge: whatsapp | yes | n/a: no API grant |
| public | whatsapp_held_photo(text,uuid,text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_inbound(text,text,text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_inbound_done(uuid,text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_inbound_retry(integer) | service_role | service_role | Edge: whatsapp | yes | n/a: no API grant |
| public | whatsapp_inbound_store(text,text,text,jsonb,jsonb) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_map_sent(uuid) | service_role | service_role | Edge: whatsapp | yes | n/a: no API grant |
| public | whatsapp_maps_due() | service_role | service_role | Edge: whatsapp | no | n/a: no API grant |
| public | whatsapp_may_send(uuid) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | whatsapp_monthly_answered(uuid) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_monthly_due(integer) | service_role | service_role | Edge: whatsapp | yes | n/a: no API grant |
| public | whatsapp_open_items(text) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | whatsapp_ops_claim(integer) | service_role | service_role | Edge: whatsapp | yes | n/a: no API grant |
| public | whatsapp_outbox_add(text,uuid,uuid,text,text,jsonb,jsonb,boolean,text,timestamp with time zone,jsonb) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_outbox_claim(integer) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_outbox_get(text,bigint[]) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | whatsapp_outbox_mark(bigint[],text,text,text,timestamp with time zone) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_outbox_release(text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_owner_draft(uuid,uuid,text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_owners_on() | authenticated, service_role | authenticated, service_role | browser: lib/read-timeout.ts lib/whatsapp-owner.ts | no | none (returns a setting only) |
| public | whatsapp_photo_category(uuid,uuid,text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_photo_hold(uuid,uuid) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_photo_post_prepare(uuid,uuid,uuid,text,text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_photo_skip(text,text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_photo_target(uuid) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | whatsapp_photos_due(integer) | service_role | service_role | Edge: whatsapp | yes | n/a: no API grant |
| public | whatsapp_post_skip(text,text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_recipients(uuid) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | whatsapp_record(uuid,uuid,text,text,text,text,text,text) | service_role | service_role | Edge: _shared whatsapp | yes | n/a: no API grant |
| public | whatsapp_resolve(text) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | whatsapp_review_link(uuid) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | whatsapp_send_state(text) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | whatsapp_set_prefs(boolean,boolean) | authenticated, service_role | authenticated, service_role | browser: lib/whatsapp-owner.ts | yes | auth.uid() own rows |
| public | whatsapp_set_webhook_secret(text) | service_role | service_role | Edge: whatsapp | no | n/a: no API grant |
| public | whatsapp_staff_code() | authenticated, service_role | authenticated, service_role | browser: components/staff/whatsapp-staff-code.tsx | yes | is_staff() |
| public | whatsapp_staff_numbers() | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | whatsapp_staff_pause(text,boolean) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_staff_summary() | service_role | service_role | Edge: _shared whatsapp | no | n/a: no API grant |
| public | whatsapp_start(text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_stats(uuid,integer) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | whatsapp_status() | authenticated, service_role | authenticated, service_role | browser: lib/read-timeout.ts lib/whatsapp-owner.ts; SQL: set_routine_delivery whatsapp_disconnect whatsapp_set_prefs | no | auth.uid() own rows |
| public | whatsapp_status_update(text,text,text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_stop(text) | service_role | service_role | Edge: _shared | yes | n/a: no API grant |
| public | whatsapp_token_owner(text,text) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | whatsapp_undo(text,text) | service_role | service_role | Edge: _shared | no | n/a: no API grant |
| public | whatsapp_verify(text,text) | service_role | service_role | Edge: _shared; SQL: whatsapp_bind | yes | n/a: no API grant |

## The 59 tables with RLS on and no policy (part D)

No page reads any of them with `.from(...)` (grep of `src/`), and after this migration none grants anything to `anon` or `authenticated`. With RLS on and no policy, the browser roles see no row and write none; the service role (Edge Functions) and SECURITY DEFINER functions reach them. No allow policy was added: no page needs one.

| Group | Tables | Verdict |
|---|---|---|
| Jobs, limits and settings (written and read by the service role and SQL only) | `jobs`, `ops_events`, `circuit_breaker`, `google_rate`, `rate_limits`, `places_usage`, `places_cache`, `webhook_rejections`, `app_settings`, `retention_policies`, `deletion_log`, `product_events`, `ai_runs`, `mock_listings`, `google_listings`, `industry_search_terms`, `holidays`, `invitation_lookups` | service-only on purpose |
| Tokens and links (resolved only inside SECURITY DEFINER functions) | `action_tokens`, `photo_upload_links`, `whatsapp_staff_codes`, `whatsapp_actions` | service-only on purpose |
| Money: billing, trials and Kabsi Partners (Edge Functions and staff_ functions only) | `billing_checkouts`, `billing_events`, `billing_extras`, `partner_accounts`, `partner_commissions`, `partner_payouts`, `partner_referrals`, `trial_accounts`, `trial_grants`, `trial_usage` | service-only on purpose |
| Public forms and consent (written by Edge Functions; staff read through staff_ functions) | `contacts`, `founding_applications`, `founding_checklist`, `free_check_waitlist`, `free_checks`, `signup_attribution`, `consent_records`, `email_suppressions` | service-only on purpose |
| WhatsApp and prompts (the WhatsApp functions; owners see their state through whatsapp_status) | `whatsapp_conversations`, `whatsapp_messages`, `whatsapp_number_health`, `whatsapp_optins`, `whatsapp_outbox`, `whatsapp_window`, `profile_check_whatsapp`, `onboarding_messages`, `business_update_prompts`, `holiday_prompts` | service-only on purpose |
| Nora's chats (the assistant function; staff read through staff_chats) | `chat_conversations`, `chat_messages` | service-only on purpose |
| Owner data the app reads through a membership-checked function | `coach_profile`, `coach_read_failures`, `coach_site_check`, `style_edits` | service-only on purpose |
| Outbound (Rashid's daily batch through staff_outbound_ functions) | `outbound_days`, `outbound_harvey_queue`, `outbound_suppression` | service-only on purpose |
