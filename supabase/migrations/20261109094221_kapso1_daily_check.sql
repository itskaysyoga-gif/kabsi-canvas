-- Kapso 1: the daily read-only check of Kabsi's WhatsApp number and templates (health function, body {"only":"kapso"}).
-- It reads through Kapso's API and raises at most one staff alert a day (ops event whatsapp_check, dedupe key per day).
-- Additive: one pg_cron job, no table changes. 05:17 UTC, after the staff digest hour and off the hour.
select cron.schedule('kabsi_whatsapp_check', '17 5 * * *', $$select public.call_internal('health', '{"only":"kapso"}'::jsonb)$$);
