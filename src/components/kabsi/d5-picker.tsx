// "Pick your business" under Home's hero (brief section 16, item 1). A choice swaps the example in the hero story
// and the tappable demo and links to that trade's page; Other goes to /for.
import { ArrowRight } from "lucide-react";
import { HOME_EXAMPLES, type HomeExample } from "@/content/home-examples";
import { cn } from "@/lib/utils";
import { SiteLink } from "./site-link";

export function BusinessPicker({
  value,
  onChange,
}: {
  value: HomeExample;
  onChange: (id: string) => void;
}) {
  return (
    <section aria-labelledby="pick-h" className="container-kb pb-12 lg:pb-16">
      <div className="border-t border-line pt-8">
        <h2 id="pick-h" className="text-title">
          Pick your business
        </h2>
        <p className="mt-1 text-small text-text-2">The example on this page changes to match.</p>
        <div role="group" aria-labelledby="pick-h" className="mt-5 flex flex-wrap gap-2">
          {HOME_EXAMPLES.map((e) => (
            <button
              key={e.id}
              type="button"
              aria-pressed={value.id === e.id}
              onClick={() => onChange(e.id)}
              className={cn(
                "press inline-flex min-h-11 items-center rounded-full border px-4 text-small font-semibold",
                value.id === e.id
                  ? "border-text-1 bg-text-1 text-surface-0"
                  : "border-line-strong text-text-1 hover:border-text-3 hover:bg-surface-2",
              )}
            >
              {e.label}
            </button>
          ))}
          <SiteLink
            to="/for"
            className="press inline-flex min-h-11 items-center gap-1.5 rounded-full border border-dashed border-line-strong px-4 text-small font-semibold text-text-1 hover:border-text-3 hover:bg-surface-2"
          >
            Other
            <ArrowRight className="size-4" aria-hidden />
          </SiteLink>
        </div>
        <p className="mt-5 text-small text-text-2" aria-live="polite">
          Showing {value.business}, an example.{" "}
          <SiteLink
            to={value.to}
            className="inline-flex min-h-11 items-center gap-1 font-semibold text-text-1 underline decoration-text-3 underline-offset-4 hover:decoration-text-1"
          >
            {value.linkLabel}
            <ArrowRight className="size-4" aria-hidden />
          </SiteLink>
        </p>
      </div>
    </section>
  );
}
