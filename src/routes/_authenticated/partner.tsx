import { useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layouts/app-layout";
import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BINANCE_PAY_ID,
  LOCATION_STATUS,
  USDT_TRC20,
  inviteBusiness,
  money,
  monthName,
  myPartner,
  partnerWorkspace,
  shortDate,
  submitClaim,
  type Claim,
  type Invoice,
  type Partner,
} from "@/lib/partner";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

// Partner workspace (Phase 9, D210): invite businesses, see status and tap counts (never review text),
// cards, monthly invoices paid in USDT.
export const Route = createFileRoute("/_authenticated/partner")({
  head: () => ({ meta: [{ title: "Partner | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: PartnerPage,
});

function PartnerPage() {
  const partner = useQuery({ queryKey: ["my-partner"], queryFn: myPartner, staleTime: 60_000 });
  return (
    <AppLayout area="partner">
      <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
        {partner.isLoading ? <p className="text-kb-stone">Loading…</p> : null}
        {partner.isError ? (
          <p className="text-kb-red">We couldn't load your partner account. Reload the page.</p>
        ) : null}
        {partner.isSuccess && !partner.data ? <NotAPartner /> : null}
        {partner.data ? <Workspace partner={partner.data} /> : null}
      </div>
    </AppLayout>
  );
}

function NotAPartner() {
  return (
    <>
      <h1 className="font-display text-4xl leading-none sm:text-5xl">Partner</h1>
      <p className="mt-4 max-w-xl leading-7 text-kb-stone">
        This page is for Kabsi partners. If you sell NFC cards or look after Google profiles for
        businesses, you can apply to become one. Already a partner? Sign in with the email you gave
        Kabsi.
      </p>
      <Button asChild className="mt-6">
        <Link to="/partners">Become a partner</Link>
      </Button>
    </>
  );
}

function rateLine(p: Partner) {
  const rate = money(p.rate_usd ?? 8);
  if (p.founding && p.price_locked_until)
    return `Founding partner · ${rate} per active location per month until ${shortDate(p.price_locked_until)}`;
  return `${rate} per active location per month`;
}

function Workspace({ partner }: { partner: Partner }) {
  const data = useQuery({
    queryKey: ["partner-workspace", partner.id],
    queryFn: () => partnerWorkspace(partner.id),
  });
  const w = data.data;
  const pendingInvites = w?.invites.filter((i) => !i.accepted_at) ?? [];
  return (
    <>
      <h1 className="font-display text-4xl leading-none sm:text-5xl">{partner.name}</h1>
      <p className="mt-2 text-kb-stone">{rateLine(partner)}</p>

      {w && !w.live ? (
        <p className="mt-5 rounded-card bg-kb-white px-4 py-3 text-sm leading-6 shadow-kb">
          Billing starts when Kabsi's Google connection goes live. Until then nothing is billed.
        </p>
      ) : null}

      <InviteSection partner={partner} />

      <Section
        title="Businesses"
        sub="Status and card taps only. Reviews and replies stay private to each business."
      >
        {data.isLoading ? <p className="text-kb-stone">Loading…</p> : null}
        {data.isError ? <p className="text-kb-red">{String(data.error.message)}</p> : null}
        {w && w.locations.length === 0 ? (
          <p className="text-kb-stone">
            No businesses yet. When someone signs up from your invite or link, they appear here.
          </p>
        ) : null}
        {w && w.locations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-kb-stone">
                <tr className="border-b border-kb-hairline">
                  <th className="py-2 pr-3 font-medium">Business</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Active since</th>
                  <th className="py-2 pr-3 text-right font-medium">Taps 7d</th>
                  <th className="py-2 text-right font-medium">Taps 30d</th>
                </tr>
              </thead>
              <tbody>
                {w.locations.map((l) => (
                  <tr key={l.location_id} className="border-b border-kb-hairline last:border-0">
                    <td className="py-3 pr-3 font-medium">
                      {l.name}
                      {l.country ? <span className="text-kb-stone"> · {l.country}</span> : null}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={cn(
                          "rounded-pill px-2.5 py-1 text-xs font-bold",
                          l.status === "active" ? "bg-kb-green/10 text-kb-green" : "bg-kb-sand",
                        )}
                      >
                        {LOCATION_STATUS[l.status] ?? l.status}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-kb-stone">{shortDate(l.activated_at)}</td>
                    <td className="py-3 pr-3 text-right tabular-nums">{l.taps_7d}</td>
                    <td className="py-3 text-right tabular-nums">{l.taps_30d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {pendingInvites.length > 0 ? (
          <div className="mt-6">
            <p className="text-sm font-bold">Invites not used yet</p>
            <ul className="mt-2 space-y-1 text-sm text-kb-stone">
              {pendingInvites.slice(0, 20).map((i) => (
                <li key={i.id}>
                  {i.business_name ? `${i.business_name} · ` : ""}
                  {i.business_email} · sent {shortDate(i.created_at)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <Section title="Invoices" sub="One invoice on the 1st of each month for the month before.">
        {w?.monthSoFar ? (
          <p className="mb-4 text-sm text-kb-stone">
            This month so far: {w.monthSoFar.active_count} active{" "}
            {w.monthSoFar.active_count === 1 ? "location" : "locations"}
            {w.monthSoFar.free_count
              ? `, ${w.monthSoFar.free_count} free (first 30 days)`
              : ""} ={" "}
            <span className="font-bold text-kb-ink">{money(w.monthSoFar.amount_usd)}</span>
          </p>
        ) : null}
        {w && w.invoices.length === 0 ? <p className="text-kb-stone">No invoices yet.</p> : null}
        <div className="space-y-4">
          {w?.invoices.map((inv) => (
            <InvoiceRow
              key={inv.id}
              invoice={inv}
              claim={w.claims.find((c) => c.invoice_id === inv.id) ?? null}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Cards"
        sub="Cards Kabsi made for you. Each one opens its business's Google review page."
      >
        {w && w.cards.length === 0 ? (
          <p className="text-kb-stone">
            No cards assigned to you yet. Write to hello@kabsi.co to order.
          </p>
        ) : null}
        {w && w.cards.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {w.cards.map((c) => (
              <li
                key={c.code}
                className="flex items-center justify-between rounded-card border border-kb-hairline px-4 py-3 text-sm"
              >
                <span className="font-mono font-bold tracking-wider">{c.code}</span>
                <span className="text-kb-stone">
                  {c.status === "active"
                    ? `In use since ${shortDate(c.activated_at)}`
                    : c.status === "unassigned"
                      ? "Not linked yet"
                      : "Switched off"}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>
    </>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="mt-8 rounded-large bg-kb-white p-5 shadow-kb sm:p-7">
      <h2 className="text-xl font-bold">{title}</h2>
      {sub ? <p className="mt-1 text-sm text-kb-stone">{sub}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function InviteSection({ partner }: { partner: Partner }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = partner.handle ? `${origin}/start?p=${partner.handle}` : "";

  async function send(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await inviteBusiness(partner.id, email.trim(), name.trim());
      track("partner_invited", { partner_id: partner.id });
      setMsg({
        ok: true,
        text: r.emailed
          ? `Invite sent to ${email.trim()}.`
          : `Invite created, but the email didn't go out. Send them this link: ${r.link}`,
      });
      setEmail("");
      setName("");
      await queryClient.invalidateQueries({ queryKey: ["partner-workspace"] });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    }
    setBusy(false);
  }

  return (
    <Section
      title="Invite a business"
      sub="We email the owner a setup link. Their plan is through you, so Kabsi never asks them to pay."
    >
      <form onSubmit={send} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="inv-email">Owner's email</Label>
          <Input
            id="inv-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="inv-name">Business name (optional)</Label>
          <Input
            id="inv-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <Button type="submit" disabled={busy || !email.trim()}>
          {busy ? "Sending…" : "Send invite"}
        </Button>
      </form>
      {msg ? (
        <p
          role="status"
          className={cn("mt-3 break-words text-sm", msg.ok ? "text-kb-green" : "text-kb-red")}
        >
          {msg.text}
        </p>
      ) : null}
      {link ? (
        <div className="mt-6 flex flex-col gap-3 rounded-card bg-kb-sand p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold">Your signup link</p>
            <p className="truncate font-mono text-sm text-kb-stone">{link}</p>
          </div>
          <CopyButton text={link} label="Copy link" />
        </div>
      ) : null}
    </Section>
  );
}

function InvoiceRow({ invoice, claim }: { invoice: Invoice; claim: Claim | null }) {
  const queryClient = useQueryClient();
  const [network, setNetwork] = useState<Claim["network"]>("trc20");
  const [tx, setTx] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const billable = invoice.active_count - invoice.free_count;
  const pending = claim?.status === "pending";

  async function send(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await submitClaim(invoice.id, network, tx.trim());
      setTx("");
      await queryClient.invalidateQueries({ queryKey: ["partner-workspace"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  }

  return (
    <div className="rounded-card border border-kb-hairline p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-bold">{monthName(invoice.month)}</p>
        <p className="font-display text-2xl leading-none">{money(invoice.amount_usd)}</p>
      </div>
      <p className="mt-1 text-sm text-kb-stone">
        {invoice.active_count} active × {money(invoice.rate_usd)}
        {invoice.free_count ? ` · ${invoice.free_count} free (first 30 days)` : ""}
        {billable !== invoice.active_count ? ` · ${billable} billed` : ""}
      </p>
      {invoice.status === "paid" ? (
        <p className="mt-2 text-sm font-bold text-kb-green">Paid {shortDate(invoice.paid_at)}</p>
      ) : null}
      {invoice.status === "waived" ? (
        <p className="mt-2 text-sm text-kb-stone">Nothing to pay.</p>
      ) : null}
      {invoice.status === "unpaid" && pending ? (
        <p className="mt-2 text-sm">
          You sent a transaction ID on {shortDate(claim.created_at)}. We're checking it and will
          email you when the payment is confirmed.
        </p>
      ) : null}
      {invoice.status === "unpaid" && !pending ? (
        <div className="mt-4 space-y-3 border-t border-kb-hairline pt-4 text-sm">
          {claim?.status === "rejected" ? (
            <p className="text-kb-red">
              We couldn't match your last transaction ID{claim.note ? `: ${claim.note}` : ""}. Check
              it and send it again.
            </p>
          ) : null}
          <p>Pay {money(invoice.amount_usd)} in USDT, then paste the transaction ID below.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-0 break-all">
              <span className="text-kb-stone">TRC20: </span>
              <span className="font-mono">{USDT_TRC20}</span>
            </span>
            <CopyButton text={USDT_TRC20} label="Copy" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <span className="text-kb-stone">Binance Pay ID: </span>
              <span className="font-mono">{BINANCE_PAY_ID}</span>
            </span>
            <CopyButton text={BINANCE_PAY_ID} label="Copy" />
          </div>
          <form onSubmit={send} className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
            <select
              aria-label="How you paid"
              value={network}
              onChange={(e) => setNetwork(e.target.value as Claim["network"])}
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
        </div>
      ) : null}
    </div>
  );
}
