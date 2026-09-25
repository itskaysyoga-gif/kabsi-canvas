-- Advisor 0014: keep extensions out of the public schema. pg_net's functions live in schema "net" either way.
drop extension if exists pg_net;
create extension pg_net schema extensions;
