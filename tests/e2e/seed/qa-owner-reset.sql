-- QA 1: the QA owner (delivered+kabsi-qa@resend.dev, no inbox) for the sign-up and onboarding journey. Part 1 creates the account once;
-- part 2 takes its one fictional business back to the first onboarding step. Run with the Supabase connector.
-- 1. Once: create the account (an email-confirmed Auth user; the sign-in code comes from qa-login-code.sql).
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous,
      confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current, phone_change, phone_change_token, reauthentication_token)
values ('de300000-0000-4000-8000-0000000000a6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'delivered+kabsi-qa@resend.dev', now(), '{"provider":"email","providers":["email"]}', '{"qa":"qa-1"}', now(), now(), false, '', '', '', '', '', '', '', '')
on conflict (id) do nothing;
-- 2. Every time: take the fictional business "Kabsi QA Cafe" back to the start of today's four stages (Fix 1): business not
-- confirmed (stage 2), no WhatsApp setup yes (stage 3), no agreement and no Google access (stage 4), so the journey can run
-- again at the other size. Updates only (no delete), so the connector runs it without asking. The business, its organisation
-- and its members stay (they are fixtures); the onboarding answers it saved stay too. The QA owner has no WhatsApp opt in.
update public.locations set onboarding_step = 'access', consent_at = null, consent_text = null, status = 'onboarding',
  manage_confirmed_at = null, setup_whatsapp_at = null
where place_id = 'qa-place-kabsi-qa-cafe' and created_by = 'de300000-0000-4000-8000-0000000000a6'
  and access_granted_at is null
returning id, name, onboarding_step, manage_confirmed_at, consent_at;
-- Expect one row: step access, manage_confirmed_at and consent_at null. No row means the business has Google access
-- (access_granted_at set), which this journey never gives; ask before clearing it.
