-- Demo pack (lane R decision R-125, 7 Nov 2026): the two demo businesses become complete, so every /app page shows a
-- believable month of Kabsi's work. They serve the dashboard review now and the product videos later.
--
-- Insert and update only, demo locations only (locations.is_demo). Invented names and reviewers; emails on example.com;
-- phones in the reserved +44 7700 900xxx range; no real business, logo or face. Photos are plain placeholder images in the
-- design tokens, uploaded to Supabase Storage (bucket owner-photos) by the QA demo owner, never kept in the repository
-- (R-121). Nothing here calls Google, an AI model or WhatsApp: a demo business is mock Google always (R-17).
--
-- What it adds, per business: reviews in every state the app shows with their reply drafts, 6 posts (draft, approved,
-- published), 8 photos, one special day, 8 weeks of rating points and weekly reports, visibility scans with their points,
-- AI visibility questions with answers, competitor snapshots, a plan, a second review card with taps, the coach read, a
-- richer Business Knowledge card, and a pending team invite. It also makes qa-demo@test.local an owner of Juniper Hair
-- Studio (it was an owner of Harbour Lane Coffee only).
--
-- It ends with an assert: the fingerprint of every table it could touch, read for non-demo locations only, is the same
-- before and after. A change to a row of a real business aborts the whole migration.

create function pg_temp.did(p_kind int, p_loc int, p_n int) returns uuid language sql immutable as
$f$ select ('de300000-0000-4000-9000-' || p_kind::text || '00000' || p_loc::text || lpad(p_n::text, 3, '0'))::uuid $f$;

-- One text per table that has a location_id, read for non-demo locations only.
create function pg_temp.fp() returns text language plpgsql as $f$
declare t text; r text; acc text := '';
begin
  foreach t in array array['reviews', 'publications', 'gbp_posts', 'photos', 'special_hours', 'rating_snapshots',
    'weekly_reports', 'knowledge_facts', 'plans', 'cards', 'taps', 'notifications', 'profile_changes', 'listing_baselines',
    'coach_profile', 'visibility_keywords', 'visibility_scans', 'ai_visibility_prompts', 'ai_visibility_runs',
    'ai_visibility_answers', 'competitor_picks', 'competitor_snapshots', 'holiday_prompts', 'business_update_prompts',
    'team_invites', 'approval_policies', 'google_connections', 'location_members', 'google_listings', 'tasks'] loop
    execute format('select md5(coalesce(string_agg(to_jsonb(x)::text, %L order by to_jsonb(x)::text), %L)) from public.%I x
                    where not exists (select 1 from public.locations l where l.id = x.location_id and l.is_demo)',
                   '|', '', t) into r;
    acc := acc || t || '=' || r || ';';
  end loop;
  select md5(coalesce(string_agg(to_jsonb(l)::text, '|' order by l.id::text), '')) into r from public.locations l where not l.is_demo;
  acc := acc || 'locations=' || r || ';';
  select md5(coalesce(string_agg(to_jsonb(d)::text, '|' order by d.id::text), '')) into r from public.reply_drafts d
    where exists (select 1 from public.reviews v join public.locations l on l.id = v.location_id where v.id = d.review_id and not l.is_demo);
  acc := acc || 'reply_drafts=' || r || ';';
  select md5(coalesce(string_agg(to_jsonb(m)::text, '|' order by m.review_id), '')) into r from public.mock_google_reviews m
    where m.google_location_id not like 'locations/demo-%';
  acc := acc || 'mock_google_reviews=' || r || ';';
  select md5(coalesce(string_agg(to_jsonb(m)::text, '|' order by m.google_location_id), '')) into r from public.mock_listings m
    where m.google_location_id not like 'locations/demo-%';
  acc := acc || 'mock_listings=' || r || ';';
  return acc;
end $f$;

do $pack$
declare
  v_cafe constant uuid := 'de300000-0000-4000-8000-000000000001';
  v_salon constant uuid := 'de300000-0000-4000-8000-000000000002';
  v_qa constant uuid := 'de300000-0000-4000-8000-0000000000a0';
  v_owner uuid;
  v_before text := pg_temp.fp();
  v_shift interval;
  r record;
  i int;
  v_loc uuid;
  v_g text;
  v_gloc text;
  v_rid uuid;
  v_at timestamptz;
  v_id uuid;
  v_pid uuid;
  v_scan uuid;
  v_kw uuid;
  v_top3 int;
  v_run uuid;
  v_prompt uuid;
begin
  select id into v_owner from auth.users where lower(email) = public.demo_login_email();
  -- A database without the demo workspace (a fresh local stack, CI) has nothing to seed: the migration does nothing there.
  -- (Production had the workspace, so the version applied on 7 Nov 2026 ran in full; this guard is the only difference.)
  if v_owner is null or not exists (select 1 from auth.users where id = v_qa)
     or (select count(*) from public.locations where is_demo and id in (v_cafe, v_salon)) <> 2 then
    raise notice 'demo pack skipped: the demo workspace is not in this database';
    return;
  end if;

  -- 1. The QA demo owner works on both businesses -----------------------------------------------------------------
  insert into public.location_members (location_id, user_id, role) values (v_salon, v_qa, 'owner') on conflict do nothing;

  -- 2. Phones in the reserved range: the old fictional 555 numbers become +44 7700 900xxx ------------------------------
  update public.locations set knowledge_card = replace(replace(knowledge_card::text, '+1 (555) 010-0142', '+44 7700 900142'),
      '+1 (555) 010-0187', '+44 7700 900187')::jsonb
    where id in (v_cafe, v_salon) and knowledge_card::text like '%(555) 010-01%';
  update public.mock_listings set fields = replace(replace(fields::text, '+1 (555) 010-0142', '+44 7700 900142'),
      '+1 (555) 010-0187', '+44 7700 900187')::jsonb
    where google_location_id in ('locations/demo-harbour-lane-coffee', 'locations/demo-juniper-hair-studio') and fields::text like '%(555) 010-01%';
  update public.knowledge_facts set value = replace(replace(value::text, '+1 (555) 010-0142', '+44 7700 900142'),
      '+1 (555) 010-0187', '+44 7700 900187')::jsonb
    where location_id in (v_cafe, v_salon) and value::text like '%(555) 010-01%';
  update public.listing_baselines set fields = replace(replace(fields::text, '+1 (555) 010-0142', '+44 7700 900142'),
      '+1 (555) 010-0187', '+44 7700 900187')::jsonb
    where location_id in (v_cafe, v_salon) and fields::text like '%(555) 010-01%';

  -- 3. Business Knowledge: a fuller card, then the facts follow it ------------------------------------------------------
  update public.locations set knowledge_card = knowledge_card || jsonb_build_object(
      'payment_methods', 'Cards and contactless. Cash only before 3 pm.',
      'parking', 'Street parking on Harbour Lane and a public car park two minutes away.',
      'accessibility', 'Step-free entrance and an accessible toilet.',
      'wifi', 'Free wifi. Ask at the counter for the password.',
      'languages', 'English and Spanish',
      'policies', 'Dogs are welcome on the terrace.',
      'delivery', false,
      'avoid', 'Never promise a free drink or a discount in a reply.',
      'faqs', jsonb_build_array(
        jsonb_build_object('q', 'Do you have oat milk?', 'a', 'Yes, oat and almond milk at no extra charge.'),
        jsonb_build_object('q', 'Can I work on a laptop?', 'a', 'Yes, the quiet corner at the back is for laptops.')),
      'custom_rules', jsonb_build_array('If a review mentions an allergy, ask the customer to contact us and never discuss details in public.'))
    where id = v_cafe;
  update public.locations set knowledge_card = knowledge_card || jsonb_build_object(
      'booking', 'Book ahead online or by phone. A few walk-in slots each day.',
      'payment_methods', 'Cards and contactless.',
      'parking', 'Two hours free on Juniper Row after 10 am.',
      'accessibility', 'Ground floor, no steps, wide door.',
      'wifi', 'Free wifi in the waiting area.',
      'languages', 'English and French',
      'policies', 'Please give 24 hours notice to move an appointment.',
      'delivery', false,
      'avoid', 'Never discuss prices or promise a result in a reply.',
      'faqs', jsonb_build_array(
        jsonb_build_object('q', 'Do you cut curly hair?', 'a', 'Yes, curly hair is a speciality of the studio.'),
        jsonb_build_object('q', 'How long does balayage take?', 'a', 'Usually three to four hours, including the toner.')),
      'custom_rules', jsonb_build_array('If a review mentions a colour result, invite the client to come back so we can adjust it.'))
    where id = v_salon;
  perform private.sync_card_facts(v_cafe, v_owner);
  perform private.sync_card_facts(v_salon, v_owner);

  -- 4. Reviews: the seed dates move to the last month, then the states the app shows ------------------------------------
  v_shift := make_interval(days => (current_date - date '2026-10-04'));
  update public.mock_google_reviews set create_time = create_time + v_shift,
      reply_update_time = reply_update_time + v_shift
    where google_location_id in ('locations/demo-harbour-lane-coffee', 'locations/demo-juniper-hair-studio')
      and review_id ~ '^demo-(hlc|jhs)-[0-9]{2}$' and create_time < now() - interval '31 days';
  update public.reviews set review_created_at = review_created_at + v_shift
    where location_id in (v_cafe, v_salon) and google_review_id ~ '^demo-(hlc|jhs)-[0-9]{2}$'
      and review_created_at < now() - interval '31 days';

  -- (loc, n, reviewer, stars, language, state, reply_state, risk, hours ago, comment, reply on Google, draft, draft safe, publication state)
  for r in select * from (values
    -- Harbour Lane Coffee
    (1, 13, 'Isla Morgan', 5, 'en', 'new', null::text, 'low', 3, 'First visit today. The cardamom bun was warm and the flat white was spot on.', null::text, null::text, true, null::text),
    (1, 14, 'Ravi Shah', 4, 'en', 'publishing', null, 'low', 30, 'Good coffee and a calm room on a rainy afternoon. A bit short of seats at one.', null,
      'Thank you, Ravi. A rainy afternoon is when the room works best, and we are working on more seats at lunchtime. Maya and the Harbour Lane team', true, 'approved'),
    (1, 15, 'Emily Stone', 5, 'en', 'posted', null, 'low', 52, 'Lovely staff and the best cinnamon bun I have had in years.', null,
      'Thank you, Emily. The cinnamon buns are baked at six every morning, so come early for the warmest ones. Maya and the Harbour Lane team', true, 'published'),
    (1, 16, 'Carlos Mendes', 3, 'en', 'posted', 'in_review', 'low', 76, 'Coffee was fine but the queue at eight was long.', null,
      'Thank you, Carlos. We are adding a second person at the bar between eight and nine to shorten the queue. Maya and the Harbour Lane team', true, 'verifying'),
    (1, 17, 'Jade Foster', 1, 'en', 'drafted', 'rejected', 'low', 100, 'Rude reply to my question about the menu. Will not be back.', null,
      'Jade, thank you for telling us, and we are sorry the answer felt rude. We would like to hear more, so please contact us through the details on our profile. Maya and the Harbour Lane team', true, 'rejected'),
    (1, 18, 'Pat Nolan', 4, 'en', 'skipped', null, 'low', 150, 'Good beans, fair price.', null, null, true, null),
    (1, 19, 'Zoe Hartley', 5, 'en', 'handled_offline', null, 'low', 200, 'Staff remembered my name and my order. That is rare.', null, null, true, null),
    (1, 20, 'Mo Haddad', 2, 'en', 'archived', null, 'low', 1100, 'Slow service on a quiet morning.', null, null, true, null),
    (1, 21, 'Hugo Bell', 1, 'en', 'blocked', null, 'high', 5, 'I think the cold brew made me ill. I felt sick for two days after.', null, null, true, null),
    (1, 22, 'Tilda Reed', 3, 'en', 'drafted', null, 'medium', 20, 'Nice place but quite expensive for what it is.', null,
      'Thank you, Tilda. We use beans from a small roaster and bake every morning, and we are glad you came in. Maya and the Harbour Lane team', true, null),
    (1, 23, 'Ben Ortiz', 2, 'en', 'drafted', null, 'low', 40, 'Ordered a mocha and got a latte. Fixed quickly though.', null,
      'Thank you, Ben. We are sorry about the mix-up, and your next coffee is on us. Maya and the Harbour Lane team', false, null),
    -- Juniper Hair Studio
    (2, 13, 'Hannah Wells', 5, 'en', 'drafted', null, 'low', 6, 'Rafael took the time to understand what I wanted. My hair has never looked better.', null,
      'Thank you, Hannah. Rafael will be happy to read this. See you at your next appointment. Ines, Juniper Hair Studio', true, null),
    (2, 14, 'Pete Lawson', 4, 'en', 'drafted', null, 'low', 14, 'Quick, tidy cut and a friendly welcome.', null,
      'Thank you, Pete. We are glad you felt welcome. Ines, Juniper Hair Studio', true, null),
    (2, 15, 'Anika Rao', 2, 'en', 'drafted', null, 'low', 28, 'The colour was fine but I waited a long time and nobody told me why.', null,
      'Thank you, Anika. We should have told you about the wait, and we are sorry we did not. Please contact us through the details on our profile so we can make it right. Ines, Juniper Hair Studio', true, null),
    (2, 16, 'Tessa Morgan', 3, 'en', 'drafted', null, 'medium', 40, 'Good result but I felt rushed at the end.', null,
      'Thank you, Tessa. We are glad you liked the result, and we will leave more time at the end of each appointment. Ines, Juniper Hair Studio', true, null),
    (2, 17, 'Leila Haddad', 1, 'en', 'blocked', null, 'high', 8, 'They cut it much shorter than I asked and the owner was rude when I said so. I am talking to a solicitor.', null, null, true, null),
    (2, 18, 'Grace Liu', 5, 'en', 'new', null, 'low', 2, 'Beautiful balayage and a very calm studio.', null, null, true, null),
    (2, 19, 'Marta Kos', 5, 'en', 'publishing', null, 'low', 36, 'Ines gave me the best advice on caring for my colour.', null,
      'Thank you, Marta. It was a pleasure, and we will see you for a gloss in a few weeks. Ines, Juniper Hair Studio', true, 'approved'),
    (2, 20, 'Zane Pike', 4, 'en', 'posted', null, 'low', 60, 'Friendly team and an easy booking.', null,
      'Thank you, Zane. We are glad booking was easy. Ines, Juniper Hair Studio', true, 'published'),
    (2, 21, 'Rob Dyer', 2, 'en', 'posted', 'in_review', 'low', 84, 'The appointment started twenty minutes late.', null,
      'Thank you, Rob. We are sorry the appointment started late, and we are leaving more time between bookings. Ines, Juniper Hair Studio', true, 'verifying'),
    (2, 22, 'Ola Berg', 1, 'en', 'drafted', 'rejected', 'low', 110, 'Disappointed with the result and the reply I got by message.', null,
      'Ola, thank you for telling us, and we are sorry. We would like to put it right, so please contact us through the details on our profile. Ines, Juniper Hair Studio', true, 'rejected'),
    (2, 23, 'Fern Cole', 4, 'en', 'skipped', null, 'low', 160, 'Nice cut, a little pricey.', null, null, true, null),
    (2, 24, 'Dev Mistry', 5, 'en', 'handled_offline', null, 'low', 210, 'Always a good haircut here.', null, null, true, null),
    (2, 25, 'Ivy Park', 3, 'en', 'archived', null, 'low', 1200, 'Average, nothing special.', null, null, true, null),
    (2, 26, 'Cleo Grant', 2, 'en', 'drafted', null, 'low', 48, 'Not what I asked for and a bit short with me at the desk.', null,
      'Thank you, Cleo. We will give you a free treatment to say sorry, and please book again with Ines. Ines, Juniper Hair Studio', false, null)
  ) as t(loc, n, who, stars, lang, state, reply_state, risk, hours_ago, comment, reply, draft, draft_ok, pub)
  loop
    v_loc := case when r.loc = 1 then v_cafe else v_salon end;
    v_g := 'demo-' || case when r.loc = 1 then 'hlc-' else 'jhs-' end || lpad(r.n::text, 2, '0');
    v_gloc := case when r.loc = 1 then 'locations/demo-harbour-lane-coffee' else 'locations/demo-juniper-hair-studio' end;
    v_rid := pg_temp.did(101, r.loc, r.n);
    v_at := now() - make_interval(hours => r.hours_ago);
    insert into public.mock_google_reviews (review_id, google_location_id, reviewer_name, star_rating, comment, create_time, reply_comment, reply_update_time)
    values (v_g, v_gloc, r.who, r.stars, r.comment, v_at, r.reply, case when r.reply is not null then v_at + interval '5 hours' end)
    on conflict (review_id) do nothing;
    insert into public.reviews (id, location_id, google_review_id, reviewer_name, star_rating, comment, language, urgency, urgency_reasons,
      state, existing_reply, review_created_at, is_backlog, notified_at, reply_state, reply_state_reason, fetched_at, source, draft_attempts, risk, risk_reasons)
    values (v_rid, v_loc, v_g, r.who, r.stars, r.comment, r.lang, case when r.risk = 'high' then 'urgent' else 'normal' end,
      case when r.risk = 'high' then array['health or safety'] else '{}'::text[] end,
      r.state, r.reply, v_at, false, now(), r.reply_state,
      case when r.reply_state = 'rejected' then 'Google did not accept the reply. Kabsi can write another one for you to approve.' end,
      now(), 'google', case when r.state = 'new' then 3 else 1 end, r.risk,
      case r.risk when 'high' then array['serious claim in the review'] when 'medium' then array['mentions price'] else '{}'::text[] end)
    on conflict (id) do nothing;
    if r.draft is not null then
      insert into public.reply_drafts (review_id, version, body, source, safety_ok, safety_notes, model, prompt_version)
      values (v_rid, 1, r.draft, 'ai', r.draft_ok,
        case when r.draft_ok then '[]'::jsonb else jsonb_build_array('The reply offers something Kabsi cannot promise.') end, 'demo-seed', 'reply.v1')
      on conflict (review_id, version) do nothing;
    end if;
    if r.n = 22 and r.loc = 1 then
      insert into public.reply_drafts (review_id, version, body, source, instruction, safety_ok, safety_notes, model, prompt_version)
      values (v_rid, 2, 'Thank you, Tilda. The beans come from a small roaster and the pastries are baked each morning. Maya and the Harbour Lane team',
        'ai_edit', 'Shorter, no mention of price', true, '[]'::jsonb, 'demo-seed', 'reply.v1')
      on conflict (review_id, version) do nothing;
    end if;
    if r.pub is not null then
      insert into public.publications (id, location_id, target_type, target_id, payload, approved_by, approved_at, channel, route, state,
        idempotency_key, publish_after, attempts, google_ref, error, owner_told, owner_told_at, created_at)
      values (pg_temp.did(104, r.loc, r.n), v_loc, 'review_reply', v_rid, jsonb_build_object('text', r.draft), v_owner, v_at + interval '3 hours', 'dashboard', 'api',
        r.pub, 'demo-pack:reply:' || v_rid::text, case when r.pub = 'approved' then now() + interval '3 days' end,
        case when r.pub = 'approved' then 0 else 1 end,
        case when r.pub in ('published', 'verifying') then 'demo-reply-' || v_g end,
        case when r.pub = 'rejected' then 'Google did not accept the reply.' end,
        case when r.pub in ('published', 'verifying', 'rejected') then 'final' end,
        case when r.pub in ('published', 'verifying', 'rejected') then v_at + interval '4 hours' end, v_at + interval '3 hours')
      on conflict (id) do nothing;
    end if;
  end loop;

  -- 5. Posts: 6 per business across draft, approved (scheduled) and published ---------------------------------------------
  for r in select * from (values
    -- (loc, n, state, source, topic, cta, body, owner input, days: positive = published that many days ago, negative = scheduled in)
    (1, 3, 'publishing', 'auto', 'STANDARD', 'CALL', 'Cardamom buns are back every Saturday from 8 am. Bring a friend and grab the window seats while they last.', 'Weekly draft by Kabsi', -3),
    (1, 4, 'publishing', 'owner', 'EVENT', 'LEARN_MORE', 'Latte art night at the back table. Maya will show you how to pour a heart. Free to join, small groups.', 'Latte art night, Thursday 19 Nov', -12),
    (1, 5, 'posted', 'auto', 'STANDARD', 'CALL', 'New filter roast this week: a washed bean with notes of orange and cocoa. Ask for it at the counter.', 'Weekly draft by Kabsi', 9),
    (1, 6, 'posted', 'owner', 'OFFER', 'LEARN_MORE', 'Pastries half price in the last hour on weekdays, while they last.', 'Half price pastries after 5', 21),
    (2, 1, 'draft', 'auto', 'STANDARD', 'BOOK', 'Curly hair care tips from Ines: sleep on silk, wash less, and book a trim every ten weeks to keep the shape.', 'Weekly draft by Kabsi', 0),
    (2, 2, 'draft', 'owner', 'STANDARD', 'BOOK', 'December colour appointments are open. Early slots are going, so book ahead if you want a Saturday.', 'December colour slots', 0),
    (2, 3, 'publishing', 'auto', 'STANDARD', 'BOOK', 'Winter gloss treatment is back. A shine boost that lasts six weeks, made for colour-treated hair.', 'Weekly draft by Kabsi', -2),
    (2, 4, 'publishing', 'owner', 'EVENT', 'BOOK', 'Late opening on Tuesday 17 November until 7 pm, with a free consultation for first-time clients.', 'Late opening Tuesday', -10),
    (2, 5, 'posted', 'auto', 'STANDARD', 'BOOK', 'Balayage season: soft, sun-kissed colour that grows out well. Ask Ines about a consultation.', 'Weekly draft by Kabsi', 7),
    (2, 6, 'posted', 'owner', 'OFFER', 'LEARN_MORE', 'Bring a friend for a first visit and both of you get a blow-dry with your cut, until the end of the month.', 'Bring a friend', 18)
  ) as t(loc, n, state, source, topic, cta, body, input, days)
  loop
    v_loc := case when r.loc = 1 then v_cafe else v_salon end;
    v_id := pg_temp.did(102, r.loc, r.n);
    insert into public.gbp_posts (id, location_id, owner_input, body, cta_type, cta_url, state, source, topic_type, event_title, start_date, end_date,
      start_time, end_time, offer_terms, publish_at, created_at)
    values (v_id, v_loc, r.input, r.body, r.cta, case when r.cta = 'CALL' then null else 'https://example.com/' end, r.state, r.source, r.topic,
      case when r.topic = 'EVENT' then r.input end,
      case when r.topic in ('EVENT', 'OFFER') then current_date - r.days end,
      case when r.topic in ('EVENT', 'OFFER') then current_date - r.days + case when r.days > 0 then 30 else 0 end end,
      case when r.topic = 'EVENT' then time '18:00' end, case when r.topic = 'EVENT' then time '20:00' end,
      case when r.topic = 'OFFER' then 'While stocks last. One per customer.' end,
      case when r.days < 0 then now() + make_interval(days => -r.days) end, now() - make_interval(days => abs(r.days) + 1))
    on conflict (id) do nothing;
    if r.state <> 'draft' then
      insert into public.publications (id, location_id, target_type, target_id, payload, approved_by, approved_at, channel, route, state, idempotency_key,
        publish_after, attempts, google_ref, owner_told, owner_told_at, created_at)
      values (pg_temp.did(104, r.loc, 100 + r.n), v_loc, 'local_post', v_id,
        jsonb_build_object('summary', r.body, 'cta_type', r.cta, 'topic_type', r.topic, 'language', 'en'), v_owner,
        case when r.state = 'posted' then now() - make_interval(days => abs(r.days) + 1) else now() - interval '1 day' end, 'dashboard', 'api',
        case when r.state = 'posted' then 'verified' else 'approved' end, 'demo-pack:post:' || v_id::text,
        case when r.days < 0 then now() + make_interval(days => -r.days) end, case when r.state = 'posted' then 1 else 0 end,
        case when r.state = 'posted' then 'demo-post-' || v_id::text end,
        case when r.state = 'posted' then 'final' end, case when r.state = 'posted' then now() - make_interval(days => r.days) end,
        now() - make_interval(days => abs(r.days) + 1))
      on conflict (id) do nothing;
    end if;
  end loop;

  -- 6. Photos: placeholder images in Storage (owner-photos/<business>/<id>.jpg), uploaded after this migration ---------------
  for r in select * from (values
    -- (loc, n, category, state, note, issues, bytes, caption)
    (1, 1, 'INTERIOR', 'posted', null::text, '{}'::text[], 16991, 'The counter'),
    (1, 2, 'INTERIOR', 'posted', null, '{}', 17910, 'Window seats'),
    (1, 3, 'FOOD_AND_DRINK', 'posted', null, '{}', 17224, 'Flat white'),
    (1, 4, 'PRODUCT', 'publishing', null, '{}', 18933, 'Fresh pastries'),
    (1, 5, 'EXTERIOR', 'draft', null, '{}', 16256, 'The storefront'),
    (1, 6, 'PRODUCT', 'draft', 'Kabsi has a note on this photo.', array['dark'], 19282, 'Beans to take home'),
    (2, 1, 'INTERIOR', 'posted', null, '{}', 15893, 'Front desk'),
    (2, 2, 'INTERIOR', 'posted', null, '{}', 16397, 'Styling chairs'),
    (2, 3, 'AT_WORK', 'posted', null, '{}', 19784, 'Balayage in progress'),
    (2, 4, 'AT_WORK', 'publishing', null, '{}', 15773, 'Blow-dry'),
    (2, 5, 'EXTERIOR', 'draft', null, '{}', 15624, 'The studio front'),
    (2, 6, 'PRODUCT', 'draft', null, '{}', 19161, 'Care products'),
    (2, 7, 'ADDITIONAL', 'draft', 'Kabsi has a note on this photo.', array['dark'], 21298, 'Tools'),
    (2, 8, 'TEAMS', 'draft', null, '{}', 20435, 'The team')
  ) as t(loc, n, category, state, note, issues, bytes, caption)
  loop
    v_loc := case when r.loc = 1 then v_cafe else v_salon end;
    v_id := pg_temp.did(103, r.loc, r.n);
    insert into public.photos (id, location_id, storage_path, category, suitable, suitability_note, caption, state, kind, source, width, height, bytes,
      brightness, sharpness, phash, issues, flags, processed_at, created_at, uploaded_by)
    values (v_id, v_loc, v_loc::text || '/' || v_id::text || '.jpg', r.category, coalesce(array_length(r.issues, 1), 0) = 0, r.note, r.caption, r.state, 'photo',
      case when r.n % 2 = 0 then 'app' else 'whatsapp' end, 1200, 900, r.bytes, case when r.issues = array['dark'] then 0.18 else 0.62 end, 0.8,
      'demo' || r.loc::text || lpad(r.n::text, 4, '0') || 'a5c3e1f0b7d9', r.issues, '{}', now() - make_interval(days => 20 - r.n * 2),
      now() - make_interval(days => 21 - r.n * 2), v_qa)
    on conflict (id) do nothing;
    if r.state in ('posted', 'publishing') then
      insert into public.publications (id, location_id, target_type, target_id, payload, approved_by, approved_at, channel, route, state, idempotency_key,
        publish_after, attempts, google_ref, owner_told, owner_told_at, created_at)
      values (pg_temp.did(104, r.loc, 200 + r.n), v_loc, 'photo', v_id, jsonb_build_object('category', r.category, 'caption', r.caption), v_owner,
        case when r.state = 'posted' then now() - make_interval(days => 18 - r.n * 2) else now() - interval '2 hours' end, 'dashboard', 'api',
        case when r.state = 'posted' then 'verified' else 'approved' end,
        'demo-pack:photo:' || v_id::text, case when r.state = 'publishing' then now() + interval '2 days' end,
        case when r.state = 'posted' then 1 else 0 end, case when r.state = 'posted' then 'demo-photo-' || v_id::text end,
        case when r.state = 'posted' then 'final' end, case when r.state = 'posted' then now() - make_interval(days => 17 - r.n * 2) end,
        case when r.state = 'posted' then now() - make_interval(days => 18 - r.n * 2) else now() - interval '2 hours' end)
      on conflict (id) do nothing;
    end if;
  end loop;

  -- 7. One special day each, already on Google -----------------------------------------------------------------------------
  insert into public.special_hours (id, location_id, start_date, end_date, closed, open_time, close_time, reason, state)
  values (pg_temp.did(105, 1, 1), v_cafe, (now() + interval '7 days')::date, (now() + interval '7 days')::date, false, time '10:00', time '16:00',
      'Barista training in the morning', 'posted'),
    (pg_temp.did(105, 2, 1), v_salon, (now() + interval '10 days')::date, (now() + interval '10 days')::date, false, time '11:00', time '19:00',
      'Late opening for a first-time client evening', 'posted')
  on conflict (id) do nothing;
  insert into public.publications (id, location_id, target_type, target_id, payload, approved_by, approved_at, channel, route, state, idempotency_key,
    attempts, google_ref, owner_told, owner_told_at, created_at)
  select pg_temp.did(104, s.loc, 300), s.location_id, 'special_hours', s.id,
    jsonb_build_object('start_date', s.start_date, 'end_date', s.end_date, 'closed', s.closed, 'open_time', s.open_time, 'close_time', s.close_time, 'reason', s.reason),
    v_owner, now() - interval '3 days', 'dashboard', 'api', 'verified', 'demo-pack:hours:' || s.id::text, 1, 'demo-hours-' || s.id::text, 'final',
    now() - interval '2 days', now() - interval '3 days'
  from (select 1 as loc, h.* from public.special_hours h where h.id = pg_temp.did(105, 1, 1)
        union all select 2, h.* from public.special_hours h where h.id = pg_temp.did(105, 2, 1)) s
  on conflict (id) do nothing;

  -- 8. Plan, review cards and taps ----------------------------------------------------------------------------------------
  insert into public.plans (location_id, kind, status, starts_at, ends_at)
  select l, 'pro_yearly', 'active', now() - interval '40 days', now() + interval '325 days'
  from unnest(array[v_cafe, v_salon]) l
  where not exists (select 1 from public.plans p where p.location_id = l and p.status = 'active');

  insert into public.cards (code, location_id, label, status, destination, activated_at, kind, page_mode) values
    ('KQ7CAF', v_cafe, 'Counter card', 'active', 'https://kabsi.co', now() - interval '30 days', 'card', 'direct'),
    ('KQ9HRS', v_salon, 'Reception card', 'active', 'https://kabsi.co', now() - interval '30 days', 'card', 'direct')
  on conflict (code) do nothing;
  insert into public.taps (code, location_id, source, country, device, is_bot, created_at)
  select c.code, c.loc, (array['nfc', 'qr', 'message'])[1 + (g % 3)], 'US', (array['ios', 'android', 'other'])[1 + (g % 3)], false,
         now() - make_interval(days => (g * 7) % 34, hours => (g * 5) % 12)
  from (values ('KQ7CAF', v_cafe), ('KQ9HRS', v_salon), ('HBRDM2', v_cafe), ('JNPDM3', v_salon)) c(code, loc)
  cross join generate_series(1, 14) g
  where not exists (select 1 from public.taps t where t.location_id = c.loc and t.created_at > now() - interval '40 days' and t.code in ('KQ7CAF', 'KQ9HRS'))
    and c.code in ('KQ7CAF', 'KQ9HRS', 'HBRDM2', 'JNPDM3');

  -- 9. Profile Coach read, team invites ----------------------------------------------------------------------------------------
  update public.coach_profile set description_length = 612, additional_categories = 2, attributes = 11, read_at = now() - interval '1 day'
    where location_id in (v_cafe, v_salon);
  insert into public.team_invites (id, location_id, email, role, invited_by, expires_at) values
    (pg_temp.did(110, 1, 1), v_cafe, 'theo.marsh@example.com', 'manager', v_owner, now() + interval '5 days'),
    (pg_temp.did(110, 1, 2), v_cafe, 'sana.iqbal@example.com', 'staff', v_owner, now() + interval '6 days'),
    (pg_temp.did(110, 2, 1), v_salon, 'rafael.vega@example.com', 'manager', v_owner, now() + interval '5 days')
  on conflict (id) do nothing;
  insert into public.approval_policies (location_id, kind, policy, set_by)
  values (v_cafe, 'post', 'owner_and_managers', v_owner), (v_salon, 'photo', 'owner_and_managers', v_owner)
  on conflict do nothing;

  -- 10. Notifications in the bell ----------------------------------------------------------------------------------------------
  insert into public.notifications (location_id, user_id, to_address, category, kind, dedupe_key, title, link, in_app, email_state, created_at)
  select l.id, u.id, u.email, n.category, n.kind, 'demo-pack:' || l.id::text || ':' || n.kind, n.title, n.link, true, 'skipped', now() - make_interval(hours => n.hrs)
  from public.locations l
  cross join (select id, email from auth.users where id in (v_owner, v_qa)) u
  cross join (values ('review_new', 'review_new', 'A new 5-star review is ready for your reply', '/app/reviews', 3),
                     ('approval_needed', 'holiday_hours', 'Veterans Day: choose your hours', '/app/hours', 20),
                     ('weekly_report', 'weekly_report', 'Your Weekly Care Report is ready', '/app/report', 60)) n(category, kind, title, link, hrs)
  where l.id in (v_cafe, v_salon)
  on conflict do nothing;

  -- 11. Eight weeks of rating points, from the week before the seed's own daily points ---------------------------------------------
  insert into public.rating_snapshots (location_id, taken_on, rating, review_count)
  select s.loc, date '2026-10-24' - (k * 7), s.r[9 - k], s.c[9 - k]
  from (values (v_cafe, array[3.4, 3.5, 3.5, 3.6, 3.6, 3.7, 3.7, 3.7], array[8, 9, 10, 10, 11, 12, 12, 13]),
               (v_salon, array[4.4, 4.5, 4.5, 4.6, 4.6, 4.7, 4.7, 4.7], array[16, 17, 18, 19, 20, 21, 22, 24])) s(loc, r, c)
  cross join generate_series(1, 8) k
  on conflict (location_id, taken_on) do nothing;

  -- 12. Eight weeks of weekly reports (the newest two with the full work receipt) --------------------------------------------------
  for r in select * from (values
    (1, date '2026-09-14', 0, 1, 0, 1, 3.4, 8, 5), (1, date '2026-09-21', 1, 1, 0, 2, 3.5, 9, 7),
    (1, date '2026-10-26', 4, 1, 1, 3, 3.7, 13, 11), (1, date '2026-11-02', 5, 2, 2, 5, 3.7, 13, 9),
    (2, date '2026-09-14', 1, 0, 1, 2, 4.4, 16, 8), (2, date '2026-09-21', 1, 1, 0, 3, 4.5, 17, 9),
    (2, date '2026-10-26', 3, 1, 1, 4, 4.7, 22, 10), (2, date '2026-11-02', 4, 2, 2, 6, 4.7, 24, 12)
  ) as t(loc, wk, replies, posts, photos, new_reviews, rating, rating_count, taps)
  loop
    v_loc := case when r.loc = 1 then v_cafe else v_salon end;
    insert into public.weekly_reports (location_id, week_of, data)
    values (v_loc, r.wk, jsonb_build_object(
      'v', 2,
      'period', jsonb_build_object('from', r.wk, 'to', r.wk + 6),
      'rating', r.rating, 'rating_count', r.rating_count, 'rating_change', 0.1, 'rating_drop', false,
      'new_reviews', r.new_reviews, 'new_avg', 4.2, 'replied', r.replies, 'waiting', 4,
      'taps', jsonb_build_object('total', r.taps, 'nfc', r.taps / 2, 'qr', r.taps - r.taps / 2),
      'care', jsonb_build_object('headline', 'Kabsi took care of ' || (r.replies + r.posts + r.photos) || ' things this week.',
        'things', r.replies + r.posts + r.photos, 'profile_line', 'Checked 1,760 times. No important changes.'),
      'receipt', jsonb_build_object('v', 3,
        'did', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
            select jsonb_build_object('key', 'replies', 'label', 'Replies sent to Google', 'count', r.replies) x where r.replies > 0
            union all select jsonb_build_object('key', 'posts', 'label', 'Posts sent to Google', 'count', r.posts) where r.posts > 0
            union all select jsonb_build_object('key', 'photos', 'label', 'Photos sent to Google', 'count', r.photos) where r.photos > 0) d),
        'did_total', r.replies + r.posts + r.photos,
        'waiting', jsonb_build_object('count', 4, 'items', jsonb_build_array(
          jsonb_build_object('title', 'Your opening hours changed on Google', 'path', '/app/shield'),
          jsonb_build_object('title', 'Reply ready for a 5-star review', 'path', '/app/reviews'))),
        'next_step', jsonb_build_object('title', 'Check your hours for Veterans Day', 'path', '/app/hours'),
        'google', jsonb_build_object('example', true,
          'views', jsonb_build_object('this', 214, 'last', 198, 'change', '8% more'),
          'website_clicks', jsonb_build_object('this', 17, 'last', 15, 'change', '13% more'),
          'calls', jsonb_build_object('this', 9, 'last', 7, 'change', '29% more'),
          'directions', jsonb_build_object('this', 12, 'last', 11, 'change', '9% more')),
        'growth', jsonb_build_object('new_reviews', r.new_reviews, 'link_opens', r.taps, 'by', jsonb_build_object('message', r.taps / 3, 'qr', r.taps / 3, 'tag', r.taps - 2 * (r.taps / 3))),
        'ai', null, 'competitor', null, 'accuracy', null)))
    on conflict (location_id, week_of) do update set data = excluded.data
      where public.weekly_reports.week_of in (date '2026-10-26', date '2026-11-02');
  end loop;
  update public.weekly_reports w set data = jsonb_set(w.data, '{receipt,competitor}', to_jsonb('Larkhaven Roasters got 11 reviews this month. You got 3.'::text))
    where w.location_id = v_cafe and w.week_of = date '2026-11-02';

  -- 13. Where you show up: tracked searches, two scans each with 49 points, nearby cards, competitors ---------------------------------
  for r in select * from (values
    (1, 'coffee shop near me', 'Larkhaven Roasters', 'Coffee shop', 41.0, -71.5),
    (2, 'hair salon near me', 'Larkhaven Hair Co', 'Hair salon', 41.01, -71.49)
  ) as t(loc, kw, rival, category, lat, lng)
  loop
    v_loc := case when r.loc = 1 then v_cafe else v_salon end;
    v_kw := pg_temp.did(109, r.loc, 1);
    insert into public.visibility_keywords (id, location_id, keyword, radius_km, center_lat, center_lng, self_title, cadence, active, confirmed_at, next_run_at)
    values (v_kw, v_loc, r.kw, 3, r.lat, r.lng, (select name from public.locations where id = v_loc), 'monthly', true, now() - interval '35 days', now() + interval '24 days')
    on conflict (id) do nothing;
    for i in 1..2 loop
      v_scan := pg_temp.did(106, r.loc, i);
      if not exists (select 1 from public.visibility_scans where id = v_scan) then
        insert into public.visibility_scans (id, location_id, keyword_id, keyword, radius_km, center_lat, center_lng, zoom, grid_size, source, state, first, created_at, done_at)
        values (v_scan, v_loc, v_kw, r.kw, 3, r.lat, r.lng, 13, 7, 'mock', 'done', i = 1, now() - make_interval(days => case when i = 1 then 35 else 4 end),
                now() - make_interval(days => case when i = 1 then 35 else 4 end) + interval '6 minutes');
        insert into public.visibility_points (scan_id, row, col, lat, lng, rank, items, done_at)
        select v_scan, rw, cl, r.lat + (rw - 3) * 0.004, r.lng + (cl - 3) * 0.005,
               (case when 1 + greatest(abs(rw - 3), abs(cl - 3)) * 2 + ((rw * 3 + cl * 5 + i) % 3) + case when i = 1 then 3 else -1 end > 20 then null
                     else greatest(1, 1 + greatest(abs(rw - 3), abs(cl - 3)) * 2 + ((rw * 3 + cl * 5 + i) % 3) + case when i = 1 then 3 else -1 end) end)::smallint,
               jsonb_build_array(jsonb_build_object('rank', 1, 'title', r.rival), jsonb_build_object('rank', 2, 'title', r.category || ' on Pier Street')),
               now() - make_interval(days => case when i = 1 then 35 else 4 end)
        from generate_series(0, 6) rw cross join generate_series(0, 6) cl;
        select count(*) filter (where rank <= 3) into v_top3 from public.visibility_points where scan_id = v_scan;
        update public.visibility_scans s set top3 = v_top3, ranked = (select count(*) from public.visibility_points p where p.scan_id = s.id and p.rank is not null),
          average_rank = (select round(avg(rank), 1) from public.visibility_points p where p.scan_id = s.id and p.rank is not null),
          centre_rank = (select rank from public.visibility_points p where p.scan_id = s.id and row = 3 and col = 3),
          beats = jsonb_build_object('key', 'rival-1', 'name', r.rival, 'spots', 9, 'direction', 'north'),
          competitors = jsonb_build_array(jsonb_build_object('key', 'rival-1', 'name', r.rival), jsonb_build_object('key', 'rival-2', 'name', r.category || ' on Pier Street')),
          nearby = jsonb_build_object('top3', v_top3, 'points', 49, 'keyword', r.kw,
            'count_line', 'In the first 3 at ' || v_top3 || ' of 49 places Kabsi checked.', 'note', 'Sample Google Maps results, not customer counts.',
            'cards', jsonb_build_array(
              jsonb_build_object('kind', 'home', 'row', 3, 'col', 3, 'place', 'Near your ' || lower(r.category), 'name', null, 'rank',
                (select rank from public.visibility_points p where p.scan_id = s.id and row = 3 and col = 3), 'position', '2nd', 'first', r.rival, 'firstIsYou', false),
              jsonb_build_object('kind', 'away', 'row', 0, 'col', 5, 'place', 'Near Larkhaven Station', 'name', 'Larkhaven Station', 'rank',
                (select rank from public.visibility_points p where p.scan_id = s.id and row = 0 and col = 5), 'position', '9th', 'first', r.rival, 'firstIsYou', false),
              jsonb_build_object('kind', 'away', 'row', 6, 'col', 1, 'place', 'Near Pier Street Market', 'name', 'Pier Street Market', 'rank',
                (select rank from public.visibility_points p where p.scan_id = s.id and row = 6 and col = 1), 'position', '12th', 'first', r.category || ' on Pier Street', 'firstIsYou', false)))
        where s.id = v_scan;
        -- the cards say the position in words: keep them true to the stored ranks
        update public.visibility_scans s set nearby = jsonb_set(s.nearby, '{cards}', (
          select jsonb_agg(jsonb_set(c, '{position}', to_jsonb(case when (c ->> 'rank') is null then 'not in the first 20'
            when (c ->> 'rank')::int = 1 then '1st' when (c ->> 'rank')::int = 2 then '2nd' when (c ->> 'rank')::int = 3 then '3rd'
            else (c ->> 'rank') || 'th' end::text)) order by ord) from jsonb_array_elements(s.nearby -> 'cards') with ordinality as e(c, ord)))
          where s.id = v_scan;
      end if;
    end loop;
    insert into public.competitor_picks (location_id, key, name, picked_at)
    values (v_loc, 'rival-1', r.rival, now() - interval '35 days'), (v_loc, 'rival-2', r.category || ' on Pier Street', now() - interval '35 days')
    on conflict do nothing;
    insert into public.competitor_snapshots (location_id, key, taken_on, is_self, name, rating, reviews, photos, category, categories)
    select v_loc, s.key, current_date - s.d, s.is_self, s.nm, s.rt, s.rv, s.ph, r.category, array[r.category]
    from (values
      ('self', true, (select name from public.locations where id = v_loc), 4.3, case when r.loc = 1 then 10 else 21 end, 18, 35),
      ('self', true, (select name from public.locations where id = v_loc), 4.3, case when r.loc = 1 then 10 else 21 end, 18, 4),
      ('rival-1', false, r.rival, 4.6, 120, 12, 35), ('rival-1', false, r.rival, 4.6, 120, 12, 4),
      ('rival-2', false, r.category || ' on Pier Street', 4.4, 64, 40, 35), ('rival-2', false, r.category || ' on Pier Street', 4.4, 64, 40, 4)
    ) s(key, is_self, nm, rt, rv, ph, d)
    on conflict do nothing;
  end loop;
  -- Reviews gained over the month: the business +3, the first rival +11 (the one Competitor Watch line)
  update public.competitor_snapshots set reviews = case key when 'self' then reviews + 3 when 'rival-1' then reviews + 11 else reviews + 2 end
    where location_id in (v_cafe, v_salon) and taken_on = current_date - 4;

  -- 14. AI answers: three questions each, answers from two assistants (invented text) --------------------------------------------------
  for r in select * from (values
    (1, 1, 'where can i get a good flat white in larkhaven', 'owner', 'monthly', 'chatgpt', true, 2,
      'For a good flat white in Larkhaven, people often mention Larkhaven Roasters and Harbour Lane Coffee. Harbour Lane Coffee is a neighbourhood coffee shop by the harbour with window seats and a quiet corner for laptops.'),
    (1, 2, 'best coffee shop to work from near the harbour', 'suggested', 'monthly', 'perplexity', true, 1,
      'Harbour Lane Coffee is a good choice to work from near the harbour: free wifi, a quiet corner and pastries baked each morning.'),
    (1, 3, 'cafe with oat milk in larkhaven', 'suggested', 'biweekly', 'chatgpt', false, null,
      'Larkhaven Roasters and the cafe on Pier Street both serve oat milk. Check their opening hours before you go.'),
    (2, 1, 'who is a good hair stylist for curly hair in larkhaven', 'owner', 'monthly', 'chatgpt', true, 1,
      'Juniper Hair Studio is often recommended in Larkhaven for curly hair, with Ines and Rafael known for cuts that suit natural texture.'),
    (2, 2, 'balayage in larkhaven', 'suggested', 'monthly', 'perplexity', true, 3,
      'For balayage in Larkhaven, Larkhaven Hair Co, the salon on Pier Street and Juniper Hair Studio all offer it. Book ahead on Saturdays.'),
    (2, 3, 'hair salon open on saturday larkhaven', 'suggested', 'biweekly', 'chatgpt', false, null,
      'Larkhaven Hair Co and the salon on Pier Street are open on Saturdays. Call to check for walk-in slots.')
  ) as t(loc, n, q, kind, cadence, provider, named, pos, answer)
  loop
    v_loc := case when r.loc = 1 then v_cafe else v_salon end;
    v_prompt := pg_temp.did(108, r.loc, r.n);
    insert into public.ai_visibility_prompts (id, location_id, text, kind, cadence, active, confirmed_at, next_run_at)
    values (v_prompt, v_loc, r.q, r.kind, r.cadence, true, now() - interval '34 days', now() + interval '20 days')
    on conflict (id) do nothing;
    v_run := pg_temp.did(107, r.loc, r.n);
    insert into public.ai_visibility_runs (id, location_id, prompt_id, provider, model, source, state, run_at, named, "position", competitors, sources, source_count, cost_micros, expires_at)
    values (v_run, v_loc, v_prompt, r.provider, 'demo', 'live', 'done', now() - make_interval(days => 3 + r.n), r.named, r.pos,
      jsonb_build_array('Larkhaven Roasters', 'Pier Street Espresso'),
      jsonb_build_array(jsonb_build_object('domain', 'larkhaven-guide.example.com', 'title', 'Larkhaven local guide'),
                        jsonb_build_object('domain', 'eats.example.com', 'title', 'Where to eat in Larkhaven')), 2, 0, now() + interval '80 days')
    on conflict (id) do nothing;
    insert into public.ai_visibility_answers (run_id, location_id, answer) values (v_run, v_loc, r.answer) on conflict do nothing;
  end loop;

  -- 15. The assert: nothing of a non-demo business moved -----------------------------------------------------------------------------
  if pg_temp.fp() is distinct from v_before then
    raise exception 'demo pack: a row of a non-demo location changed';
  end if;
end
$pack$;
