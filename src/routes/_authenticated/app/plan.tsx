import { CONCIERGE_COPY } from "@/lib/concierge-copy";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { myLatestLocation } from "@/lib/onboarding";
import {
  type Billing,
  billingAction,
  type BillingOp,
  loadPlanSummary,
  PAID_NAMES,
  PLAN_COPY,
  PLAN_NAMES,
  type PlanSummary,
} from "@/lib/plans";
import { daysUntil } from "@/lib/dashboard";
import { PLAN_PRICES, PLAN_PRICE_ROWS, TAX_NOTE } from "@/lib/site";
import { Wallet as PageGlyph } from "lucide-react";
import { PageIcon } from "@/components/shared/page-icon";

// Plan: what the owner has and until when. There is one way to pay, by card through Creem (K-124, master plan section
// 10). Session 10 adds the buttons and states: choose a plan (the Creem checkout), card and invoices (Creem's portal),
// switch plan, add a location, cancel at the period end and keep my plan. Until plans open (10.2.13) the paid buttons
// read "Plans open soon" for everyone but Kabsi's test accounts. Web 2 restyles the page.
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
      <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl">{PLAN_COPY.title}</h1>
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
              ) : creemBilling(sum) ? (
                <PaidState b={creemBilling(sum)!} />
              ) : sum.tier === "trial" && sum.plan ? (
                <>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <p className="text-2xl font-bold">Pro trial</p>
                    <span className="rounded-pill bg-kb-green/10 px-2.5 py-1 text-xs font-bold text-kb-green">
                      Active
                    </span>
                  </div>
                  <p className="mt-2 text-kb-stone">
                    Pro trial, ends{" "}
                    <span className="font-bold text-kb-ink">{shortDate(sum.plan.last_day)}</span>.
                    {trialDaysLeft(sum) !== null ? ` ${trialDaysLeft(sum)} days left.` : ""}
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

          <PlanActions locationId={loc.id} sum={sum} />

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

/** The Creem subscription that still decides this screen: anything but a checkout with no payment yet. */
function creemBilling(s: PlanSummary): Billing | null {
  const b = s.entitlements?.billing ?? null;
  return b && b.state !== "incomplete" ? b : null;
}

function PaidState({ b }: { b: Billing }) {
  const name = PAID_NAMES[`${b.plan}_${b.period ?? "month"}`] ?? "Kabsi Pro";
  const ended = b.state === "cancelled" || b.state === "expired";
  const paused = b.state === "paused" || (b.state === "past_due" && !b.grace_ends_at);
  return (
    <>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <p className="text-2xl font-bold">{name}</p>
        <span
          className={
            ended || paused
              ? "rounded-pill bg-kb-sand px-2.5 py-1 text-xs font-bold text-kb-stone"
              : b.payment_failed
                ? "rounded-pill bg-kb-red/10 px-2.5 py-1 text-xs font-bold text-kb-red"
                : "rounded-pill bg-kb-green/10 px-2.5 py-1 text-xs font-bold text-kb-green"
          }
        >
          {ended
            ? "Ended"
            : paused
              ? "Paused"
              : b.payment_failed
                ? "Card did not go through"
                : "Active"}
        </span>
      </div>
      {b.units > 0 ? (
        <p className="mt-2 text-kb-stone">
          Plus {b.units} extra {b.units === 1 ? "location" : "locations"}.
        </p>
      ) : null}
      {ended || paused ? (
        <p className="mt-2 leading-7 text-kb-stone">
          {paused ? "Approvals have stopped and nothing is lost." : "Your plan has ended."}
          {b.data_kept_until ? ` Your data is kept until ${shortDate(b.data_kept_until)}.` : ""}
        </p>
      ) : b.payment_failed ? (
        <p className="mt-2 leading-7 text-kb-stone">
          Your card did not go through. Kabsi keeps working until {shortDate(b.grace_ends_at)}.
        </p>
      ) : b.cancel_at_period_end ? (
        <p className="mt-2 leading-7 text-kb-stone">
          Your plan ends on {shortDate(b.current_period_end)}. Until then everything keeps working.
        </p>
      ) : (
        <p className="mt-2 text-kb-stone">
          Renews on <span className="font-bold text-kb-ink">{shortDate(b.current_period_end)}</span>
          .
        </p>
      )}
    </>
  );
}

type Pending = { op: BillingOp; line: string; plan?: "essentials" | "pro" } | null;

/** The buttons: choose a plan, or manage the one there is. One yellow button on the screen. */
function PlanActions({ locationId, sum }: { locationId: string; sum: PlanSummary }) {
  const qc = useQueryClient();
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const b = creemBilling(sum);
  const running = b && (b.state === "active" || b.state === "past_due");
  const open = !!sum.checkout_open;

  async function run(
    op: BillingOp,
    extra: { plan?: "essentials" | "pro"; period?: "month" | "year" } = {},
  ) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const r = await billingAction(op, locationId, extra);
      if (r.url) {
        // The full Creem link (10.2.7): the checkout or the portal opens in this tab.
        window.location.assign(r.url);
        return;
      }
      if (op === "cancel") setNote(`Done. Your plan ends on ${shortDate(r.ends_at ?? null)}.`);
      if (op === "keep") setNote("Done. Your plan carries on.");
      if (op === "upgrade") setNote("Done. You are on Pro now.");
      if (op === "downgrade")
        setNote(`Done. Essentials starts on ${shortDate(b?.current_period_end ?? null)}.`);
      if (op === "add_location") setNote("Done. Kabsi added a location to your plan.");
      setPending(null);
      await qc.invalidateQueries({ queryKey: ["plan-summary", locationId] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const price = (plan: "essentials" | "pro" | "extra") => {
    const p = PLAN_PRICES;
    const per = (b?.period ?? period) === "year";
    const n =
      plan === "essentials"
        ? per
          ? p.essentialsYearly
          : p.essentialsMonthly
        : plan === "pro"
          ? per
            ? p.proYearly
            : p.proMonthly
          : per
            ? p.extraLocationYearly
            : p.extraLocationMonthly;
    return `$${n} ${per ? "a year" : "a month"}`;
  };

  return (
    <section className="mt-6 rounded-large bg-kb-white p-6 shadow-kb sm:p-8">
      <div className="flex items-start gap-3">
        <CreditCard className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="w-full">
          {running ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button disabled={busy} onClick={() => void run("portal")}>
                {b.payment_failed ? "Update your card" : "Card and invoices"}
              </Button>
              {b.cancel_at_period_end ? (
                <Button variant="outline" disabled={busy} onClick={() => void run("keep")}>
                  Keep my plan
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      setPending(
                        b.plan === "pro"
                          ? {
                              op: "downgrade",
                              line: `Switch to Essentials at your next renewal, ${price("essentials")}.`,
                            }
                          : {
                              op: "upgrade",
                              line: `Switch to Pro now, ${price("pro")}. Creem charges the difference today.`,
                            },
                      )
                    }
                  >
                    {b.plan === "pro" ? "Switch to Essentials" : "Switch to Pro"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      setPending({
                        op: "add_location",
                        line: `Add a location for ${price("extra")}, charged today for the rest of this period.`,
                      })
                    }
                  >
                    Add a location
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      setPending({
                        op: "cancel",
                        line: `Cancel at the end of the paid period, ${shortDate(b.current_period_end)}. Everything keeps working until then.`,
                      })
                    }
                  >
                    Cancel my plan
                  </Button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="flex gap-2" role="group" aria-label="Billing period">
                {(["month", "year"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={period === p}
                    onClick={() => setPeriod(p)}
                    className={
                      period === p
                        ? "rounded-pill bg-kb-black px-4 py-2 text-sm font-bold text-kb-white"
                        : "rounded-pill bg-kb-sand px-4 py-2 text-sm font-bold text-kb-ink"
                    }
                  >
                    {p === "month" ? PLAN_COPY.monthly : PLAN_COPY.yearly}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  disabled={!open || busy}
                  onClick={() => void run("checkout", { plan: "essentials", period })}
                >
                  {open
                    ? `${PLAN_COPY.chooseEssentials}, ${price("essentials")}`
                    : PLAN_COPY.openSoon}
                </Button>
                <Button
                  disabled={!open || busy}
                  onClick={() => void run("checkout", { plan: "pro", period })}
                >
                  {open ? `${PLAN_COPY.choosePro}, ${price("pro")}` : PLAN_COPY.openSoon}
                </Button>
              </div>
            </>
          )}
          {pending ? (
            <div className="mt-4 rounded-card bg-kb-sand p-4">
              <p className="leading-6">{pending.line}</p>
              <div className="mt-3 flex gap-3">
                <Button variant="outline" disabled={busy} onClick={() => void run(pending.op)}>
                  Confirm
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => setPending(null)}>
                  Not now
                </Button>
              </div>
            </div>
          ) : null}
          {note ? <p className="mt-3 text-sm font-bold text-kb-green">{note}</p> : null}
          {error ? <p className="mt-3 text-sm text-kb-red">{error}</p> : null}
          <p className="mt-4 text-sm leading-6 text-kb-stone">{PLAN_COPY.creem}</p>
        </div>
      </div>
    </section>
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
