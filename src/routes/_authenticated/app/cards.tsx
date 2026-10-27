import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Download, Link2, Nfc, Power, Printer, TriangleAlert } from "lucide-react";
import { copyText } from "@/lib/clipboard";
import { CopyButton } from "@/components/shared/copy-button";
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
import { AccountTop, Panel } from "@/components/kabsi/d3-account";
import {
  Button,
  ButtonLink,
  ErrorState,
  Skeleton,
  StatusPill,
  WhatsAppGlyph,
  buttonClass,
} from "@/components/kabsi/ui";
import { QrCode } from "@/components/kabsi/d2-parts";
import { ReviewCounts } from "@/components/reviews/review-counts";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { activateCard, friendlyError, myLatestLocation } from "@/lib/onboarding";
import { track } from "@/lib/telemetry";
import { qrSvg } from "@/lib/qr";
import { reviewLinkMessage, sendReviewLinkHref } from "@/lib/send-review-link";
import { fetchPrintCard, PRINT_FILE, savePdf, type PrintKind } from "@/lib/review-cards";

// Get reviews (Design 3, V3): one ready message that the owner or the team forwards after a real visit, the same for every
// customer; the QR code and the two print-ready cards; this month's numbers with where they come from; Google's rules.
// Every link opens the business's Google review page for everyone, no filtering (D212). Kabsi never gets a customer's
// number. Reads via RLS; create, activate, rename, switch off go through membership-checked RPCs. Staff can open it.
export const Route = createFileRoute("/_authenticated/app/cards")({
  head: () => ({
    meta: [{ title: "Get Reviews | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: CardsPage,
});

type Card = {
  code: string;
  kind: string;
  status: string;
  label: string | null;
  activated_at: string | null;
  page_mode: "direct" | "page";
};
type Tap = { code: string; source: string; created_at: string };
const DAY = 86400_000;
const goLink = (code: string) => `https://go.kabsi.co/${code}`;

async function loadCards(locationId: string) {
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const [cards, taps] = await Promise.all([
    supabase
      .from("cards")
      .select("code, kind, status, label, activated_at, page_mode")
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
  const links = data.data?.cards.filter((c) => c.kind === "link") ?? [];
  const shareLink = links.find((l) => l.status === "active") ?? links[0];
  const nfc = (data.data?.cards ?? []).filter((c) => c.kind !== "link");

  return (
    <>
      <AccountTop
        title="Get reviews"
        lead="A ready message you or your team send after a real visit. The same message to every customer."
      />
      {!location.isLoading && !loc ? (
        <ButtonLink to="/start">Add your business</ButtonLink>
      ) : location.isLoading || data.isLoading ? (
        <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-card border border-line bg-surface-1 p-5">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-4/5" />
            </div>
          ))}
        </div>
      ) : data.isError ? (
        <ErrorState title="This page did not load." onRetry={() => void data.refetch()}>
          Nothing you did, and nothing changed on Google. Try again in a minute.
        </ErrorState>
      ) : loc ? (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          {shareLink ? (
            <>
              <ReadyMessage name={loc.name} code={shareLink.code} />
              <QrPanel code={shareLink.code} name={loc.name} />
            </>
          ) : (
            <MakeLink locationId={loc.id} onChanged={refresh} />
          )}
          <Panel title="This month" id="month" className="lg:col-span-2">
            <ReviewCounts locationId={loc.id} />
          </Panel>
          <Panel title="Google's rules" id="rules" className="lg:col-span-2">
            <p className="text-body text-text-2">
              Send it to every customer, the same way. Do not offer anything in return, and do not
              ask only happy customers.
            </p>
            <p className="mt-2 text-small text-text-2">
              Never offer a reward for a review: Google can remove those reviews. Activity is not
              the same as reviews. Google decides which reviews appear.
            </p>
          </Panel>
          {links.length ? (
            <ReviewLinks
              locationId={loc.id}
              links={links}
              taps={data.data?.taps ?? []}
              onChanged={refresh}
            />
          ) : null}
          {shareLink ? <ShareKit name={loc.name} link={goLink(shareLink.code)} /> : null}
          <Panel title="Optional: use your own NFC card or tag" id="nfc" className="lg:col-span-2">
            <p className="text-small text-text-2">
              Already have an NFC tag or sticker? Use a free NFC writer on your phone, choose "write
              a URL" and paste your review link. Activity is counted the same way.
            </p>
            <div className="mt-4 space-y-3">
              {[...nfc]
                .sort((a, b) => Number(b.status === "active") - Number(a.status === "active"))
                .map((c) => (
                  <CardRow
                    key={c.code}
                    card={c}
                    taps={(data.data?.taps ?? []).filter((t) => t.code === c.code)}
                    onChanged={refresh}
                  />
                ))}
              {data.data && !nfc.length ? (
                <div className="rounded-inner bg-surface-2 p-4">
                  <p className="font-bold">No Kabsi cards added.</p>
                  <p className="mt-1 text-small text-text-2">
                    Got a Kabsi card? Add it below with the code printed under the QR.
                  </p>
                </div>
              ) : null}
            </div>
            <AddCard locationId={loc.id} onAdded={refresh} />
          </Panel>
        </div>
      ) : null}
    </>
  );
}

// The one message (V3, src/lib/send-review-link.ts, the same words as WhatsApp). The owner or the team forwards it from
// their own WhatsApp; the link carries s=m so an open from a message is counted apart, never as a review.
function ReadyMessage({ name, code }: { name: string; code: string }) {
  const [copied, setCopied] = useState<"" | "done" | "failed">("");
  const link = `${goLink(code)}?s=m`;
  const message = reviewLinkMessage(name, link);
  return (
    <Panel title="Your ready message" id="message">
      <div className="wa-ground rounded-inner p-3">
        <p
          dir="auto"
          className="ms-auto max-w-[90%] break-words rounded-bubble rounded-se-none bg-wa-out p-3 text-chat text-wa-ink shadow-bubble"
        >
          {message}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={sendReviewLinkHref(name, link)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass("whatsapp", "md")}
          data-main-cta
        >
          <WhatsAppGlyph className="size-4.5" />
          Forward on WhatsApp
        </a>
        <Button
          variant="secondary"
          size="md"
          icon={
            copied === "done" ? (
              <Check className="size-4" aria-hidden />
            ) : copied === "failed" ? (
              <TriangleAlert className="size-4" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )
          }
          onClick={() =>
            void copyText(message).then((ok) => {
              setCopied(ok ? "done" : "failed");
              setTimeout(() => setCopied(""), 2000);
            })
          }
        >
          {copied === "done" ? "Copied" : copied === "failed" ? "Couldn't copy" : "Copy message"}
        </Button>
      </div>
      <p className="mt-4 text-small text-text-2">
        Kabsi never asks for your customers' numbers and never messages them. You choose who gets
        it, after a visit.
      </p>
    </Panel>
  );
}

// The QR code and the print-ready cards (supabase/functions/review-cards answers the PDF).
function QrPanel({ code, name }: { code: string; name: string }) {
  const qrUrl = `${goLink(code)}?s=q`;
  const [busy, setBusy] = useState<PrintKind | "">("");
  const [error, setError] = useState("");
  async function print(kind: PrintKind) {
    setBusy(kind);
    setError("");
    try {
      savePdf(await fetchPrintCard(code, kind), PRINT_FILE[kind]);
    } catch (e) {
      setError(
        e instanceof Error && e.message ? e.message : "The card did not come out. Try again.",
      );
    }
    setBusy("");
  }
  function download() {
    const blob = new Blob([qrSvg(qrUrl, 1024)], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kabsi-review-qr-${code}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  return (
    <Panel title="Your QR code" id="qr">
      <div className="mx-auto max-w-[12rem] rounded-card border border-line">
        <QrCode value={qrUrl} label={`QR code that opens the review page for ${name}`} />
      </div>
      <div className="mt-4 grid gap-2">
        <Button
          variant="secondary"
          size="md"
          loading={busy === "counter"}
          disabled={!!busy}
          onClick={() => void print("counter")}
          icon={<Printer className="size-4" aria-hidden />}
        >
          Print a counter card
        </Button>
        <Button
          variant="quiet"
          size="md"
          loading={busy === "tent"}
          disabled={!!busy}
          onClick={() => void print("tent")}
          icon={<Printer className="size-4" aria-hidden />}
        >
          Print a table card
        </Button>
        <Button
          variant="tertiary"
          className="justify-self-center"
          onClick={download}
          icon={<Download className="size-4" aria-hidden />}
        >
          Download QR
        </Button>
      </div>
      {error ? (
        <p className="mt-3 text-small text-bad" role="alert">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}

// No review link yet: one button makes it.
function MakeLink({ locationId, onChanged }: { locationId: string; onChanged: () => unknown }) {
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
    <Panel title="Your review link" id="message" className="lg:col-span-2">
      <p className="text-body text-text-2">
        A link goes straight to your Google review page, or opens a short page with the Google
        button first and a line to message the manager. Everyone sees the same thing, and nobody is
        asked how their visit went.
      </p>
      <Button
        className="mt-5"
        size="md"
        loading={busy}
        onClick={() => void create()}
        icon={<Link2 className="size-4" aria-hidden />}
        data-main-cta
      >
        {busy ? "Creating..." : "Create my review link"}
      </Button>
      {msg ? (
        <p className="mt-3 text-small text-bad" role="alert">
          {msg}
        </p>
      ) : null}
    </Panel>
  );
}

// The short link with a real, labelled copy button (44 px tall, easy to hit on a phone).
// copyText() always resolves (it falls back off the Clipboard API), so a failed copy shows a real
// "couldn't copy" state instead of the button silently doing nothing on a second tap (iOS Safari can
// reject navigator.clipboard.writeText, e.g. after the tab lost focus).
function CopyField({ url, label }: { url: string; label: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  return (
    <div className="mt-3 flex items-center gap-2 rounded-input border border-stroke bg-surface-2 py-1 ps-4 pe-1 text-small">
      <span className="min-w-0 flex-1 truncate font-mono">{url.replace(/^https:\/\//, "")}</span>
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-surface-1 px-4 text-small font-bold shadow-rest hover:bg-surface-3"
        onClick={() =>
          void copyText(url).then((ok) => {
            setState(ok ? "done" : "failed");
            setTimeout(() => setState("idle"), 2000);
          })
        }
      >
        {state === "done" ? (
          <Check className="size-4" aria-hidden />
        ) : state === "failed" ? (
          <TriangleAlert className="size-4" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
        {state === "done" ? "Copied" : state === "failed" ? "Couldn't copy" : "Copy"}
      </button>
    </div>
  );
}

function OnOff({ active }: { active: boolean }) {
  return <StatusPill tone={active ? "ok" : "info"}>{active ? "On" : "Off"}</StatusPill>;
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
        variant="tertiary"
        disabled={busy}
        onClick={() => (active ? setOpen(true) : onToggle())}
        icon={<Power className="size-4" aria-hidden />}
      >
        {active ? "Switch off" : "Switch on"}
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
    <Panel title="Your review link" id="links" className="lg:col-span-2">
      <p className="text-small text-text-2">
        A link goes straight to your Google review page, or opens a short page with the Google
        button first and a line to message the manager. Everyone sees the same thing, and nobody is
        asked how their visit went. Works with your own QR codes and NFC cards.
      </p>
      <div className="mt-4 space-y-3">
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
          variant="secondary"
          size="md"
          className="mt-4"
          loading={busy}
          onClick={() => void create()}
          icon={<Link2 className="size-4" aria-hidden />}
        >
          {busy ? "Creating..." : "Create another link"}
        </Button>
      ) : null}
      {msg ? (
        <p className="mt-3 text-small text-bad" role="alert">
          {msg}
        </p>
      ) : null}
    </Panel>
  );
}

// What the link does when someone opens it (P0.8-05, K-132). Every existing link starts on "Go straight to Google",
// so printed QR codes never change until the owner chooses the page. The page is the same for every visitor.
function ModeChoice({ link, onChanged }: { link: Card; onChanged: () => unknown }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function choose(mode: "direct" | "page") {
    if (mode === link.page_mode) return;
    setBusy(true);
    setMsg("");
    const { error } = await supabase.rpc("set_review_link_mode", {
      p_code: link.code,
      p_mode: mode,
    });
    setBusy(false);
    setMsg(
      error ? "Couldn't change it. Try again." : "Saved. It can take up to a minute on phones.",
    );
    if (!error) onChanged();
  }
  const options = [
    ["direct", "Go straight to Google"],
    ["page", "Show the page"],
  ] as const;
  return (
    <fieldset className="mt-3" disabled={busy}>
      <legend className="text-small font-bold">When someone opens this link</legend>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
        {options.map(([mode, label]) => (
          <label
            key={mode}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-2 rounded-input border px-3 text-small font-bold",
              link.page_mode === mode ? "border-text-1 bg-surface-2" : "border-line-strong",
            )}
          >
            <input
              type="radio"
              name={`mode-${link.code}`}
              className="size-4 accent-current"
              checked={link.page_mode === mode}
              onChange={() => void choose(mode)}
            />
            {label}
          </label>
        ))}
      </div>
      {link.page_mode === "page" ? (
        <p className="mt-2 text-small text-text-2">
          The page shows your Google review button first.{" "}
          <Link to="/app/knowledge" className="font-bold underline underline-offset-4">
            Add your WhatsApp number
          </Link>{" "}
          to show a line to message the manager.
        </p>
      ) : null}
      {msg ? (
        <p className="mt-2 text-small text-text-2" role="status">
          {msg}
        </p>
      ) : null}
    </fieldset>
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
  const url = goLink(link.code);
  const qrUrl = `${url}?s=q`;
  const week = taps.filter((t) => Date.parse(t.created_at) > Date.now() - 7 * DAY).length;
  function download() {
    const blob = new Blob([qrSvg(qrUrl, 1024)], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kabsi-review-qr-${link.code}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  return (
    <article className="rounded-inner border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold">{link.label || "Review link"}</p>
          <p className="mt-1 flex items-center gap-2 text-small text-text-2">
            <span className="font-mono">{link.code}</span>
            <OnOff active={active} />
          </p>
        </div>
        <div className="text-end">
          <p className="font-display text-h3 font-bold leading-none">{week}</p>
          <p className="mt-1 text-label text-text-2">link activity, 7 days</p>
        </div>
      </div>
      <CopyField url={url} label="Copy review link" />
      <ModeChoice link={link} onChanged={onChanged} />
      <div className="mt-3 flex flex-wrap gap-x-4">
        <Button
          variant="tertiary"
          onClick={download}
          icon={<Download className="size-4" aria-hidden />}
        >
          Download QR
        </Button>
        <SwitchButton active={active} what="this review link" onToggle={() => void toggle()} />
      </div>
      {msg ? (
        <p className="mt-2 text-small text-text-2" role="status">
          {msg}
        </p>
      ) : null}
    </article>
  );
}

// Other places to put the link: the one message for a text or an email (the same words for every customer), and two
// short lines for an email signature or a receipt. Copy only; nothing is sent for the owner.
function ShareKit({ name, link }: { name: string; link: string }) {
  const message = reviewLinkMessage(name, link);
  const subject = `Thank you from ${name}`;
  const items: { title: string; text: string; copy: string; subject?: string }[] = [
    { title: "SMS", text: message, copy: message },
    {
      title: "Email to a customer",
      subject,
      text: message,
      copy: `Subject: ${subject}\n\n${message}`,
    },
    {
      title: "Email signature line",
      text: `Leave ${name} a Google review: ${link}`,
      copy: `Leave ${name} a Google review: ${link}`,
    },
    {
      title: "Receipt line",
      text: `Review us on Google: ${link}`,
      copy: `Review us on Google: ${link}`,
    },
  ];
  return (
    <Panel title="Other ways to share" id="share" className="lg:col-span-2">
      <ul className="divide-y divide-line">
        {items.map((it) => (
          <li key={it.title} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold">{it.title}</p>
              <CopyButton text={it.copy} label="Copy" />
            </div>
            {it.subject ? <p className="mt-1 text-small font-bold">Subject: {it.subject}</p> : null}
            <p dir="auto" className="mt-1 break-words text-small text-text-2">
              {it.text}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function CardRow({ card, taps, onChanged }: { card: Card; taps: Tap[]; onChanged: () => unknown }) {
  const [label, setLabel] = useState(card.label ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const url = goLink(card.code);
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
    <article className={cn("rounded-inner border border-line p-4", !active && "opacity-80")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-text-2">
            <Nfc className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold">{card.label || "NFC card"}</p>
            <p className="mt-1 flex items-center gap-2 text-small text-text-2">
              <span className="font-mono">{card.code}</span>
              <OnOff active={active} />
            </p>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-4 text-end">
          <div>
            <p className="font-display text-h3 font-bold leading-none">{week.length}</p>
            <p className="mt-1 text-label text-text-2">link activity, 7 days</p>
          </div>
          <div>
            <p className="font-display text-h3 font-bold leading-none">{taps.length}</p>
            <p className="mt-1 text-label text-text-2">link activity, 30 days</p>
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
          className="h-11 border-stroke"
        />
        {dirty ? (
          <Button type="submit" variant="secondary" size="md" disabled={busy}>
            Save
          </Button>
        ) : null}
      </form>
      <div className="mt-2 flex items-center justify-between gap-3">
        {msg ? (
          <p className="text-small text-text-2" role="status">
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
    <form onSubmit={add} className="mt-4 rounded-inner border border-dashed border-line-strong p-4">
      <Label htmlFor="new-card" className="font-bold">
        Add a Kabsi card
      </Label>
      <p className="mt-1 text-small text-text-2">The 6-character code printed under the QR.</p>
      <div className="mt-3 flex gap-2">
        <Input
          id="new-card"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. KQA234"
          maxLength={8}
          autoCapitalize="characters"
          autoComplete="off"
          className="h-11 border-stroke font-mono uppercase placeholder:normal-case"
        />
        <Button type="submit" variant="secondary" size="md" disabled={busy}>
          {busy ? "Adding..." : "Add"}
        </Button>
      </div>
      {msg ? (
        <p className="mt-3 text-small text-text-2" role="status">
          {msg}
        </p>
      ) : null}
    </form>
  );
}
