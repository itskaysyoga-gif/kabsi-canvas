import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { askNora, loadProfile, taskAction } from "@/lib/profile";

// The few things that need the owner's attention next. Nothing here changes Google: each task opens the page
// where the owner reviews and approves the change (D202).
export function DoNow({ locationId }: { locationId: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["profile", locationId], queryFn: () => loadProfile(locationId) });
  const act = useMutation({
    mutationFn: (v: { id: string; a: "later" | "skip" }) => taskAction(v.id, v.a),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", locationId] }),
  });
  if (q.isError) return null;
  const p = q.data;
  return (
    <section className="mt-8 rounded-large bg-kb-white p-6 shadow-kb" aria-labelledby="attention">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="attention" className="text-lg font-bold">
            What needs your attention
          </h2>
          <p className="mt-1 text-sm text-kb-stone">
            The next things that keep your Google profile complete and current. You approve every
            change.
          </p>
        </div>
      </div>
      {!p ? (
        <p className="mt-4 text-sm text-kb-stone">Loading…</p>
      ) : p.tasks.length === 0 ? (
        <p className="mt-4 text-sm text-kb-stone">
          Nothing to do right now. Kabsi will tell you when something comes up.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {p.tasks.map((t) => (
            <li key={t.id} className="rounded-card border border-kb-hairline p-4">
              <p className="font-bold">{t.title}</p>
              <p className="mt-1 text-sm leading-6 text-kb-stone">{t.why}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="compact">
                  <Link to={t.path}>
                    Do it <ArrowRight />
                  </Link>
                </Button>
                <Button
                  size="compact"
                  variant="outline"
                  disabled={act.isPending}
                  onClick={() => act.mutate({ id: t.id, a: "later" })}
                >
                  Later
                </Button>
                <Button
                  size="compact"
                  variant="ghost"
                  disabled={act.isPending}
                  onClick={() => act.mutate({ id: t.id, a: "skip" })}
                >
                  Skip
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="ghost"
        size="compact"
        className="mt-3"
        onClick={() => askNora("I want help with something else on my profile.")}
      >
        <MessageCircle /> Something else
      </Button>
    </section>
  );
}
