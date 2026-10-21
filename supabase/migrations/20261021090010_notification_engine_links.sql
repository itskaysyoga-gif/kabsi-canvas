-- P0.4-09: the foreign keys of public.notifications and public.notification_preferences
-- (20261021090000_notification_engine.sql). A business's notices and choices go with the business when it is removed
-- (K-41 deletion), a person's go with their account, and an email keeps itself when its notice is cleared. Run by
-- Hussein in the SQL editor because the file holds the cascade clauses; it removes no data when run.
alter table public.notifications
  add constraint notifications_location_id_fkey foreign key (location_id) references public.locations(id) on delete cascade,
  add constraint notifications_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.notification_preferences
  add constraint notification_preferences_location_id_fkey foreign key (location_id) references public.locations(id) on delete cascade,
  add constraint notification_preferences_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.emails
  add constraint emails_notification_id_fkey foreign key (notification_id) references public.notifications(id) on delete set null;
