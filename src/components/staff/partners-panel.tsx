import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import {
  createPartner,
  decideClaim,
  money,
  monthName,
  partnerError,
  shortDate,
  staffPartnerData,
  type StaffClaim,
} from "@/lib/partner";

// Staff: USDT payments to confirm, partners (create + list), partner leads from /partners.
export function PartnersPanel() {
  const data = useQuery({ queryKey: ["staff-partners"], queryFn: staffPartnerData });
  const d = data.data;
  return (
    <div className="mt-8 space-y-8">
      {data.isError ? <p className="text-kb-red">{String(data.error.message)}</p> : null}

      <section>
        <h2 className="text-xl font-bold">USDT payments to check</h2>
        <p className="mt-1 text-sm text-kb-stone">
          Confirm only after the money is in the wallet. Confirming marks the invoice paid and
          emails the partner.
        </p>
        <div className="mt-4 space-y-3">
          {d && d.claims.length === 0 ? <p className="text-kb-stone">Nothing waiting.</p> : null}
          {d?.claims.map((c) => (
            <ClaimRow key={c.id} claim={c} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">Partners</h2>
        <p className="mt-1 text-sm text-kb-stone">
          The first 10 are founding partners automatically ($6 for 12 months, first location free
          for 30 days). The partner signs in with the contact email to reach /partner.
        </p>
        <NewPartner />
        <div className="mt-4 space-y-3">
          {d && d.partners.length === 0 ? <p className="text-kb-stone">No partners yet.</p> : null}
          {d?.partners.map((p) => (
            <div key={p.id} className="rounded-large bg-kb-white p-5 shadow-kb">
              <p className="font-bold">
                {p.name}{" "}
                <span className="font-normal text-kb-stone">
                  /{p.handle} · {p.status}
                </span>
              </p>
              <p className="text-sm text-kb-stone">
                {p.founding
                  ? `Founding · ${money(p.rate_usd)} until ${shortDate(p.price_locked_until)}`
                  : `${money(p.rate_usd)} per location`}{" "}
                · {p.contact_email ?? "no email"}
                {p.instagram ? ` · ${p.instagram}` : ""} · {p.country ?? "-"} ·{" "}
                {p.partner_members.length
                  ? `${p.partner_members.length} signed in`
                  : "hasn't signed in yet"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">Leads</h2>
        <div className="mt-4 space-y-3">
          {d && d.leads.length === 0 ? <p className="text-kb-stone">No leads yet.</p> : null}
          {d?.leads.map((l) => (
            <div key={l.id} className="rounded-large bg-kb-white p-5 text-sm shadow-kb">
              <p className="font-bold">
                {l.name} <span className="font-normal text-kb-stone">· {l.kind}</span>
              </p>
              <p className="text-kb-stone">
                {l.email}
                {l.instagram ? ` · ${l.instagram}` : ""}
                {l.country ? ` · ${l.country}` : ""}
                {l.volume ? ` · ${l.volume}` : ""} · {shortDate(l.created_at)}
              </p>
              {l.message ? <p className="mt-2 whitespace-pre-line">{l.message}</p> : null}
            </div>
          ))}
        </div>
      </section>

      <AssistantContacts />
    </div>
  );
}

type Contact = {
  id: string;
  email: string;
  name: string | null;
  business_name: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  business_type: string | null;
  interest: string | null;
  marketing_consent: boolean;
  source: string;
  created_at: string;
};

// Contacts the Kabsi Assistant collected (D261): the mailing list. CSV for the email tool.
function AssistantContacts() {
  const q = useQuery({
    queryKey: ["staff-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("staff_contacts", { p_limit: 500 });
      if (error) throw new Error(error.message);
      return (data ?? []) as Contact[];
    },
  });
  function csv() {
    const cols = [
      "email",
      "name",
      "business_name",
      "phone",
      "country",
      "city",
      "business_type",
      "interest",
      "marketing_consent",
      "source",
      "created_at",
    ] as const;
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = [
      cols.join(","),
      ...(q.data ?? []).map((c) => cols.map((k) => esc(c[k])).join(",")),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
    a.download = "kabsi-contacts.csv";
    a.click();
  }
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Assistant contacts</h2>
          <p className="mt-1 text-sm text-kb-stone">
            People who gave their details to Nora, the Kabsi assistant. Email news only to those
            marked "yes to news".
          </p>
        </div>
        {q.data?.length ? (
          <Button size="compact" variant="outline" onClick={csv}>
            Download CSV
          </Button>
        ) : null}
      </div>
      {q.isError ? <p className="mt-3 text-kb-red">{String(q.error.message)}</p> : null}
      <div className="mt-4 space-y-3">
        {q.data && q.data.length === 0 ? <p className="text-kb-stone">No contacts yet.</p> : null}
        {q.data?.map((c) => (
          <div key={c.id} className="rounded-large bg-kb-white p-5 text-sm shadow-kb">
            <p className="font-bold">
              {c.name ?? c.email}
              {c.business_name ? (
                <span className="font-normal text-kb-stone"> · {c.business_name}</span>
              ) : null}
            </p>
            <p className="text-kb-stone">
              {c.email}
              {c.phone ? ` · ${c.phone}` : ""}
              {c.city || c.country ? ` · ${[c.city, c.country].filter(Boolean).join(", ")}` : ""}
              {c.business_type ? ` · ${c.business_type}` : ""} · {shortDate(c.created_at)} ·{" "}
              {c.marketing_consent ? "yes to news" : "no news"}
            </p>
            {c.interest ? <p className="mt-1">{c.interest}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function ClaimRow({ claim }: { claim: StaffClaim }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function decide(confirm: boolean) {
    setBusy(true);
    setMsg("");
    try {
      await decideClaim(claim.id, confirm, note.trim() || undefined);
      await queryClient.invalidateQueries({ queryKey: ["staff-partners"] });
    } catch (e) {
      setMsg(partnerError(e));
    }
    setBusy(false);
  }
  return (
    <div className="rounded-large bg-kb-white p-5 shadow-kb">
      <p className="font-bold">
        {claim.partners?.name ?? "Partner"} · {money(claim.amount_usd)}
        {claim.partner_invoices ? ` · ${monthName(claim.partner_invoices.month)}` : ""}
      </p>
      <p className="break-all text-sm text-kb-stone">
        {claim.network === "trc20" ? "TRC20" : "Binance Pay"}: {claim.tx_ref} · sent{" "}
        {shortDate(claim.created_at)}
        {claim.network === "trc20" ? (
          <>
            {" · "}
            <a
              className="underline"
              href={`https://tronscan.org/#/transaction/${encodeURIComponent(claim.tx_ref)}`}
              target="_blank"
              rel="noreferrer"
            >
              Tronscan
            </a>
          </>
        ) : null}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          aria-label="Note to the partner (if rejecting)"
          placeholder="Note (shown to the partner if rejected)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button size="compact" disabled={busy} onClick={() => void decide(true)}>
          Money received
        </Button>
        <Button size="compact" variant="outline" disabled={busy} onClick={() => void decide(false)}>
          Reject
        </Button>
      </div>
      {msg ? <p className="mt-2 text-sm text-kb-red">{msg}</p> : null}
    </div>
  );
}

function NewPartner() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", handle: "", email: "", instagram: "", country: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await createPartner(f);
      setF({ name: "", handle: "", email: "", instagram: "", country: "" });
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["staff-partners"] });
      await queryClient.invalidateQueries({ queryKey: ["my-partner"] });
    } catch (e) {
      setMsg(partnerError(e));
    }
    setBusy(false);
  }

  if (!open)
    return (
      <Button className="mt-4" size="compact" variant="outline" onClick={() => setOpen(true)}>
        Add a partner
      </Button>
    );
  return (
    <form
      onSubmit={save}
      className="mt-4 grid gap-3 rounded-large bg-kb-white p-5 shadow-kb sm:grid-cols-2"
    >
      <Input aria-label="Name" placeholder="Name" required value={f.name} onChange={set("name")} />
      <Input
        aria-label="Handle"
        placeholder="handle (used in /start?p=handle)"
        required
        pattern="[a-z0-9-]{3,30}"
        value={f.handle}
        onChange={(e) => setF({ ...f, handle: e.target.value.toLowerCase() })}
      />
      <Input
        aria-label="Contact email"
        type="email"
        placeholder="Contact email (they sign in with it)"
        required
        value={f.email}
        onChange={set("email")}
      />
      <Input
        aria-label="Instagram"
        placeholder="Instagram (optional)"
        value={f.instagram}
        onChange={set("instagram")}
      />
      <Input
        aria-label="Country"
        placeholder="Country code, e.g. LB (optional)"
        maxLength={2}
        value={f.country}
        onChange={set("country")}
      />
      <div className="flex gap-2">
        <Button type="submit" size="compact" disabled={busy}>
          {busy ? "Saving…" : "Create partner"}
        </Button>
        <Button type="button" size="compact" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {msg ? <p className="text-sm text-kb-red sm:col-span-2">{msg}</p> : null}
    </form>
  );
}
