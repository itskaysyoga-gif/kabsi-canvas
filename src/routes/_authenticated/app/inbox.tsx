import { createFileRoute, redirect } from "@tanstack/react-router";

// "To reply" is now the Needs reply filter of the one Reviews screen (P0.3-09). The old address, which emails and saved
// links still use, lands there.
export const Route = createFileRoute("/_authenticated/app/inbox")({
  beforeLoad: () => {
    throw redirect({ to: "/app/reviews", search: { f: "needs" }, replace: true });
  },
});
