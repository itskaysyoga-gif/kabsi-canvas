-- P0.6-02: the trigger functions and the touch cleaner of 20261021234210_product_events.sql were executable by
-- public (the default for a new function). Nothing in private may be called from the browser. Additive.
revoke execute on function private.audit_product_event() from public;
revoke execute on function private.user_product_event() from public;
revoke execute on function private.subscription_product_event() from public;
revoke execute on function private.clean_touch(jsonb) from public;
revoke execute on function private.location_via_code() from public;
