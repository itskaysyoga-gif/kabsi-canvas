import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { Panel } from "@/components/kabsi/d3-account";
import { Button, ButtonLink } from "@/components/kabsi/ui";
import { askNora, taskAction, type Task } from "@/lib/tasks";

// What would make the profile more complete: the profile_gap tasks from the task engine (K-08), on Profile watch as
// Design 3's "[n] things to fix" and on Home. Nothing here changes Google: each one opens the page where the owner
// reviews and approves the change.
export function ProfileGaps({
  locationId,
  gaps,
  title = "Make your profile more complete",
  className,
}: {
  locationId: string;
  gaps: Task[];
  title?: string;
  className?: string;
}) {
  const qc = useQueryClient();
  const act = useMutation({
    mutationFn: (v: { id: string; a: "later" | "skip" }) => taskAction(v.id, v.a),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["tasks", locationId] }),
        qc.invalidateQueries({ queryKey: ["shield", locationId] }),
      ]),
  });
  return (
    <Panel title={title} id="gaps" {...(className ? { className } : {})}>
      {gaps.length === 0 ? (
        <p className="text-body text-text-2">
          Nothing to add right now. Kabsi will tell you when something comes up.
        </p>
      ) : (
        <ul className="space-y-3">
          {gaps.map((t) => (
            <li key={t.id} className="rounded-inner bg-surface-2 p-4">
              <p className="text-body font-bold text-text-1">{t.title}</p>
              {t.why ? <p className="mt-1 text-small text-text-2">{t.why}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <ButtonLink to={t.path} variant="secondary" size="md">
                  Do it
                </ButtonLink>
                <Button
                  size="md"
                  variant="tertiary"
                  disabled={act.isPending}
                  onClick={() => act.mutate({ id: t.id, a: "later" })}
                >
                  Later
                </Button>
                <Button
                  size="md"
                  variant="tertiary"
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
        variant="tertiary"
        className="mt-3"
        icon={<MessageCircle className="size-4" aria-hidden />}
        onClick={() => askNora("I want help with something else on my profile.")}
      >
        Something else
      </Button>
    </Panel>
  );
}
