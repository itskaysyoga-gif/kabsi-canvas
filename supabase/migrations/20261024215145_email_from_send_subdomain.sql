-- Ops 1 part B (master plan 30.4): product mail goes from "Kabsi <hello@send.kabsi.co>" with Reply-To hello@kabsi.co, so the
-- root domain keeps its reputation for people's own mail. The live row held "Kabsi <hello@kabsi.co>", which wins over the
-- constant in _shared/kabsi.ts. send.kabsi.co is verified in Resend (eu-west-1, sending enabled, checked 24 Oct 2026).
-- Reversible with one update of the same row.
update public.app_settings
   set value = 'Kabsi <hello@send.kabsi.co>', updated_at = now()
 where key = 'email_from';
