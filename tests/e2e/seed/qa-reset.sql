-- QA 1 (master plan 30.12): after a run, puts the two things the web journeys and the WhatsApp card scenarios change back as they
-- were, so a run can be repeated. Run with the Supabase connector (execute_sql) before each run. Updates only (no delete), so the
-- connector runs it without asking; an older publication of the QA review is marked cancelled, because one approved or verified publication would be handed back for the next approval of the same draft.
-- Everything here is on the demo business Harbour Lane Coffee (mock Google, R-17); nothing reaches Google or a person.
--   review  de300000-0000-4000-8000-0000000000f1  waiting again, with its draft
--   post    de300000-0000-4000-8000-0000000000f2  a draft again, due in 20 days
with a as (update public.reviews set state = 'drafted', reply_state = null, existing_reply = null where id = 'de300000-0000-4000-8000-0000000000f1' returning id),
b as (update public.mock_google_reviews set reply_comment = null, reply_update_time = null where review_id = 'demo-hlc-qa1' returning review_id),
d as (update public.publications set state = 'cancelled' where target_id in ('de300000-0000-4000-8000-0000000000f1', 'de300000-0000-4000-8000-0000000000f2') and state <> 'cancelled' returning id),
c as (update public.gbp_posts set state = 'draft', publish_at = now() + interval '20 days' where id = 'de300000-0000-4000-8000-0000000000f2' returning id)
select (select count(*) from a) as review_rows, (select count(*) from b) as mock_rows, (select count(*) from c) as post_rows, (select count(*) from d) as publications_closed;
-- Expect 1 | 1 | 1 | 0 or more (an approval that is still on its way is closed too). Read back: select state from public.reviews where id = 'de300000-0000-4000-8000-0000000000f1'; expect drafted.
