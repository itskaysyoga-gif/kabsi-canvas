// Building blocks for guide articles (D253, D256): step timelines, review/reply examples, callouts,
// do/don't lists and simplified "sketch" illustrations of the screens an owner will see.
// Sketches are drawn in HTML (never screenshots), carry no Google logo or colours, and say so.
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  Coffee,
  Copy,
  Download,
  Flag,
  Lightbulb,
  MessageSquareReply,
  MousePointerClick,
  Phone,
  Share2,
  Star,
  UserPlus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DemoQr, IconBadge } from "./parts";

/* ───────────── text blocks ───────────── */

export function KeyPoints({ items }: { items: string[] }) {
  return (
    <aside className="not-prose rounded-large bg-kb-sand p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-kb-stone">In this guide</p>
      <ul className="mt-3 space-y-2.5">
        {items.map((t) => (
          <li key={t} className="flex gap-3 text-[16px] leading-7 text-kb-ink">
            <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-kb-yellow">
              <Check className="size-3.5" aria-hidden="true" />
            </span>
            {t}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="not-prose mt-2 space-y-4">
      {items.map((it, i) => (
        <li key={i} className="relative flex gap-4">
          {i < items.length - 1 ? (
            <span
              aria-hidden="true"
              className="absolute bottom-[-18px] left-[17px] top-10 w-0.5 bg-kb-hairline"
            />
          ) : null}
          <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-kb-yellow text-sm font-bold text-kb-black">
            {i + 1}
          </span>
          <div className="pt-1.5 text-[17px] leading-7 text-kb-ink [&_b]:font-bold">{it}</div>
        </li>
      ))}
    </ol>
  );
}

export function Callout({
  kind = "tip",
  title,
  children,
}: {
  kind?: "tip" | "warn";
  title: string;
  children: ReactNode;
}) {
  return (
    <aside
      className={cn(
        "not-prose flex gap-4 rounded-large p-5",
        kind === "tip"
          ? "bg-kb-yellow/15 ring-1 ring-kb-yellow/60"
          : "bg-kb-sand ring-1 ring-kb-hairline",
      )}
    >
      <IconBadge
        icon={kind === "tip" ? <Lightbulb /> : <AlertTriangle />}
        tone={kind === "tip" ? "yellow" : "sand"}
        className={cn("size-10", kind === "warn" && "bg-kb-white")}
      />
      <div>
        <p className="font-bold text-kb-ink">{title}</p>
        <div className="mt-1 text-[16px] leading-7 text-kb-stone [&_a]:font-bold [&_a]:text-kb-ink [&_a]:underline [&_b]:text-kb-ink">
          {children}
        </div>
      </div>
    </aside>
  );
}

export function IconGrid({ items }: { items: { icon: ReactNode; title: string; text: string }[] }) {
  return (
    <div className="not-prose grid gap-3 sm:grid-cols-2">
      {items.map((it) => (
        <div
          key={it.title}
          className="flex gap-4 rounded-large border border-kb-hairline bg-kb-white p-4"
        >
          <IconBadge icon={it.icon} className="size-10" />
          <div>
            <p className="font-bold text-kb-ink">{it.title}</p>
            <p className="mt-0.5 text-[15px] leading-6 text-kb-stone">{it.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DoDont({
  yes,
  no,
  yesTitle,
  noTitle,
}: {
  yes: string[];
  no: string[];
  yesTitle: string;
  noTitle: string;
}) {
  return (
    <div className="not-prose grid gap-3 sm:grid-cols-2">
      <div className="rounded-large border border-kb-hairline bg-kb-white p-5">
        <p className="flex items-center gap-2 font-bold text-kb-ink">
          <span className="grid size-7 place-items-center rounded-full bg-kb-yellow">
            <Check className="size-4" aria-hidden="true" />
          </span>
          {yesTitle}
        </p>
        <ul className="mt-3 space-y-2 text-[15px] leading-6 text-kb-stone">
          {yes.map((t) => (
            <li key={t} className="flex gap-2">
              <Check className="mt-1 size-4 shrink-0 text-kb-ink" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-large border border-kb-hairline bg-kb-sand p-5">
        <p className="flex items-center gap-2 font-bold text-kb-ink">
          <span className="grid size-7 place-items-center rounded-full bg-kb-carbon text-kb-white">
            <X className="size-4" aria-hidden="true" />
          </span>
          {noTitle}
        </p>
        <ul className="mt-3 space-y-2 text-[15px] leading-6 text-kb-stone">
          {no.map((t) => (
            <li key={t} className="flex gap-2">
              <X className="mt-1 size-4 shrink-0 text-kb-ink" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Compare({
  cols,
  rows,
}: {
  cols: [string, string];
  rows: { label: string; a: boolean; b: boolean }[];
}) {
  const Mark = ({ on }: { on: boolean }) =>
    on ? (
      <span className="mx-auto grid size-7 place-items-center rounded-full bg-kb-yellow">
        <Check className="size-4" aria-label="Yes" />
      </span>
    ) : (
      <span className="mx-auto grid size-7 place-items-center rounded-full bg-kb-sand text-kb-stone">
        <X className="size-4" aria-label="No" />
      </span>
    );
  return (
    <div className="not-prose overflow-hidden rounded-large border border-kb-hairline bg-kb-white">
      <table className="w-full text-left text-[15px]">
        <thead className="bg-kb-sand text-xs font-bold uppercase tracking-wider text-kb-stone">
          <tr>
            <th className="px-4 py-3 font-bold">What they can do</th>
            <th className="w-24 px-2 py-3 text-center font-bold">{cols[0]}</th>
            <th className="w-24 px-2 py-3 text-center font-bold">{cols[1]}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-kb-hairline">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="px-4 py-3 text-kb-ink">{r.label}</td>
              <td className="px-2 py-3">
                <Mark on={r.a} />
              </td>
              <td className="px-2 py-3">
                <Mark on={r.b} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───────────── review / reply example ───────────── */

function Stars({ n }: { n: number }) {
  return (
    <span className="flex" role="img" aria-label={`${n} out of 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn("size-3.5", s <= n ? "fill-kb-black text-kb-black" : "text-kb-stone/40")}
        />
      ))}
    </span>
  );
}

export function Example({
  label,
  lang,
  name,
  rating,
  review,
  reply,
  dir = "ltr",
}: {
  label: string;
  lang: string;
  name: string;
  rating: number;
  review: string;
  reply: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <figure className="not-prose overflow-hidden rounded-large border border-kb-hairline bg-kb-white shadow-kb">
      <figcaption className="flex items-center justify-between gap-3 border-b border-kb-hairline bg-kb-sand px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-kb-stone">
        <span>{label}</span>
        <span className="rounded-pill bg-kb-white px-2.5 py-1 normal-case tracking-normal text-kb-ink">
          {lang}
        </span>
      </figcaption>
      <div className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-kb-carbon text-sm font-bold text-kb-white">
            {name.charAt(0)}
          </span>
          <div>
            <p className="text-sm font-bold text-kb-ink">{name}</p>
            <Stars n={rating} />
          </div>
        </div>
        <p dir={dir} className="mt-3 text-[16px] leading-7 text-kb-ink">
          {review}
        </p>
        <div className="mt-4 rounded-card border-l-4 border-kb-yellow bg-kb-sand p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-kb-stone">
            <MessageSquareReply className="size-4" aria-hidden="true" />
            Reply from the business
          </p>
          <p dir={dir} className="mt-2 text-[16px] leading-7 text-kb-ink">
            {reply}
          </p>
        </div>
      </div>
    </figure>
  );
}

/* ───────────── sketches ───────────── */

function Sketch({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure
      className="not-prose rounded-large bg-kb-sand p-4 sm:p-7"
      style={{
        backgroundImage: "radial-gradient(rgba(94,91,85,.18) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    >
      <div aria-hidden="true" className="mx-auto max-w-md">
        {children}
      </div>
      <figcaption className="mt-4 text-center text-xs font-medium text-kb-stone">
        {caption} · Simplified illustration
      </figcaption>
    </figure>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-card bg-kb-white shadow-[0_10px_30px_rgba(0,0,0,.08)] ring-1 ring-kb-hairline">
      <div className="flex items-center gap-2 border-b border-kb-hairline px-4 py-2.5">
        <span className="flex gap-1">
          <span className="size-2 rounded-full bg-kb-hairline" />
          <span className="size-2 rounded-full bg-kb-hairline" />
          <span className="size-2 rounded-full bg-kb-hairline" />
        </span>
        <span className="text-xs font-bold text-kb-stone">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Lines({ n = 2 }: { n?: number }) {
  return (
    <span className="mt-2 block space-y-1.5">
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="block h-2 rounded-pill bg-kb-hairline"
          style={{ width: `${i === n - 1 ? 60 : 100}%` }}
        />
      ))}
    </span>
  );
}

/** The thing to click: a yellow ring and a small pointer tag. */
function Hit({ children, tag }: { children: ReactNode; tag: string }) {
  return (
    <span className="relative inline-flex">
      <span className="inline-flex items-center gap-1.5 rounded-pill bg-kb-white px-3 py-1.5 text-xs font-bold text-kb-ink ring-[3px] ring-kb-yellow">
        {children}
      </span>
      <span className="absolute left-1/2 top-full z-10 mt-2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-pill bg-kb-carbon px-2.5 py-1 text-[11px] font-bold text-kb-white">
        <MousePointerClick className="size-3.5 text-kb-yellow" />
        {tag}
      </span>
    </span>
  );
}

function MiniReview({ name, stars }: { name: string; stars: number }) {
  return (
    <div className="flex gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-kb-carbon text-xs font-bold text-kb-white">
        {name.charAt(0)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-xs font-bold text-kb-ink">
          {name} <Stars n={stars} />
        </p>
        <Lines n={2} />
      </div>
    </div>
  );
}

export function ReplySketch() {
  return (
    <Sketch caption="Reviews on your Business Profile">
      <Panel title="Reviews">
        <MiniReview name="Emma" stars={5} />
        <div className="mt-4 flex items-center gap-3 pb-12 pl-11">
          <Hit tag="Select Reply">
            <MessageSquareReply className="size-3.5" /> Reply
          </Hit>
          <span className="inline-flex items-center gap-1 text-xs text-kb-stone">
            <Share2 className="size-3.5" /> Share
          </span>
        </div>
        <div className="rounded-card border-2 border-kb-ink p-3 text-xs leading-5 text-kb-ink">
          Thank you, Emma! We're glad you enjoyed the coffee. See you again soon.
        </div>
        <div className="mt-3 flex justify-end">
          <span className="rounded-pill bg-kb-carbon px-4 py-1.5 text-xs font-bold text-kb-white">
            Reply
          </span>
        </div>
      </Panel>
    </Sketch>
  );
}

export function ReportSketch() {
  return (
    <Sketch caption="Reporting a review that breaks the rules">
      <Panel title="Reviews">
        <MiniReview name="Anonymous" stars={1} />
        <div className="mt-3 flex justify-end pb-12">
          <Hit tag="Select Report">
            <Flag className="size-3.5" /> Report
          </Hit>
        </div>
        <div className="rounded-card bg-kb-sand p-3">
          <p className="text-xs font-bold text-kb-ink">Why are you reporting it?</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-kb-ink">
            {["Spam", "Off topic", "Profanity", "Personal information"].map((r, i) => (
              <span
                key={r}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg bg-kb-white px-2 py-1.5",
                  i === 0 && "ring-2 ring-kb-ink",
                )}
              >
                <span
                  className={cn(
                    "size-2.5 rounded-full border border-kb-ink",
                    i === 0 && "bg-kb-ink",
                  )}
                />
                {r}
              </span>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <span className="rounded-pill bg-kb-carbon px-3 py-1.5 text-[11px] font-bold text-kb-white">
              Send report
            </span>
          </div>
        </div>
      </Panel>
    </Sketch>
  );
}

export function ManagerSketch() {
  return (
    <Sketch caption="People and access, in Business Profile settings">
      <Panel title="People and access">
        <div className="flex items-center justify-between pb-12">
          <Hit tag="Select Add">
            <UserPlus className="size-3.5" /> Add
          </Hit>
        </div>
        <div className="flex items-center gap-3 rounded-card bg-kb-sand px-3 py-2.5">
          <span className="grid size-7 place-items-center rounded-full bg-kb-yellow text-xs font-bold">
            Y
          </span>
          <span className="flex-1 text-xs font-bold text-kb-ink">You</span>
          <span className="text-[11px] font-bold text-kb-stone">Primary owner</span>
        </div>
        <div className="mt-3 rounded-card border border-kb-hairline p-3">
          <p className="text-[11px] font-bold text-kb-stone">Name or email</p>
          <p className="mt-1 rounded-lg bg-kb-sand px-2.5 py-2 text-xs text-kb-ink">
            name@example.com
          </p>
          <p className="mt-3 text-[11px] font-bold text-kb-stone">Access</p>
          <p className="mt-1 flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-bold text-kb-ink ring-2 ring-kb-yellow">
            Manager <ChevronDown className="size-3.5" />
          </p>
          <div className="mt-3 flex justify-end">
            <span className="rounded-pill bg-kb-carbon px-4 py-1.5 text-[11px] font-bold text-kb-white">
              Invite
            </span>
          </div>
        </div>
      </Panel>
    </Sketch>
  );
}

export function LinkSketch() {
  return (
    <Sketch caption="Get more reviews: your link and QR code">
      <Panel title="Get more reviews">
        <p className="text-[11px] font-bold text-kb-stone">Share review form</p>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-kb-sand p-2 pb-2">
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-kb-stone">
            g.page/r/…/review
          </span>
        </div>
        <div className="mt-3 flex justify-end pb-12">
          <Hit tag="Copy the link">
            <Copy className="size-3.5" /> Copy
          </Hit>
        </div>
        <div className="flex items-center gap-4 rounded-card border border-kb-hairline p-3">
          <div className="rounded-lg bg-kb-white p-1.5 ring-1 ring-kb-hairline">
            <DemoQr className="size-16" />
          </div>
          <div className="text-xs leading-5 text-kb-stone">
            <p className="font-bold text-kb-ink">QR code</p>
            <p>Print it for the counter, tables and receipts.</p>
            <p className="mt-1 inline-flex items-center gap-1 font-bold text-kb-ink">
              <Download className="size-3.5" /> Download
            </p>
          </div>
        </div>
      </Panel>
    </Sketch>
  );
}

export function CalmFlow() {
  const steps = [
    { icon: <Coffee />, title: "Pause", text: "Reply when you're calm, not in the moment." },
    {
      icon: <MessageSquareReply />,
      title: "Acknowledge",
      text: "Thank them and name the problem once.",
    },
    { icon: <Phone />, title: "Take it offline", text: "Give a phone number or email to talk." },
  ];
  return (
    <figure className="not-prose rounded-large bg-kb-carbon p-5 text-kb-white sm:p-7">
      <ol className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
        {steps.map((s, i) => (
          <li key={s.title} className="contents">
            <div className="rounded-card bg-white/[.06] p-4 ring-1 ring-white/10">
              <IconBadge icon={s.icon} className="size-10" />
              <p className="mt-3 font-bold">
                {i + 1}. {s.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-kb-stone-on-dark">{s.text}</p>
            </div>
            {i < steps.length - 1 ? (
              <span className="hidden items-center text-kb-yellow sm:flex" aria-hidden="true">
                <ArrowRight className="size-5" />
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </figure>
  );
}
