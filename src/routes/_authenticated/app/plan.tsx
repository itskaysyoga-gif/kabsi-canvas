import { CONCIERGE_COPY } from "@/lib/concierge-copy";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { myLatestLocation } from "@/lib/onboarding";
import { CARD_PAYMENTS_COMING, loadPlanSummary, PLAN_NAMES, type PlanSummary } from "@/lib/plans";
import { daysUntil } from "@/lib/dashboard";
import { COMING_SOON, PLAN_PRICE_ROWS, TAX_NOTE } from "@/lib/site";
import { Wallet as PageGlyph } from "lucide-react";
import { PageIcon } from "@/components/shared/page-icon";

// Plan: what the owner has and until when. There is one way to pay, by card through Creem (K-124), and it opens
// with P0.4-07; until then the page says card payments are coming and shows no other route. Crypto, local transfer
// and cash routes and the old partner-covered plans are gone (P0.8-01).
export const Route = createFileRoute("/_authenticated/app/plan")({
  head: () => ({ meta: [{ title: "Plan | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: PlanPage,
});

type PlanRow = {
  id: string;
  kind: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
};
type Payment = {
  id: string;
  plan_id: string | null;
  item: string;
  amount_usd: number;
  created_at: string;
};

const money = (n: number | string | null | undefined) => `$${Number(n ?? 0).toFixed(2)}`;
const shortDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "-";

async function loadPlan(locationId: string) {
  const [plans, payments] = await Promise.all([
    supabase
      .from("plans")
      .select("id, kind, status, starts_at, ends_at")
      .eq("location_id", locationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("id, plan_id, item, amount_usd, created_at")
      .eq("location_id", locationId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  for (const r of [plans, payments]) if (r.error) throw new Error(r.error.message);
  const all = (plans.data ?? []) as PlanRow[];
  const now = Date.now();
  const running = all.filter(
    (p) => p.status === "active" && p.ends_at && Date.parse(p.ends_at) > now,
  );
  const paidUntil = running.reduce<string | null>(
    (m, p) => (!m || Date.parse(p.ends_at!) > Date.parse(m) ? p.ends_at : m),
    null,
  );
  const current =
    running
      .filter((p) => !p.starts_at || Date.parse(p.starts_at) <= now)
      .sort((a, b) => Date.parse(a.starts_at ?? "0") - Date.parse(b.starts_at ?? "0"))[0] ?? null;
  const paidIds = new Set(((payments.data ?? []) as Payment[]).map((p) => p.plan_id));
  // Paid but not started: the plan starts once Kabsi's Google access works (D224).
  const paidWaiting = all.find((p) => p.status === "pending" && paidIds.has(p.id)) ?? null;
  return {
    current,
    paidUntil,
    queued: running.filter((p) => p.starts_at && Date.parse(p.starts_at) > now),
    paidWaiting,
    payments: (payments.data ?? []) as Payment[],
  };
}

const ITEM_NAME: Record<string, string> = PLAN_NAMES;

function PlanPage() {
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const data = useQuery({
    queryKey: ["plan", loc?.id],
    queryFn: () => loadPlan(loc!.id),
    enabled: !!loc,
  });
  const summaryQ = useQuery({
    queryKey: ["plan-summary", loc?.id],
    queryFn: () => loadPlanSummary(loc!.id),
    enabled: !!loc,
  });
  const d = data.data;
  const sum = summaryQ.data;
  const left = daysUntil(d?.paidUntil ?? null);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <PageIcon icon={<PageGlyph />} />
      <p className="text-sm font-bold uppercase tracking-wider text-kb-stone">Settings</p>
      <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl">Plan</h1>
      {loc ? <p className="mt-2 text-kb-stone">{loc.name}</p> : null}
      {location.isLoading || data.isLoading || summaryQ.isLoading ? (
        <p className="mt-6 text-kb-stone">Loading…</p>
      ) : null}
      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      {data.isError || summaryQ.isError ? (
        <p className="mt-6 text-kb-red">Couldn't load your plan. Refresh the page.</p>
      ) : null}

      {loc && sum && d ? (
        <>
          {/* Current plan */}
          <section className="mt-7 overflow-hidden rounded-large bg-kb-white shadow-kb">
            <div className="p-6 sm:p-8">
              <p className="text-sm font-medium text-kb-stone">Your plan</p>
              {sum.tier === "early_access" ? (
                <>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <p className="text-2xl font-bold">Early access</p>
                    <span className="rounded-pill bg-kb-green/10 px-2.5 py-1 text-xs font-bold text-kb-green">
                      Active
                    </span>
                  </div>
                  <p className="mt-2 leading-7 text-kb-stone">{CONCIERGE_COPY.plan}</p>
                  <p className="mt-2 text-sm leading-6 text-kb-stone">{CONCIERGE_COPY.banner}</p>
                </>
              ) : sum.tier === "trial" && sum.plan ? (
                <>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <p className="text-2xl font-bold">Pro trial</p>
                    <span className="rounded-pill bg-kb-green/10 px-2.5 py-1 text-xs font-bold text-kb-green">
                      Active
                    </span>
                  </div>
                  <p className="mt-2 text-kb-stone">
                    Your trial runs until{" "}
                    <span className="font-bold text-kb-ink">{shortDate(sum.plan.last_day)}</span>
                    {trialDaysLeft(sum) !== null ? ` · ${trialDaysLeft(sum)} days left` : ""}
                  </p>
                  {sum.queued.length ? (
                    <p className="mt-3 text-sm text-kb-stone">
                      Already paid: {sum.queued.map((q) => ITEM_NAME[q.kind]).join(", ")}, starts{" "}
                      {shortDate(sum.queued[0]!.starts_at)}. Nothing stops when the trial ends.
                    </p>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-kb-stone">
                      When the trial ends without a plan, reply drafts, Google Protection and the
                      Weekly Care Report pause. Your review link and QR code keep working.
                    </p>
                  )}
                </>
              ) : sum.tier === "free" && !d.paidWaiting ? (
                <>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <p className="text-2xl font-bold">No plan</p>
                  </div>
                  <p className="mt-2 leading-7 text-kb-stone">
                    Your review link and QR code keep working. Reply drafts, Google Protection and
                    the Weekly Care Report are paused until you choose a plan.
                  </p>
                </>
              ) : d.current ? (
                <>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <p className="text-2xl font-bold">{ITEM_NAME[d.current.kind] ?? "Kabsi Pro"}</p>
                    <span className="rounded-pill bg-kb-green/10 px-2.5 py-1 text-xs font-bold text-kb-green">
                      Active
                    </span>
                  </div>
                  <p className="mt-2 text-kb-stone">
                    Paid until{" "}
                    <span className="font-bold text-kb-ink">{shortDate(d.paidUntil)}</span>
                    {left !== null ? ` · ${left} ${left === 1 ? "day" : "days"} left` : ""}
                  </p>
                  {d.current.starts_at && d.current.ends_at ? (
                    <Progress start={d.current.starts_at} end={d.current.ends_at} />
                  ) : null}
                  {d.queued.length ? (
                    <p className="mt-3 text-sm text-kb-stone">
                      Renewal already paid: {d.queued.map((q) => ITEM_NAME[q.kind]).join(", ")},
                      starts {shortDate(d.queued[0]!.starts_at)}.
                    </p>
                  ) : null}
                </>
              ) : d.paidWaiting ? (
                <>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <p className="text-2xl font-bold">
                      {ITEM_NAME[d.paidWaiting.kind] ?? "Kabsi Pro"}
                    </p>
                    <span className="rounded-pill bg-kb-sand px-2.5 py-1 text-xs font-bold text-kb-stone">
                      Paid
                    </span>
                  </div>
                  <p className="mt-2 leading-7 text-kb-stone">
                    Your plan starts the day Kabsi's access to your Google profile works, so you
                    don't lose any days while you wait.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-2xl font-bold">No active plan</p>
                  <p className="mt-2 leading-7 text-kb-stone">
                    Your trial starts when Kabsi's access to your Google profile works.
                  </p>
                </>
              )}
            </div>
          </section>

          <section className="mt-6 rounded-large bg-kb-white p-6 shadow-kb sm:p-8">
            <h2 className="text-xl font-bold">Plans and prices</h2>
            <dl className="mt-3 divide-y divide-kb-hairline">
              {PLAN_PRICE_ROWS.map((r) => (
                <div
                  key={r.name}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 py-3"
                >
                  <dt className="font-bold">{r.name}</dt>
                  <dd className="text-kb-stone">{r.price}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm leading-6 text-kb-stone">
              Prices are in US dollars, {TAX_NOTE}, and the same in every country. Every trial is 14
              days of Pro with no card.
            </p>
          </section>

          <section className="mt-6 rounded-large bg-kb-white p-6 shadow-kb sm:p-8">
            <div className="flex items-start gap-3">
              <CreditCard className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold">How to pay</h2>
                  <span className="rounded-pill bg-kb-sand px-2.5 py-1 text-xs font-bold text-kb-stone">
                    {COMING_SOON}
                  </span>
                </div>
                <p className="mt-1 leading-7 text-kb-stone">{CARD_PAYMENTS_COMING}</p>
              </div>
            </div>
          </section>

          {d.payments.length ? (
            <section className="mt-8">
              <h2 className="text-lg font-bold">Payments</h2>
              <ul className="mt-3 divide-y divide-kb-hairline rounded-large bg-kb-white px-5 shadow-kb">
                {d.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3.5 text-sm">
                    <span>
                      <span className="font-medium">{ITEM_NAME[p.item] ?? "Kabsi Pro"}</span>
                    </span>
                    <span className="text-right">
                      <span className="font-bold">{money(p.amount_usd)}</span>
                      <span className="block text-xs text-kb-stone">{shortDate(p.created_at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="mt-8 text-sm leading-6 text-kb-stone">
            Yearly plans are refundable within 14 days. If your plan ends, your review link and QR
            code keep working; only reply drafts, Google Protection and reports stop.
          </p>
        </>
      ) : null}
    </div>
  );
}

function trialDaysLeft(s: PlanSummary): number | null {
  return s.plan ? daysUntil(s.plan.ends_at) : null;
}

function Progress({ start, end }: { start: string; end: string }) {
  const s = Date.parse(start);
  const e = Date.parse(end);
  const pct = Math.min(100, Math.max(0, ((Date.now() - s) / (e - s)) * 100));
  return (
    <div className="mt-5">
      <div className="h-2 overflow-hidden rounded-pill bg-kb-sand">
        <div className="h-full rounded-pill bg-kb-yellow" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-kb-stone">
        <span>{shortDate(start)}</span>
        <span>{shortDate(end)}</span>
      </div>
    </div>
  );
}
