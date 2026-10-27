// Shared bits of Where you show up, Reports, Settings, Team and Plan (UX 1, Design 3): V4's first task gate and the one line
// a held back part shows instead (master plan 30.15: team, tone, AI questions, competitors and photos open after the first
// task is done, one thing at a time).
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const HELD_BACK_LINE = "These open after your first task is done. One thing at a time.";

type OnboardingStatus = { first_task_done?: boolean | null; keyword?: string | null };

/**
 * Whether the business has finished its first task (V4's onboarding_status). `undefined` while it loads, so a held back
 * part never flashes open first; a failed read counts as done, because the server enforces the gate itself.
 */
export function useFirstTaskDone(locationId: string | undefined): boolean | undefined {
  const q = useQuery({
    queryKey: ["onboarding-status", locationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("onboarding_status", { p_location: locationId! });
      if (error) throw error;
      return (data ?? {}) as OnboardingStatus;
    },
    enabled: !!locationId,
    staleTime: 60_000,
    retry: false,
  });
  if (q.isError) return true;
  if (!q.data) return undefined;
  return q.data.first_task_done !== false;
}

/** The one short line a held back part shows instead of itself. */
export function HeldBack({ className, children }: { className?: string; children?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2.5 rounded-inner bg-surface-2 p-4 text-small text-text-2",
        className,
      )}
    >
      <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children ?? HELD_BACK_LINE}</span>
    </p>
  );
}
