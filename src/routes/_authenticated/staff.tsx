import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { amStaff } from "@/lib/reviews";

// Staff workspace v1: see every business and record offline payments (cash / Whish / OMT / USDT).
// Payments go through the staff_record_payment RPC, which activates the plan and refreshes the status.
export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [{ title: "Staff — Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: StaffPage,
});

type Row = {
  id: string;
  name: string;
  status: string;
  onboarding_step: string;
  country: string | null;
  created_at: string;
  access_granted_at: string | null;
};
const ITEMS = [
  { value: "pro_6m", label: "Pro 6 months", price: 75 },
  { value: "pro_12m", label: "Pro 12 months", price: 120 },
  { value: "card", label: "Card", price: 20 },
] as const;
const METHODS = ["cash", "whish", "omt", "usdt"] as const;

async function allLocations(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, status, onboarding_step, country, created_at, access_granted_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

function StaffPage() {
  const staff = useQuery({ queryKey: ["am-staff"], queryFn: amStaff, staleTime: Infinity });
  const rows = useQuery({
    queryKey: ["staff-locations"],
    queryFn: allLocations,
    enabled: staff.data === true,
  });
  return (
    <AppLayout area="staff">
      <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
        <h1 className="font-display text-4xl leading-none sm:text-5xl">Staff</h1>
        {staff.isLoading ? <p className="mt-6 text-kb-stone">Loading…</p> : null}
        {staff.data === false ? (
          <p className="mt-6 text-kb-stone">This page is for the Kabsi team only.</p>
        ) : null}
        {staff.data ? (
          <>
            <p className="mt-2 text-kb-stone">
              Businesses, newest first. Record a payment once the money is received.
            </p>
            <div className="mt-7 space-y-4">
              {rows.isLoading ? <p className="text-kb-stone">Loading businesses…</p> : null}
              {rows.data?.length === 0 ? <p className="text-kb-stone">No businesses yet.</p> : null}
              {rows.data?.map((row) => (
                <LocationRow key={row.id} row={row} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}

function LocationRow({ row }: { row: Row }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<(typeof ITEMS)[number]["value"]>("pro_6m");
  const [amount, setAmount] = useState("75");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("cash");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function record() {
    setBusy(true);
    setMsg("");
    const { error } = await supabase.rpc("staff_record_payment", {
      p_location: row.id,
      p_item: item,
      p_amount: Number(amount),
      p_method: method,
      p_reference: reference.trim() || null,
    });
    setBusy(false);
    if (error) return setMsg(`Couldn't record it: ${error.message}`);
    setMsg("Payment recorded.");
    setOpen(false);
    await queryClient.invalidateQueries({ queryKey: ["staff-locations"] });
    await queryClient.invalidateQueries({ queryKey: ["my-location"] });
  }

  return (
    <div className="rounded-large bg-kb-white p-5 shadow-kb">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold">{row.name}</p>
          <p className="text-sm text-kb-stone">
            {row.status.replace(/_/g, " ")} · step {row.onboarding_step} · {row.country ?? "—"} ·{" "}
            {new Date(row.created_at).toLocaleDateString()}
            {row.access_granted_at ? " · Google access ✓" : ""}
          </p>
        </div>
        <Button size="compact" variant="outline" onClick={() => setOpen(!open)}>
          Record payment
        </Button>
      </div>
      {open ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <select
            aria-label="Item"
            value={item}
            onChange={(e) => {
              const next = ITEMS.find((i) => i.value === e.target.value) ?? ITEMS[0];
              setItem(next.value);
              setAmount(String(next.price));
            }}
            className="h-11 rounded-card border border-kb-hairline bg-kb-white px-3"
          >
            {ITEMS.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label} (${i.price})
              </option>
            ))}
          </select>
          <Input
            aria-label="Amount in USD"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <select
            aria-label="Method"
            value={method}
            onChange={(e) => setMethod(e.target.value as (typeof METHODS)[number])}
            className="h-11 rounded-card border border-kb-hairline bg-kb-white px-3"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m === "omt" ? "OMT" : m === "usdt" ? "USDT" : m[0]!.toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
          <Input
            aria-label="Reference"
            placeholder="Reference (optional)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <Button
            className="sm:col-span-4"
            disabled={busy || !(Number(amount) >= 0) || amount === ""}
            onClick={() => void record()}
          >
            {busy ? "Saving…" : "Confirm payment received"}
          </Button>
        </div>
      ) : null}
      {msg ? <p className="mt-3 text-sm text-kb-stone">{msg}</p> : null}
    </div>
  );
}
