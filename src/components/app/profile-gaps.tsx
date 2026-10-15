import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { askNora, taskAction, type Task } from "@/lib/tasks";

// What would make the profile more complete: the profile_gap tasks from the task engine (K-08). Nothing here changes
// Google: each one opens the page where the owner reviews and approves the change.
export function ProfileGaps({ locationId, gaps }: { locationId: string; gaps: Task[] }) {
  const qc = useQueryClient();
  const act = useMutation({
    mutationFn: (v: { id: string; a: "later" | "skip" }) => taskAction(v.id, v.a),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", locationId] }),
  });
  return (
    <section className="mt-8 rounded-large bg-kb-white p-6 shadow-kb" aria-labelledby="gaps">
      <h2 id="gaps" className="text-lg font-bold">
        Make your profile more complete
      </h2>
      <p className="mt-1 text-sm text-kb-stone">
        Useful next steps, when you have a minute. You approve every change.
      </p>
      {gaps.length === 0 ? (
        <p className="mt-4 text-sm text-kb-stone">
          Nothing to add right now. Kabsi will tell you when something comes up.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {gaps.map((t) => (
            <li key={t.id} className="rounded-card border border-kb-hairline p-4">
              <p className="font-bold">{t.title}</p>
              <p className="mt-1 text-sm leading-6 text-kb-stone">{t.why}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="compact" variant="outline">
                  <Link to={t.path}>
                    Do it <ArrowRight />
                  </Link>
                </Button>
                <Button
                  size="compact"
                  variant="ghost"
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
