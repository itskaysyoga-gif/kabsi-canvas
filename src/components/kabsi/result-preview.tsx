// The Example free check result card and the small Pill label (Design 8, Web 4). Shared by Home and the free check's
// start page, in their own small file so the free check page does not load Home's module.
import { cn } from "@/lib/utils";
import { ExampleBadge } from "./ui";
import { EXAMPLE_RESULT } from "./d8-data";

export function Pill({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-line-strong px-2.5 py-0.5 text-label font-semibold text-text-2",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ResultPreview({ className }: { className?: string }) {
  const r = EXAMPLE_RESULT;
  return (
    <figure
      className={cn(
        "relative rounded-panel border border-line bg-surface-1 p-5 shadow-float sm:p-7",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label font-bold text-text-2">Free check result</p>
          <p className="mt-1 text-title font-bold">{r.business}</p>
          <p className="text-label text-text-2">{r.address}</p>
        </div>
        <ExampleBadge className="shrink-0" />
      </div>
      <div className="mt-4 rounded-inner bg-warn-soft p-4">
        <p className="text-label font-bold text-text-1">Most important</p>
        <p className="mt-1 text-title font-bold">{r.first.fact}</p>
        <p className="mt-1 text-small text-text-1">{r.first.action}</p>
      </div>
      <ul className="mt-3 divide-y divide-line">
        {r.found.map((f) => (
          <li key={f.label} className="flex items-center justify-between gap-3 py-2.5 text-small">
            <span className="text-text-1">{f.label}</span>
            <span className="text-end font-semibold">{f.value}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 border-t border-line pt-3">
        <p className="text-label font-bold text-text-2">An answer customers might see</p>
        <p className="mt-1 text-small text-text-1">{r.ai.line}</p>
      </div>
      <figcaption className="sr-only">
        An Example free check result for an invented salon: no photos on Google, Saturday 09:00 to
        18:00, website and phone shown, 38 reviews, and an AI answer that gives 17:00 for Saturday.
      </figcaption>
    </figure>
  );
}
