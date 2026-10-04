-- P0.1-06 (R-17, VIDEO "How Rashid uses this plan" step 3): the demo workspace. Run once with the Supabase
-- connector after migration 20261004120000_demo_workspace.sql. Every business, person, review and number here is
-- invented; "Larkhaven" is not a real town and +1 (555) 010-01xx numbers are reserved for fiction.
--
-- Before running: app_settings.demo_login_email must hold the demo login (set separately, so no personal address
-- is written in the repository). The demo login signs in with an email code like any owner.
--
-- Safe to run twice: fixed ids and "on conflict do nothing". It never updates or deletes anything; to reset the
-- demo after a recording, delete the two demo businesses first (only with the owner's explicit go).

do $$
declare
  v_email text := public.demo_login_email();
  v_user uuid;
  v_cafe constant uuid := 'de300000-0000-4000-8000-000000000001';
  v_salon constant uuid := 'de300000-0000-4000-8000-000000000002';
  v_week date := date_trunc('week', now())::date;
  r record;
begin
  if v_email is null then
    raise exception 'Set app_settings.demo_login_email before running the demo seed';
  end if;

  -- The demo login: an ordinary email-code account (no password).
  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is null then
    v_user := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated', v_email, '', now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (v_user::text, v_user, jsonb_build_object('sub', v_user::text, 'email', v_email, 'email_verified', true),
      'email', now(), now(), now());
  end if;

  -- Two fictional businesses, active, always on mock Google ('locations/demo-' ids), no plan and no partner.
  insert into public.locations (id, name, address, country, time_zone, google_account_id, google_location_id, status,
    signup_source, onboarding_step, consent_text, consent_at, access_granted_at, activated_at, created_by,
    reviews_synced_at, backlog_emailed_at, category, category_label, area, post_slot, auto_posts, digest_hour,
    is_demo, knowledge_card)
  values
    (v_cafe, 'Harbour Lane Coffee', '18 Harbour Lane, Larkhaven, USA', 'US', 'America/New_York', 'accounts/demo',
     'locations/demo-harbour-lane-coffee', 'active', 'staff', 'done', 'Demo workspace (fictional business)',
     now(), now(), now(), v_user, now(), now(), 'cafe', 'Coffee shop', 'Larkhaven', 'retail', false, 19, true,
     jsonb_build_object(
       'signature', 'Maya and the Harbour Lane team', 'tone', 'warm', 'tone_notes', 'Friendly, short, never pushy',
       'about', 'Neighbourhood coffee shop by the harbour. Espresso drinks, pour-over, pastries baked each morning.',
       'services', 'Espresso drinks, filter coffee, oat and almond milk, pastries, breakfast sandwiches, coffee beans to take home',
       'price_notes', 'No prices in replies', 'hours_note', 'Mon to Fri 07:00 to 18:00, Sat 08:00 to 16:00, Sun 08:00 to 15:00',
       'contact_phone', '+1 (555) 010-0142', 'mention', 'Seating by the window and a quiet corner for laptops',
       'staff_names', jsonb_build_array('Maya', 'Theo'))),
    (v_salon, 'Juniper Hair Studio', '305 Juniper Row, Larkhaven, USA', 'US', 'America/New_York', 'accounts/demo',
     'locations/demo-juniper-hair-studio', 'active', 'staff', 'done', 'Demo workspace (fictional business)',
     now(), now(), now(), v_user, now(), now(), 'hair_salon', 'Hair salon', 'Larkhaven', 'pro', false, 19, true,
     jsonb_build_object(
       'signature', 'Ines, Juniper Hair Studio', 'tone', 'warm', 'tone_notes', 'Calm and personal',
       'about', 'Small hair studio for cuts, colour and styling. Appointments and a few walk-in slots each day.',
       'services', 'Cuts, colour, balayage, blow-dry and styling, treatments for curly hair',
       'price_notes', 'No prices in replies', 'hours_note', 'Tue to Sat 09:00 to 19:00, closed Sun and Mon',
       'contact_phone', '+1 (555) 010-0187', 'mention', 'Booking ahead is best on Saturdays',
       'staff_names', jsonb_build_array('Ines', 'Rafael')))
  on conflict (id) do nothing;

  insert into public.location_members (location_id, user_id, role)
  values (v_cafe, v_user, 'owner'), (v_salon, v_user, 'owner')
  on conflict do nothing;

  -- What "Google" shows today (mock) and the owner-approved baseline. Harbour Lane's Saturday changed to Closed.
  insert into public.mock_listings (google_location_id, fields) values
    ('locations/demo-harbour-lane-coffee', jsonb_build_object('title', 'Harbour Lane Coffee', 'phone', '+1 (555) 010-0142',
      'address', '18 Harbour Lane, Larkhaven, USA', 'website', '', 'categories', 'Coffee shop',
      'hours', 'Mon to Fri 07:00 to 18:00, Sat Closed, Sun 08:00 to 15:00')),
    ('locations/demo-juniper-hair-studio', jsonb_build_object('title', 'Juniper Hair Studio', 'phone', '+1 (555) 010-0187',
      'address', '305 Juniper Row, Larkhaven, USA', 'website', '', 'categories', 'Hair salon',
      'hours', 'Tue to Sat 09:00 to 19:00'))
  on conflict (google_location_id) do nothing;

  insert into public.listing_baselines (location_id, fields, updated_by)
  select l.id, (select jsonb_object_agg(k, jsonb_build_object('display', v, 'raw', v))
                from jsonb_each_text(m.fields || case when l.id = v_cafe
                  then jsonb_build_object('hours', 'Mon to Fri 07:00 to 18:00, Sat 08:00 to 16:00, Sun 08:00 to 15:00')
                  else '{}'::jsonb end) as e(k, v)), 'owner'
  from public.locations l join public.mock_listings m on m.google_location_id = l.google_location_id
  where l.id in (v_cafe, v_salon)
  on conflict (location_id) do nothing;

  -- The profile change alert: "Google changed your Saturday hours to Closed".
  insert into public.listing_changes (id, location_id, field, old_value, new_value, detected_by, state, created_at)
  values ('de300000-0000-4000-8000-000000000301', v_cafe, 'hours',
    jsonb_build_object('display', 'Mon to Fri 07:00 to 18:00, Sat 08:00 to 16:00, Sun 08:00 to 15:00',
                       'raw', 'Mon to Fri 07:00 to 18:00, Sat 08:00 to 16:00, Sun 08:00 to 15:00'),
    jsonb_build_object('display', 'Mon to Fri 07:00 to 18:00, Sat Closed, Sun 08:00 to 15:00',
                       'raw', 'Mon to Fri 07:00 to 18:00, Sat Closed, Sun 08:00 to 15:00'),
    'scheduled_check', 'open', now() - interval '2 hours')
  on conflict (id) do nothing;

  -- 12 invented reviews per business. state: drafted (waiting for the owner, with a draft) or posted (replied).
  -- n 1 is S03 (1 star, cold coffee), n 2 is S01 (2 stars); n 5 needs care (urgent).
  for r in select * from (values
    (v_cafe, 1, 'Dana Whitfield', 1, 'en', 'normal', 'drafted', 1,
      'Waited 25 minutes for a latte and when it came it was cold. The place was not even that busy.', null::text,
      'Thank you for telling us, Dana. Waiting 25 minutes and then getting a cold latte is not what we want for anyone. We have added a second person at the bar in the mornings so orders move faster. Please contact us through the details on our profile so we can make your next coffee right. Maya and the Harbour Lane team'),
    (v_cafe, 2, 'Marcus Lee', 2, 'en', 'normal', 'drafted', 2,
      'Nice room but my breakfast sandwich was missing the egg and nobody noticed.', null,
      'Thank you for the honest review, Marcus. A breakfast sandwich without the egg is a real miss, and we are sorry nobody caught it. We now check every sandwich before it leaves the counter. We would like to put it right, so please contact us through the details on our profile. Maya and the Harbour Lane team'),
    (v_cafe, 3, 'Priya Raman', 5, 'en', 'normal', 'drafted', 1,
      'Best flat white in Larkhaven. Theo remembered my order on my second visit.', null,
      'Thank you, Priya. Theo will be glad to hear it, and we are happy the flat white hit the spot. See you at the window seat soon. Maya and the Harbour Lane team'),
    (v_cafe, 4, 'Lucía Fernández', 4, 'es', 'normal', 'drafted', 3,
      'Muy buen café y los cruasanes están recién hechos. A veces hay que esperar un poco por mesa.', null,
      'Muchas gracias, Lucía. Nos alegra que le gustaran el café y los cruasanes del día. Tiene razón sobre las mesas por la mañana, y estamos buscando cómo aprovechar mejor el espacio. Maya y el equipo de Harbour Lane'),
    (v_cafe, 5, 'Sam Okafor', 1, 'en', 'urgent', 'drafted', 0,
      'I told the barista about my nut allergy and still got almond milk. I had a reaction and had to leave.', null,
      'Sam, we are very sorry. An allergy is serious and this should not have happened. We are reviewing how allergy requests are passed to the bar with the whole team today. Please contact us through the details on our profile so we can hear exactly what happened. Maya and the Harbour Lane team'),
    (v_cafe, 6, 'Hannah Brooks', 5, 'en', 'normal', 'posted', 6,
      'Lovely quiet corner to work in the afternoons. Good wifi and friendly staff.',
      'Thank you, Hannah. The quiet corner is there for exactly that, so we are glad it works for you. Maya and the Harbour Lane team', null),
    (v_cafe, 7, 'Owen Price', 4, 'en', 'normal', 'posted', 9,
      'Great pour-over. Pastries sell out early so come before ten.',
      'Thanks, Owen. Good tip on the pastries, they do go fast. Maya and the Harbour Lane team', null),
    (v_cafe, 8, 'Grace Kim', 5, 'en', 'normal', 'posted', 12,
      'My go-to on the way to work. Always quick in the morning.',
      'Thank you, Grace. We are glad to be part of your morning. Maya and the Harbour Lane team', null),
    (v_cafe, 9, 'Tom Becker', 3, 'en', 'normal', 'posted', 15,
      'Coffee is good but the music was a bit loud for a Sunday morning.',
      'Thank you for the feedback, Tom. We have turned the Sunday music down a notch. Maya and the Harbour Lane team', null),
    (v_cafe, 10, 'Aisha Grant', 5, 'en', 'normal', 'posted', 18,
      'The oat milk cappuccino is perfect and the window seats are the best in town.',
      'Thank you, Aisha. Those window seats are our favourite too. Maya and the Harbour Lane team', null),
    (v_cafe, 11, 'Leo Martin', 4, 'en', 'normal', 'posted', 22,
      'Friendly team and good beans to take home.',
      'Thanks, Leo. Enjoy the beans, and tell us how you brew them. Maya and the Harbour Lane team', null),
    (v_cafe, 12, 'Nora Quinn', 5, 'en', 'normal', 'posted', 27,
      'Warm welcome every time. The cinnamon bun is worth the walk.',
      'Thank you, Nora. We will keep the cinnamon buns coming. Maya and the Harbour Lane team', null),
    (v_salon, 1, 'Chloe Adams', 2, 'en', 'normal', 'drafted', 1,
      'Colour came out much darker than what I asked for and I was in a hurry so I did not say anything.', null,
      'Thank you for telling us, Chloe. Colour that is darker than you asked for is not the result we want. We would be glad to look at it with you and adjust it. Please contact us through the details on our profile to arrange a time. Ines, Juniper Hair Studio'),
    (v_salon, 2, 'Ben Carter', 5, 'en', 'normal', 'drafted', 2,
      'Rafael gave me the best haircut I have had in years. Quick and no fuss.', null,
      'Thank you, Ben. Rafael will be happy to read this. See you next time. Ines, Juniper Hair Studio'),
    (v_salon, 3, 'Camille Durand', 5, 'fr', 'normal', 'drafted', 3,
      'Accueil chaleureux et un balayage magnifique. Je recommande.', null,
      'Merci beaucoup, Camille. Nous sommes ravis que le balayage vous plaise. À bientôt. Ines, Juniper Hair Studio'),
    (v_salon, 4, 'Jordan Ellis', 3, 'en', 'normal', 'drafted', 4,
      'Good cut but I waited twenty minutes past my appointment time.', null,
      'Thank you, Jordan. We are glad you liked the cut, and we are sorry about the wait. We are leaving more time between Saturday appointments so this happens less. Ines, Juniper Hair Studio'),
    (v_salon, 5, 'Mia Thompson', 4, 'en', 'normal', 'posted', 6,
      'They really know curly hair. Booking ahead on Saturdays is a must.',
      'Thank you, Mia. Curly hair is a favourite of ours. Ines, Juniper Hair Studio', null),
    (v_salon, 6, 'Ethan Wright', 5, 'en', 'normal', 'posted', 8,
      'Clean, calm studio and a great blow-dry.',
      'Thank you, Ethan. We are glad you enjoyed it. Ines, Juniper Hair Studio', null),
    (v_salon, 7, 'Sofia Rossi', 5, 'en', 'normal', 'posted', 11,
      'Ines listened to exactly what I wanted. Love the result.',
      'Thank you, Sofia. It was a pleasure. Ines, Juniper Hair Studio', null),
    (v_salon, 8, 'Daniel Novak', 1, 'en', 'normal', 'posted', 14,
      'Appointment was moved without asking me first.',
      'Daniel, we are sorry the change was not agreed with you first. We now confirm every change with the client before it is made. Ines, Juniper Hair Studio', null),
    (v_salon, 9, 'Emma Clarke', 5, 'en', 'normal', 'posted', 17,
      'Best treatment for my dry hair. It feels so much softer.',
      'Thank you, Emma. We are happy the treatment helped. Ines, Juniper Hair Studio', null),
    (v_salon, 10, 'Noah Patel', 4, 'en', 'normal', 'posted', 21,
      'Good cut, friendly people, easy to book.',
      'Thanks, Noah. See you next time. Ines, Juniper Hair Studio', null),
    (v_salon, 11, 'Olivia Hart', 5, 'en', 'normal', 'posted', 24,
      'Rafael fixed a bad cut from somewhere else. Very patient.',
      'Thank you, Olivia. Rafael is glad it worked out. Ines, Juniper Hair Studio', null),
    (v_salon, 12, 'Lucas Moreau', 4, 'en', 'normal', 'posted', 28,
      'Nice atmosphere, good coffee while you wait.',
      'Thank you, Lucas. We are glad you felt at home. Ines, Juniper Hair Studio', null)
  ) as t(loc, n, who, stars, lang, urgency, state, days, comment, reply, draft)
  loop
    declare
      v_gid text := 'demo-' || case when r.loc = v_cafe then 'hlc-' else 'jhs-' end || lpad(r.n::text, 2, '0');
      v_gloc text := case when r.loc = v_cafe then 'locations/demo-harbour-lane-coffee' else 'locations/demo-juniper-hair-studio' end;
      v_at timestamptz := now() - make_interval(days => r.days, hours => r.n);
      v_rid uuid := ('de300000-0000-4000-8000-' || case when r.loc = v_cafe then '0000001' else '0000002' end
                     || lpad(r.n::text, 5, '0'))::uuid;
    begin
      insert into public.mock_google_reviews (review_id, google_location_id, reviewer_name, star_rating, comment, create_time,
        reply_comment, reply_update_time)
      values (v_gid, v_gloc, r.who, r.stars, r.comment, v_at, r.reply, case when r.reply is not null then v_at + interval '5 hours' end)
      on conflict (review_id) do nothing;
      insert into public.reviews (id, location_id, google_review_id, reviewer_name, star_rating, comment, language, urgency,
        urgency_reasons, state, existing_reply, review_created_at, is_backlog, notified_at, reply_state, fetched_at, source)
      values (v_rid, r.loc, v_gid, r.who, r.stars, r.comment, r.lang, r.urgency,
        case when r.urgency = 'urgent' then array['health or safety'] end, r.state, r.reply, v_at, false, now(),
        case when r.state = 'posted' then 'live' end, now(), 'google')
      on conflict (id) do nothing;
      if r.draft is not null then
        insert into public.reply_drafts (review_id, version, body, source, safety_ok, safety_notes, model)
        values (v_rid, 1, r.draft, 'ai', true, '{}', 'demo-seed')
        on conflict (review_id, version) do nothing;
      end if;
    end;
  end loop;

  -- Last week's Weekly Care Report for each business.
  insert into public.weekly_reports (location_id, week_of, data) values
    (v_cafe, v_week, jsonb_build_object('period', jsonb_build_object('from', to_char(v_week - 7, 'Mon FMDD'), 'to', to_char(v_week, 'Mon FMDD')),
      'rating', 4.6, 'rating_count', 128, 'rating_change', 0.1, 'rating_drop', false, 'new_reviews', 5, 'new_avg', 3.8,
      'replied', 3, 'waiting', 2, 'taps', jsonb_build_object('total', 14, 'nfc', 9, 'qr', 5))),
    (v_salon, v_week, jsonb_build_object('period', jsonb_build_object('from', to_char(v_week - 7, 'Mon FMDD'), 'to', to_char(v_week, 'Mon FMDD')),
      'rating', 4.8, 'rating_count', 86, 'rating_change', 0, 'rating_drop', false, 'new_reviews', 3, 'new_avg', 4.3,
      'replied', 2, 'waiting', 1, 'taps', jsonb_build_object('total', 6, 'nfc', 4, 'qr', 2)))
  on conflict (location_id, week_of) do nothing;

  -- Holiday-hours reminder: special hours drafted for the owner to confirm (Thanksgiving is the fourth Thursday of November).
  insert into public.special_hours (id, location_id, start_date, end_date, closed, open_time, close_time, reason, state)
  select 'de300000-0000-4000-8000-000000000401'::uuid, v_cafe, d, d, true, null::time, null::time, 'Thanksgiving', 'draft'
  from (select (date_trunc('month', make_date(extract(year from now())::int, 11, 1))::date
               + ((4 - extract(isodow from make_date(extract(year from now())::int, 11, 1))::int + 7) % 7) + 21) as d) x
  union all
  select 'de300000-0000-4000-8000-000000000402'::uuid, v_salon, make_date(extract(year from now())::int, 12, 24),
    make_date(extract(year from now())::int, 12, 24), false, '09:00'::time, '14:00'::time, 'Christmas Eve', 'draft'
  on conflict (id) do nothing;

  -- A post idea waiting for approval (Home shows a review reply, a profile change and a post idea).
  insert into public.gbp_posts (id, location_id, owner_input, body, cta_type, state, source)
  values ('de300000-0000-4000-8000-000000000501', v_cafe, 'Weekly draft by Kabsi',
    'Fresh cinnamon buns come out of the oven at 7 every morning. Grab one with a flat white before work, or take a bag of our house beans home for the weekend.',
    'CALL', 'draft', 'auto')
  on conflict (id) do nothing;

  -- One review link per business. It opens the Kabsi home page, never a Google page, because the businesses are invented.
  insert into public.cards (code, location_id, label, status, destination, activated_at, kind) values
    ('HBRDM2', v_cafe, 'Review link', 'active', 'https://kabsi.co', now(), 'link'),
    ('JNPDM3', v_salon, 'Review link', 'active', 'https://kabsi.co', now(), 'link')
  on conflict (code) do nothing;
end $$;
