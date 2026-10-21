-- P0.8-01, removal file 2 of 3, run by Hussein in the Supabase SQL editor after file 1 (it holds delete statements,
-- which the connector cannot run). It removes the test and retired rows that live in tables Kabsi keeps. Rows in the
-- retired tables themselves go with those tables in file 3.
--
-- Removes, counted on 21 Oct 2026:
--   1 organisation:  "QA Partner" (type partner), with its 1 organisation membership (cascade) and its 1
--                    partner_clients row (cascade: the link to Safa Chicken)
--   20 review cards: the unassigned card codes minted for QA Partner (no business, never tapped)
--   1 plan:          Yawmiyati's unpaid, pending "lebanon_yearly" plan (no payment); its three paid Pro plans stay
-- Nothing else changes: Safa Chicken, Yawmiyati, QA Bakery and the demo businesses keep every other row.
--
-- Read-back (expected: 0, 0, 0, then 3 for Yawmiyati's paid plans):
--   select count(*) from public.organizations where type = 'partner';
--   select count(*) from public.cards where partner_id is not null and location_id is null;
--   select count(*) from public.plans where kind = 'lebanon_yearly';
--   select count(*) from public.plans p join public.locations l on l.id = p.location_id
--    where l.name = 'Yawmiyati' and p.kind = 'pro_6m' and p.status = 'active';

delete from public.organizations where type = 'partner';
delete from public.cards where partner_id is not null and location_id is null and status = 'unassigned';
delete from public.plans p
 where p.kind = 'lebanon_yearly' and p.status = 'pending'
   and not exists (select 1 from public.payments pay where pay.plan_id = p.id);
