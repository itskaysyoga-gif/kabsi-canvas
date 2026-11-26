-- FIX-6 item 5 (lane R decision R-168, 26 Nov 2026). Data only, no schema change.
-- The app opened on a demo business for Rashid because he is owner of three demo businesses through location_members:
-- Kabsi Test Salon, Kabsi Test Gym and Kabsi Test Garage (made for the request book tests, 9 Nov). Remove only those three
-- membership rows. Yawmiyati stays. The three businesses, their packs and their data stay; the WhatsApp replay harness
-- does not use them (it uses its own fictional personas on Harbour Lane Coffee and Juniper Hair Studio,
-- qa_ensure_whatsapp_personas). The member triggers run as usual: the phone bindings of these three were already ended by
-- FIX-4, and the owner row in the test organisation goes with the last owner membership.
--
-- Read-back before (4 rows: the three test businesses and Yawmiyati) and after (1 row: Yawmiyati) is in the session report.
delete from public.location_members
 where user_id = '80dc5bb0-f979-40fc-b09c-cfb7757214bc'
   and role = 'owner'
   and location_id in (
     'e5e00000-0000-4000-8000-000000000001',  -- Kabsi Test Salon
     'e5e00000-0000-4000-8000-000000000002',  -- Kabsi Test Gym
     'e5e00000-0000-4000-8000-000000000003'   -- Kabsi Test Garage
   );
