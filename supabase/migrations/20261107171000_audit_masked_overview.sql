-- R-123 part B. An allowlisted, read-only preview with server-side redaction.
-- This does not widen public.is_staff() or expose a raw customer table.

create or replace function private.audit_mask_json(p_data jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_key text;
  v_value jsonb;
  v_out jsonb;
  v_part jsonb;
  v_plain text;
begin
  if p_data is null then return null; end if;

  if jsonb_typeof(p_data) = 'array' then
    v_out := '[]'::jsonb;
    for v_part in select value from jsonb_array_elements(p_data) loop
      v_out := v_out || jsonb_build_array(private.audit_mask_json(v_part));
    end loop;
    return v_out;
  end if;

  if jsonb_typeof(p_data) = 'object' then
    v_out := '{}'::jsonb;
    for v_key, v_value in select key, value from jsonb_each(p_data) loop
      if jsonb_typeof(v_value) in ('object', 'array') then
        v_out := v_out || jsonb_build_object(v_key, private.audit_mask_json(v_value));
      elsif jsonb_typeof(v_value) = 'string' then
        v_plain := v_value #>> '{}';
        if v_key in (
           'category', 'trade', 'sector', 'country', 'status', 'state',
           'kind', 'provider', 'metric', 'plan', 'tier', 'source', 'month'
        ) and v_plain ~ '^[A-Za-z][A-Za-z _-]{0,63}$' then
          v_out := v_out || jsonb_build_object(v_key, v_value);
        elsif v_key in ('created_at', 'checked_at', 'updated_at', 'due_at',
                        'expires_at', 'observed_on', 'week_of')
           and v_plain ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}' then
          v_out := v_out || jsonb_build_object(v_key, v_value);
        else
          v_out := v_out || jsonb_build_object(v_key, '[hidden]');
        end if;
      else
        v_out := v_out || jsonb_build_object(v_key, v_value);
      end if;
    end loop;
    return v_out;
  end if;

  if jsonb_typeof(p_data) = 'string' then
    return to_jsonb('[hidden]'::text);
  end if;
  return p_data;
end;
$$;

revoke all on function private.audit_mask_json(jsonb) from public, anon, authenticated;

create or replace function public.audit_staff_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_data jsonb;
begin
  if not private.is_auditor() then
    raise exception 'This access has ended.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'locations', (select count(*) from public.locations),
    'active_locations', (select count(*) from public.locations where status = 'active'),
    'demo_locations', (select count(*) from public.locations where is_demo),
    'categories', (
      select coalesce(jsonb_agg(jsonb_build_object('category', x.category, 'count', x.n)
                                order by x.n desc), '[]'::jsonb)
      from (
        select coalesce(nullif(category, ''), 'other') as category, count(*) as n
        from public.locations group by 1
      ) x
    ),
    'status', (
      select coalesce(jsonb_agg(jsonb_build_object('status', x.status, 'count', x.n)
                                order by x.n desc), '[]'::jsonb)
      from (select status, count(*) as n from public.locations group by 1) x
    )
  ) into v_data;
  return private.audit_mask_json(v_data);
end;
$$;

revoke all on function public.audit_staff_overview() from public, anon;
grant execute on function public.audit_staff_overview() to authenticated;
