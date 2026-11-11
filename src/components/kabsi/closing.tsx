// Two Design 8 sections shared by Home, Pricing, How it works and the industry pages: "You stay in control." and the
// closing free check. Their own small file so those pages do not load Home's module (Web 4b).
import {
  ArrowRight,
  Check,
  KeyRound,
  Store,
  ThumbsUp,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TRIAL_LINE } from "@/lib/site";
import { ScanBox } from "./scan-box";
import { Highlight } from "./highlight";
import { SiteLink } from "./site-link";
import { CONTROL, CONTROL_SHORT } from "./d8-data";
import { Marked } from "@/components/kabsi/highlight";

const linkCls =
  "press inline-flex min-h-11 items-center gap-1.5 font-semibold text-text-1 underline decoration-text-3 decoration-1 underline-offset-4 hover:decoration-text-1";

function Arrow() {
  return <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />;
}

export function Closing({
  keyword,
  industry,
  marked = true,
}: {
  keyword?: string;
  industry?: string;
  /** "free check" on the yellow bar (Industries 2; every page from Style 1, 30.33). */
  marked?: boolean;
}) {
  return (
    <section aria-labelledby="closing-title" className="border-t border-line bg-surface-1">
      <div className="container-kb section-y">
        <div className="mx-auto max-w-[44rem]">
          <h2 id="closing-title" className="text-h2">
            {marked ? (
              <>
                Start with a <Highlight>free check</Highlight>.
              </>
            ) : (
              "Start with a free check."
            )}
          </h2>
          <ScanBox
            id="closing-scan"
            className="mt-6"
            keyword={keyword}
            industry={industry}
            note={TRIAL_LINE}
          />
        </div>
      </div>
    </section>
  );
}

/* ---------- You stay in control ---------- */

const CONTROL_ICONS: LucideIcon[] = [UserRound, KeyRound, ThumbsUp, Check, Store];

/** `short` (Polish 4, How it works): the three short points of CONTROL_SHORT instead of the five. */
export function Control({ short = false }: { short?: boolean }) {
  const items = short ? CONTROL_SHORT : CONTROL;
  const icons: LucideIcon[] = short ? [KeyRound, ThumbsUp, Store] : CONTROL_ICONS;
  return (
    <section aria-labelledby="control-h">
      <div className="container-kb section-y grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <h2 id="control-h" className="text-h2">
            <Marked text="You stay in control." mark="in control." />
          </h2>
          <SiteLink to="/security" className={cn(linkCls, "mt-3 text-body")}>
            See how to remove Kabsi on Security
            <Arrow />
          </SiteLink>
        </div>
        <ul className={cn("grid gap-x-8 gap-y-5", short ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
          {items.map((c, i) => {
            const Icon = icons[i] ?? Check;
            return (
              <li key={c.title} className="flex gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
                <div>
                  <h3 className="text-title">{c.title}</h3>
                  <p className="mt-0.5 text-body text-text-2">{c.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
