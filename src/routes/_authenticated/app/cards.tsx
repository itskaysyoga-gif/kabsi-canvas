import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Download,
  HandHeart,
  Link2,
  MousePointerClick,
  Nfc,
  Power,
  Printer,
  TriangleAlert,
} from "lucide-react";
import { copyText } from "@/lib/clipboard";
import { CopyButton } from "@/components/shared/copy-button";
import { useIsLebanon } from "@/lib/region";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { activateCard, friendlyError, myLatestLocation } from "@/lib/onboarding";
import { track } from "@/lib/telemetry";
import { qrSvg } from "@/lib/qr";
import { CreditCard as PageGlyph } from "lucide-react";
import { PageIcon } from "@/components/shared/page-icon";

// Cards and review links: each opens the business's Google review page for every customer, no filtering
// (D212). A physical card is optional: a review link (go.kabsi.co/CODE) and its printable QR do the same job
// digitally. Reads via RLS; create / activate / rename / switch off go through membership-checked RPCs.
export const Route = createFileRoute("/_authenticated/app/cards")({
  head: () => ({
    meta: [{ title: "Get reviews | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: CardsPage,
});

type Card = {
  code: string;
  kind: string;
  status: string;
  label: string | null;
  activated_at: string | null;
};
type Tap = { code: string; source: string; created_at: string };
const DAY = 86400_000;

async function loadCards(locationId: string) {
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const [cards, taps] = await Promise.all([
    supabase
      .from("cards")
      .select("code, kind, status, label, activated_at")
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
      <PageIcon icon={<PageGlyph />} />
      <p className="text-sm font-bold uppercase tracking-wider text-kb-stone">
        Make reviewing easy
      </p>
      <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl">Get reviews</h1>
      <p className="mt-2 text-kb-stone">
        Each tap, scan or click opens your Google review page. Every customer sees the same page. A
        card is optional: a review link and its QR code work without one.
      </p>
      <ul className="mt-5 grid gap-3 rounded-large border-2 border-kb-hairline bg-kb-white p-5 text-sm leading-6 sm:grid-cols-2">
        <li className="flex gap-3">
          <MousePointerClick className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span>
            Taps and scans count how often your review page was opened. They don't show whether a
            review was written.
          </span>
        </li>
        <li className="flex gap-3">
          <HandHeart className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span>
            Ask every customer the same way. Never offer a discount, gift or prize for a review:
            Google can remove those reviews.
          </span>
        </li>
      </ul>
      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      {data.isLoading ? <p className="mt-6 text-kb-stone">Loading…</p> : null}
      {loc ? (
        <ReviewLinks
          locationId={loc.id}
          links={data.data?.cards.filter((c) => c.kind === "link") ?? []}
          taps={data.data?.taps ?? []}
          onChanged={refresh}
        />
      ) : null}
      <h2 className="mt-10 text-lg font-bold">NFC cards</h2>
      {loc && loc.country !== "LB" ? (
        <p className="mt-2 rounded-card bg-kb-white p-4 text-sm leading-6 text-kb-stone shadow-kb">
          <b className="text-kb-ink">Outside Lebanon?</b> Kabsi ships cards only in Lebanon. Get one
          from a Kabsi partner, or buy any blank NFC card or sticker online (NTAG213 or NTAG215),
          open a free NFC writer app, choose "write a URL" and paste your review link from above.
          Taps are counted the same way.
        </p>
      ) : null}
      <div className="mt-3 space-y-4">
        {data.data?.cards
          .filter((c) => c.kind !== "link")
          .sort((a, b) => Number(b.status === "active") - Number(a.status === "active"))
          .map((c) => (
            <CardRow
              key={c.code}
              card={c}
              taps={data.data.taps.filter((t) => t.code === c.code)}
              onChanged={refresh}
            />
          ))}
        {data.data && !data.data.cards.some((c) => c.kind !== "link") ? (
          <div className="rounded-large bg-kb-white p-6 shadow-kb">
            <p className="font-bold">No cards yet.</p>
            <p className="mt-1 text-sm text-kb-stone">
              Got a Kabsi NFC card? Add it below with the code printed under the QR. You don't need
              one to use Kabsi.
            </p>
          </div>
        ) : null}
      </div>
      {loc ? <AddCard locationId={loc.id} onAdded={refresh} /> : null}
    </div>
  );
}

// The short link with a real, labelled copy button (44 px tall, easy to hit on a phone).
// copyText() always resolves (it falls back off the Clipboard API), so a failed copy shows a real
// "couldn't copy" state instead of the button silently doing nothing on a second tap (iOS Safari can
// reject navigator.clipboard.writeText, e.g. after the tab lost focus).
function CopyField({ url, label }: { url: string; label: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  return (
    <div className="mt-4 flex items-center gap-2 rounded-card bg-kb-sand py-1.5 pl-4 pr-1.5 text-sm">
      <span className="min-w-0 flex-1 truncate font-mono">{url.replace(/^https:\/\//, "")}</span>
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-pill bg-kb-white px-3 text-sm font-bold shadow-kb transition-colors hover:bg-kb-hairline/40"
        onClick={() =>
          void copyText(url).then((ok) => {
            setState(ok ? "done" : "failed");
            setTimeout(() => setState("idle"), 2000);
          })
        }
      >
        {state === "done" ? (
          <Check className="size-4" />
        ) : state === "failed" ? (
          <TriangleAlert className="size-4" />
        ) : (
          <Copy className="size-4" />
        )}
        {state === "done" ? "Copied" : state === "failed" ? "Couldn't copy" : "Copy"}
      </button>
    </div>
  );
}

function OnOff({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-pill px-2 py-0.5 text-xs font-bold",
        active ? "bg-kb-green/10 text-kb-green" : "bg-kb-sand text-kb-stone",
      )}
    >
      {active ? "On" : "Off"}
    </span>
  );
}

// Switching off needs a confirm (customers tapping it stop reaching the review page); switching on doesn't.
function SwitchButton({
  active,
  what,
  busy,
  onToggle,
}: {
  active: boolean;
  what: string;
  busy?: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="compact"
        disabled={busy}
        onClick={() => (active ? setOpen(true) : onToggle())}
      >
        <Power /> {active ? "Switch off" : "Switch on"}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch off {what}?</AlertDialogTitle>
            <AlertDialogDescription>
              People who tap or scan it will see a "not active" page instead of your Google review
              page. You can switch it back on any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it on</AlertDialogCancel>
            <AlertDialogAction onClick={onToggle}>Switch off</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CardRow({ card, taps, onChanged }: { card: Card; taps: Tap[]; onChanged: () => unknown }) {
  const [label, setLabel] = useState(card.label ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const url = `https://go.kabsi.co/${card.code}`;
  const week = taps.filter((t) => Date.parse(t.created_at) > Date.now() - 7 * DAY);
  const active = card.status === "active";
  const dirty = label.trim() !== (card.label ?? "").trim();

  async function rename(e?: FormEvent) {
    e?.preventDefault();
    if (!dirty) return;
    setBusy(true);
    const { error } = await supabase.rpc("rename_card", {
      p_code: card.code,
      p_label: label.trim(),
    });
    setBusy(false);
    setMsg(error ? "Couldn't save the name." : "Name saved.");
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
    <article
      className={cn("rounded-large bg-kb-white p-5 shadow-kb sm:p-6", !active && "opacity-80")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-full",
              active ? "bg-kb-yellow" : "bg-kb-sand",
            )}
          >
            <Nfc className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold">{card.label || "NFC card"}</p>
            <p className="flex items-center gap-2 text-sm text-kb-stone">
              <span className="font-mono">{card.code}</span>
              <OnOff active={active} />
            </p>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-4 text-right">
          <div>
            <p className="text-2xl font-bold leading-none">{week.length}</p>
            <p className="mt-1 text-xs text-kb-stone">7 days</p>
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{taps.length}</p>
            <p className="mt-1 text-xs text-kb-stone">30 days</p>
          </div>
        </div>
      </div>
      <CopyField url={url} label="Copy card link" />
      <form onSubmit={(e) => void rename(e)} className="mt-3 flex gap-2">
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
        {dirty ? (
          <Button type="submit" variant="outline" size="compact" disabled={busy}>
            Save
          </Button>
        ) : null}
      </form>
      <div className="mt-2 flex items-center justify-between gap-3">
        {msg ? (
          <p className="text-sm text-kb-stone" role="status">
            {msg}
          </p>
        ) : (
          <span />
        )}
        <SwitchButton
          active={active}
          what={`card ${card.code}`}
          busy={busy}
          onToggle={() => void toggle()}
        />
      </div>
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
    <form
      onSubmit={add}
      className="mt-8 rounded-large border border-dashed border-kb-hairline p-5 sm:p-6"
    >
      <Label htmlFor="new-card" className="font-bold">
        Add a Kabsi card
      </Label>
      <p className="mt-1 text-sm text-kb-stone">The 6-character code printed under the QR.</p>
      <div className="mt-3 flex gap-2">
        <Input
          id="new-card"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. KQA234"
          maxLength={8}
          autoCapitalize="characters"
          autoComplete="off"
          className="font-mono uppercase placeholder:normal-case"
        />
        <Button type="submit" size="compact" disabled={busy}>
          {busy ? "Adding…" : "Add"}
        </Button>
      </div>
      {msg ? <p className="mt-3 text-sm text-kb-stone">{msg}</p> : null}
    </form>
  );
}

function ReviewLinks({
  locationId,
  links,
  taps,
  onChanged,
}: {
  locationId: string;
  links: Card[];
  taps: Tap[];
  onChanged: () => unknown;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function create() {
    setBusy(true);
    setMsg("");
    const { error } = await supabase.rpc("create_review_link", {
      p_location: locationId,
      p_label: null,
    });
    setBusy(false);
    if (error) {
      setMsg(
        error.message.includes("too_many_links")
          ? "You already have 5 links. Reuse one of them."
          : friendlyError(error),
      );
      return;
    }
    track("card_activated", { source: "review_link" });
    onChanged();
  }
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">Review links</h2>
      <p className="mt-1 text-sm text-kb-stone">
        Put it in WhatsApp replies, your Instagram bio or receipts, or print the QR code.
      </p>
      <div className="mt-3 space-y-4">
        {links.map((l) => (
          <LinkRow
            key={l.code}
            link={l}
            taps={taps.filter((t) => t.code === l.code)}
            onChanged={onChanged}
          />
        ))}
      </div>
      {links.length < 5 ? (
        <Button
          variant={links.length ? "outline" : "default"}
          className="mt-4"
          disabled={busy}
          onClick={() => void create()}
        >
          <Link2 />{" "}
          {busy ? "Creating…" : links.length ? "Create another link" : "Create my review link"}
        </Button>
      ) : null}
      {msg ? <p className="mt-3 text-sm text-kb-red">{msg}</p> : null}
    </section>
  );
}

function LinkRow({ link, taps, onChanged }: { link: Card; taps: Tap[]; onChanged: () => unknown }) {
  const [msg, setMsg] = useState("");
  const active = link.status === "active";
  async function toggle() {
    const { error } = await supabase.rpc("set_card_active", {
      p_code: link.code,
      p_active: !active,
    });
    setMsg(error ? "Couldn't change it. Try again." : active ? "Switched off." : "Switched on.");
    if (!error) onChanged();
  }
  const url = `https://go.kabsi.co/${link.code}`;
  const qrUrl = `${url}?s=q`;
  const svg = qrSvg(qrUrl, 176);
  const week = taps.filter((t) => Date.parse(t.created_at) > Date.now() - 7 * DAY).length;
  function download() {
    const blob = new Blob([qrSvg(qrUrl, 1024)], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kabsi-review-qr-${link.code}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function print() {
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    w.document.write(
      `<!doctype html><title>Review QR</title><body style="font-family:sans-serif;text-align:center;padding:40px">` +
        `<p style="font-size:28px;font-weight:700;margin:0 0 20px">Leave us a Google review</p>${qrSvg(qrUrl, 360)}` +
        `<p style="font-size:18px;margin:16px 0 0">Scan with your phone camera</p></body>`,
    );
    w.document.close();
    w.focus();
    w.print();
  }
  return (
    <article className="flex flex-col gap-5 rounded-large bg-kb-white p-6 shadow-kb sm:flex-row">
      <div
        className="size-44 shrink-0 self-center overflow-hidden rounded-card border border-kb-hairline"
        role="img"
        aria-label={`QR code for ${url}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-bold">{link.label || "Review link"}</p>
            <p className="mt-0.5 flex items-center gap-2 text-sm text-kb-stone">
              <span className="font-mono">{link.code}</span>
              <OnOff active={active} />
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{week}</p>
            <p className="text-xs text-kb-stone">opens, 7 days</p>
          </div>
        </div>
        <CopyField url={url} label="Copy review link" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="compact" onClick={download}>
            <Download /> Download QR
          </Button>
          <Button variant="ghost" size="compact" onClick={print}>
            <Printer /> Print
          </Button>
          <SwitchButton active={active} what="this review link" onToggle={() => void toggle()} />
        </div>
        {msg ? <p className="mt-2 text-sm text-kb-stone">{msg}</p> : null}
      </div>
    </article>
  );
}
