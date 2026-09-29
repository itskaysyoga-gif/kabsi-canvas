import { useEffect, useState, type FormEvent } from "react";
import { CONCIERGE_COPY } from "@/lib/concierge-copy";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/shared/copy-button";
import { supabase, supabaseUrl } from "@/lib/supabase";
import { myLatestLocation } from "@/lib/onboarding";
import {
  createInvoice,
  invoiceStatus,
  loadPlanSummary,
  planOptions,
  PLAN_NAMES,
  type PaidKind,
  type PayNetwork,
  type PlanSummary,
} from "@/lib/plans";
import { daysUntil } from "@/lib/dashboard";
import { BINANCE_PAY_ID, USDT_TRC20, money, shortDate } from "@/lib/partner";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { Wallet as PageGlyph } from "lucide-react";
import { PageIcon } from "@/components/shared/page-icon";

// Plan: what the owner has, until when, and how to pay or renew (USDT anywhere; Whish / OMT / cash in
// Lebanon through the team, D211). A USDT payment is a claim that staff confirm; confirming starts or
// extends the plan (migration 20260926052531). Partner-tagged businesses never see a price (D224).
export const Route = createFileRoute("/_authenticated/app/plan")({
  head: () => ({ meta: [{ title: "Plan | Kabsi" }, { name: "robots", content: "noindex" }] }),
  // ?paid=<invoice id> is where NOWPayments sends the owner back; ?pay=<plan kind> comes from a reminder email.
  validateSearch: (
    s: Record<string, unknown>,
  ): { paid?: string; cancelled?: boolean; pay?: string } => {
    const paid = s["paid"];
    const pay = s["pay"];
    const cancelled = s["cancelled"];
    return {
      ...(typeof paid === "string" && /^[0-9a-f-]{36}$/.test(paid) ? { paid } : {}),
      ...(cancelled === "1" || cancelled === 1 || cancelled === true ? { cancelled: true } : {}),
      ...(typeof pay === "string" ? { pay } : {}),
    };
  },
  component: PlanPage,
});

type Item = PaidKind;
type PlanRow = {
  id: string;
  kind: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
};
type Claim = {
  id: string;
  item: Item | null;
  network: string;
  tx_ref: string;
  status: string;
  note: string | null;
  created_at: string;
};
type Payment = {
  id: string;
  plan_id: string | null;
  item: string;
  amount_usd: number;
  method: string;
  created_at: string;
};

async function loadPlan(locationId: string) {
  const [plans, claims, payments] = await Promise.all([
    supabase
      .from("plans")
      .select("id, kind, status, starts_at, ends_at")
      .eq("location_id", locationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("usdt_claims")
      .select("id, item, network, tx_ref, status, note, created_at")
      .eq("location_id", locationId)
      .eq("kind", "plan")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("payments")
      .select("id, plan_id, item, amount_usd, method, created_at")
      .eq("location_id", locationId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  for (const r of [plans, claims, payments]) if (r.error) throw new Error(r.error.message);
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
  const pending = all.find((p) => p.status === "pending" && !paidIds.has(p.id)) ?? null;
  // Paid but not started: the plan starts once Kabsi's Google access works (D224).
  const paidWaiting = all.find((p) => p.status === "pending" && paidIds.has(p.id)) ?? null;
  return {
    current,
    paidUntil,
    queued: running.filter((p) => p.starts_at && Date.parse(p.starts_at) > now),
    pending,
    paidWaiting,
    claims: (claims.data ?? []) as Claim[],
    payments: (payments.data ?? []) as Payment[],
  };
}

async function sendClaim(locationId: string, item: Item, network: string, txRef: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please log in again.");
  const res = await fetch(`${supabaseUrl}/functions/v1/partner/plan-claim`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ location_id: locationId, item, network, tx_ref: txRef }),
  });
  const json = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) throw new Error(json.message || "Something went wrong. Please try again.");
}

const ITEM_NAME: Record<string, string> = {
  ...PLAN_NAMES,
  card: "Card",
  cards_5: "5 cards",
  extra_card: "Extra card",
};
const METHOD: Record<string, string> = {
  cash: "Cash",
  whish: "Whish",
  omt: "OMT",
  usdt: "USDT",
  nowpayments: "USDT (invoice)",
};

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
  const search = Route.useSearch();
  const d = data.data;
  const sum = summaryQ.data;
  const left = daysUntil(d?.paidUntil ?? null);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <PageIcon icon={<PageGlyph />} />
      <p className="text-sm font-bold uppercase tracking-wider text-kb-stone">Settings</p>
      <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl">Plan</h1>
      {loc ? <p className="mt-2 text-kb-stone">{loc.name}</p> : null}
      {search.paid ? (
        <PaymentReturn
          invoiceId={search.paid}
          onPaid={() => {
            void data.refetch();
            void summaryQ.refetch();
          }}
        />
      ) : null}
      {search.cancelled ? (
        <p className="mt-6 rounded-card bg-kb-sand px-4 py-3 text-sm text-kb-stone">
          You left the payment page, so nothing was charged. You can choose a plan again below.
        </p>
      ) : null}
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

      {sum?.partner_covered ? (
        <section className="mt-7 rounded-large bg-kb-white p-6 shadow-kb sm:p-8">
          <p className="text-sm font-medium text-kb-stone">Your plan</p>
          <p className="mt-1 text-2xl font-bold">Kabsi Pro through your partner</p>
          <p className="mt-2 leading-7 text-kb-stone">
            The Kabsi partner who set you up looks after your plan. There's nothing to pay here.
          </p>
        </section>
      ) : null}

      {loc && sum && !sum.partner_covered && d ? (
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
                    <p className="text-2xl font-bold">Free trial</p>
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
                      Choose a plan below before then so nothing stops. If you don't, your business
                      moves to Free: Replies drafts, Profile Care, Listing Shield and the Monday
                      Report pause, and your Review Link and Card keep working.
                    </p>
                  )}
                </>
              ) : sum.tier === "free" && !d.paidWaiting ? (
                <>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <p className="text-2xl font-bold">Free</p>
                    <span className="rounded-pill bg-kb-sand px-2.5 py-1 text-xs font-bold text-kb-stone">
                      Active
                    </span>
                  </div>
                  <p className="mt-2 leading-7 text-kb-stone">
                    Your Review Link and Card keep working. Replies drafts, Profile Care, Listing
                    Shield and the Monday Report are paused. Choose a plan below to turn them back
                    on.
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
                    Choose a plan below. Kabsi starts drafting replies once payment is confirmed and
                    Google access is in place.
                  </p>
                </>
              )}
            </div>
          </section>

          <Pay
            locationId={loc.id}
            renew={sum.tier === "pro" || sum.tier === "trial" || !!d.paidWaiting}
            summary={sum}
            defaultItem={
              [d.pending?.kind, d.current?.kind].find((k) => sum.offer.includes(k as Item)) as
                Item | undefined
            }
            preselect={search.pay}
            claim={d.claims[0] ?? null}
            onDone={() => data.refetch()}
          />

          {d.payments.length ? (
            <section className="mt-8">
              <h2 className="text-lg font-bold">Payments</h2>
              <ul className="mt-3 divide-y divide-kb-hairline rounded-large bg-kb-white px-5 shadow-kb">
                {d.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3.5 text-sm">
                    <span>
                      <span className="font-medium">{ITEM_NAME[p.item] ?? p.item}</span>
                      <span className="text-kb-stone"> · {METHOD[p.method] ?? p.method}</span>
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
            Pro is refundable within 14 days. If your plan ends, your Kabsi card keeps working; only
            reply drafts, Listing Shield and reports stop.
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

function Pay({
  locationId,
  renew,
  summary,
  defaultItem,
  preselect,
  claim,
  onDone,
}: {
  locationId: string;
  renew: boolean;
  summary: PlanSummary;
  defaultItem: Item | undefined;
  preselect: string | undefined;
  claim: Claim | null;
  onDone: () => unknown;
}) {
  const queryClient = useQueryClient();
  const options = planOptions(summary);
  const wanted = options.find((o) => o.key === preselect)?.key;
  const [item, setItem] = useState<Item>(
    wanted ?? defaultItem ?? options[0]?.key ?? "lebanon_yearly",
  );
  const [payNet, setPayNet] = useState<PayNetwork>("usdttrc20");
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [network, setNetwork] = useState<"trc20" | "binance_pay">("trc20");
  const [tx, setTx] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const chosen = options.find((o) => o.key === item) ?? options[0]!;

  if (claim?.status === "pending") {
    return (
      <section className="mt-6 rounded-large bg-kb-white p-6 shadow-kb sm:p-8">
        <p className="font-bold">Payment sent, we're confirming it</p>
        <p className="mt-2 leading-7 text-kb-stone">
          You sent a transaction ID for {ITEM_NAME[claim.item ?? ""] ?? "Kabsi Pro"} on{" "}
          {shortDate(claim.created_at)}. We'll check it and email you as soon as it's confirmed.
        </p>
      </section>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await sendClaim(locationId, item, network, tx.trim());
      track("payment_recorded", { location_id: locationId, plan: item, channel: "usdt_claim" });
      setTx("");
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["plan-summary"] });
      await onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  }

  return (
    <section className="mt-6 rounded-large bg-kb-white p-6 shadow-kb sm:p-8">
      <h2 className="text-xl font-bold">{renew ? "Renew ahead" : "Choose your plan"}</h2>
      {renew ? (
        <p className="mt-1 text-sm text-kb-stone">
          A renewal starts the day your current plan ends, so you never lose days.
        </p>
      ) : null}
      {claim?.status === "rejected" ? (
        <p className="mt-3 rounded-card bg-kb-red/10 px-4 py-3 text-sm text-kb-red">
          We couldn't match your last transaction ID{claim.note ? `: ${claim.note}` : ""}. Check it
          and send it again.
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setItem(o.key)}
            aria-pressed={item === o.key}
            className={cn(
              "relative rounded-card border-2 p-5 text-left transition-colors",
              item === o.key
                ? "border-kb-black bg-kb-sand"
                : "border-kb-hairline hover:border-kb-stone",
            )}
          >
            {item === o.key ? (
              <span className="absolute right-4 top-4 grid size-6 place-items-center rounded-full bg-kb-black text-kb-white">
                <Check className="size-4" />
              </span>
            ) : null}
            <span className="block font-display text-4xl leading-none">${o.price}</span>
            <span className="mt-2 block font-bold">{o.title}</span>
            <span className="block text-sm text-kb-stone">{o.note}</span>
          </button>
        ))}
      </div>

      {summary.nowpayments ? (
        <div className="mt-6 space-y-3 border-t border-kb-hairline pt-6 text-sm">
          <p className="font-bold">
            Pay {money(chosen.price)} in USDT. Your plan starts by itself once the payment is
            confirmed.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Network"
              value={payNet}
              onChange={(e) => setPayNet(e.target.value as PayNetwork)}
              className="h-11 rounded-card border border-kb-hairline bg-kb-white px-3"
            >
              <option value="usdttrc20">USDT on TRON (TRC20)</option>
              <option value="usdtbsc">USDT on BNB Chain (BEP20)</option>
            </select>
            <Button
              disabled={invoiceBusy}
              onClick={async () => {
                setInvoiceBusy(true);
                setInvoiceError("");
                try {
                  const inv = await createInvoice(locationId, item, payNet);
                  track("checkout_started", { plan: item, channel: "nowpayments" });
                  window.location.assign(inv.invoice_url);
                } catch (e) {
                  setInvoiceError(e instanceof Error ? e.message : String(e));
                  setInvoiceBusy(false);
                }
              }}
            >
              {invoiceBusy ? "Opening…" : "Pay with USDT"}
            </Button>
          </div>
          {invoiceError ? <p className="text-kb-red">{invoiceError}</p> : null}
        </div>
      ) : null}
      {summary.nowpayments ? (
        <details className="mt-6 border-t border-kb-hairline pt-4">
          <summary className="cursor-pointer text-sm font-bold">Other ways to pay</summary>
          <div className="mt-4 space-y-3 text-sm">
            <p className="font-bold">
              Pay {money(chosen.price)} in USDT, then paste the transaction ID.
            </p>
            <div className="flex flex-col gap-2 rounded-card bg-kb-sand p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0 break-all">
                <span className="block text-xs text-kb-stone">USDT on TRC20</span>
                <span className="font-mono">{USDT_TRC20}</span>
              </span>
              <CopyButton text={USDT_TRC20} />
            </div>
            <div className="flex flex-col gap-2 rounded-card bg-kb-sand p-4 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <span className="block text-xs text-kb-stone">Binance Pay ID</span>
                <span className="font-mono">{BINANCE_PAY_ID}</span>
              </span>
              <CopyButton text={BINANCE_PAY_ID} />
            </div>
            <form
              onSubmit={submit}
              className="grid gap-3 pt-1 sm:grid-cols-[auto_1fr_auto] sm:items-end"
            >
              <select
                aria-label="How you paid"
                value={network}
                onChange={(e) => setNetwork(e.target.value as "trc20" | "binance_pay")}
                className="h-11 rounded-card border border-kb-hairline bg-kb-white px-3"
              >
                <option value="trc20">USDT TRC20</option>
                <option value="binance_pay">Binance Pay</option>
              </select>
              <Input
                aria-label="Transaction ID"
                placeholder={network === "trc20" ? "Transaction hash" : "Binance Pay order ID"}
                value={tx}
                onChange={(e) => setTx(e.target.value)}
              />
              <Button type="submit" size="compact" disabled={busy || tx.trim().length < 6}>
                {busy ? "Sending…" : "I've paid"}
              </Button>
            </form>
            {error ? <p className="text-kb-red">{error}</p> : null}
            <p className="pt-2 text-kb-stone">
              In Lebanon you can also pay with Whish, OMT or cash: message us on +961 3 956 917 or{" "}
              <a className="font-medium text-kb-ink underline" href="mailto:hello@kabsi.co">
                hello@kabsi.co
              </a>
              .
            </p>
          </div>
        </details>
      ) : (
        <div className="mt-6 space-y-3 border-t border-kb-hairline pt-6 text-sm">
          <p className="font-bold">
            Pay {money(chosen.price)} in USDT, then paste the transaction ID.
          </p>
          <div className="flex flex-col gap-2 rounded-card bg-kb-sand p-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-0 break-all">
              <span className="block text-xs text-kb-stone">USDT on TRC20</span>
              <span className="font-mono">{USDT_TRC20}</span>
            </span>
            <CopyButton text={USDT_TRC20} />
          </div>
          <div className="flex flex-col gap-2 rounded-card bg-kb-sand p-4 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <span className="block text-xs text-kb-stone">Binance Pay ID</span>
              <span className="font-mono">{BINANCE_PAY_ID}</span>
            </span>
            <CopyButton text={BINANCE_PAY_ID} />
          </div>
          <form
            onSubmit={submit}
            className="grid gap-3 pt-1 sm:grid-cols-[auto_1fr_auto] sm:items-end"
          >
            <select
              aria-label="How you paid"
              value={network}
              onChange={(e) => setNetwork(e.target.value as "trc20" | "binance_pay")}
              className="h-11 rounded-card border border-kb-hairline bg-kb-white px-3"
            >
              <option value="trc20">USDT TRC20</option>
              <option value="binance_pay">Binance Pay</option>
            </select>
            <Input
              aria-label="Transaction ID"
              placeholder={network === "trc20" ? "Transaction hash" : "Binance Pay order ID"}
              value={tx}
              onChange={(e) => setTx(e.target.value)}
            />
            <Button type="submit" size="compact" disabled={busy || tx.trim().length < 6}>
              {busy ? "Sending…" : "I've paid"}
            </Button>
          </form>
          {error ? <p className="text-kb-red">{error}</p> : null}
          <p className="pt-2 text-kb-stone">
            In Lebanon you can also pay with Whish, OMT or cash: message us on +961 3 956 917 or{" "}
            <a className="font-medium text-kb-ink underline" href="mailto:hello@kabsi.co">
              hello@kabsi.co
            </a>
            .
          </p>
        </div>
      )}
    </section>
  );
}

// Where NOWPayments sends the owner back. The plan starts when the payment is confirmed on the network and the
// webhook arrives, which can take a few minutes, so this page checks every 5 seconds for up to 10 minutes.
function PaymentReturn({ invoiceId, onPaid }: { invoiceId: string; onPaid: () => void }) {
  const started = useState(() => Date.now())[0];
  const [paidSeen, setPaidSeen] = useState(false);
  const q = useQuery({
    queryKey: ["invoice-status", invoiceId],
    queryFn: () => invoiceStatus(invoiceId),
    refetchInterval: (query) =>
      query.state.data?.status === "paid" || Date.now() - started > 10 * 60_000 ? false : 5000,
  });
  const st = q.data;
  useEffect(() => {
    if (st?.status === "paid" && !paidSeen) {
      setPaidSeen(true);
      onPaid();
    }
  }, [st?.status, paidSeen, onPaid]);
  if (!st) return null;
  const box = "mt-6 rounded-card px-4 py-3 text-sm leading-6";
  if (st.status === "paid") {
    return (
      <p className={cn(box, "bg-kb-green/10 text-kb-ink")}>
        Payment received. Thank you. Your plan is set up below.
      </p>
    );
  }
  if (st.last_payment_status === "partially_paid") {
    return (
      <p className={cn(box, "bg-kb-red/10 text-kb-red")}>
        We received less than the plan price. We'll be in touch at your email.
      </p>
    );
  }
  if (st.status === "expired") {
    return (
      <p className={cn(box, "bg-kb-sand text-kb-stone")}>
        That payment link expired without a payment. You can start again below.
      </p>
    );
  }
  return (
    <p className={cn(box, "bg-kb-sand text-kb-stone")}>
      We're waiting for the network to confirm your payment. This can take a few minutes. We'll
      email you when it's done.
    </p>
  );
}
