import { CONCIERGE_COPY } from "@/lib/concierge-copy";
import { RetryLine } from "@/components/kabsi/retry-line";
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
  ADD_CARD_LABEL,
  PAID_NAMES,
  PLAN_COPY,
  PLAN_NAMES,
  type PlanSummary,
} from "@/lib/plans";
import { daysUntil } from "@/lib/dashboard";
import { ACCOUNT_STAYS_LINE, CONTACT_EMAIL, TAX_NOTE, WHATSAPP_ON } from "@/lib/site";
import { FOUNDING_LINE, FOUNDING_MONTHLY_USD, PRICE_MONTHLY_USD, TRIAL_LINE } from "@/lib/offer";
import { AccountTop, Panel } from "@/components/kabsi/d3-account";
import { Banner, Button, Skeleton, StatusPill, buttonClass } from "@/components/kabsi/ui";
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
    /** APP-3: this business has had a plan of any kind (a trial too), so the trial offer is not shown. */
    everPlan: all.length > 0,
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

  // APP-3 (R-169): the trial offer shows only to a business with no plan, no trial and no payment. Any other business sees
  // its current plan card: the plan, paid until and days left, and the cancel link.
  const fresh =
    !b &&
    !d.everPlan &&
    !d.current &&
    !d.paidWaiting &&
    d.payments.length === 0 &&
    !sum.plan &&
    !sum.trial_used &&
    !sum.paid_waiting &&
    sum.queued.length === 0 &&
    sum.tier !== "trial";

  return (
    <div className="max-w-2xl space-y-4">
      <StateBanner sum={sum} d={d} b={b} busy={busy} run={run} />

      {fresh ? (
        <>
          <Panel>
            <h2 className="font-display text-h3 font-bold">{PLAN_COPY.oneName}</h2>
            <p className="mt-2 font-display text-h2 font-bold">
              ${monthly}
              <span className="text-body font-semibold text-text-2"> a month per location</span>
            </p>
            <p className="mt-1 text-small text-text-2">{TRIAL_LINE}</p>
            <WorkList />
            <p className="mt-4 text-small font-bold">{PLAN_COPY.nothingWithoutYes}</p>
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
          </Panel>
          {open ? (
            <p className="text-small text-text-2">
              Creem's page shows the exact price before you pay.
            </p>
          ) : null}
          {sum.checkout_open && !accessNow ? (
            <p className="text-small text-text-2">{PLAN_COPY.afterAccess}</p>
          ) : null}
        </>
      ) : (
        <CurrentPlanCard
          sum={sum}
          d={d}
          b={b}
          busy={busy}
          open={open}
          onCheckout={() => void run("checkout", { plan: "essentials", period: "month" })}
          onCancel={cancelLine}
        />
      )}

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

function WorkList() {
  return (
    <ul className="mt-4 space-y-2">
      {PLAN_COPY.work.map((w) => (
        <li key={w} className="flex gap-2 text-body">
          <Check className="mt-1 size-4 shrink-0 text-ok" strokeWidth={3} aria-hidden />
          {w}
        </li>
      ))}
    </ul>
  );
}

const daysLeftLine = (until: string | null) => {
  const left = daysUntil(until);
  return left === null ? "" : ` ${left} ${left === 1 ? "day" : "days"} left.`;
};

/**
 * APP-3 (R-169): the plan this business has now, in place of the trial offer. The plan's name, until when it is paid and the
 * days left, and the cancel link. A Creem plan cancels at the end of the paid period (Confirm below); a plan paid before
 * Creem does not renew by itself, so cancelling it is an email. A trial, or a plan that ended, offers the card checkout.
 */
function CurrentPlanCard({
  sum,
  d,
  b,
  busy,
  open,
  onCheckout,
  onCancel,
}: {
  sum: PlanSummary;
  d: PlanData;
  b: Billing | null;
  busy: boolean;
  open: boolean;
  onCheckout: () => void;
  onCancel: () => void;
}) {
  const live = !!b && (b.state === "active" || b.state === "past_due");
  const trial = !b && sum.tier === "trial" && !!sum.plan;
  const legacy = !b && !trial && !!d.current;
  const waiting = !b && !trial && !legacy && !!d.paidWaiting;
  const name = waiting
    ? (ITEM_NAME[d.paidWaiting!.kind] ?? "Kabsi")
    : b
      ? (PAID_NAMES[`${b.plan}_${b.period ?? "month"}`] ?? "Kabsi")
      : trial
        ? PLAN_NAMES["trial"]
        : legacy
          ? (ITEM_NAME[d.current!.kind] ?? "Kabsi")
          : "No plan";
  const dates = live
    ? `${b!.cancel_at_period_end ? "Ends" : "Paid until"} ${longDate(b!.current_period_end)}.${daysLeftLine(b!.current_period_end)}`
    : trial
      ? `Ends ${longDate(sum.plan!.last_day)}.${daysLeftLine(sum.plan!.ends_at)}`
      : legacy
        ? `Paid until ${longDate(d.paidUntil)}.${daysLeftLine(d.paidUntil)}`
        : null;
  const pill = live || legacy || waiting ? "Your plan" : trial ? "Your trial" : null;
  const linkCls =
    "inline-flex min-h-11 items-center font-bold text-text-1 underline underline-offset-4";
  return (
    <Panel className={cn(pill && "ring-2 ring-text-1")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-h3 font-bold">{name}</h2>
        {pill ? <StatusPill tone="info">{pill}</StatusPill> : null}
      </div>
      {dates ? <p className="mt-2 text-body font-semibold">{dates}</p> : null}
      {live && b!.founding ? <p className="mt-1 text-small text-text-2">{FOUNDING_LINE}</p> : null}
      {live && b!.units > 0 ? (
        <p className="mt-1 text-small text-text-2">
          Plus {b!.units} extra {b!.units === 1 ? "location" : "locations"}.
        </p>
      ) : null}
      {legacy ? (
        <p className="mt-1 text-small text-text-2">This plan does not renew by itself.</p>
      ) : null}
      {trial ? (
        <p className="mt-1 text-small text-text-2">
          Everything Kabsi does is on during your trial. Without a card when it ends, reply drafts,
          Google Protection and your weekly report pause.
        </p>
      ) : null}
      <WorkList />
      <p className="mt-4 text-small font-bold">{PLAN_COPY.nothingWithoutYes}</p>
      {!live && !legacy && !waiting ? (
        <Button
          full
          size="md"
          variant="primary"
          className="mt-5"
          disabled={!open || busy}
          onClick={onCheckout}
          data-main-cta
        >
          {sum.checkout_open ? ADD_CARD_LABEL : PLAN_COPY.openSoon}
        </Button>
      ) : null}
      {live && !b!.cancel_at_period_end ? (
        <p className="mt-4 text-small text-text-2">
          <button type="button" className={linkCls} disabled={busy} onClick={onCancel}>
            Cancel my plan
          </button>
        </p>
      ) : null}
      {legacy ? (
        <p className="mt-4 text-small text-text-2">
          <a className={linkCls} href={`mailto:${CONTACT_EMAIL}?subject=Cancel%20my%20plan`}>
            Cancel my plan
          </a>
        </p>
      ) : null}
    </Panel>
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
    // APP-3: a plan that is fine is said by the plan card below, not again here.
    return null;
  }
  if (sum.tier === "trial" && sum.plan) {
    return sum.queued.length ? (
      <Banner tone="info" title="Already paid.">
        {sum.queued.map((q) => ITEM_NAME[q.kind]).join(", ")}, starts{" "}
        {shortDate(sum.queued[0]!.starts_at)}. Nothing stops when the trial ends.
      </Banner>
    ) : null;
  }
  if (sum.tier === "free" && !d.paidWaiting)
    return (
      <Banner tone="warn" title="No plan">
        Your review link and QR code keep working. Reply drafts, Google Protection and your weekly
        report are paused until you choose a plan.
      </Banner>
    );
  if (d.current) {
    // APP-3: the plan card says the plan, the date and the days left.
    return d.queued.length ? (
      <Banner tone="ok" title="Renewal already paid.">
        {d.queued.map((q) => ITEM_NAME[q.kind]).join(", ")}, starts{" "}
        {shortDate(d.queued[0]!.starts_at)}.
      </Banner>
    ) : null;
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
