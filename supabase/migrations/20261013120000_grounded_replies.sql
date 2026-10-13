-- P0.3-02: per-business memory and the grounded reply pipeline (K-14, K-39, K-120.2, K-120.4).
--
-- Expand only; nothing is taken away and no row is removed. Tying the three new tables to their business (so they go
-- with it) is the next file, 20261013120100_grounded_replies_links.sql, run in the SQL editor.
--
-- 1. reply_drafts records the prompt version and the facts the draft used (knowledge_facts ids).
-- 2. public.ai_runs (K-39 record): one row per generation: workflow, prompt version, model, check model, input hash,
--    output hash, memory version, the named checks and whether they passed, and who approved. No text is kept here: the
--    draft is in reply_drafts and is redacted with its review after 30 days (D266), so nothing in ai_runs outlives it.
--    Edge Functions only.
-- 3. Edit learning (K-10, K-120.2): public.style_edits notes the kinds of change an owner made to a draft (no text);
--    public.style_offers holds what Kabsi asks once: "Save this as a rule?" after three edits of one kind, "Save this as
--    a fact?" for a fact the owner added. public.record_draft_edit (Edge Functions) records an edit and returns new
--    offers; public.answer_style_offer (owner or manager) saves the rule or fact through save_fact, or declines it. An
--    offer is made once and never again after a no: nothing is learned silently.

-- 1. Drafts -----------------------------------------------------------------------------------------------------------

alter table public.reply_drafts add column prompt_version text check (length(prompt_version) <= 40);
alter table public.reply_drafts add column facts_used uuid[] not null default '{}';

-- 2. AI runs ----------------------------------------------------------------------------------------------------------

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null,
  review_id uuid,
  draft_id uuid,
  workflow text not null check (workflow ~ '^[a-z_]{2,40}$'),
  prompt_version text not null check (prompt_version ~ '^[a-z_]+\.v[0-9]+$'),
  model text not null check (length(model) <= 80),
  check_model text check (length(check_model) <= 80),
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  output_hash text check (output_hash ~ '^[0-9a-f]{64}$'),
  memory_version text check (memory_version ~ '^[0-9a-f]{12}$'),
  ok boolean not null,
  -- [{"name": "<check>", "ok": true|false}, ...]: names only, never the text that failed.
  checks jsonb not null default '[]' check (jsonb_typeof(checks) = 'array'),
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table public.ai_runs is
  'P0.3-02 (K-39): one row per AI generation. Hashes, versions and check names only; the text lives in reply_drafts.';
create index ai_runs_location on public.ai_runs (location_id, created_at desc);
create index ai_runs_review on public.ai_runs (review_id) where review_id is not null;
alter table public.ai_runs enable row level security;
revoke all on public.ai_runs from public, anon, authenticated;

-- 3. Edit learning ----------------------------------------------------------------------------------------------------

create table public.style_edits (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null,
  review_id uuid,
  kinds text[] not null check (kinds <@ array['shorter', 'longer', 'adds_name', 'without_name', 'adds_apology', 'without_apology']),
  created_at timestamptz not null default now()
);
create index style_edits_location on public.style_edits (location_id, created_at desc);
alter table public.style_edits enable row level security;
revoke all on public.style_edits from public, anon, authenticated;

create table public.style_offers (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null,
  -- A kind of edit (a rule), or 'fact' for a sentence the owner added.
  kind text not null check (kind in ('shorter', 'longer', 'adds_name', 'without_name', 'adds_apology', 'without_apology', 'fact')),
  -- The rule or the owner's own sentence, as it would be saved.
  text text not null check (length(text) between 3 and 200),
  text_hash text not null,
  state text not null default 'open' check (state in ('open', 'saved', 'declined')),
  fact_id uuid,
  answered_by uuid,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  -- One offer per kind of edit, and one per sentence: asked once.
  constraint one_offer unique (location_id, kind, text_hash)
);
create index style_offers_open on public.style_offers (location_id) where state = 'open';
alter table public.style_offers enable row level security;
revoke all on public.style_offers from public, anon, authenticated;
grant select on public.style_offers to authenticated;
create policy members_read_offers on public.style_offers for select to authenticated
  using ((select public.is_member(location_id)) or (select public.is_staff()));

-- Records one edit and returns the offers it makes: [{"id", "kind", "text"}]. p_rules: {"<kind>": "<rule text>"}.
-- A kind is offered when three edits carry it; a rule kind is offered once per business (hashed by kind), whatever the
-- answer. A fact sentence is offered once (hashed by its text).
create function public.record_draft_edit(p_location uuid, p_review uuid, p_kinds text[], p_rules jsonb, p_additions text[])
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare k text; a text; v_out jsonb := '[]'::jsonb; o public.style_offers;
begin
  if not exists (select 1 from public.locations where id = p_location) then raise exception 'unknown_location'; end if;
  if coalesce(cardinality(p_kinds), 0) > 0 then
    insert into public.style_edits (location_id, review_id, kinds) values (p_location, p_review, p_kinds);
  end if;
  foreach k in array coalesce(p_kinds, '{}') loop
    if (select count(*) from public.style_edits where location_id = p_location and k = any (kinds)) >= 3
       and nullif(btrim(p_rules ->> k), '') is not null then
      insert into public.style_offers (location_id, kind, text, text_hash)
      values (p_location, k, left(btrim(p_rules ->> k), 200), k)
      on conflict on constraint one_offer do nothing
      returning * into o;
      if o.id is not null then
        v_out := v_out || jsonb_build_array(jsonb_build_object('id', o.id, 'kind', o.kind, 'text', o.text));
        o := null;
      end if;
    end if;
  end loop;
  foreach a in array coalesce(p_additions, '{}') loop
    a := left(btrim(a), 200);
    continue when length(a) < 3;
    insert into public.style_offers (location_id, kind, text, text_hash)
    values (p_location, 'fact', a, md5(lower(a)))
    on conflict on constraint one_offer do nothing
    returning * into o;
    if o.id is not null then
      v_out := v_out || jsonb_build_array(jsonb_build_object('id', o.id, 'kind', o.kind, 'text', o.text));
      o := null;
    end if;
  end loop;
  return v_out;
end $$;

-- The owner answers an offer. Yes to a rule saves it as one of the owner's rules; yes to a fact adds the sentence to
-- "Things you'd like mentioned when relevant". Both go through save_fact, so they are verified owner facts with their
-- own versions and audit events. No closes the offer for good. Returns the fact id, or null for a no.
create function public.answer_style_offer(p_offer uuid, p_save boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); o public.style_offers; v_fact uuid; v_mention text;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  select * into o from public.style_offers where id = p_offer for update;
  if not found or not public.has_location_role(o.location_id, array['owner', 'manager']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if o.state <> 'open' then raise exception 'already_answered'; end if;
  if p_save then
    if o.kind = 'fact' then
      select value ->> 'text' into v_mention from public.knowledge_facts
       where location_id = o.location_id and slot = 'card.mention' and superseded_by is null and status = 'verified';
      v_fact := public.save_fact(o.location_id, 'mention', to_jsonb(btrim(concat_ws(' ', v_mention, o.text))));
    else
      v_fact := public.save_fact(o.location_id, 'custom_rules', to_jsonb(o.text));
    end if;
  end if;
  update public.style_offers set state = case when p_save then 'saved' else 'declined' end, fact_id = v_fact,
    answered_by = v_uid, answered_at = now()
   where id = o.id;
  perform private.audit('user', v_uid, 'style_offer_answered', o.location_id, 'style_offers', o.id::text, null,
    jsonb_build_object('kind', o.kind, 'saved', p_save, 'fact_id', v_fact), 'dashboard', case when p_save then 'saved' else 'declined' end);
  return v_fact;
end $$;

revoke execute on function public.record_draft_edit(uuid, uuid, text[], jsonb, text[]) from public, anon, authenticated;
grant execute on function public.record_draft_edit(uuid, uuid, text[], jsonb, text[]) to service_role;
revoke execute on function public.answer_style_offer(uuid, boolean) from public, anon;
grant execute on function public.answer_style_offer(uuid, boolean) to authenticated;
