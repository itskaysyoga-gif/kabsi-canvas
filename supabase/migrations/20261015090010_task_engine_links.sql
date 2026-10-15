-- P0.3-05: the two foreign keys of public.tasks (20261015090000_task_engine.sql). A business's tasks go with the
-- business when it is removed (K-41 deletion), and a task keeps itself when its publication is cleared. Run by Hussein
-- in the SQL editor because the file holds the cascade clauses; it removes no data when run.
alter table public.tasks
  add constraint tasks_location_id_fkey foreign key (location_id) references public.locations(id) on delete cascade,
  add constraint tasks_publication_id_fkey foreign key (publication_id) references public.publications(id) on delete set null;
