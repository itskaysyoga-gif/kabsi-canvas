import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Segmented } from "@/components/kabsi/ui";
import { supabase } from "@/lib/supabase";
import { STAFF_CARD, STAFF_H2 } from "./staff-ui";

// Costs for the team (master plan 25.8, unit economics; 27.10 the provider caps). Two staff-only reads:
// - provider_spend: what each paid data provider cost this month and last (the row the monthly cap is checked against;
//   staff read it under RLS).
// - AI Visibility by provider over the chosen days: the same sum as ai_visibility_spend(days) (live, finished runs,
//   cost_micros per provider). That function is service role only (20261026110000), so the page adds up the same rows of
//   ai_visibility_runs, which staff read under RLS. Mock runs cost nothing and are left out, as there.

type ProviderMonth = { provider: string; month: string; calls: number; micros: number };
export type AiSpend = Record<string, { runs: number; micros: number }>;

const PROVIDER: Record<string, string> = {
  dataforseo: "DataForSEO (maps checks)",
  ai_visibility: "AI Visibility (all assistants)",
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  gemini: "Gemini",
};
const name = (p: string) => PROVIDER[p] ?? p.replace(/_/g, " ");
export const usd = (micros: number) =>
  `$${(micros / 1_000_000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function providerMonths(): Promise<ProviderMonth[]> {
  const { data, error } = await supabase
    .from("provider_spend" as never)
    .select("provider, month, calls, micros")
    .order("month", { ascending: false })
    .limit(40);
  if (error) throw new Error(error.message);
  return (data ?? []) as ProviderMonth[];
}

/** The sum ai_visibility_spend(days) returns, from the runs staff can read. */
export function sumAiSpend(rows: { provider: string; cost_micros: number | null }[]): AiSpend {
  const out: AiSpend = {};
  for (const r of rows) {
    const p = (out[r.provider] ??= { runs: 0, micros: 0 });
    p.runs += 1;
    p.micros += r.cost_micros ?? 0;
  }
  return out;
}

async function aiSpend(days: number): Promise<AiSpend> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("ai_visibility_runs" as never)
    .select("provider, cost_micros")
    .eq("state", "done")
    .eq("source", "live")
    .gt("run_at", since)
    .limit(20_000);
  if (error) throw new Error(error.message);
  return sumAiSpend((data ?? []) as { provider: string; cost_micros: number | null }[]);
}

export function CostsPanel() {
  const [days, setDays] = useState<"7" | "30" | "90">("30");
  const months = useQuery({ queryKey: ["staff-provider-spend"], queryFn: providerMonths });
  const ai = useQuery({ queryKey: ["staff-ai-spend", days], queryFn: () => aiSpend(Number(days)) });
  const thisMonth = months.data?.[0]?.month;
  const current = (months.data ?? []).filter((m) => m.month === thisMonth);
  const last = (months.data ?? []).filter((m) => thisMonth && m.month < thisMonth);
  const lastMonth = last[0]?.month;
  const aiRows = Object.entries(ai.data ?? {}).sort((a, b) => b[1].micros - a[1].micros);
  const aiTotal = aiRows.reduce((n, [, v]) => n + v.micros, 0);

  return (
    <section id="costs" className={STAFF_CARD}>
      <h2 className={STAFF_H2}>Costs</h2>
      <p className="mt-1 text-small text-text-2">
        Paid data providers. Mock mode costs nothing and is not counted.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-title font-bold">
            Data providers{thisMonth ? `, ${monthName(thisMonth)}` : ""}
          </h3>
          {months.isError ? (
            <p className="mt-2 text-small text-bad">{months.error.message}</p>
          ) : months.isLoading ? (
            <p className="mt-2 text-small text-text-2">Loading</p>
          ) : current.length ? (
            <SpendTable
              rows={current.map((m) => ({
                label: name(m.provider),
                count: m.calls,
                micros: m.micros,
              }))}
              countLabel="Calls"
            />
          ) : (
            <p className="mt-2 text-small text-text-2">Nothing spent yet.</p>
          )}
          {lastMonth ? (
            <p className="mt-2 text-small text-text-2">
              {monthName(lastMonth)}:{" "}
              {last
                .filter((m) => m.month === lastMonth)
                .map((m) => `${name(m.provider)} ${usd(m.micros)}`)
                .join(" · ")}
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-title font-bold">AI Visibility by provider</h3>
            <Segmented
              label="Days counted"
              value={days}
              onChange={setDays}
              options={[
                { value: "7", label: "7 days" },
                { value: "30", label: "30 days" },
                { value: "90", label: "90 days" },
              ]}
            />
          </div>
          {ai.isError ? (
            <p className="mt-2 text-small text-bad">{ai.error.message}</p>
          ) : ai.isLoading ? (
            <p className="mt-2 text-small text-text-2">Loading</p>
          ) : aiRows.length ? (
            <SpendTable
              rows={aiRows.map(([p, v]) => ({ label: name(p), count: v.runs, micros: v.micros }))}
              countLabel="Answers"
              total={aiTotal}
            />
          ) : (
            <p className="mt-2 text-small text-text-2">No live answers in the last {days} days.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function SpendTable({
  rows,
  countLabel,
  total,
}: {
  rows: { label: string; count: number; micros: number }[];
  countLabel: string;
  total?: number;
}) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Costs"
      className="mt-2 overflow-x-auto rounded-inner border border-line"
    >
      <table className="w-full text-start text-small">
        <thead className="text-text-2">
          <tr>
            <th className="p-3 text-start font-bold">Provider</th>
            <th className="p-3 text-end font-bold">{countLabel}</th>
            <th className="p-3 text-end font-bold">Cost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="p-3">{r.label}</td>
              <td className="p-3 text-end tabular-nums">{r.count}</td>
              <td className="p-3 text-end font-bold tabular-nums">{usd(r.micros)}</td>
            </tr>
          ))}
          {total !== undefined && rows.length > 1 ? (
            <tr>
              <td className="p-3 font-bold">Total</td>
              <td className="p-3" />
              <td className="p-3 text-end font-bold tabular-nums">{usd(total)}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function monthName(iso: string) {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
