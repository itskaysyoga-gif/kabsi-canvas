-- Photos from WhatsApp are on both plans (COPY.md 25, master plan 30.15). V3's migration 20261026150502 turned the Essentials
-- limit on; this reads both plans so the line and the limit cannot drift apart again.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select is((private.plan_limits('essentials') ->> 'photos_from_whatsapp')::boolean, true, 'Essentials: photos_from_whatsapp is true');
select is((private.plan_limits('pro') ->> 'photos_from_whatsapp')::boolean, true, 'Pro: photos_from_whatsapp is true');

select * from finish();
rollback;
