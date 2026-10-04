// Load test (P0.1-12b, K-35 wave target): 500 mock businesses on the local Supabase stack, one simulated hour of
// dispatch. Runs the real producer (private.produce_jobs) and the real dispatcher route (api/jobs.ts, imported into
// this process, with the mock Google layer and the rate limiter in the local database). Time is simulated by moving
// the schedule columns back after each minute instead of waiting: each loop is one minute, the dispatcher's own
// running time included.
//
// Run after `bash scripts/db-test.sh` (local stack up, migrations applied):
//   eval "$(supabase status -o env)"; deno run -A scripts/load/mock-500.ts
// Env: API_URL, SERVICE_ROLE_KEY, DB_URL (from `supabase status -o env`); LOAD_BUSINESSES (500); LOAD_MINUTES (60);
// LOAD_LATENCY_MS (0): added to every database call from the dispatcher, to stand in for the network between an Edge
// Function and the database in production.
// Writes only to the local stack. Fails (exit 1) unless every business synced at least once in every 5 minutes after
// its first, no job died or failed, nothing was left due at the end, and no dispatcher run came near the function
// time limit.
import postgres from "npm:postgres@3.4.5";

const env = (k: string, d?: string) => {
  const v = Deno.env.get(k) ?? d;
  if (v === undefined) throw new Error(`${k} is not set (run: eval "$(supabase status -o env)")`);
  return v;
};
const N = Number(env("LOAD_BUSINESSES", "500"));
const MINUTES = Number(env("LOAD_MINUTES", "60"));
const LATENCY = Number(env("LOAD_LATENCY_MS", "0"));
const API_URL = env("API_URL");
const DB_URL = env("DB_URL");
if (
  !/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(API_URL) ||
  !/@(127\.0\.0\.1|localhost)[:/]/.test(DB_URL)
) {
  throw new Error("the load test runs only against a local stack");
}
// The function code reads these at import: point it at the local stack, keep it in mock mode, and keep error reports
// out of Kabsi's Sentry.
Deno.env.set("SUPABASE_URL", API_URL);
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", env("SERVICE_ROLE_KEY"));
Deno.env.set("GOOGLE_MODE", "mock");
Deno.env.set("SENTRY_DSN_EDGE", "");
Deno.env.delete("RESEND_API_KEY");
Deno.env.delete("PLACES_API_KEY");
Deno.env.delete("ANTHROPIC_API_KEY");

const realFetch = globalThis.fetch;
if (LATENCY > 0) {
  globalThis.fetch = async (input, init) => {
    if (String(input instanceof Request ? input.url : input).startsWith(API_URL))
      await new Promise((r) => setTimeout(r, LATENCY));
    return realFetch(input, init);
  };
}

const sql = postgres(DB_URL, { max: 2, onnotice: () => {} });
const SECRET = `load-${crypto.randomUUID()}`;

async function seed() {
  console.log(`Seeding ${N} mock businesses ...`);
  await sql`update public.locations set status = 'paused' where name not like 'Load test business %'`;
  await sql`delete from vault.secrets where name = 'cron_secret'`;
  await sql`select vault.create_secret(${SECRET}, 'cron_secret')`;
  await sql`update public.app_settings set value = 'mock' where key = 'google_mode'`;
  await sql`
    insert into public.locations (name, status, consent_at, access_granted_at, google_account_id, google_location_id,
                                  emails_paused_until, time_zone)
    select 'Load test business ' || n, 'onboarding', now(), now(), 'accounts/mock', 'locations/load-' || n,
           now() + interval '2 days', 'UTC'
      from generate_series(1, ${N}) n`;
  await sql`update public.locations set status = 'active' where name like 'Load test business %'`;
  // Three answered reviews each: every sync reads and refreshes them, and no draft (no AI call) is needed.
  await sql`
    insert into public.mock_google_reviews (google_location_id, reviewer_name, star_rating, comment, create_time,
                                            reply_comment, reply_update_time)
    select 'locations/load-' || n, 'Customer ' || r, 5, 'Lovely place', now() - make_interval(days => r),
           'Thank you for visiting', now() - make_interval(days => r)
      from generate_series(1, ${N}) n, generate_series(1, 3) r`;
  await sql`delete from public.jobs`;
  await sql`notify pgrst, 'reload schema'`;
  await new Promise((r) => setTimeout(r, 2000));
  const [{ c }] =
    await sql`select count(*)::int c from public.google_connections g join public.locations l on l.id = g.location_id
                            where l.name like 'Load test business %' and l.status = 'active'`;
  if (c !== N) throw new Error(`expected ${N} google_connections, found ${c}`);
}

// One simulated minute later: every schedule moves back by `ms`.
async function advance(ms: number) {
  if (ms <= 0) return;
  const d = `${ms} milliseconds`;
  await sql`update public.google_connections set next_sync_at = next_sync_at - ${d}::interval,
              next_protection_at = next_protection_at - ${d}::interval`;
  await sql`update public.jobs set next_run_at = next_run_at - ${d}::interval where state in ('pending', 'retrying')`;
  await sql`update public.jobs set locked_at = locked_at - ${d}::interval where state = 'running'`;
}

async function due() {
  const [{ c }] =
    await sql`select count(*)::int c from public.jobs where state in ('pending', 'retrying') and next_run_at <= now()`;
  return c as number;
}

async function main() {
  await seed();
  const { dispatch } = await import("../../supabase/functions/api/jobs.ts");
  const runs: { minute: number; offered: number; ms: number; done: number; leftDue: number }[] = [];
  const started = Date.now();
  for (let minute = 1; minute <= MINUTES; minute++) {
    const t0 = Date.now();
    const [{ r }] = await sql`select private.produce_jobs() r`;
    const offered = Object.values(r as Record<string, number>).reduce((a, b) => a + Number(b), 0);
    let ms = 0,
      done = 0;
    if (await due()) {
      const t = Date.now();
      const res = await dispatch(
        new Request("http://local/api/dispatch", {
          method: "POST",
          headers: { "x-cron-secret": SECRET },
        }),
      );
      ms = Date.now() - t;
      const body = (await res.json()) as { counts?: Record<string, number>; error?: string };
      if (!res.ok) throw new Error(`dispatch ${res.status}: ${JSON.stringify(body)}`);
      done = Object.values(body.counts ?? {}).reduce((a, b) => a + b, 0);
    }
    const leftDue = await due();
    runs.push({ minute, offered, ms, done, leftDue });
    if (minute % 10 === 0 || minute <= 2) {
      console.log(
        `minute ${minute}: offered ${offered}, dispatcher ${done} jobs in ${ms} ms, still due ${leftDue}`,
      );
    }
    await advance(60_000 - (Date.now() - t0));
  }

  const [syncs] = await sql`
    select count(*)::int businesses, min(n)::int min_syncs, max(n)::int max_syncs, sum(n)::int total
      from (select l.id, count(j.id) n from public.locations l
              left join public.jobs j on j.location_id = l.id and j.kind = 'sync_reviews' and j.state = 'succeeded'
             where l.name like 'Load test business %' group by l.id) s`;
  const [prot] = await sql`
    select min(n)::int min_checks, sum(n)::int total
      from (select l.id, count(j.id) n from public.locations l
              left join public.jobs j on j.location_id = l.id and j.kind = 'protection_check' and j.state = 'succeeded'
             where l.name like 'Load test business %' group by l.id) s`;
  const states =
    await sql`select kind, state, count(*)::int n from public.jobs group by 1, 2 order by 1, 2`;
  const [status] = await sql`
    select count(*) filter (where g.sync_status = 'ok')::int ok, count(*) filter (where g.last_successful_sync_at is null)::int never
      from public.google_connections g join public.locations l on l.id = g.location_id where l.name like 'Load test business %'`;
  const [breaker] = await sql`select state from public.circuit_breaker where name = 'google'`;
  const maxMs = Math.max(...runs.map((x) => x.ms));
  const slowest = runs.reduce((a, b) => (b.ms > a.ms ? b : a));
  const maxLeft = Math.max(...runs.map((x) => x.leftDue));
  const stopped = states
    .filter((s) => s.state === "dead" || s.state === "failed")
    .reduce((a, s) => a + s.n, 0);
  const endDue = runs[runs.length - 1].leftDue;
  // After its first sync (at its own offset inside the first 5 minutes) each business is due every 5 minutes.
  const expectMin = Math.floor((MINUTES - 5) / 5);

  console.log("\nResult");
  console.log(
    `  businesses ${syncs.businesses}, simulated minutes ${MINUTES}, database latency added ${LATENCY} ms, real time ${Math.round((Date.now() - started) / 1000)} s`,
  );
  console.log(
    `  review syncs succeeded: ${syncs.total} (per business min ${syncs.min_syncs}, max ${syncs.max_syncs}; at least ${expectMin} expected)`,
  );
  console.log(`  Protection checks succeeded: ${prot.total} (per business min ${prot.min_checks})`);
  console.log(
    `  google_connections: sync_status ok ${status.ok} of ${N}, never synced ${status.never}`,
  );
  console.log(
    `  dispatcher: longest run ${maxMs} ms (minute ${slowest.minute}, ${slowest.done} jobs); most left due after a run ${maxLeft}; due at the end ${endDue}`,
  );
  console.log(
    `  jobs by kind and state: ${states.map((s) => `${s.kind} ${s.state} ${s.n}`).join(", ")}`,
  );
  console.log(`  circuit breaker: ${breaker.state}`);

  const problems = [
    syncs.min_syncs < expectMin && `a business synced only ${syncs.min_syncs} times`,
    status.never > 0 && `${status.never} businesses never synced`,
    status.ok !== N && `${N - status.ok} businesses not ok`,
    stopped > 0 && `${stopped} jobs dead or failed`,
    endDue > 0 && `${endDue} jobs still due at the end`,
    maxMs > 50_000 &&
      `a dispatcher run took ${maxMs} ms (the function limit is 150 s; a run should stop at about 40 s)`,
    breaker.state !== "closed" && "the circuit breaker opened",
  ].filter(Boolean);
  await sql.end();
  if (problems.length) {
    console.error(`\nFAILED: ${problems.join("; ")}`);
    Deno.exit(1);
  }
  console.log(
    "\nPASSED: every business synced on schedule for the whole hour, no function came near its time limit.",
  );
}

await main();
