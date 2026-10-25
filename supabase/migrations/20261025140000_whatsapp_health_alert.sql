-- Fix 1 (master plan 30.11 item 8): the number health alert fires only when quality is YELLOW or RED or messaging is
-- BLOCKED. LIMITED at tier 250 is normal for a business Meta has not verified and is not an alert. A change in quality
-- or messaging while it is bad raises one ops event; the email text is built in the function. Additive: replaces one
-- function, no table changes.
create or replace function public.whatsapp_health_record(p_status text, p_quality text, p_messaging text, p_tier text,
  p_detail jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_prev_q text; v_prev_m text; v_bad boolean; v_changed boolean;
begin
  select quality, messaging into v_prev_q, v_prev_m from public.whatsapp_number_health order by checked_at desc limit 1;
  insert into public.whatsapp_number_health (status, quality, messaging, tier, detail)
  values (left(coalesce(p_status, 'unknown'), 40), left(p_quality, 40), left(p_messaging, 40), left(p_tier, 40),
    coalesce(p_detail, '{}'::jsonb));
  delete from public.whatsapp_number_health where checked_at < now() - interval '90 days';
  v_bad := upper(coalesce(p_quality, '')) in ('YELLOW', 'RED') or upper(coalesce(p_messaging, '')) = 'BLOCKED';
  v_changed := upper(coalesce(v_prev_q, '')) is distinct from upper(coalesce(p_quality, ''))
            or upper(coalesce(v_prev_m, '')) is distinct from upper(coalesce(p_messaging, ''));
  if v_bad and v_changed then
    perform public.ops_emit('whatsapp_number', 'alerts', 'WhatsApp number health changed',
      'Status ' || coalesce(p_status, '?') || ', quality ' || coalesce(p_quality, '?') || ', messaging ' || coalesce(p_messaging, '?'),
      '[]'::jsonb, '[]'::jsonb, 'whatsapp_number:' || to_char(now(), 'YYYY-MM-DD-HH24'));
  end if;
  return jsonb_build_object('bad', v_bad, 'changed', v_changed);
end $$;
revoke all on function public.whatsapp_health_record(text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.whatsapp_health_record(text, text, text, text, jsonb) to service_role;
