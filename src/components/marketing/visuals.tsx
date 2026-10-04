// Drawn hero visuals for the inner public pages (KABSI-BRAND: real HTML components, never screenshots).
// Every visual is decorative (aria-hidden) and labelled "Example" where it shows sample content.
// No stars, no Google "G", no real businesses, no numbers.
import type { ReactNode } from "react";
import {
  ArrowDown,
  BookOpen,
  Copy,
  Download,
  MessageSquare,
  MessageSquareReply,
  PenLine,
  Printer,
  QrCode,
  Send,
  ShieldCheck,
  Store,
  UserPlus,
} from "lucide-react";
import { KabsiMark } from "@/components/shared/kabsi-logo";
import { cn } from "@/lib/utils";
import { CardRender, DemoQr, IconBadge } from "./parts";

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "w-full max-w-[400px] rounded-large bg-kb-white p-5 text-kb-ink shadow-[0_18px_40px_rgba(0,0,0,.55)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ExampleTag() {
  return (
    <span className="rounded-pill bg-kb-sand px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-kb-stone">
      Example
    </span>
  );
}

function Connector() {
  return (
    <div className="flex justify-center py-1.5 text-kb-stone-on-dark">
      <span className="grid size-7 place-items-center rounded-full bg-kb-white/10 ring-1 ring-kb-white/15">
        <ArrowDown className="size-3.5" />
      </span>
    </div>
  );
}

/** How it works: review arrives, a draft is written, you approve it. */
export function FlowVisual() {
  return (
    <div aria-hidden="true" className="w-full max-w-[400px] text-kb-ink">
      <div className="rounded-large bg-kb-white p-4 shadow-[0_18px_40px_rgba(0,0,0,.55)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IconBadge icon={<MessageSquare />} tone="sand" className="size-9 [&_svg]:size-4" />
            <p className="text-sm font-bold">New Google review</p>
          </div>
          <ExampleTag />
        </div>
        <p className="mt-3 rounded-card bg-kb-sand p-3 text-sm leading-6">
          <b>Emma</b>
          <br />
          Friendly staff and the best croissants on the street.
        </p>
      </div>
      <Connector />
      <div className="rounded-large bg-kb-white p-4 shadow-[0_18px_40px_rgba(0,0,0,.55)]">
        <div className="flex items-center gap-3">
          <IconBadge icon={<PenLine />} className="size-9 [&_svg]:size-4" />
          <p className="text-sm font-bold">Reply drafted for you</p>
        </div>
        <p className="mt-3 rounded-card border border-kb-hairline p-3 text-sm leading-6 text-kb-stone">
          Thank you, Emma. We're so glad you enjoyed the croissants. See you again soon.
        </p>
      </div>
      <Connector />
      <div className="flex items-center gap-2 rounded-large bg-kb-white p-3 shadow-[0_18px_40px_rgba(0,0,0,.55)]">
        <span className="kb-ripple flex h-11 flex-1 items-center justify-center rounded-pill bg-kb-yellow text-sm font-bold text-kb-black">
          Approve
        </span>
        <span className="flex h-11 items-center rounded-pill border-2 border-kb-black px-5 text-sm font-bold">
          Edit
        </span>
        <span className="px-3 text-sm font-bold">Skip</span>
      </div>
      <p className="mt-3 text-center text-xs text-kb-stone-on-dark">
        Nothing is published until you approve it.
      </p>
    </div>
  );
}

/** Pricing: the card render, slightly turned, with the one-time tap ripple. */
export function PricingVisual() {
  return (
    <div aria-hidden="true" className="w-full max-w-[340px] -rotate-3 text-kb-ink">
      <CardRender />
    </div>
  );
}

const CLIENTS = [
  { name: "Bakery", city: "Brooklyn, NY", on: true },
  { name: "Dental clinic", city: "Lyon, France", on: false },
  { name: "Café", city: "Madrid, Spain", on: true },
];

/** Partners: one workspace, every client's status side by side. */
export function WorkspaceVisual() {
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KabsiMark className="size-6" />
          <p className="font-bold">Your workspace</p>
        </div>
        <ExampleTag />
      </div>
      <ul className="mt-4 divide-y divide-kb-hairline rounded-card border border-kb-hairline">
        {CLIENTS.map((c) => (
          <li key={c.name} className="flex items-center gap-3 p-3">
            <IconBadge icon={<Store />} tone="sand" className="size-9 [&_svg]:size-4" />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-sm font-bold">{c.name}</span>
              <span className="block text-xs text-kb-stone">{c.city}</span>
            </span>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-bold sm:text-xs",
                c.on ? "bg-kb-green/10 text-kb-ink" : "bg-kb-sand text-kb-stone",
              )}
            >
              <span className={cn("size-1.5 rounded-full", c.on ? "bg-kb-green" : "bg-kb-stone")} />
              {c.on ? "Connected" : "Awaiting access"}
            </span>
          </li>
        ))}
      </ul>
      <span className="kb-ripple mt-4 flex h-11 items-center justify-center gap-2 rounded-pill bg-kb-yellow text-sm font-bold text-kb-black">
        <Send className="size-4" /> Invite a client
      </span>
    </Panel>
  );
}

/** FAQ: one real question and its answer, as a short exchange. */
export function AnswerVisual() {
  return (
    <div aria-hidden="true" className="w-full max-w-[400px] space-y-3">
      <div className="mr-10 flex items-start gap-3 rounded-large rounded-tl-md bg-kb-white/8 p-4 ring-1 ring-kb-white/15">
        <IconBadge icon={<MessageSquare />} tone="dark" className="size-9 [&_svg]:size-4" />
        <p className="pt-1.5 text-[15px] font-bold leading-6 text-kb-white">
          Does Kabsi publish replies by itself?
        </p>
      </div>
      <div className="ml-10 rounded-large rounded-tr-md bg-kb-white p-4 text-kb-ink shadow-[0_18px_40px_rgba(0,0,0,.55)]">
        <div className="flex items-center gap-2">
          <KabsiMark className="size-6" />
          <p className="text-sm font-bold">Kabsi</p>
        </div>
        <p className="mt-2 text-[15px] leading-6 text-kb-stone">
          No. Nothing is published until you <b className="text-kb-ink">approve it</b>, and you see
          the exact text first.
        </p>
      </div>
      <div className="mr-10 flex items-center gap-3 rounded-large rounded-tl-md bg-kb-white/8 p-4 ring-1 ring-kb-white/15">
        <IconBadge icon={<ShieldCheck />} tone="dark" className="size-9 [&_svg]:size-4" />
        <p className="text-[15px] font-bold leading-6 text-kb-white">
          Can I remove Kabsi's access?
        </p>
      </div>
    </div>
  );
}

export const GUIDE_ICONS: Record<string, ReactNode> = {
  "how-to-reply-to-google-reviews": <MessageSquareReply />,
  "how-to-respond-to-negative-google-reviews": <PenLine />,
  "can-you-remove-a-google-review": <ShieldCheck />,
  "add-manager-google-business-profile": <UserPlus />,
  "google-review-link-and-qr-code": <QrCode />,
};

/** Guides: a small stack of guide cards. */
export function GuidesVisual() {
  const cards = [
    { icon: <MessageSquareReply />, title: "Reply to Google reviews", tilt: "-rotate-3" },
    { icon: <UserPlus />, title: "Add a manager", tilt: "rotate-2 translate-x-3 sm:translate-x-6" },
    { icon: <QrCode />, title: "Your review link and QR", tilt: "-rotate-1 -translate-x-2" },
  ];
  return (
    <div aria-hidden="true" className="w-full max-w-[360px]">
      {cards.map((c, i) => (
        <div
          key={c.title}
          className={cn(
            "flex items-center gap-4 rounded-large bg-kb-white p-4 text-kb-ink shadow-[0_18px_40px_rgba(0,0,0,.55)]",
            c.tilt,
            i > 0 && "-mt-2",
          )}
        >
          <IconBadge icon={c.icon} />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-kb-stone">Guide</p>
            <p className="font-bold">{c.title}</p>
          </div>
          <BookOpen className="ml-auto size-4 text-kb-stone" />
        </div>
      ))}
    </div>
  );
}

/** Free review link tool: what you get back, a link, a QR code and a printable card. */
export function ReviewLinkVisual() {
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <p className="font-bold">Your review link</p>
        <ExampleTag />
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-card border border-kb-hairline bg-kb-sand p-2.5">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-kb-stone">
          search.google.com/local/writereview?placeid=…
        </span>
        <span className="grid size-8 place-items-center rounded-full bg-kb-white ring-1 ring-kb-hairline">
          <Copy className="size-3.5" />
        </span>
      </div>
      <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-4">
        <div className="rounded-card bg-kb-white p-2 ring-1 ring-kb-hairline">
          <DemoQr className="size-28" />
        </div>
        <div className="space-y-2 text-sm font-bold">
          <span className="kb-ripple flex h-10 items-center justify-center gap-2 rounded-pill bg-kb-yellow text-kb-black">
            <Download className="size-4" /> QR code
          </span>
          <span className="flex h-10 items-center justify-center gap-2 rounded-pill border-2 border-kb-black">
            <Printer className="size-4" /> Counter card
          </span>
        </div>
      </div>
    </Panel>
  );
}
