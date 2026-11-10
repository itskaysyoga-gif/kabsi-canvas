// What Kabsi handles, in four groups (Site 3a, master plan 30.50 item 10): reviews, details and hours, posts and photos,
// the weekly report. Shared by Home and How it works, in its own small file so How it works does not load Home's module.
import { CalendarCheck, Images, MessageSquareText, Store, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Marked } from "./highlight";
import { D9_HANDLES } from "./d9-data";

const ICONS: Record<(typeof D9_HANDLES)[number]["id"], LucideIcon> = {
  reviews: MessageSquareText,
  details: Store,
  posts: Images,
  report: CalendarCheck,
};

export function HandlesGroups({
  id = "handles-h",
  title = "What Kabsi handles",
  mark = "handles",
  className,
}: {
  id?: string;
  title?: string;
  mark?: string;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("border-t border-line", className)}>
      <div className="container-kb py-10 sm:py-18 lg:py-24">
        <h2 id={id} className="text-h2">
          <Marked text={title} mark={mark} />
        </h2>
        <ul className="mt-6 grid gap-x-8 gap-y-6 sm:mt-10 sm:grid-cols-2 lg:grid-cols-4">
          {D9_HANDLES.map((h) => {
            const Icon = ICONS[h.id];
            return (
              <li key={h.id} className="border-t-2 border-text-1 pt-4">
                <p className="flex items-center gap-2 text-small font-semibold text-text-2">
                  <Icon className="size-4 shrink-0 text-text-1" aria-hidden />
                  {h.group}
                </p>
                <h3 className="mt-2 text-title">{h.title}</h3>
                <p className="mt-1 text-body text-text-2">{h.text}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
