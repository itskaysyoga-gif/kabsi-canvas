-- Session 13b part 1: the foreign keys of the WhatsApp agent's tables. The `on delete` clauses are additive; applied by
-- the session with execute_sql and read back in the same call (R-44). A person's or a business's phone roles go with
-- them; a conversation keeps its phone but forgets the business; an outbox row outlives a deleted business without
-- naming it.
alter table public.phone_roles add constraint phone_roles_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;
alter table public.phone_roles add constraint phone_roles_location_id_fkey
  foreign key (location_id) references public.locations (id) on delete cascade;
alter table public.whatsapp_conversations add constraint whatsapp_conversations_active_location_id_fkey
  foreign key (active_location_id) references public.locations (id) on delete set null;
alter table public.whatsapp_outbox add constraint whatsapp_outbox_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;
alter table public.whatsapp_outbox add constraint whatsapp_outbox_location_id_fkey
  foreign key (location_id) references public.locations (id) on delete set null;
alter table public.whatsapp_staff_codes add constraint whatsapp_staff_codes_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete cascade;
