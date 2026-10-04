import { useState, type FormEvent } from "react";
import { fmtDateTime } from "@/lib/format";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { qrSvg } from "@/lib/qr";
import { cn } from "@/lib/utils";

// Staff operations (spec §9): job health, card codes (mint, CSV for NFC encoding, printable QR sheet)
// and card orders. Reads via staff RLS; writes via staff-only RPCs (generate_card_codes,
// staff_create_card_order, staff_set_card_order_status, staff_job_health).

type Health = {
  schedules: {
    name: string;
    schedule: string;
    active: boolean;
    last_start: string | null;
    last_status: string | null;
    last_message: string | null;
    failed_24h: number;
  }[];
  jobs: {
    job: string;
    runs_7d: number;
    fails_7d: number;
    last_at: string;
    last_fail_at: string | null;
  }[];
  recent_failures: { job: string; at: string; detail: unknown }[];
  /** The job queue (P0.1-12a): open work and the jobs that stopped in the last 7 days. */
  queue?: {
    pending: number;
    running: number;
    retrying: number;
    due_late: number;
    dead_7d: number;
    failed_7d: number;
  };
  stopped_jobs?: {
    id: number;
    kind: string;
    state: string;
    business: string | null;
    attempts: number;
    last_error: string | null;
    at: string;
  }[];
  http_errors_24h: number;
  http_calls_24h: number;
  emails_failed_24h: number;
  emails_sent_24h: number;
  publications_failed_7d: number;
  reviews_blocked: number;
  google_mode: string;
  email_from: string;
  checked_at: string;
};
type Code = { code: string; partner_id: string | null; created_at: string };
type Partner = { id: string; name: string };
type Order = {
  id: string;
  location_id: string | null;
  partner_id: string | null;
  quantity: number;
  status: string;
  notes: string | null;
  created_at: string;
};
type Place = { id: string; name: string };

const ORDER_STATES = ["requested", "paid", "encoding", "shipped", "installed", "cancelled"];
const when = (iso: string | null) => (iso ? fmtDateTime(iso) : "-");
const cardUrl = (code: string) => `https://go.kabsi.co/${code}`;

async function loadHealth(): Promise<Health> {
  const { data, error } = await supabase.rpc("staff_job_health");
  if (error) throw new Error(error.message);
  return data as Health;
}

async function loadOps() {
  const [codes, partners, orders, places] = await Promise.all([
    supabase
      .from("cards")
      .select("code, partner_id, created_at")
      .eq("status", "unassigned")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("partners").select("id, name").order("name"),
    supabase
      .from("card_orders")
      .select("id, location_id, partner_id, quantity, status, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("locations").select("id, name").order("name").limit(500),
  ]);
  for (const r of [codes, partners, orders, places]) if (r.error) throw new Error(r.error.message);
  return {
    codes: (codes.data ?? []) as Code[],
    partners: (partners.data ?? []) as Partner[],
    orders: (orders.data ?? []) as Order[],
    places: (places.data ?? []) as Place[],
  };
}

export function OpsPanel() {
  return (
    <div className="mt-8 space-y-10">
      <JobHealth />
      <CardsAndOrders />
    </div>
  );
}

function JobHealth() {
  const q = useQuery({ queryKey: ["staff-health"], queryFn: loadHealth });
  const h = q.data;
  const bad = (n: number) => (n > 0 ? "text-kb-red font-bold" : "");
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Job health</h2>
        <Button variant="ghost" size="compact" onClick={() => void q.refetch()}>
          <RefreshCw /> {q.isFetching ? "Checking…" : "Refresh"}
        </Button>
      </div>
      {q.isError ? <p className="mt-2 text-kb-red">{q.error.message}</p> : null}
      {h ? (
        <>
          <p className="mt-1 text-sm text-kb-stone">
            Google: {h.google_mode} · sending as {h.email_from} · checked {when(h.checked_at)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat
              label="Failed calls, 24h"
              value={`${h.http_errors_24h} / ${h.http_calls_24h}`}
              warn={h.http_errors_24h > 0}
            />
            <Stat
              label="Emails failed, 24h"
              value={String(h.emails_failed_24h)}
              warn={h.emails_failed_24h > 0}
            />
            <Stat label="Emails sent, 24h" value={String(h.emails_sent_24h)} />
            <Stat
              label="Google writes failed, 7d"
              value={String(h.publications_failed_7d)}
              warn={h.publications_failed_7d > 0}
            />
            <Stat
              label="Blocked drafts"
              value={String(h.reviews_blocked)}
              warn={h.reviews_blocked > 0}
            />
          </div>
          <div className="mt-4 overflow-x-auto rounded-large bg-kb-white shadow-kb">
            <table className="w-full text-left text-sm">
              <thead className="text-kb-stone">
                <tr>
                  <th className="p-3 font-medium">Schedule</th>
                  <th className="p-3 font-medium">Runs</th>
                  <th className="p-3 font-medium">Last run</th>
                  <th className="p-3 font-medium">Failed 24h</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kb-hairline">
                {h.schedules.map((s) => (
                  <tr key={s.name}>
                    <td className="p-3 font-mono text-xs">{s.name.replace(/^kabsi_/, "")}</td>
                    <td className="p-3 font-mono text-xs">{s.schedule}</td>
                    <td className={cn("p-3", s.last_status === "failed" && "text-kb-red")}>
                      {when(s.last_start)} · {s.active ? (s.last_status ?? "never") : "paused"}
                    </td>
                    <td className={cn("p-3", bad(s.failed_24h))}>{s.failed_24h}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-kb-stone">
            Work done, last 7 days:{" "}
            {h.jobs.length
              ? h.jobs
                  .map((j) => `${j.job} ${j.runs_7d}${j.fails_7d ? ` (${j.fails_7d} failed)` : ""}`)
                  .join(" · ")
              : "nothing yet"}
          </p>
          {h.queue ? (
            <p className="mt-2 text-sm text-kb-stone">
              Job queue: {h.queue.pending} waiting · {h.queue.running} running · {h.queue.retrying}{" "}
              retrying · <span className={bad(h.queue.due_late)}>{h.queue.due_late} late</span> ·{" "}
              <span className={bad(h.queue.dead_7d + h.queue.failed_7d)}>
                {h.queue.dead_7d} dead and {h.queue.failed_7d} failed in 7 days
              </span>
            </p>
          ) : null}
          {h.stopped_jobs?.length ? (
            <details className="mt-2 text-sm" open>
              <summary className="cursor-pointer font-bold text-kb-red">
                {h.stopped_jobs.length} stopped {h.stopped_jobs.length === 1 ? "job" : "jobs"}
              </summary>
              <ul className="mt-2 space-y-1 font-mono text-xs">
                {h.stopped_jobs.map((j) => (
                  <li key={j.id}>
                    {when(j.at)} {j.kind} {j.state} after {j.attempts}{" "}
                    {j.attempts === 1 ? "try" : "tries"}
                    {j.business ? ` (${j.business})` : ""}: {j.last_error ?? ""}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          {h.recent_failures.length ? (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer font-bold text-kb-red">
                {h.recent_failures.length} recent failures
              </summary>
              <ul className="mt-2 space-y-1 font-mono text-xs">
                {h.recent_failures.map((f, i) => (
                  <li key={i}>
                    {when(f.at)} {f.job}: {JSON.stringify(f.detail).slice(0, 200)}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-large bg-kb-white p-4 shadow-kb">
      <p className="text-xs text-kb-stone">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", warn && "text-kb-red")}>{value}</p>
    </div>
  );
}

function CardsAndOrders() {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["staff-ops"], queryFn: loadOps });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["staff-ops"] });
  const d = q.data;
  const partnerName = (id: string | null) =>
    id ? (d?.partners.find((p) => p.id === id)?.name ?? "partner") : "Kabsi stock";
  const placeName = (id: string | null) =>
    id ? (d?.places.find((p) => p.id === id)?.name ?? "business") : "";
  return (
    <>
      {q.isError ? <p className="text-kb-red">{q.error.message}</p> : null}
      <CardCodes
        codes={d?.codes ?? []}
        partners={d?.partners ?? []}
        partnerName={partnerName}
        onChanged={refresh}
      />
      <CardOrders
        orders={d?.orders ?? []}
        partners={d?.partners ?? []}
        places={d?.places ?? []}
        partnerName={partnerName}
        placeName={placeName}
        onChanged={refresh}
      />
    </>
  );
}

function CardCodes({
  codes,
  partners,
  partnerName,
  onChanged,
}: {
  codes: Code[];
  partners: Partner[];
  partnerName: (id: string | null) => string;
  onChanged: () => unknown;
}) {
  const [count, setCount] = useState("20");
  const [partner, setPartner] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("all");
  const shown = codes.filter((c) => filter === "all" || (c.partner_id ?? "stock") === filter);

  async function mint(e: FormEvent) {
    e.preventDefault();
    const n = Number(count);
    if (!(n >= 1 && n <= 200)) return setMsg("Mint between 1 and 200 codes at a time.");
    setBusy(true);
    setMsg("");
    const { data, error } = await supabase.rpc("generate_card_codes", {
      p_count: n,
      p_partner: partner || null,
    });
    setBusy(false);
    if (error) return setMsg(`Couldn't mint: ${error.message}`);
    setMsg(`Minted ${(data as string[] | null)?.length ?? n} codes.`);
    onChanged();
  }

  function csv() {
    const rows = [
      ["code", "nfc_url", "qr_url", "owner", "minted"],
      ...shown.map((c) => [
        c.code,
        cardUrl(c.code),
        `${cardUrl(c.code)}?s=q`,
        partnerName(c.partner_id),
        c.created_at.slice(0, 10),
      ]),
    ];
    const text = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = `kabsi-card-codes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function printSheet() {
    const w = window.open("", "_blank");
    if (!w) return;
    const cells = shown
      .map(
        (c) =>
          `<div class="c">${qrSvg(`${cardUrl(c.code)}?s=q`, 120)}<p>${c.code}</p><small>go.kabsi.co/${c.code}</small></div>`,
      )
      .join("");
    w.document.write(
      `<!doctype html><title>Kabsi card codes</title><style>body{font-family:sans-serif;margin:12mm}` +
        `.g{display:grid;grid-template-columns:repeat(4,1fr);gap:6mm}.c{border:1px dashed #bbb;padding:4mm;text-align:center;break-inside:avoid}` +
        `p{font:700 16px monospace;letter-spacing:2px;margin:2mm 0 0}small{color:#666}</style>` +
        `<p style="font:14px sans-serif;letter-spacing:0">Kabsi card codes · ${shown.length} · printed ${new Date().toLocaleDateString()}</p>` +
        `<div class="g">${cells}</div>`,
    );
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <section>
      <h2 className="text-xl font-bold">Card codes</h2>
      <p className="mt-1 text-sm text-kb-stone">
        Unused codes. Encode the NFC chip with the nfc_url and print the QR (it carries ?s=q so
        scans are counted separately). A code links to a business when the owner activates it.
      </p>
      <form onSubmit={mint} className="mt-4 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          How many
          <Input
            className="mt-1 w-24"
            inputMode="numeric"
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </label>
        <label className="text-sm">
          For
          <select
            value={partner}
            onChange={(e) => setPartner(e.target.value)}
            className="mt-1 block h-11 rounded-card border border-kb-hairline bg-kb-white px-3"
          >
            <option value="">Kabsi stock</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="compact" disabled={busy}>
          {busy ? "Minting…" : "Mint codes"}
        </Button>
      </form>
      {msg ? <p className="mt-2 text-sm text-kb-stone">{msg}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          aria-label="Show codes for"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-10 rounded-card border border-kb-hairline bg-kb-white px-3 text-sm"
        >
          <option value="all">All unused ({codes.length})</option>
          <option value="stock">Kabsi stock</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Button variant="outline" size="compact" disabled={!shown.length} onClick={csv}>
          <Download /> CSV for encoding
        </Button>
        <Button variant="outline" size="compact" disabled={!shown.length} onClick={printSheet}>
          <Printer /> Print QR sheet
        </Button>
      </div>
      <p className="mt-3 font-mono text-xs leading-6 text-kb-stone">
        {shown.length
          ? shown
              .slice(0, 60)
              .map((c) => c.code)
              .join("  ")
          : "No unused codes."}
        {shown.length > 60 ? `  … and ${shown.length - 60} more` : ""}
      </p>
    </section>
  );
}

function CardOrders({
  orders,
  partners,
  places,
  partnerName,
  placeName,
  onChanged,
}: {
  orders: Order[];
  partners: Partner[];
  places: Place[];
  partnerName: (id: string | null) => string;
  placeName: (id: string | null) => string;
  onChanged: () => unknown;
}) {
  const [target, setTarget] = useState("");
  const [qty, setQty] = useState("1");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function create(e: FormEvent) {
    e.preventDefault();
    const [kind, id] = target.split(":");
    if (!id) return setMsg("Pick a business or a partner.");
    setBusy(true);
    setMsg("");
    const { error } = await supabase.rpc("staff_create_card_order", {
      p_location: kind === "l" ? id : null,
      p_partner: kind === "p" ? id : null,
      p_quantity: Number(qty),
      p_notes: notes || null,
    });
    setBusy(false);
    if (error) return setMsg(`Couldn't create it: ${error.message}`);
    setNotes("");
    setMsg("Order added.");
    onChanged();
  }
  async function setStatus(id: string, status: string) {
    const { error } = await supabase.rpc("staff_set_card_order_status", {
      p_order: id,
      p_status: status,
    });
    if (error) setMsg(`Couldn't update: ${error.message}`);
    else onChanged();
  }

  return (
    <section>
      <h2 className="text-xl font-bold">Card orders</h2>
      <p className="mt-1 text-sm text-kb-stone">
        Requested → paid → encoding → shipped → installed.
      </p>
      <form onSubmit={create} className="mt-4 grid gap-2 sm:grid-cols-[2fr_80px_2fr_auto]">
        <select
          aria-label="Order for"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="h-11 rounded-card border border-kb-hairline bg-kb-white px-3"
        >
          <option value="">For…</option>
          <optgroup label="Businesses">
            {places.map((p) => (
              <option key={p.id} value={`l:${p.id}`}>
                {p.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Partners">
            {partners.map((p) => (
              <option key={p.id} value={`p:${p.id}`}>
                {p.name}
              </option>
            ))}
          </optgroup>
        </select>
        <Input
          aria-label="Quantity"
          inputMode="numeric"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <Input
          aria-label="Notes"
          placeholder="Notes (address, design, paid how)"
          value={notes}
          maxLength={500}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button
          type="submit"
          size="compact"
          disabled={busy || !(Number(qty) >= 1 && Number(qty) <= 1000)}
        >
          Add order
        </Button>
      </form>
      {msg ? <p className="mt-2 text-sm text-kb-stone">{msg}</p> : null}
      <div className="mt-4 space-y-2">
        {orders.length === 0 ? <p className="text-kb-stone">No orders yet.</p> : null}
        {orders.map((o) => (
          <div
            key={o.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-large bg-kb-white p-4 shadow-kb"
          >
            <div className="min-w-0">
              <p className="font-bold">
                {o.quantity} × card ·{" "}
                {o.location_id ? placeName(o.location_id) : partnerName(o.partner_id)}
              </p>
              <p className="text-sm text-kb-stone">
                {when(o.created_at)}
                {o.notes ? ` · ${o.notes}` : ""}
              </p>
            </div>
            <select
              aria-label="Order status"
              value={o.status}
              onChange={(e) => void setStatus(o.id, e.target.value)}
              className="h-10 rounded-card border border-kb-hairline bg-kb-white px-3 text-sm"
            >
              {ORDER_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}
