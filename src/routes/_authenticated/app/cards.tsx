import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Nfc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { activateCard, friendlyError, myLatestLocation } from "@/lib/onboarding";
import { track } from "@/lib/telemetry";

// Cards: each opens the business's Google review page for every customer, no filtering (D212).
// Reads via RLS; activate / rename / switch off go through membership-checked RPCs.
export const Route = createFileRoute("/_authenticated/app/cards")({
  head: () => ({ meta: [{ title: "Cards — Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: CardsPage,
});

type Card = { code: string; status: string; label: string | null; activated_at: string | null };
type Tap = { code: string; source: string; created_at: string };
const DAY = 86400_000;

async function loadCards(locationId: string) {
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const [cards, taps] = await Promise.all([
    supabase
      .from("cards")
      .select("code, status, label, activated_at")
      .eq("location_id", locationId)
      .order("activated_at"),
    supabase
      .from("taps")
      .select("code, source, created_at")
      .eq("location_id", locationId)
      .eq("is_bot", false)
      .gte("created_at", since),
  ]);
  if (cards.error) throw new Error(cards.error.message);
  return { cards: (cards.data ?? []) as Card[], taps: (taps.data ?? []) as Tap[] };
}

function CardsPage() {
  const queryClient = useQueryClient();
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const data = useQuery({
    queryKey: ["cards", loc?.id],
    queryFn: () => loadCards(loc!.id),
    enabled: !!loc,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["cards"] });
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <h1 className="font-display text-4xl leading-none sm:text-5xl">Cards</h1>
      <p className="mt-2 text-kb-stone">
        Each tap or scan opens your Google review page. Every customer sees the same page.
      </p>
      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      {data.isLoading ? <p className="mt-6 text-kb-stone">Loading…</p> : null}
      <div className="mt-7 space-y-4">
        {data.data?.cards.map((c) => (
          <CardRow
            key={c.code}
            card={c}
            taps={data.data.taps.filter((t) => t.code === c.code)}
            onChanged={refresh}
          />
        ))}
        {data.data && !data.data.cards.length ? (
          <div className="rounded-large bg-kb-white p-7 shadow-kb">
            <p className="font-bold">No cards yet.</p>
            <p className="mt-1 text-sm text-kb-stone">
              Got a Kabsi card? Add it below with the code printed under the QR.
            </p>
          </div>
        ) : null}
      </div>
      {loc ? <AddCard locationId={loc.id} onAdded={refresh} /> : null}
    </div>
  );
}

function CardRow({ card, taps, onChanged }: { card: Card; taps: Tap[]; onChanged: () => unknown }) {
  const [label, setLabel] = useState(card.label ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const url = `https://go.kabsi.co/${card.code}`;
  const week = taps.filter((t) => Date.parse(t.created_at) > Date.now() - 7 * DAY);
  const active = card.status === "active";

  async function rename() {
    setBusy(true);
    const { error } = await supabase.rpc("rename_card", {
      p_code: card.code,
      p_label: label.trim(),
    });
    setBusy(false);
    setMsg(error ? "Couldn't save the name." : "Saved.");
    if (!error) onChanged();
  }
  async function toggle() {
    setBusy(true);
    const { error } = await supabase.rpc("set_card_active", {
      p_code: card.code,
      p_active: !active,
    });
    setBusy(false);
    setMsg(
      error
        ? "Couldn't change it. Try again."
        : active
          ? "Switched off. It can take up to a minute on phones."
          : "Switched on.",
    );
    if (!error) onChanged();
  }

  return (
    <article className="rounded-large bg-kb-white p-6 shadow-kb">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-full bg-kb-yellow">
            <Nfc className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-mono text-lg font-bold">{card.code}</p>
            <p className="text-sm text-kb-stone">{active ? "On" : "Off"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-right">
          <div>
            <p className="text-2xl font-bold">{week.length}</p>
            <p className="text-xs text-kb-stone">last 7 days</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{taps.length}</p>
            <p className="text-xs text-kb-stone">last 30 days</p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-card bg-kb-sand px-4 py-2.5 text-sm">
        <span className="min-w-0 flex-1 truncate font-mono">{url}</span>
        <button
          type="button"
          className="shrink-0"
          aria-label="Copy card link"
          onClick={() =>
            void navigator.clipboard?.writeText(url).then(() => setMsg("Link copied."))
          }
        >
          <Copy className="size-4" />
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Label htmlFor={`label-${card.code}`} className="sr-only">
          Card name
        </Label>
        <Input
          id={`label-${card.code}`}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={60}
          placeholder="Name it, e.g. Counter, Table 4"
        />
        <Button variant="outline" size="compact" disabled={busy} onClick={() => void rename()}>
          Save name
        </Button>
        <Button variant="ghost" size="compact" disabled={busy} onClick={() => void toggle()}>
          {active ? "Switch off" : "Switch on"}
        </Button>
      </div>
      {msg ? <p className="mt-3 text-sm text-kb-stone">{msg}</p> : null}
    </article>
  );
}

function AddCard({ locationId, onAdded }: { locationId: string; onAdded: () => unknown }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function add(e: FormEvent) {
    e.preventDefault();
    const clean = code.toUpperCase().replace(/[^0-9A-Z]/g, "");
    if (clean.length !== 6) return setMsg("The code has 6 letters and numbers.");
    setBusy(true);
    setMsg("");
    try {
      await activateCard(clean, locationId);
      track("card_activated", { source: "app" });
      setCode("");
      setMsg("Card added. Tap it with a phone to try it.");
      onAdded();
    } catch (err) {
      setMsg(friendlyError(err));
    }
    setBusy(false);
  }
  return (
    <form onSubmit={add} className="mt-8 rounded-large border border-dashed border-kb-hairline p-6">
      <Label htmlFor="new-card" className="font-bold">
        Add a card
      </Label>
      <div className="mt-3 flex gap-2">
        <Input
          id="new-card"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code under the QR, e.g. KQA234"
          maxLength={8}
          className="font-mono uppercase"
        />
        <Button type="submit" size="compact" disabled={busy}>
          {busy ? "Adding…" : "Add"}
        </Button>
      </div>
      {msg ? <p className="mt-3 text-sm text-kb-stone">{msg}</p> : null}
    </form>
  );
}
