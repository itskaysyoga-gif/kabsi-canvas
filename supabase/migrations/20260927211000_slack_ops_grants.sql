-- D263: the slack Edge Function (service role) claims queued events, reads the digest and raises events.
grant execute on function public.ops_claim(int), public.ops_digest(int),
  public.ops_emit(text, text, text, text, jsonb, jsonb, text, text, text) to service_role;
grant select, update on public.ops_events to service_role;
