import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { timeAgo } from "@/lib/dashboard";
import { loadBell, markRead } from "@/lib/notifications";
import { cn } from "@/lib/utils";

// A stored link is an app path, possibly with a query ("/app/reviews?f=needs"); the router wants them apart.
function splitLink(link: string) {
  const [to = "/app", query = ""] = link.split("?");
  return { to: to as "/app", search: Object.fromEntries(new URLSearchParams(query)) as never };
}

// The bell on Home (K-46, P0.4-09): what Kabsi told you, newest first, from the same notification record the emails
// come from. Opening a notice goes to the page where you act on it; nothing here approves anything.
export function NotificationBell({ locationId }: { locationId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const bell = useQuery({
    queryKey: ["bell", locationId],
    queryFn: () => loadBell(locationId),
    refetchInterval: 60_000,
  });
  const read = useMutation({
    mutationFn: (ids?: string[]) => markRead(locationId, ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bell", locationId] }),
  });
  const unread = bell.data?.unread ?? 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="relative shrink-0"
          aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
          data-testid="bell"
        >
          <Bell />
          {unread ? (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 grid min-w-5 place-content-center rounded-full bg-kb-yellow px-1 text-xs font-bold leading-5 text-kb-black"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto bg-kb-sand p-5">
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="font-display text-3xl leading-none">Notifications</SheetTitle>
          <SheetDescription className="text-kb-stone">
            What Kabsi told you. Nothing here is published until you approve it.
          </SheetDescription>
        </SheetHeader>

        {bell.isError ? (
          <p className="mt-6 text-kb-small text-kb-red" role="alert">
            We couldn't load your notifications. Try again in a moment.
          </p>
        ) : null}
        {bell.data && bell.data.items.length === 0 ? (
          <p className="mt-6 rounded-card bg-kb-white p-5 text-kb-stone">
            Nothing new. Kabsi tells you here when something happens.
          </p>
        ) : null}
        {unread ? (
          <Button
            variant="tertiary"
            className="mt-5 min-h-11 px-0"
            onClick={() => read.mutate(undefined)}
            disabled={read.isPending}
          >
            Mark all as read
          </Button>
        ) : null}
        <ul className="mt-4 space-y-3">
          {(bell.data?.items ?? []).map((n) => {
            const body = (
              <>
                <span className="flex items-start gap-2">
                  {n.read_at ? null : (
                    <span
                      aria-hidden="true"
                      className="mt-2 size-2.5 shrink-0 rounded-full bg-kb-yellow ring-1 ring-kb-black"
                    />
                  )}
                  <span className={cn("font-bold", n.read_at && "font-medium")}>{n.title}</span>
                </span>
                {n.body ? (
                  <span className="mt-1 block text-kb-small text-kb-stone">{n.body}</span>
                ) : null}
                <span className="mt-1 block text-kb-small text-kb-stone">
                  {timeAgo(n.created_at)}
                </span>
              </>
            );
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link
                    {...splitLink(n.link)}
                    onClick={() => {
                      if (!n.read_at) read.mutate([n.id]);
                      setOpen(false);
                    }}
                    className="block min-h-11 rounded-card bg-kb-white p-4 shadow-kb"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="rounded-card bg-kb-white p-4 shadow-kb">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
