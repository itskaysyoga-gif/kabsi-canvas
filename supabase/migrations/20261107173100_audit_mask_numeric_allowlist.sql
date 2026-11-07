-- R-123 part B hardening. Never pass arbitrary numeric IDs or flags through the audit mask.
-- This mask remains safe only for server-controlled aggregates, not arbitrary JSON documents.

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
      elsif jsonb_typeof(v_value) = 'number' then
        -- Numeric phone numbers and account identifiers must not escape.
        if v_key in ('count', 'locations', 'active_locations', 'demo_locations') then
          v_out := v_out || jsonb_build_object(v_key, v_value);
        else
          v_out := v_out || jsonb_build_object(v_key, '[hidden]');
        end if;
      elsif jsonb_typeof(v_value) = 'boolean' then
        v_out := v_out || jsonb_build_object(v_key, '[hidden]');
      else
        v_out := v_out || jsonb_build_object(v_key, v_value);
      end if;
    end loop;
    return v_out;
  end if;

  if jsonb_typeof(p_data) in ('string', 'number', 'boolean') then
    return to_jsonb('[hidden]'::text);
  end if;
  return p_data;
end;
$$;

