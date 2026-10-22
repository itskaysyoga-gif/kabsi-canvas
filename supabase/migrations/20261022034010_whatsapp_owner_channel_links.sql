-- P0.8-03: the foreign keys of the WhatsApp tables. The `on delete` clauses are additive; applied by the session with
-- execute_sql and read back in the same call (R-44). A person's opt-in, window and buttons go with their account; a
-- message log row keeps no content and outlives a deleted business or person without naming them.
alter table public.whatsapp_optins add constraint whatsapp_optins_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;
alter table public.whatsapp_window add constraint whatsapp_window_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;
alter table public.whatsapp_messages add constraint whatsapp_messages_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;
alter table public.whatsapp_messages add constraint whatsapp_messages_location_id_fkey
  foreign key (location_id) references public.locations (id) on delete set null;
alter table public.whatsapp_actions add constraint whatsapp_actions_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;
alter table public.whatsapp_actions add constraint whatsapp_actions_location_id_fkey
  foreign key (location_id) references public.locations (id) on delete cascade;
