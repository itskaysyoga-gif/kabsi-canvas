import { CONCIERGE_COPY } from "@/lib/concierge-copy";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check } from "lucide-react";
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
import { ACCOUNT_STAYS_LINE, TAX_NOTE, WHATSAPP_ON, WORKING_HOURS } from "@/lib/site";
import { FOUNDING_LINE, FOUNDING_MONTHLY_USD, PRICE_MONTHLY_USD, TRIAL_LINE } from "@/lib/offer";
import { AccountTop, Panel } from "@/components/kabsi/d3-account";
import {
  Banner,
  Button,
  RetryLine,
  Skeleton,
  StatusPill,
  buttonClass,
} from "@/components/kabsi/ui";
import { cn } from "@/lib/utils";

// Your plan (UX 1, Design 3): the state first as one banner (trial, paid, a payment that did not go through, a plan that
// ends), then the two plans with the work they do, then the receipts. There is one way to pay, by card through Creem
// (K-124, master plan section 10): choose a plan (the Creem checkout), card and invoices (Creem's portal), switch plan,
// add a location, cancel at the period end and keep my plan. Until plans open (10.2.13) the paid buttons read "Plans open
// soon" for everyone but Kabsi's test accounts. The billing calls and their rules are unchanged from session 10.
export const Route = createFileRoute("/_authenticated/app/plan")({
  head: () => ({ meta: [{ title: "Your plan | Kabsi" }, { name: "robots", content: "noindex" }] }),
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
const longDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : "-";

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
type PlanData = Awaited<ReturnType<typeof loadPlan>>;

const ITEM_NAME: Record<string, string> = PLAN_NAMES;

/** The Creem subscription that still decides this screen: anything but a checkout with no payment yet. */
function creemBilling(s: PlanSummary): Billing | null {
  const b = s.entitlements?.billing ?? null;
  return b && b.state !== "incomplete" ? b : null;
}

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

  return (
    <>
      <AccountTop title={PLAN_COPY.title} />
      {location.isLoading || data.isLoading || summaryQ.isLoading ? (
        <div className="space-y-4" role="status" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-28 w-full rounded-card" />
          <Skeleton className="h-72 w-full rounded-card" />
        </div>
      ) : null}
      {!location.isLoading && !loc ? (
        <Link to="/start" className={buttonClass()} data-main-cta>
          Add your business
        </Link>
      ) : null}
      {data.isError || summaryQ.isError ? (
        <RetryLine
          what="Your plan did not load."
          onRetry={() => {
            void data.refetch();
            void summaryQ.refetch();
          }}
        />
      ) : null}
      {loc && sum && d ? <PlanScreen locationId={loc.id} sum={sum} d={d} /> : null}
    </>
  );
}

type Pending = { op: BillingOp; line: string; plan?: "essentials" | "pro" } | null;

function PlanScreen({ locationId, sum, d }: { locationId: string; sum: PlanSummary; d: PlanData }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const b = creemBilling(sum);
  const running = b && (b.state === "active" || b.state === "past_due");
  // Tidy 1 (R-143 item 3): a plan can be chosen only once Kabsi's access works (tier "none" is a business whose access has
  // not started). The server refuses the same way (billing-access.ts), so this only keeps the buttons honest.
  const accessNow = sum.tier !== "none";
  const open = !!sum.checkout_open && accessNow;
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
      if (op === "downgrade")
        setNote(
          `Done. Kabsi at 29 US dollars a month starts on ${shortDate(b?.current_period_end ?? null)}.`,
        );
      if (op === "remove_location")
        setNote(`Done. The extra location ends on ${shortDate(r.ends_at ?? null)}.`);
      setPending(null);
      await qc.invalidateQueries({ queryKey: ["plan-summary", locationId] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // OFFER-2 (blueprint 3.1): one plan, shown as "Kabsi", 29 US dollars a month per location; the founding price (19 for the
  // first 12 months) only through the private invitation, so it shows only on a plan already on it.
  const monthly = running && b.founding ? FOUNDING_MONTHLY_USD : PRICE_MONTHLY_USD;
  const price = (plan: "essentials" | "pro" | "extra") =>
    `$${plan === "extra" ? PRICE_MONTHLY_USD : monthly} a month`;

  const cancelLine = () =>
    b
      ? setPending({
          op: "cancel",
          line: `Cancel at the end of the paid period, ${shortDate(b.current_period_end)}. Everything keeps working until then.`,
        })
      : undefined;

  const trial = sum.tier === "trial" && !!sum.plan && !b;
  const mine = (!!b && b.state !== "cancelled" && b.state !== "expired") || trial;
  const showChoose = !running;

  return (
    <div className="space-y-4">
      <StateBanner sum={sum} d={d} b={b} busy={busy} run={run} />

      <Panel className={cn(mine && "ring-2 ring-text-1")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-h3 font-bold">{PLAN_COPY.oneName}</h2>
          {mine ? <StatusPill tone="info">{trial ? "Your trial" : "Your plan"}</StatusPill> : null}
        </div>
        <p className="mt-2 font-display text-h2 font-bold">
          ${monthly}
          <span className="text-body font-semibold text-text-2"> a month per location</span>
        </p>
        <p className="mt-1 text-small text-text-2">
          {running && b.founding ? FOUNDING_LINE : TRIAL_LINE}
        </p>
        <ul className="mt-4 space-y-2">
          {PLAN_COPY.work.map((w) => (
            <li key={w} className="flex gap-2 text-body">
              <Check className="mt-1 size-4 shrink-0 text-ok" strokeWidth={3} aria-hidden />
              {w}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-small font-bold">{PLAN_COPY.nothingWithoutYes}</p>
        <p className="text-small text-text-2">{WORKING_HOURS}</p>
        {showChoose ? (
          <Button
            full
            size="md"
            variant="primary"
            className="mt-5"
            disabled={!open || busy}
            onClick={() => void run("checkout", { plan: "essentials", period: "month" })}
            data-main-cta
          >
            {sum.checkout_open ? PLAN_COPY.start : PLAN_COPY.openSoon}
          </Button>
        ) : null}
      </Panel>
      {showChoose && open ? (
        <p className="text-small text-text-2">Creem's page shows the exact price before you pay.</p>
      ) : null}
      {showChoose && sum.checkout_open && !accessNow ? (
        <p className="text-small text-text-2">{PLAN_COPY.afterAccess}</p>
      ) : null}

      {running ? (
        <Panel title="Manage your plan" id="manage">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              variant="secondary"
              size="md"
              disabled={busy}
              onClick={() => void run("portal")}
            >
              Card and invoices
            </Button>
            {b.cancel_at_period_end ? null : (
              <>
                {b.plan === "pro" ? (
                  <Button
                    variant="secondary"
                    size="md"
                    disabled={busy}
                    onClick={() =>
                      setPending({
                        op: "downgrade",
                        line: `Move to Kabsi at your next renewal, ${price("essentials")}.`,
                      })
                    }
                  >
                    Move to Kabsi
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  size="md"
                  disabled={busy}
                  onClick={() =>
                    setPending({
                      op: "add_location",
                      line: `Add a location for ${price("extra")}. You pay for it on Creem's page now, and it renews from today.`,
                    })
                  }
                >
                  Add a location
                </Button>
                {b.units > 0 ? (
                  <Button
                    variant="secondary"
                    size="md"
                    disabled={busy}
                    onClick={() =>
                      setPending({
                        op: "remove_location",
                        line: "Remove one extra location at the end of its paid period. Then Kabsi stops its work for your newest business. Nothing changes on Google.",
                      })
                    }
                  >
                    Remove a location
                  </Button>
                ) : null}
              </>
            )}
          </div>
          {!b.cancel_at_period_end ? (
            WHATSAPP_ON ? (
              <p className="mt-4 text-small text-text-2">
                Cancel any time: reply Cancel on WhatsApp, or{" "}
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center font-bold text-text-1 underline underline-offset-4"
                  disabled={busy}
                  onClick={cancelLine}
                >
                  cancel here
                </button>
                .
              </p>
            ) : (
              <Button variant="tertiary" className="mt-3" disabled={busy} onClick={cancelLine}>
                Cancel my plan
              </Button>
            )
          ) : null}
        </Panel>
      ) : null}

      {pending ? (
        <div className="rounded-card border border-line bg-surface-2 p-4" role="status">
          <p className="text-body">{pending.line}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              size="md"
              disabled={busy}
              onClick={() => void run(pending.op)}
            >
              Confirm
            </Button>
            <Button variant="quiet" size="md" disabled={busy} onClick={() => setPending(null)}>
              Not now
            </Button>
          </div>
        </div>
      ) : null}
      {note ? (
        <p className="text-small font-bold text-ok" role="status">
          {note}
        </p>
      ) : null}
      {error ? (
        <p className="text-small text-bad" role="alert">
          {error}
        </p>
      ) : null}

      <Panel title="More locations" id="prices">
        <p className="text-small text-text-2">
          Each further location is {price("extra")}. Prices are in US dollars, {TAX_NOTE}, and the
          same in every country.
        </p>
      </Panel>

      <Panel title="Receipts" id="receipts">
        {d.payments.length ? (
          <ul className="divide-y divide-line">
            {d.payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-small"
              >
                <span>
                  {shortDate(p.created_at)}, {ITEM_NAME[p.item] ?? "Kabsi"}
                </span>
                <span className="font-bold">{money(p.amount_usd)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-text-2">
            No payments yet. Your receipts show here after your first payment.
          </p>
        )}
      </Panel>

      <div className="space-y-2">
        <p className="text-small text-text-2">{PLAN_COPY.creem}</p>
        <p className="text-small text-text-2">
          If your plan ends, your review link and QR code keep working; only reply drafts, Google
          Protection and reports stop.
        </p>
      </div>
    </div>
  );
}

/** The one banner at the top: what the owner has now and what happens next. */
function StateBanner({
  sum,
  d,
  b,
  busy,
  run,
}: {
  sum: PlanSummary;
  d: PlanData;
  b: Billing | null;
  busy: boolean;
  run: (op: BillingOp) => Promise<void>;
}) {
  if (sum.tier === "early_access")
    return (
      <Banner tone="ok" title="Early access">
        <p>{CONCIERGE_COPY.plan}</p>
        <p className="mt-1">{CONCIERGE_COPY.banner}</p>
      </Banner>
    );
  // Billing 2: an extra location ended, so this business is past the plan's locations; its work has stopped.
  if (b && sum.entitlements?.location_on_plan === false)
    return (
      <Banner tone="warn" title="This business is not on your plan.">
        Kabsi has stopped its work here. Nothing on Google changed. Add a location to start again.
      </Banner>
    );
  if (b) {
    const name = PAID_NAMES[`${b.plan}_${b.period ?? "month"}`] ?? "Kabsi";
    const ended = b.state === "cancelled" || b.state === "expired";
    const paused = b.state === "paused" || (b.state === "past_due" && !b.grace_ends_at);
    const units =
      b.units > 0 ? ` Plus ${b.units} extra ${b.units === 1 ? "location" : "locations"}.` : "";
    if (ended || paused)
      return (
        <Banner tone="warn" title={`${name}: ${paused ? "paused" : "ended"}.`}>
          {paused ? "Approvals have stopped and nothing is lost." : "Your plan has ended."}
          {` ${ACCOUNT_STAYS_LINE}`}
        </Banner>
      );
    if (b.payment_failed)
      return (
        <Banner
          tone="bad"
          title="Your last payment did not go through."
          action={
            <Button size="md" disabled={busy} onClick={() => void run("portal")} data-main-cta>
              Update my card
            </Button>
          }
        >
          Kabsi keeps working for 7 days while you fix it. Nothing has been deleted.
        </Banner>
      );
    if (b.cancel_at_period_end)
      return (
        <Banner
          tone="warn"
          title={`Your plan ends on ${longDate(b.current_period_end)}.`}
          action={
            <Button variant="secondary" size="md" disabled={busy} onClick={() => void run("keep")}>
              Keep my plan
            </Button>
          }
        >
          Kabsi stops publishing then. You keep your review link and QR code.
        </Banner>
      );
    const founding = (b as Billing & { founding?: boolean }).founding === true;
    return (
      <Banner tone="ok" title={`${name}.`}>
        Next payment on {longDate(b.current_period_end)}.{founding ? ` ${FOUNDING_LINE}` : ""}
        {units}
      </Banner>
    );
  }
  if (sum.tier === "trial" && sum.plan) {
    const left = sum.plan ? daysUntil(sum.plan.ends_at) : null;
    return (
      <Banner
        tone="info"
        title={`Free trial, ends ${longDate(sum.plan.last_day)}.${left !== null ? ` ${left} ${left === 1 ? "day" : "days"} left.` : ""}`}
      >
        <p>Everything Kabsi does is on during your trial.</p>
        {sum.queued.length ? (
          <p className="mt-1">
            Already paid: {sum.queued.map((q) => ITEM_NAME[q.kind]).join(", ")}, starts{" "}
            {shortDate(sum.queued[0]!.starts_at)}. Nothing stops when the trial ends.
          </p>
        ) : (
          <p className="mt-1">
            If you cancel, reply drafts, Google Protection and your weekly report pause when the
            trial ends. Your review link and QR code keep working.
          </p>
        )}
      </Banner>
    );
  }
  if (sum.tier === "free" && !d.paidWaiting)
    return (
      <Banner tone="warn" title="No plan">
        Your review link and QR code keep working. Reply drafts, Google Protection and your weekly
        report are paused until you choose a plan.
      </Banner>
    );
  if (d.current) {
    const left = daysUntil(d.paidUntil);
    return (
      <Banner tone="ok" title={`${ITEM_NAME[d.current.kind] ?? "Kabsi"}.`}>
        <p>
          Paid until {shortDate(d.paidUntil)}
          {left !== null ? `, ${left} ${left === 1 ? "day" : "days"} left` : ""}.
        </p>
        {d.queued.length ? (
          <p className="mt-1">
            Renewal already paid: {d.queued.map((q) => ITEM_NAME[q.kind]).join(", ")}, starts{" "}
            {shortDate(d.queued[0]!.starts_at)}.
          </p>
        ) : null}
      </Banner>
    );
  }
  if (d.paidWaiting)
    return (
      <Banner tone="info" title={`${ITEM_NAME[d.paidWaiting.kind] ?? "Kabsi"}: paid.`}>
        Your plan starts the day Kabsi&apos;s access to your Google profile works, so you don&apos;t
        lose any days while you wait.
      </Banner>
    );
  return (
    <Banner tone="info" title="No active plan">
      Your trial starts when Kabsi&apos;s access to your Google profile works.
    </Banner>
  );
}
