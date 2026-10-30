import { useQuery } from "@tanstack/react-query";
import { fmtDate } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { STAFF_CARD, STAFF_H2, STAFF_ITEM } from "./staff-ui";

// The staff validation figures (30.19 section 3 items 2 and 4): the three activation measures per business, then the figures
// of the two cohorts kept apart, then the money. Every figure comes from public.staff_validation() and public.staff_activation(),
// which read recorded timestamps and verified Creem events only. A figure that cannot be reconciled reads "No data", never an
// estimate. The fuller dashboard waits (docs/LATER.md).
type Stat = { n: number; median: number | null; slowest: number | null };
type Cohort = {
  businesses: number;
  access_confirmed: number;
  free_check_before_signup: number;
  a: Stat;
  a_after_a_free_check: Stat;
  a_with_no_free_check: Stat;
  b: Stat;
  c: Stat;
  approvals_last_7_days: number;
  businesses_approving_last_7_days: number;
  retention: Record<
    "month_1" | "month_2" | "month_3",
    { eligible: number; still_with_kabsi: number }
  >;
  trials_ended: number;
  trials_paid: number;
  handoffs_to_a_person: number;
  support_rows: number;
};
type Money = {
  mrr: { status: "ok" | "no_data"; subscriptions: number; usd_per_month?: number | string };
  cash_by_month: {
    month: string;
    status: "ok" | "no_data";
    payments_usd?: number | string | null;
    refunds_usd?: number | string | null;
    chargebacks_usd?: number | string | null;
  }[];
  margin_per_account: {
    business: string;
    status: "ok" | "no_data";
    cash_usd: number | string | null;
    refunds_and_chargebacks_usd: number | string | null;
    cost_usd: number | string | null;
    margin_usd: number | string | null;
    basis: string;
  }[];
};
type Validation = { generated_at: string; founding: Cohort; paying: Cohort; money: Money };
type Row = {
  location_id: string;
  business: string;
  cohort: "founding" | "paying";
  signup_at: string;
  access_at: string | null;
  free_check_before_signup_at: string | null;
  a_hours: number | null;
  b_hours: number | null;
  c_hours: number | null;
};

async function load(): Promise<{ v: Validation; rows: Row[] }> {
  const [v, a] = await Promise.all([
    supabase.rpc("staff_validation" as never),
    supabase.rpc("staff_activation" as never),
  ]);
  if (v.error) throw new Error((v.error as { message: string }).message);
  if (a.error) throw new Error((a.error as { message: string }).message);
  return { v: v.data as unknown as Validation, rows: (a.data ?? []) as unknown as Row[] };
}

const NO = "No data";
const hours = (h: number | null | undefined) => (h === null || h === undefined ? NO : `${h} h`);
const stat = (s: Stat) =>
  s.n === 0 ? NO : `median ${s.median} h, slowest ${s.slowest} h (${s.n})`;
const usd = (v: number | string | null | undefined) =>
  v === null || v === undefined ? NO : `$${Number(v).toFixed(2)}`;
const share = (a: number, b: number) => (b === 0 ? NO : `${a} of ${b}`);

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 text-small">
      <dt className="text-text-2">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function CohortCard({ title, note, c }: { title: string; note: string; c: Cohort }) {
  return (
    <div className={STAFF_ITEM}>
      <p className="font-bold">{title}</p>
      <p className="text-small text-text-2">{note}</p>
      <dl className="mt-2 divide-y divide-line">
        <Line
          label="Businesses"
          value={`${c.businesses} (${c.access_confirmed} with Google access)`}
        />
        <Line label="A: sign-up to the first finding" value={stat(c.a)} />
        <Line label="A after a free check before sign-up" value={stat(c.a_after_a_free_check)} />
        <Line label="A with no free check before sign-up" value={stat(c.a_with_no_free_check)} />
        <Line label="B: access to the first verified value" value={stat(c.b)} />
        <Line label="C: access to the first approved action on Google" value={stat(c.c)} />
        <Line
          label="Approvals, last 7 days"
          value={`${c.approvals_last_7_days} from ${c.businesses_approving_last_7_days} businesses`}
        />
        <Line
          label="Still with Kabsi, 1 month"
          value={share(c.retention.month_1.still_with_kabsi, c.retention.month_1.eligible)}
        />
        <Line
          label="Still with Kabsi, 2 months"
          value={share(c.retention.month_2.still_with_kabsi, c.retention.month_2.eligible)}
        />
        <Line
          label="Still with Kabsi, 3 months"
          value={share(c.retention.month_3.still_with_kabsi, c.retention.month_3.eligible)}
        />
        <Line label="Trial to paid" value={share(c.trials_paid, c.trials_ended)} />
        <Line
          label="Support: hand-offs to a person, log rows"
          value={
            c.businesses === 0
              ? NO
              : `${c.handoffs_to_a_person} and ${c.support_rows} (${((c.handoffs_to_a_person + c.support_rows) / c.businesses).toFixed(1)} per account)`
          }
        />
      </dl>
    </div>
  );
}

export function ValidationPanel() {
  const q = useQuery({ queryKey: ["staff-validation"], queryFn: load, refetchInterval: 300_000 });
  return (
    <section id="validation" className={STAFF_CARD}>
      <h2 className={STAFF_H2}>Validation figures</h2>
      <p className="mt-1 text-small text-text-2">
        A is hours from sign-up, B and C hours from Google access. A free check finished before
        sign-up is counted apart and never ends A. Money comes from the Creem events Kabsi stored;
        what cannot be reconciled reads No data.
      </p>
      {q.isLoading ? <p className="mt-3 text-small text-text-2">Loading</p> : null}
      {q.isError ? (
        <p className="mt-3 text-small text-bad">
          The figures did not load.{" "}
          <button type="button" className="underline" onClick={() => void q.refetch()}>
            Try again
          </button>
        </p>
      ) : null}
      {q.data ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <CohortCard
              title="Founding 25 (free)"
              note="Proves use, not willingness to pay."
              c={q.data.v.founding}
            />
            <CohortCard
              title="Paying (trial, then a plan)"
              note="Tested from launch day."
              c={q.data.v.paying}
            />
          </div>
          <div className={STAFF_ITEM}>
            <p className="font-bold">Money</p>
            <p className="text-small text-text-2">
              MRR is each active paid subscription at its price per month (yearly divided by 12),
              not cash. Cash is shown apart. Margin is before tax and Creem&apos;s fees, which the
              events do not carry.
            </p>
            <dl className="mt-2 divide-y divide-line">
              <Line
                label="MRR"
                value={
                  q.data.v.money.mrr.status === "ok"
                    ? `${usd(q.data.v.money.mrr.usd_per_month)} a month (${q.data.v.money.mrr.subscriptions} subscriptions)`
                    : NO
                }
              />
            </dl>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-small">
                <caption className="sr-only">Cash by month</caption>
                <thead>
                  <tr className="text-text-2">
                    <th className="py-1 pe-3 font-semibold">Month</th>
                    <th className="py-1 pe-3 font-semibold">Payments</th>
                    <th className="py-1 pe-3 font-semibold">Refunds</th>
                    <th className="py-1 font-semibold">Chargebacks</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.v.money.cash_by_month.length === 0 ? (
                    <tr>
                      <td className="py-1 text-text-2" colSpan={4}>
                        No payments yet
                      </td>
                    </tr>
                  ) : null}
                  {q.data.v.money.cash_by_month.map((m) => (
                    <tr key={m.month} className="border-t border-line">
                      <td className="py-1 pe-3">{fmtDate(m.month)}</td>
                      <td className="py-1 pe-3">{m.status === "ok" ? usd(m.payments_usd) : NO}</td>
                      <td className="py-1 pe-3">{m.status === "ok" ? usd(m.refunds_usd) : NO}</td>
                      <td className="py-1">{m.status === "ok" ? usd(m.chargebacks_usd) : NO}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-small">
                <caption className="sr-only">Contribution margin per account</caption>
                <thead>
                  <tr className="text-text-2">
                    <th className="py-1 pe-3 font-semibold">Account</th>
                    <th className="py-1 pe-3 font-semibold">Cash</th>
                    <th className="py-1 pe-3 font-semibold">Refunds and chargebacks</th>
                    <th className="py-1 pe-3 font-semibold">Cost</th>
                    <th className="py-1 font-semibold">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.v.money.margin_per_account.length === 0 ? (
                    <tr>
                      <td className="py-1 text-text-2" colSpan={5}>
                        No paying accounts yet
                      </td>
                    </tr>
                  ) : null}
                  {q.data.v.money.margin_per_account.map((m) => (
                    <tr key={m.business} className="border-t border-line">
                      <td className="py-1 pe-3">{m.business}</td>
                      <td className="py-1 pe-3">{usd(m.cash_usd)}</td>
                      <td className="py-1 pe-3">{usd(m.refunds_and_chargebacks_usd)}</td>
                      <td className="py-1 pe-3">{usd(m.cost_usd)}</td>
                      <td className="py-1">{usd(m.margin_usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className={STAFF_ITEM}>
            <p className="font-bold">Activation, business by business</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-small">
                <caption className="sr-only">A, B and C for each business</caption>
                <thead>
                  <tr className="text-text-2">
                    <th className="py-1 pe-3 font-semibold">Business</th>
                    <th className="py-1 pe-3 font-semibold">Cohort</th>
                    <th className="py-1 pe-3 font-semibold">Free check before sign-up</th>
                    <th className="py-1 pe-3 font-semibold">A</th>
                    <th className="py-1 pe-3 font-semibold">B</th>
                    <th className="py-1 font-semibold">C</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.rows.length === 0 ? (
                    <tr>
                      <td className="py-1 text-text-2" colSpan={6}>
                        No businesses yet
                      </td>
                    </tr>
                  ) : null}
                  {q.data.rows.map((r) => (
                    <tr key={r.location_id} className="border-t border-line">
                      <td className="py-1 pe-3 font-semibold">{r.business}</td>
                      <td className="py-1 pe-3">
                        {r.cohort === "founding" ? "Founding 25" : "Paying"}
                      </td>
                      <td className="py-1 pe-3">
                        {r.free_check_before_signup_at
                          ? fmtDate(r.free_check_before_signup_at)
                          : "None"}
                      </td>
                      <td className="py-1 pe-3">{hours(r.a_hours)}</td>
                      <td className="py-1 pe-3">{hours(r.b_hours)}</td>
                      <td className="py-1">{hours(r.c_hours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-small text-text-2">Read {fmtDate(q.data.v.generated_at)}.</p>
        </div>
      ) : null}
    </section>
  );
}
