-- Session 19 rest (master plan 30.10 point 1, changed by the lane R chat on 25 Oct 2026): Google's 30 days include the
-- backups. Google data of a business that left (access removed, Kabsi disconnected or the business closed) is deleted
-- 7 days after it leaves, and backups are kept 21 days (scripts/backup/backup.sh), so no copy outlives 28 days.
-- run_retention and purge_after_leaving both read this row. Additive: one settings row changes.
update public.retention_policies
   set keep_days = 7, kept = 'Deleted 7 days after the business leaves Kabsi', updated_at = now()
 where data_class = 'google_data_after_access_lost';
