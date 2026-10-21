-- P0.5-02 part A: a post's photo and the post it repeats are links that go when they go (R-44: applied by the session
-- with execute_sql and read back in the same call).
alter table public.gbp_posts
  add constraint gbp_posts_photo_id_fkey foreign key (photo_id) references public.photos(id) on delete set null,
  add constraint gbp_posts_recurs_from_fkey foreign key (recurs_from) references public.gbp_posts(id) on delete set null;

-- Read-back: 2 rows, delete rule SET NULL.
select tc.constraint_name, rc.delete_rule
  from information_schema.table_constraints tc
  join information_schema.referential_constraints rc on rc.constraint_name = tc.constraint_name
 where tc.table_name = 'gbp_posts' and tc.constraint_type = 'FOREIGN KEY' and tc.constraint_name in ('gbp_posts_photo_id_fkey', 'gbp_posts_recurs_from_fkey');
