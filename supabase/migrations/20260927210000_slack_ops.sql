-- D263: Slack as Kabsi's operations hub. Every business event is written to an outbox (ops_events) by triggers,
-- and the `slack` Edge Function posts it to the right channel (immediately via pg_net, with a 1-minute cron as a
-- safety net). Events wait in the outbox until the Slack app is installed, so nothing is lost.
-- Channels: alerts, customers, chats, money, partners, daily. Staff-only: no browser access at all.

-- ── outbox
create table public.ops_events (
  id bigint generated always as identity primary key,
  kind text not null,
  channel text not null check (channel in ('alerts','customers','chats','money','partners','daily')),
  title text not null,
  body text,
  fields jsonb not null default '[]',   -- [{"l": label, "v": value}]
  buttons jsonb not null default '[]',  -- [{"t": text, "u": url}]
  dedupe_key text unique,
  thread_key text,                      -- dedupe_key of the message this one belongs to
  mode text not null default 'post' check (mode in ('post','reply','reply_broadcast','update')),
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  slack_channel text,
  slack_ts text,
  attempts int not null default 0,
  error text
);
create index ops_events_pending on public.ops_events (id) where sent_at is null;
create index ops_events_thread on public.ops_events (dedupe_key) where slack_ts is not null;
alter table public.ops_events enable row level security;
revoke all on public.ops_events from anon, authenticated;

-- Partners who prefer WhatsApp (or Slack, Instagram): Slack alerts about them carry a one-tap WhatsApp button.
alter table public.partners
  add column whatsapp text check (whatsapp is null or whatsapp ~ '^\+?[0-9 ()-]{7,24}$'),
  add column preferred_channel text not null default 'email' check (preferred_channel in ('email','whatsapp','slack','instagram'));

insert into public.app_settings (key, value) values
  ('slack_channels', '{"alerts":"C0C4XH03ESY","customers":"C0C4XH03C3W","chats":"C0C4CFS5C31","money":"C0C4NPYF0FP","partners":"C0C4RU2Q2ES","daily":"C0C4RU2NF3Q"}'),
  ('slack_staff_users', '["U8RNNNBCH"]'),
  ('app_url', 'https://kabsi-app.lovable.app')
on conflict (key) do nothing;

-- ── helpers
create or replace function public.ops_app_url() returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select value from public.app_settings where key = 'app_url'), 'https://kabsi-app.lovable.app')
$$;

create or replace function public.url_encode(p text) returns text language sql immutable set search_path = '' as $$
  select coalesce(string_agg(case when ch ~ '^[A-Za-z0-9_.~-]$' then ch
    else regexp_replace(upper(encode(convert_to(ch, 'UTF8'), 'hex')), '(..)', '%\1', 'g') end, '' order by i), '')
  from regexp_split_to_table(coalesce(p, ''), '') with ordinality as t(ch, i)
$$;

-- https://wa.me/<digits>?text=... or null when there's no usable number.
create or replace function public.wa_link(p_phone text, p_text text) returns text language sql immutable set search_path = '' as $$
  select case when length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 7
    then 'https://wa.me/' || regexp_replace(p_phone, '\D', '', 'g') || '?text=' || public.url_encode(p_text) end
$$;

-- Button helper: skips a button whose url is null.
create or replace function public.ops_btn(p_text text, p_url text) returns jsonb language sql immutable set search_path = '' as $$
  select case when p_url is null or p_url = '' then '[]'::jsonb else jsonb_build_array(jsonb_build_object('t', p_text, 'u', p_url)) end
$$;
create or replace function public.ops_f(p_label text, p_value text) returns jsonb language sql immutable set search_path = '' as $$
  select case when p_value is null or btrim(p_value) = '' then '[]'::jsonb else jsonb_build_array(jsonb_build_object('l', p_label, 'v', left(p_value, 300))) end
$$;

-- The one way to raise an event. Never breaks the caller's transaction.
create or replace function public.ops_emit(
  p_kind text, p_channel text, p_title text, p_body text default null, p_fields jsonb default '[]',
  p_buttons jsonb default '[]', p_dedupe text default null, p_thread text default null, p_mode text default 'post'
) returns void language plpgsql security definer set search_path = '' as $$
declare v_id bigint;
begin
  insert into public.ops_events (kind, channel, title, body, fields, buttons, dedupe_key, thread_key, mode)
  values (p_kind, p_channel, left(p_title, 250), left(p_body, 2900), coalesce(p_fields, '[]'), coalesce(p_buttons, '[]'),
          p_dedupe, p_thread, coalesce(p_mode, 'post'))
  on conflict (dedupe_key) do nothing
  returning id into v_id;
  if v_id is not null then
    perform public.call_internal('slack/flush');
  end if;
exception when others then
  raise warning 'ops_emit % failed: %', p_kind, sqlerrm;
end $$;

create or replace function public.ops_staff_btn(p_label text default 'Open staff page') returns jsonb language sql stable set search_path = '' as $$
  select public.ops_btn(p_label, public.ops_app_url() || '/staff')
$$;

-- ── sign-ups
create or replace function public.ops_on_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null and new.email not like '%@test.local' then
    perform public.ops_emit('signup', 'customers', ':wave: New account: ' || new.email,
      'Someone signed in to Kabsi for the first time.', '[]', public.ops_staff_btn(), 'user:' || new.id);
  end if;
  return new;
end $$;
create trigger ops_user_created after insert on auth.users for each row execute function public.ops_on_user();

-- ── businesses
create or replace function public.ops_on_location() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_partner public.partners; v_owner text; v_msg text;
begin
  if new.partner_id is not null then select * into v_partner from public.partners where id = new.partner_id; end if;
  if tg_op = 'INSERT' then
    select email into v_owner from auth.users where id = new.created_by;
    if coalesce(v_owner, '') like '%@test.local' then return new; end if;
    perform public.ops_emit('business_new', 'customers', ':convenience_store: New business started setup: ' || new.name,
      new.address,
      public.ops_f('Country', new.country) || public.ops_f('Owner', v_owner) || public.ops_f('Came from', new.signup_source)
        || public.ops_f('Partner', v_partner.name),
      public.ops_staff_btn(), 'loc_new:' || new.id);
    return new;
  end if;

  if new.status = 'active' and old.status is distinct from 'active' then
    perform public.ops_emit('business_live', 'customers', ':tada: ' || new.name || ' is live on Kabsi',
      'Google access works. Reviews are synced and drafted from now on.',
      public.ops_f('Country', new.country) || public.ops_f('Partner', v_partner.name),
      public.ops_staff_btn(), 'loc_live:' || new.id || ':' || extract(epoch from now())::bigint);
    if v_partner.id is not null then
      v_msg := 'Hi ' || v_partner.name || ', good news: ' || new.name || ' is now live on Kabsi. Thank you for bringing them in! Rasheed from Kabsi';
      perform public.ops_emit('partner_business_live', 'partners', ':tada: ' || v_partner.name || '''s client ' || new.name || ' is live',
        null, public.ops_f('Partner prefers', v_partner.preferred_channel),
        public.ops_btn('Tell them on WhatsApp', public.wa_link(v_partner.whatsapp, v_msg))
          || public.ops_btn('Email them', 'mailto:' || v_partner.contact_email || '?subject=' || public.url_encode(new.name || ' is live on Kabsi') || '&body=' || public.url_encode(v_msg)),
        'ploc_live:' || new.id || ':' || extract(epoch from now())::bigint);
    end if;
  end if;
  if new.access_lost_at is not null and old.access_lost_at is null then
    perform public.ops_emit('access_lost', 'alerts', ':warning: Google access lost: ' || new.name,
      'Kabsi can''t reach this Google profile any more (hello@kabsi.co removed or access changed). The owner was emailed the steps to add it back.',
      public.ops_f('Country', new.country) || public.ops_f('Partner', v_partner.name), public.ops_staff_btn(),
      'loc_lost:' || new.id || ':' || extract(epoch from new.access_lost_at)::bigint);
  end if;
  if new.deletion_requested_at is not null and old.deletion_requested_at is null then
    perform public.ops_emit('deletion_requested', 'customers', ':wastebasket: Deletion requested: ' || new.name,
      'The owner asked to delete this business. It will be deleted in 7 days unless they cancel.', '[]', public.ops_staff_btn(),
      'loc_del:' || new.id || ':' || extract(epoch from new.deletion_requested_at)::bigint);
  elsif new.deletion_requested_at is null and old.deletion_requested_at is not null then
    perform public.ops_emit('deletion_cancelled', 'customers', ':relieved: Deletion cancelled: ' || new.name, null, '[]', '[]',
      'loc_undel:' || new.id || ':' || extract(epoch from now())::bigint);
  end if;
  if new.status in ('paused', 'disabled') and old.status is distinct from new.status then
    perform public.ops_emit('business_' || new.status, 'customers', ':pause_button: ' || new.name || ' is now ' || new.status, null,
      '[]', public.ops_staff_btn(), 'loc_' || new.status || ':' || new.id || ':' || extract(epoch from now())::bigint);
  end if;
  return new;
end $$;
create trigger ops_location after insert or update on public.locations for each row execute function public.ops_on_location();

-- ── plans and payments
create or replace function public.ops_plan_label(p text) returns text language sql immutable set search_path = '' as $$
  select case p when 'pro_6m' then 'Kabsi Pro, 6 months' when 'pro_12m' then 'Kabsi Pro, 12 months' when 'partner' then 'Partner plan'
    when 'card' then 'Card' when 'cards_5' then '5 cards' when 'extra_card' then 'Extra card' else coalesce(p, '') end
$$;
create or replace function public.ops_on_plan() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  select name into v_name from public.locations where id = new.location_id;
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') and new.kind <> 'partner' then
    perform public.ops_emit('plan_started', 'money', ':white_check_mark: Plan started: ' || coalesce(v_name, 'a business'),
      null, public.ops_f('Plan', public.ops_plan_label(new.kind)) || public.ops_f('Until', to_char(new.ends_at, 'DD Mon YYYY')),
      public.ops_staff_btn(), 'plan_on:' || new.id);
  elsif tg_op = 'UPDATE' and new.status = 'ended' and old.status = 'active' and new.kind <> 'partner' then
    perform public.ops_emit('plan_ended', 'customers', ':hourglass: Plan ended: ' || coalesce(v_name, 'a business'),
      'Their paid plan finished. The card keeps working; drafts, Shield and reports stopped. A good moment to check in.',
      public.ops_f('Plan', public.ops_plan_label(new.kind)), public.ops_staff_btn(), 'plan_end:' || new.id);
  end if;
  return new;
end $$;
create trigger ops_plan after insert or update of status on public.plans for each row execute function public.ops_on_plan();

create or replace function public.ops_on_payment() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  select name into v_name from public.locations where id = new.location_id;
  perform public.ops_emit('payment', 'money', ':moneybag: Payment recorded: $' || to_char(new.amount_usd, 'FM999990.00') || ' · ' || coalesce(v_name, 'no business'),
    null, public.ops_f('For', public.ops_plan_label(new.item)) || public.ops_f('Method', upper(new.method)) || public.ops_f('Reference', new.reference),
    public.ops_staff_btn(), 'pay:' || new.id);
  return new;
end $$;
create trigger ops_payment after insert on public.payments for each row execute function public.ops_on_payment();

create or replace function public.ops_on_claim() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_who text; v_for text; v_by text;
begin
  if new.kind = 'partner_invoice' then
    select p.name, to_char(i.month, 'FMMonth YYYY') into v_who, v_for
      from public.partners p left join public.partner_invoices i on i.id = new.invoice_id where p.id = new.partner_id;
    v_for := 'Partner invoice ' || coalesce(v_for, '');
  else
    select name into v_who from public.locations where id = new.location_id;
    v_for := public.ops_plan_label(new.item);
  end if;
  if tg_op = 'INSERT' then
    perform public.ops_emit('claim', 'money', ':receipt: USDT payment to check: $' || to_char(new.amount_usd, 'FM999990.00') || ' · ' || coalesce(v_who, '?'),
      'Check the wallet first, then confirm or reject it on the staff page. Confirming emails them automatically.',
      public.ops_f('For', v_for) || public.ops_f('Network', upper(new.network)) || public.ops_f('Transaction', new.tx_ref),
      case when new.network = 'trc20' then public.ops_btn('Check on Tronscan', 'https://tronscan.org/#/transaction/' || new.tx_ref) else '[]'::jsonb end
        || public.ops_staff_btn('Confirm or reject'),
      'claim:' || new.id);
  elsif new.status <> old.status then
    select email into v_by from auth.users where id = new.reviewed_by;
    perform public.ops_emit('claim_' || new.status, 'money',
      case when new.status = 'confirmed' then ':white_check_mark: Confirmed' else ':x: Rejected' end || coalesce(' by ' || v_by, '')
        || case when new.note is not null then ': ' || new.note else '' end,
      null, '[]', '[]', 'claim_done:' || new.id, 'claim:' || new.id, 'reply_broadcast');
  end if;
  return new;
end $$;
create trigger ops_claim after insert or update of status on public.usdt_claims for each row execute function public.ops_on_claim();

-- ── leads and partners
create or replace function public.ops_on_lead() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.ops_emit('lead_' || new.kind, case when new.kind = 'partner' then 'partners' else 'customers' end,
    case when new.kind = 'partner' then ':handshake: New partner application: ' else ':incoming_envelope: New business enquiry: ' end || coalesce(new.name, new.email),
    new.message,
    public.ops_f('Email', new.email) || public.ops_f('Instagram', new.instagram) || public.ops_f('Country', new.country) || public.ops_f('Volume', new.volume),
    public.ops_btn('Reply by email', 'mailto:' || new.email || '?subject=' || public.url_encode('Kabsi partners')) ||
      case when new.instagram is not null then public.ops_btn('Open Instagram', 'https://instagram.com/' || ltrim(new.instagram, '@')) else '[]'::jsonb end
      || public.ops_staff_btn(),
    'lead:' || new.id);
  return new;
end $$;
create trigger ops_lead after insert on public.leads for each row execute function public.ops_on_lead();

create or replace function public.ops_on_partner() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_msg text;
begin
  if tg_op = 'INSERT' then
    v_msg := 'Hi ' || new.name || ', welcome to Kabsi! Sign in at ' || public.ops_app_url() || '/partner with ' || coalesce(new.contact_email, 'your email') || ' to invite your first business. Rasheed from Kabsi';
    perform public.ops_emit('partner_new', 'partners', ':handshake: New partner: ' || new.name || case when new.founding then ' (founding)' else '' end,
      null,
      public.ops_f('Handle', new.handle) || public.ops_f('Country', new.country) || public.ops_f('Rate', '$' || new.rate_usd || ' per active location') || public.ops_f('Prefers', new.preferred_channel),
      public.ops_btn('Welcome on WhatsApp', public.wa_link(new.whatsapp, v_msg)) || public.ops_staff_btn(), 'partner:' || new.id);
  elsif new.status is distinct from old.status then
    perform public.ops_emit('partner_' || new.status, 'partners', ':arrows_counterclockwise: Partner ' || new.name || ' is now ' || new.status, null,
      '[]', public.ops_staff_btn(), 'partner_st:' || new.id || ':' || extract(epoch from now())::bigint);
  end if;
  return new;
end $$;
create trigger ops_partner after insert or update of status on public.partners for each row execute function public.ops_on_partner();

create or replace function public.ops_on_invite() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_p public.partners; v_msg text;
begin
  select * into v_p from public.partners where id = new.partner_id;
  if tg_op = 'INSERT' then
    perform public.ops_emit('invite_sent', 'partners', ':email: ' || v_p.name || ' invited ' || coalesce(new.business_name, new.business_email),
      null, public.ops_f('Owner email', new.business_email), '[]', 'invite:' || new.id);
  elsif new.accepted_at is not null and old.accepted_at is null then
    v_msg := 'Hi ' || v_p.name || ', ' || coalesce(new.business_name, new.business_email) || ' just accepted your Kabsi invite and started setup. Thank you! Rasheed from Kabsi';
    perform public.ops_emit('invite_accepted', 'partners', ':tada: ' || coalesce(new.business_name, new.business_email) || ' accepted ' || v_p.name || '''s invite',
      null, public.ops_f('Partner prefers', v_p.preferred_channel),
      public.ops_btn('Thank them on WhatsApp', public.wa_link(v_p.whatsapp, v_msg)), 'invite_ok:' || new.id, 'invite:' || new.id, 'reply_broadcast');
  end if;
  return new;
end $$;
create trigger ops_invite after insert or update of accepted_at on public.partner_invites for each row execute function public.ops_on_invite();

create or replace function public.ops_on_invoice() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_p public.partners; v_msg text; v_month text;
begin
  select * into v_p from public.partners where id = new.partner_id;
  v_month := to_char(new.month, 'FMMonth YYYY');
  if tg_op = 'INSERT' then
    if new.amount_usd = 0 then return new; end if;
    v_msg := 'Hi ' || v_p.name || ', your Kabsi invoice for ' || v_month || ' is $' || to_char(new.amount_usd, 'FM999990.00') || ' (' || new.active_count || ' active businesses). You can pay in USDT from your partner page: ' || public.ops_app_url() || '/partner . Thank you! Rasheed';
    perform public.ops_emit('invoice', 'partners', ':page_facing_up: Invoice for ' || v_p.name || ': $' || to_char(new.amount_usd, 'FM999990.00') || ' · ' || v_month,
      'The partner was emailed the invoice.',
      public.ops_f('Active businesses', new.active_count::text) || public.ops_f('Free', nullif(new.free_count, 0)::text) || public.ops_f('Rate', '$' || new.rate_usd) || public.ops_f('Prefers', v_p.preferred_channel),
      public.ops_btn('Remind on WhatsApp', public.wa_link(v_p.whatsapp, v_msg)) || public.ops_staff_btn(), 'invoice:' || new.id);
  elsif new.status = 'paid' and old.status is distinct from 'paid' then
    perform public.ops_emit('invoice_paid', 'partners', ':white_check_mark: Paid', null, '[]', '[]', 'invoice_paid:' || new.id, 'invoice:' || new.id, 'reply_broadcast');
  end if;
  return new;
end $$;
create trigger ops_invoice after insert or update of status on public.partner_invoices for each row execute function public.ops_on_invoice();

create or replace function public.ops_on_card_order() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_for text;
begin
  select coalesce(l.name, p.name) into v_for from (select 1) x
    left join public.locations l on l.id = new.location_id left join public.partners p on p.id = new.partner_id;
  if tg_op = 'INSERT' then
    perform public.ops_emit('card_order', case when new.partner_id is not null then 'partners' else 'customers' end,
      ':package: Card order: ' || new.quantity || ' for ' || coalesce(v_for, '?'), new.notes, public.ops_f('Status', new.status),
      public.ops_staff_btn(), 'order:' || new.id);
  elsif new.status is distinct from old.status then
    perform public.ops_emit('card_order_' || new.status, case when new.partner_id is not null then 'partners' else 'customers' end,
      'Status: ' || new.status, null, '[]', '[]', 'order_st:' || new.id || ':' || new.status, 'order:' || new.id, 'reply');
  end if;
  return new;
end $$;
create trigger ops_card_order after insert or update of status on public.card_orders for each row execute function public.ops_on_card_order();

-- ── chats with Nora: one message per chat that fills in when the report is ready, transcript in the thread.
create or replace function public.ops_on_chat() returns trigger language plpgsql security definer set search_path = '' as $$
declare k public.contacts; v_who text; v_tx text; v_msg text; v_labels text;
begin
  if tg_op = 'INSERT' then
    perform public.ops_emit('chat_started', 'chats', ':speech_balloon: New chat with Nora',
      'Started on ' || coalesce(new.first_page, '/') || case when new.surface = 'app' then ' (inside the app)' else '' end || '. A full report follows once it goes quiet.',
      public.ops_f('Country', new.country) || public.ops_f('Device', new.device) || public.ops_f('Browser language', new.browser_language)
        || public.ops_f('Came from', nullif(regexp_replace(coalesce(new.referrer, ''), '^https?://([^/]+).*$', '\1'), '')),
      '[]', 'chat:' || new.id);
    return new;
  end if;

  if new.contact_id is not null then select * into k from public.contacts where id = new.contact_id; end if;
  v_who := coalesce(k.name, k.email, 'Anonymous visitor');

  if new.reported_at is distinct from old.reported_at and new.reported_at is not null then
    v_labels := concat_ws(' · ', initcap(replace(coalesce(new.category, 'other'), '_', ' ')), initcap(coalesce(new.lead_temperature, 'cold')), new.country);
    v_msg := 'Hi ' || coalesce(k.name, '') || ', it''s Rasheed from Kabsi. Thanks for chatting with us on our site.';
    perform public.ops_emit('chat_report', 'chats',
      case new.lead_temperature when 'hot' then ':fire: ' when 'warm' then ':sunny: ' else ':speech_balloon: ' end || v_who || ' · ' || v_labels,
      new.summary || case when new.next_step is not null then E'\n*Next step:* ' || new.next_step else '' end,
      public.ops_f('Email', k.email) || public.ops_f('Phone', k.phone) || public.ops_f('Business', k.business_name)
        || public.ops_f('Business type', new.business_type) || public.ops_f('Intent', replace(new.intent, '_', ' ')) || public.ops_f('Mood', new.sentiment)
        || public.ops_f('News emails', case when k.id is null then null when k.marketing_consent then 'Yes' else 'No' end)
        || public.ops_f('Started on', new.first_page) || public.ops_f('Device', new.device) || public.ops_f('Messages', new.message_count::text),
      public.ops_btn('Reply by email', case when k.email is not null then 'mailto:' || k.email || '?subject=' || public.url_encode('Your question about Kabsi') end)
        || public.ops_btn('WhatsApp', public.wa_link(k.phone, v_msg)) || public.ops_btn('All chats', public.ops_app_url() || '/staff'),
      'chat_rep:' || new.id || ':' || new.report_count, 'chat:' || new.id, 'update');
    select string_agg(case when m.role = 'user' then '*Visitor:* ' else '*Nora:* ' end || left(m.content, 600), E'\n\n' order by m.id)
      into v_tx from (select * from public.chat_messages where conversation_id = new.id order by id desc limit 30) m;
    if v_tx is not null then
      perform public.ops_emit('chat_transcript', 'chats', 'Conversation', left(v_tx, 2900), '[]', '[]',
        'chat_tx:' || new.id || ':' || new.report_count, 'chat:' || new.id, 'reply');
    end if;
  end if;

  if new.status = 'handoff' and old.status is distinct from 'handoff' then
    perform public.ops_emit('chat_handoff', 'chats', ':raising_hand: Needs a person: ' || v_who,
      'Nora passed this chat to the team (' || coalesce(new.handoff_reason, 'other') || '). The details are in hello@kabsi.co; reply to that email to answer.',
      public.ops_f('Email', k.email) || public.ops_f('Phone', k.phone),
      public.ops_btn('Reply by email', case when k.email is not null then 'mailto:' || k.email || '?subject=' || public.url_encode('Your question about Kabsi') end)
        || public.ops_btn('WhatsApp', public.wa_link(k.phone, 'Hi ' || coalesce(k.name, '') || ', it''s Rasheed from Kabsi, following up on your question.')),
      'chat_handoff:' || new.id, 'chat:' || new.id, 'reply_broadcast');
  end if;
  return new;
end $$;
create trigger ops_chat after insert or update of reported_at, status on public.chat_conversations for each row execute function public.ops_on_chat();

-- ── failures
create or replace function public.ops_on_job() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not new.ok then
    perform public.ops_emit('job_failed', 'alerts', ':red_circle: Job failed: ' || new.job, left(coalesce(new.detail::text, ''), 1500), '[]',
      public.ops_staff_btn('Job health'), 'job:' || new.job || ':' || to_char(now() at time zone 'UTC', 'YYYYMMDDHH24'));
  end if;
  return new;
end $$;
create trigger ops_job after insert on public.jobs_log for each row execute function public.ops_on_job();

create or replace function public.ops_on_email() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('failed', 'bounced') and (tg_op = 'INSERT' or old.status is distinct from new.status)
     and coalesce(new.error, '') not like 'test address%' then
    perform public.ops_emit('email_failed', 'alerts', ':email: Email ' || new.status || ': ' || new.kind || ' to ' || new.to_address,
      left(new.error, 500), public.ops_f('Subject', new.subject), public.ops_staff_btn('Job health'), 'email:' || new.id || ':' || new.status);
  end if;
  return new;
end $$;
create trigger ops_email after insert or update of status on public.emails for each row execute function public.ops_on_email();

create or replace function public.ops_on_publication() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  if new.status in ('failed', 'rejected') and old.status is distinct from new.status then
    select name into v_name from public.locations where id = new.location_id;
    perform public.ops_emit('publication_' || new.status, 'alerts',
      ':red_circle: Google ' || case when new.status = 'rejected' then 'rejected' else 'write failed' end || ': ' || replace(new.target_type, '_', ' ') || ' for ' || coalesce(v_name, '?'),
      left(coalesce(new.error, new.google_response::text, ''), 800), '[]', public.ops_staff_btn('Job health'), 'pub:' || new.id || ':' || new.status);
  end if;
  return new;
end $$;
create trigger ops_publication after update of status on public.publications for each row execute function public.ops_on_publication();

-- ── watchdog (every 10 min): failed cron runs, a stalled review tick, bursts of failed internal calls
create or replace function public.ops_watchdog() returns void language plpgsql security definer set search_path = '' as $$
declare r record; v_last timestamptz; v_5xx int; v_hour text := to_char(now() at time zone 'UTC', 'YYYYMMDDHH24');
begin
  for r in
    select j.jobname, count(*) n, max(d.return_message) msg
      from cron.job_run_details d join cron.job j on j.jobid = d.jobid
     where j.jobname like 'kabsi_%' and d.status = 'failed' and d.start_time > now() - interval '15 minutes'
     group by j.jobname
  loop
    perform public.ops_emit('cron_failed', 'alerts', ':red_circle: Scheduled job failing: ' || r.jobname, left(r.msg, 800),
      public.ops_f('Failures, 15 min', r.n::text), public.ops_staff_btn('Job health'), 'cron:' || r.jobname || ':' || v_hour);
  end loop;
  select max(d.start_time) into v_last from cron.job_run_details d join cron.job j on j.jobid = d.jobid
   where j.jobname = 'kabsi_cron_tick' and d.status = 'succeeded';
  if v_last is null or v_last < now() - interval '20 minutes' then
    perform public.ops_emit('tick_stalled', 'alerts', ':rotating_light: Reviews job hasn''t run for 20 minutes',
      'kabsi_cron_tick has no successful run since ' || coalesce(to_char(v_last at time zone 'UTC', 'DD Mon HH24:MI') || ' UTC', 'ever') || '. New reviews aren''t being drafted.',
      '[]', public.ops_staff_btn('Job health'), 'tick:' || v_hour);
  end if;
  select count(*) into v_5xx from net._http_response where created > now() - interval '15 minutes' and (status_code >= 500 or error_msg is not null);
  if v_5xx >= 5 then
    perform public.ops_emit('http_errors', 'alerts', ':red_circle: ' || v_5xx || ' failed internal calls in 15 minutes',
      'Edge Functions returned errors or timed out. Check Sentry (kabsi-edge) and the function logs.', '[]', public.ops_staff_btn('Job health'), 'http5xx:' || v_hour);
  end if;
end $$;

-- ── numbers for the daily digest and the /kabsi command
create or replace function public.ops_digest(p_hours int default 24) returns jsonb language sql stable security definer set search_path = '' as $$
  with w as (select now() - make_interval(hours => p_hours) as since)
  select jsonb_build_object(
    'hours', p_hours,
    'signups', (select count(*) from auth.users, w where created_at > since and email not like '%@test.local'),
    'businesses_new', (select count(*) from public.locations, w where created_at > since),
    'businesses_live', (select count(*) from public.locations, w where activated_at > since),
    'businesses_active_total', (select count(*) from public.locations where status = 'active'),
    'waiting_for_access', (select count(*) from public.locations where status = 'access_pending'),
    'reviews_new', (select count(*) from public.reviews, w where created_at > since),
    'replies_posted', (select count(*) from public.publications, w where target_type = 'review_reply' and status in ('live','in_review') and created_at > since),
    'drafts_waiting', (select count(*) from public.reviews where state in ('drafted','blocked')),
    'urgent_waiting', (select count(*) from public.reviews where state in ('drafted','blocked') and urgency = 'urgent'),
    'posts_published', (select count(*) from public.publications, w where target_type = 'local_post' and status in ('live','in_review') and created_at > since),
    'shield_changes', (select count(*) from public.listing_changes, w where created_at > since),
    'taps', (select count(*) from public.taps, w where created_at > since and not is_bot),
    'chats', (select count(*) from public.chat_conversations, w where created_at > since and message_count > 0),
    'chats_hot', (select count(*) from public.chat_conversations, w where created_at > since and lead_temperature = 'hot'),
    'handoffs', (select count(*) from public.chat_conversations, w where updated_at > since and status = 'handoff'),
    'contacts', (select count(*) from public.contacts, w where created_at > since),
    'leads', (select count(*) from public.leads, w where created_at > since),
    'payments_usd', (select coalesce(sum(amount_usd), 0) from public.payments, w where created_at > since),
    'claims_pending', (select count(*) from public.usdt_claims where status = 'pending'),
    'plans_ending_14d', (select count(*) from public.plans where status = 'active' and kind <> 'partner' and ends_at between now() and now() + interval '14 days'),
    'partners_active', (select count(*) from public.partners where status = 'active'),
    'invites', (select count(*) from public.partner_invites, w where created_at > since),
    'emails_sent', (select count(*) from public.emails, w where created_at > since and status in ('sent','delivered')),
    'emails_failed', (select count(*) from public.emails, w where created_at > since and status in ('failed','bounced') and coalesce(error,'') not like 'test address%'),
    'jobs_failed', (select count(*) from public.jobs_log, w where created_at > since and not ok),
    'publications_failed', (select count(*) from public.publications, w where updated_at > since and status = 'failed'),
    'google_mode', (select value from public.app_settings where key = 'google_mode'),
    'slack_queue', (select count(*) from public.ops_events where sent_at is null)
  )
$$;

-- Claim a batch of unsent events for the Slack sender (safe with overlapping runs).
create or replace function public.ops_claim(p_limit int default 25) returns setof public.ops_events language sql security definer set search_path = '' as $$
  update public.ops_events e set claimed_at = now(), attempts = e.attempts + 1
   where e.id in (select id from public.ops_events
                   where sent_at is null and attempts < 8 and (claimed_at is null or claimed_at < now() - interval '2 minutes')
                   order by id limit greatest(least(p_limit, 50), 1) for update skip locked)
  returning e.*
$$;

-- Staff: a partner's WhatsApp number and how they like to be contacted.
create or replace function public.staff_update_partner_contact(p_partner uuid, p_whatsapp text, p_preferred text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.partners set whatsapp = nullif(btrim(p_whatsapp), ''), preferred_channel = coalesce(p_preferred, preferred_channel), updated_at = now()
   where id = p_partner;
  if not found then raise exception 'unknown_partner'; end if;
end $$;

revoke execute on function public.ops_emit(text, text, text, text, jsonb, jsonb, text, text, text), public.ops_watchdog(), public.ops_digest(int),
  public.ops_claim(int), public.ops_app_url(), public.ops_staff_btn(text) from public, anon, authenticated;
revoke execute on function public.staff_update_partner_contact(uuid, text, text) from public, anon;
grant execute on function public.staff_update_partner_contact(uuid, text, text) to authenticated;
revoke execute on function public.ops_on_user(), public.ops_on_location(), public.ops_on_plan(), public.ops_on_payment(), public.ops_on_claim(),
  public.ops_on_lead(), public.ops_on_partner(), public.ops_on_invite(), public.ops_on_invoice(), public.ops_on_card_order(), public.ops_on_chat(),
  public.ops_on_job(), public.ops_on_email(), public.ops_on_publication() from public, anon, authenticated;

-- ── schedules: sender safety net every minute, watchdog every 10 minutes, digest at 08:53 Beirut (05:53 UTC)
select cron.schedule('kabsi_slack_flush', '* * * * *', $$select public.call_internal('slack/flush') where exists (select 1 from public.ops_events where sent_at is null and attempts < 8)$$);
select cron.schedule('kabsi_ops_watchdog', '*/10 * * * *', $$select public.ops_watchdog()$$);
select cron.schedule('kabsi_slack_digest', '53 5 * * *', $$select public.call_internal('slack/digest')$$);
-- Sent events are kept 30 days (they hold chat summaries and contact details).
select cron.schedule('kabsi_ops_events_retention', '23 4 * * *', $$delete from public.ops_events where created_at < now() - interval '30 days'$$);
