-- FIX-4 item 3 (25 Nov 2026): Rashid's phone (ending 6917) was still bound as owner to the three demo businesses from the
-- replay harness (Kabsi Test Salon, Kabsi Test Gym, Kabsi Test Garage), so WhatsApp asked him which business he meant.
-- End only those three bindings (revoked_at, nothing deleted). His Yawmiyati owner binding, his staff_admin binding and his
-- prospect row are not touched. The location_members rows stay, so the demo businesses keep working for the harness.
update public.phone_roles
   set revoked_at = now()
 where id in (
   'b03b62fa-11e5-431a-9c18-a0b0cfab0bd1',  -- Kabsi Test Salon
   '3c34e556-964b-4236-b925-3d4d7615dcda',  -- Kabsi Test Gym
   'aa35e100-bab8-4436-b105-cad880a1f66c'   -- Kabsi Test Garage
 )
   and source = 'membership'
   and role = 'owner'
   and location_id in ('e5e00000-0000-4000-8000-000000000001', 'e5e00000-0000-4000-8000-000000000002', 'e5e00000-0000-4000-8000-000000000003')
   and revoked_at is null;
