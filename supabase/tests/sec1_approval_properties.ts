// Sec 1 (master plan 30.15 section 8): fast-check property tests of the one publication pipeline against the real
// database functions. Random orders of approve (dashboard and WhatsApp), edit, Undo, time passing, the publish job's
// claim, a retry, a failure and revoke (removal, demotion, the owner taking approvals back) must never break these:
//   1. at most one live publication per reply, and Google is sent the reply at most once (one successful claim);
//   2. nothing is claimed without a valid yes: the approver is a member allowed to approve at claim time, the yes is
//      not undone, its undo window is over, it was due no more than 7 days ago, the stop switch is on, and the review is still
//      the one approved (no edit since);
//   3. what is claimed is exactly the text that was approved, and a WhatsApp yes is for the exact draft it showed;
//   4. an Undo after the claim is refused, and an undone yes is never claimed.
// Sec 2 adds:
//   5. an email page approves only the draft version it showed, and only while that is still the newest version
//      (a page opened on v1 and posted after v2 is refused with reply_changed and approves nothing);
//   6. a redraft (save_reply_draft, as draftReview does) never puts the review back to a draft while a yes waits or
//      the reply is being sent: no review is ever a draft with a live publication under it.
// Runs from scripts/db-test.sh after the pgTAP suite, against the local test database only:
//   deno run --allow-net --allow-env --allow-read --no-lock <copy outside the repo>/sec1_approval_properties.ts "<db url>"
// (copied out of the repo so Deno does not install the app's package.json; db-test.sh does this).
// Each run is one transaction, rolled back. SEC1_RUNS sets the number of runs (default 400), SEC1_SEED a seed.
import postgres from "npm:postgres@3.4.5";
import fc from "npm:fast-check@3.23.2";

const url = Deno.args[0];
if (!url) {
  console.error("usage: sec1_approval_properties.ts <db url>");
  Deno.exit(2);
}
const sql = postgres(url, { max: 1, onnotice: () => {} });

const LOC = "00000000-0000-4000-8000-00000000dd01";
const REVIEW = "00000000-0000-4000-8000-00000000dd02";
const USERS = {
  owner: "00000000-0000-4000-8000-00000000dd11",
  manager: "00000000-0000-4000-8000-00000000dd12",
  staff: "00000000-0000-4000-8000-00000000dd13",
  outsider: "00000000-0000-4000-8000-00000000dd14",
} as const;
type Who = keyof typeof USERS;
const PHONES: Record<Who, string> = { owner: "+15550007001", manager: "+15550007002", staff: "+15550007003", outsider: "+15550007004" };

type Op =
  | { kind: "approve"; who: Who; edited: boolean }
  | { kind: "button"; who: Who }
  | { kind: "press"; button: number }
  | { kind: "edit" }
  | { kind: "undo"; who: Who }
  | { kind: "time" }
  | { kind: "age" }
  | { kind: "claim" }
  | { kind: "fail" }
  | { kind: "retry" }
  | { kind: "revoke"; how: "remove_manager" | "demote_manager" | "policy_owner" | "restore" }
  | { kind: "pause"; on: boolean }
  | { kind: "open" }
  | { kind: "emailPost"; page: number; edited: boolean };

const who = fc.constantFrom<Who>("owner", "manager", "staff", "outsider");
const op: fc.Arbitrary<Op> = fc.oneof(
  { weight: 2, arbitrary: fc.record({ kind: fc.constant("approve" as const), who, edited: fc.boolean() }) },
  { weight: 3, arbitrary: fc.record({ kind: fc.constant("button" as const), who }) },
  { weight: 4, arbitrary: fc.record({ kind: fc.constant("press" as const), button: fc.nat(5) }) },
  { weight: 2, arbitrary: fc.constant({ kind: "edit" as const }) },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant("undo" as const), who }) },
  { weight: 5, arbitrary: fc.constant({ kind: "time" as const }) },
  { weight: 1, arbitrary: fc.constant({ kind: "age" as const }) },
  { weight: 6, arbitrary: fc.constant({ kind: "claim" as const }) },
  { weight: 1, arbitrary: fc.constant({ kind: "fail" as const }) },
  { weight: 1, arbitrary: fc.constant({ kind: "retry" as const }) },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant("revoke" as const), how: fc.constantFrom("remove_manager", "demote_manager", "policy_owner", "restore") }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant("pause" as const), on: fc.boolean() }) },
  { weight: 3, arbitrary: fc.constant({ kind: "open" as const }) },
  { weight: 3, arbitrary: fc.record({ kind: fc.constant("emailPost" as const), page: fc.nat(5), edited: fc.boolean() }) },
);

type Tx = postgres.TransactionSql;
class Rollback extends Error {}

async function setup(tx: Tx) {
  await tx`insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    select '00000000-0000-0000-0000-000000000000', u.id::uuid, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
      from (values (${USERS.owner}, 'prop-owner@example.test'), (${USERS.manager}, 'prop-manager@example.test'),
                   (${USERS.staff}, 'prop-staff@example.test'), (${USERS.outsider}, 'prop-outsider@example.test')) u(id, email)`;
  await tx`insert into public.locations (id, name, place_id, status, consent_at, access_granted_at, google_account_id, google_location_id)
    values (${LOC}, 'Property Bakery', 'prop-place', 'active', now(), now(), 'accounts/prop', 'locations/mock-prop')`;
  await tx`insert into public.location_members (location_id, user_id, role) values
    (${LOC}, ${USERS.owner}, 'owner'), (${LOC}, ${USERS.manager}, 'manager'), (${LOC}, ${USERS.staff}, 'staff')`;
  await tx`insert into public.subscriptions (organization_id, plan, state, provider)
    select organization_id, 'pro', 'active', 'manual' from public.locations where id = ${LOC}`;
  await tx`insert into public.approval_policies (location_id, kind, policy, set_by)
    values (${LOC}, 'review_reply', 'owner_and_managers', ${USERS.owner})
    on conflict (location_id, kind) do update set policy = excluded.policy`;
  await tx`insert into public.reviews (id, location_id, google_review_id, star_rating, review_created_at, state, risk)
    values (${REVIEW}, ${LOC}, 'prop-review', 5, now(), 'drafted', 'low')`;
  await tx`insert into public.reply_drafts (review_id, version, body, source, safety_ok) values (${REVIEW}, 1, 'Thank you, version 1.', 'ai', true)`;
  await tx`insert into public.app_settings (key, value) values ('google_writes', 'on') on conflict (key) do update set value = 'on'`;
  for (const w of ["owner", "manager", "staff"] as Who[]) {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: USERS[w], role: "authenticated" })}, true)`;
    const [c] = await tx`select public.whatsapp_connect_start(repeat('Consent text shown to the person. ', 3)) as c`;
    await tx`select set_config('request.jwt.claims', '', true)`;
    await tx`select public.whatsapp_bind(${PHONES[w]}, ${"KABSI " + c.c.code})`;
  }
}

// A savepoint per call: a refusal (an exception) leaves the transaction usable, as a separate request would.
async function attempt<T>(tx: Tx, f: () => Promise<T>): Promise<{ ok: true; v: T } | { ok: false; e: string }> {
  try {
    return { ok: true, v: await tx.savepoint(async () => await f()) as T };
  } catch (e) {
    return { ok: false, e: String((e as Error).message ?? e) };
  }
}

type Claim = { publication: string; text: string };
// What the runs exercised, so a property that held only because nothing happened fails instead.
const seen = { claimed: 0, whatsappApproved: 0, whatsappChanged: 0, undone: 0, refusedClaims: 0, emailApproved: 0, emailStale: 0, redraftRefused: 0 };

async function runOne(ops: Op[]) {
  try {
    await sql.begin(async (tx) => {
      await setup(tx);
      let version = 1;
      let paused = false;
      const buttons: { token: string; text: string }[] = [];
      // Email pages the owner opened: a fresh single-use link each, the draft and the version the page showed.
      const pages: { hash: string; text: string; version: number }[] = [];
      const claims: Claim[] = [];
      const undone = new Set<string>();

      const draftText = async () => (await tx`select body from public.reply_drafts where review_id = ${REVIEW} order by version desc limit 1`)[0].body as string;
      const latestPub = async () => (await tx`select id, state, approved_by, payload ->> 'text' as text from public.publications
        where target_id = ${REVIEW} order by created_at desc, id desc limit 1`)[0];

      for (const o of ops) {
        switch (o.kind) {
          case "approve": {
            const text = o.edited ? `My own words ${version}.` : await draftText();
            await attempt(tx, () => tx`select public.approve_publication('review_reply', ${REVIEW}, ${tx.json({ text })},
              ${USERS[o.who]}, 'dashboard')`);
            break;
          }
          case "button": {
            const r = await attempt(tx, () => tx`select public.whatsapp_action_create(${USERS[o.who]}, 'review_reply', ${REVIEW}) as b`);
            if (r.ok && r.v[0].b.ok) buttons.push({ token: r.v[0].b.token, text: r.v[0].b.text });
            break;
          }
          case "press": {
            if (!buttons.length) break;
            const b = buttons[o.button % buttons.length];
            const owner = await tx`select user_id from public.whatsapp_actions where token_hash = private.whatsapp_hash(${b.token})`;
            const w = (Object.keys(USERS) as Who[]).find((k) => USERS[k] === owner[0]?.user_id) ?? "outsider";
            const before = await draftText();
            const r = await attempt(tx, () => tx`select public.whatsapp_approve(${b.token}, ${PHONES[w]}) as r`);
            if (r.ok && r.v[0].r.reason === "changed") seen.whatsappChanged++;
            if (r.ok && r.v[0].r.result === "approved" && !r.v[0].r.repeat) {
              seen.whatsappApproved++;
              const p = (await tx`select payload ->> 'text' as text from public.publications where id = ${r.v[0].r.publication_id}`)[0];
              // 3: a WhatsApp yes is for the exact draft its button showed, and that draft is still the latest.
              if (p.text !== b.text || b.text !== before) throw new Error(`a WhatsApp yes published other words than its button showed: ${JSON.stringify({ shown: b.text, now: before, published: p.text })}`);
            }
            break;
          }
          case "edit": {
            // As draftReview does (Sec 2): save_reply_draft makes the next version and moves the review back to a draft,
            // and refuses while a yes waits or the reply is being sent.
            const before = (await tx`select state from public.reviews where id = ${REVIEW}`)[0].state as string;
            const r = await attempt(tx, () => tx`select public.save_reply_draft(${REVIEW}, ${"Thank you, version " + (version + 1) + "."},
              'ai_edit', 'shorter', true, '[]'::jsonb, 'stub', 'v-test', null, 'en', 'low', '{}'::text[], false) as d`);
            if (r.ok) version = (r.v[0].d as { version: number }).version;
            else if (r.e.includes("reply_publishing")) {
              seen.redraftRefused++;
              if (before !== "publishing" && before !== "posted") throw new Error(`a redraft was refused on a ${before} review`);
            } else throw new Error(`save_reply_draft failed: ${r.e}`);
            if (r.ok && (before === "publishing" || before === "posted")) throw new Error(`a redraft was saved on a ${before} review`);
            break;
          }
          case "open": {
            // The owner opens the email page: what action_link_view and the details read (the newest draft and its version).
            const hash = `prop-hash-${pages.length}-${Math.random()}`;
            await tx`insert into public.action_tokens (token_hash, location_id, user_id, action, target_type, target_id, expires_at)
              values (${hash}, ${LOC}, ${USERS.owner}, 'post', 'review', ${REVIEW}, now() + interval '72 hours')`;
            const d = (await tx`select body, version from public.reply_drafts where review_id = ${REVIEW} order by version desc limit 1`)[0];
            pages.push({ hash, text: d.body, version: d.version });
            break;
          }
          case "emailPost": {
            if (!pages.length) break;
            const pg = pages[o.page % pages.length];
            const text = o.edited ? `My own words on page ${pg.version}.` : pg.text;
            const newest = (await tx`select coalesce(max(version), 0) as v from public.reply_drafts where review_id = ${REVIEW}`)[0].v as number;
            const used = (await tx`select used_at from public.action_tokens where token_hash = ${pg.hash}`)[0].used_at;
            const r = await attempt(tx, () => tx`select public.use_action_link(${pg.hash}, 'post', ${text}, null::uuid, null::uuid, ${pg.version}::int) as r`);
            if (!r.ok && r.e.includes("reply_changed")) {
              seen.emailStale++;
              // 5: refused only because the page is stale, and nothing was approved by it.
              if (pg.version === newest) throw new Error("a current email page was refused as changed");
              const t = (await tx`select used_at from public.action_tokens where token_hash = ${pg.hash}`)[0];
              if (t.used_at) throw new Error("a stale email page used up its link");
            }
            if (r.ok && !used && !(r.v[0].r as { repeat?: boolean }).repeat && (r.v[0].r as { done: string }).done === "approved") {
              // 5: an email yes is for the newest version, with the words the page sent.
              if (pg.version !== newest) throw new Error(`an email page on version ${pg.version} approved while version ${newest} was the newest`);
              const p = (await tx`select payload ->> 'text' as text from public.publications where id = ${(r.v[0].r as { publication_id: string }).publication_id}`)[0];
              if (p.text !== text.trim()) throw new Error("an email yes published other words than the page sent");
              seen.emailApproved++;
            }
            break;
          }
          case "undo": {
            const p = await latestPub();
            if (!p) break;
            const r = await attempt(tx, () => tx`select public.undo_publication(${p.id}, ${USERS[o.who]}) as r`);
            if (r.ok && r.v[0].r.state === "cancelled") {
              // 4: an Undo after a claim is refused.
              if (claims.some((c) => c.publication === p.id)) throw new Error("an Undo was accepted after the publication was claimed");
              undone.add(p.id);
              seen.undone++;
            }
            break;
          }
          case "time":
            await tx`update public.publications set publish_after = now() - interval '1 second' where target_id = ${REVIEW} and state = 'approved'`;
            break;
          case "age":
            await tx`update public.publications set approved_at = approved_at - interval '8 days', publish_after = publish_after - interval '8 days'
              where target_id = ${REVIEW} and state = 'approved'`;
            break;
          case "claim": {
            const p = await latestPub();
            if (!p) break;
            const facts = (await tx`select p.approved_at, p.publish_after, p.state, r.state as review_state,
                (select role from public.location_members m where m.location_id = ${LOC} and m.user_id = p.approved_by) as role,
                (select policy from public.approval_policies a where a.location_id = ${LOC} and a.kind = 'review_reply') as policy,
                now() as now
              from public.publications p join public.reviews r on r.id = p.target_id where p.id = ${p.id}`)[0];
            const r = await attempt(tx, () => tx`select public.claim_publication(${p.id}) as r`);
            if (r.ok && r.v[0].r.result !== "claimed") seen.refusedClaims++;
            if (r.ok && r.v[0].r.result === "claimed") {
              // 2: every condition of a valid yes holds at the moment of the claim.
              const allowed = facts.role === "owner" || (facts.role === "manager" && facts.policy === "owner_and_managers");
              const problems = [
                !allowed && "the approver may no longer approve",
                undone.has(p.id) && "the yes was undone",
                facts.publish_after > facts.now && "the undo window was not over",
                Math.max(facts.approved_at.getTime(), facts.publish_after.getTime()) < facts.now.getTime() - 7 * 86400_000 && "the yes was older than 7 days",
                paused && "Google writes were paused",
                facts.review_state !== "publishing" && "the review changed after the yes",
              ].filter(Boolean);
              if (problems.length) throw new Error(`claimed without a valid yes: ${problems.join(", ")}`);
              // 3: the claimed text is the approved text.
              if (r.v[0].r.text !== p.text) throw new Error("the claimed text differs from the approved text");
              claims.push({ publication: p.id, text: p.text });
              seen.claimed++;
              // Google's answer: published.
              await tx`select public.record_publication(${p.id}, 'published', null, null, 'mock-ref', null, null, false)`;
            }
            break;
          }
          case "fail": {
            const p = await latestPub();
            if (p?.state === "publishing") await tx`select public.record_publication(${p.id}, 'rejected', 'Google refused it.', 'mock', null, null, null, false)`;
            break;
          }
          case "retry": {
            // The publish job's RetryLater path puts a claimed publication back to approved.
            const p = await latestPub();
            if (p?.state === "publishing") await tx`select public.record_publication(${p.id}, 'approved', null, 'retry later', null, null, null, false)`;
            break;
          }
          case "revoke": {
            if (o.how === "remove_manager") await tx`delete from public.location_members where location_id = ${LOC} and user_id = ${USERS.manager}`;
            if (o.how === "demote_manager") await tx`update public.location_members set role = 'staff' where location_id = ${LOC} and user_id = ${USERS.manager}`;
            if (o.how === "policy_owner") await tx`update public.approval_policies set policy = 'owner' where location_id = ${LOC} and kind = 'review_reply'`;
            if (o.how === "restore") {
              await tx`insert into public.location_members (location_id, user_id, role) values (${LOC}, ${USERS.manager}, 'manager')
                on conflict (location_id, user_id) do update set role = 'manager'`;
              await tx`update public.approval_policies set policy = 'owner_and_managers' where location_id = ${LOC} and kind = 'review_reply'`;
            }
            break;
          }
          case "pause":
            paused = !o.on;
            await tx`update public.app_settings set value = ${paused ? "paused" : "on"} where key = 'google_writes'`;
            break;
        }

        // 1: at most one live publication per reply, and at most one successful claim.
        const [live] = await tx`select count(*)::int as n from public.publications where target_id = ${REVIEW}
          and state in ('approved', 'publishing', 'published', 'checking', 'verifying', 'verified')`;
        if (live.n > 1) throw new Error(`${live.n} live publications for one reply`);
        if (claims.length > 1) throw new Error("the reply was sent to Google twice");
        // 6: a review is never a draft (or blocked) while a yes for it waits or is being sent.
        const [under] = await tx`select count(*)::int as n from public.publications p join public.reviews r on r.id = p.target_id
          where p.target_id = ${REVIEW} and p.state in ('approved', 'publishing') and r.state in ('drafted', 'blocked')`;
        if (under.n > 0) throw new Error("the review is a draft while a yes for it is waiting or being sent");
        // Nobody outside the business or in the staff role ever has a publication.
        const [bad] = await tx`select count(*)::int as n from public.publications where target_id = ${REVIEW}
          and approved_by in (${USERS.staff}, ${USERS.outsider})`;
        if (bad.n > 0) throw new Error("a staff member or an outsider made a publication");
      }
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}

const runs = Number(Deno.env.get("SEC1_RUNS") ?? 400);
const seed = Deno.env.get("SEC1_SEED") ? Number(Deno.env.get("SEC1_SEED")) : undefined;
const started = Date.now();
try {
  // Fixed orders run first, so every case below is reached whatever the seed (a random seed once reached no stale email
  // page in 400 runs); the random runs then explore the rest.
  const examples: [Op[]][] = [
    [[{ kind: "open" }, { kind: "edit" }, { kind: "emailPost", page: 0, edited: false }]],
    [[{ kind: "open" }, { kind: "emailPost", page: 0, edited: false }, { kind: "time" }, { kind: "claim" }]],
    [[{ kind: "approve", who: "owner", edited: false }, { kind: "edit" }, { kind: "claim" }, { kind: "undo", who: "owner" }]],
    [[{ kind: "button", who: "owner" }, { kind: "edit" }, { kind: "press", button: 0 }, { kind: "button", who: "owner" }, { kind: "press", button: 1 }]],
  ];
  await fc.assert(fc.asyncProperty(fc.array(op, { minLength: 1, maxLength: 25 }), runOne), { numRuns: runs, seed, verbose: 1, examples });
  const idle = Object.entries(seen).filter(([, n]) => n === 0).map(([k]) => k);
  if (idle.length) throw new Error(`the runs never reached: ${idle.join(", ")}`);
  console.log(`ok: ${runs} random orders of approve, edit, Undo, retry and revoke kept every rule (${Math.round((Date.now() - started) / 1000)} s; ${JSON.stringify(seen)})`);
} catch (e) {
  console.error(`not ok: ${(e as Error).message}`);
  await sql.end();
  Deno.exit(1);
}
await sql.end();
