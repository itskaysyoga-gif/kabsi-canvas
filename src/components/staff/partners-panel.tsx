import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtDate } from "@/lib/format";
import {
  approvePayouts,
  decidePartner,
  dollars,
  loadPartners,
  payoutSent,
  runPayouts,
  setPayoutDetails,
  type Partner,
  type Payout,
} from "@/lib/programs";

// Kabsi Partners (master plan 29, 30.15 section 5): applications to approve or decline, each partner's code and
// ledger (held for 30 days, cleared, paid; test-mode lines apart), payout details kept in Vault, and the monthly
// payout list made on the 5th: 25 US dollars or more cleared is paid, below that it rolls over. Staff approve the
// month's list and mark each payout sent with its transfer reference.
export function PartnersPanel() {
  const q = useQuery({
    queryKey: ["staff-partners"],
    queryFn: loadPartners,
    refetchInterval: 120_000,
  });
  if (q.isLoading) return null;
  if (q.error)
    return (
      <p className="mt-8 text-small text-text-2">
        Partners did not load: {String(q.error.message)}
      </p>
    );
  const o = q.data;
  if (!o) return null;
  const runs = [...new Set(o.payouts.filter((p) => p.state === "proposed").map((p) => p.run_on))];
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-title font-bold">Kabsi Partners</h2>
        <p className="text-small text-text-2">
          {o.places.founding_left} of {o.places.founding_total} Founding Partner places left · next
          payout run {fmtDate(o.next_run_on)}
        </p>
      </div>
      <div className="mt-4 space-y-4">
        {o.partners.length === 0 ? <p className="text-text-2">No applications yet.</p> : null}
        {o.partners.map((p) => (
          <PartnerRow key={p.id} p={p} />
        ))}
      </div>
      <h3 className="mt-8 text-title font-bold">Payouts</h3>
      <RunNow />
      {runs.map((r) => (
        <ApproveRun key={r} run={r} />
      ))}
      <div className="mt-4 space-y-3">
        {o.payouts.length === 0 ? <p className="text-small text-text-2">No payouts yet.</p> : null}
        {o.payouts.map((p) => (
          <PayoutRow key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}

function useRun() {
  const client = useQueryClient();
  const [msg, setMsg] = useState("");
  const run = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      setMsg("");
      void client.invalidateQueries({ queryKey: ["staff-partners"] });
    },
    onError: (e) => setMsg(e instanceof Error ? e.message : String(e)),
  });
  return { run, msg, setMsg };
}

function PartnerRow({ p }: { p: Partner }) {
  const { run, msg } = useRun();
  const [handle, setHandle] = useState("");
  const [method, setMethod] = useState<"usdt" | "usdc" | "paypal">("usdt");
  const [detail, setDetail] = useState("");
  return (
    <article className="rounded-panel bg-surface-1 p-5 shadow-rest">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">
            {p.name}
            {p.founding_partner ? " · Founding Partner" : ""}
          </p>
          <p className="text-small text-text-2">
            {p.kind} · {[p.city, p.country].filter(Boolean).join(", ") || "-"} · {p.email}
            {p.phone ? ` · ${p.phone}` : ""}
          </p>
        </div>
        <p className="text-label text-text-2">
          {p.status}
          {p.code ? ` · ${p.code}` : ""} · applied {fmtDate(p.created_at)}
        </p>
      </div>
      {p.reach || p.pitch ? (
        <p className="mt-3 whitespace-pre-wrap text-small leading-6">
          {[p.reach, p.pitch].filter(Boolean).join("\n")}
        </p>
      ) : null}
      {p.uae_permit ? (
        <p className="mt-1 text-label text-text-2">UAE permit: {p.uae_permit}</p>
      ) : null}
      {p.status !== "applied" ? (
        <p className="mt-3 text-small">
          {p.referrals} {p.referrals === 1 ? "business" : "businesses"}
          {p.self_referrals ? ` (+${p.self_referrals} self referral, no commission)` : ""} · held{" "}
          {dollars(p.held_cents)} · cleared {dollars(p.cleared_cents)} · paid{" "}
          {dollars(p.paid_cents)}
          {p.test_cents ? ` · test mode ${dollars(p.test_cents)}` : ""}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {p.status === "applied" ? (
          <>
            <Input
              className="h-11 w-40"
              placeholder="handle (optional)"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              aria-label="Partner page handle"
            />
            <Button
              size="compact"
              variant="outline"
              disabled={run.isPending}
              onClick={() => run.mutate(() => decidePartner(p.id, "approved", handle || undefined))}
            >
              Approve
            </Button>
            <Button
              size="compact"
              variant="outline"
              disabled={run.isPending}
              onClick={() => run.mutate(() => decidePartner(p.id, "declined"))}
            >
              Decline
            </Button>
          </>
        ) : null}
        {p.status === "approved" ? (
          <Button
            size="compact"
            variant="ghost"
            disabled={run.isPending}
            onClick={() => run.mutate(() => decidePartner(p.id, "paused"))}
          >
            Pause (withhold)
          </Button>
        ) : null}
        {p.status === "paused" ? (
          <Button
            size="compact"
            variant="outline"
            disabled={run.isPending}
            onClick={() => run.mutate(() => decidePartner(p.id, "approved"))}
          >
            Approve again
          </Button>
        ) : null}
      </div>
      {p.status === "approved" || p.status === "paused" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-small text-text-2">
            Payout: {p.payout_method ? `${p.payout_method} ending ${p.payout_last4}` : "not set"}
          </span>
          <select
            className="h-11 rounded-card border border-line bg-surface-1 px-3 text-small"
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
            aria-label="Payout method"
          >
            <option value="usdt">USDT</option>
            <option value="usdc">USDC</option>
            <option value="paypal">PayPal</option>
          </select>
          <Input
            className="h-11 w-56"
            placeholder="wallet address or PayPal email"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            aria-label="Payout details"
            autoComplete="off"
          />
          <Button
            size="compact"
            variant="outline"
            disabled={!detail || run.isPending}
            onClick={() =>
              run.mutate(async () => {
                await setPayoutDetails(p.id, method, detail);
                setDetail("");
              })
            }
          >
            Save details
          </Button>
        </div>
      ) : null}
      {msg ? <p className="mt-3 text-small text-bad">{msg}</p> : null}
    </article>
  );
}

function RunNow() {
  const { run, msg, setMsg } = useRun();
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <p className="text-small text-text-2">
        The list is made by itself on the 5th. Lines clear 30 days after payment; only live payments
        are paid.
      </p>
      <Button
        size="compact"
        variant="ghost"
        disabled={run.isPending}
        onClick={() =>
          run.mutate(async () => {
            const r = await runPayouts(new Date().toISOString().slice(0, 10));
            setMsg(`${r.cleared} lines cleared, ${r.payouts} payouts made.`);
          })
        }
      >
        Run today
      </Button>
      {msg ? <p className="text-small text-text-2">{msg}</p> : null}
    </div>
  );
}

function ApproveRun({ run: on }: { run: string }) {
  const { run, msg } = useRun();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-card bg-surface-2 p-3">
      <p className="text-small font-bold">Payout list of {fmtDate(on)} waits for approval</p>
      <Button
        size="compact"
        variant="outline"
        disabled={run.isPending}
        onClick={() => run.mutate(() => approvePayouts(on))}
      >
        Approve the list
      </Button>
      {msg ? <p className="text-small text-bad">{msg}</p> : null}
    </div>
  );
}

function PayoutRow({ p }: { p: Payout }) {
  const { run, msg } = useRun();
  const [ref, setRef] = useState("");
  return (
    <div className="rounded-card border border-line p-3 text-small">
      <p>
        <span className="font-bold">{p.partner}</span> · {dollars(p.amount_cents)} {p.currency} ·{" "}
        {p.lines} {p.lines === 1 ? "line" : "lines"} · {fmtDate(p.run_on)} · {p.state}
        {p.method ? ` · ${p.method}${p.last4 ? ` ending ${p.last4}` : ""}` : " · no payout details"}
        {p.reference ? ` · ref ${p.reference}` : ""}
      </p>
      {p.state === "approved" ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input
            className="h-11 w-64"
            placeholder="transfer reference or hash"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            aria-label="Transfer reference"
          />
          <Button
            size="compact"
            variant="outline"
            disabled={ref.length < 3 || run.isPending}
            onClick={() => run.mutate(() => payoutSent(p.id, ref))}
          >
            Mark sent
          </Button>
        </div>
      ) : null}
      {msg ? <p className="mt-2 text-bad">{msg}</p> : null}
    </div>
  );
}
