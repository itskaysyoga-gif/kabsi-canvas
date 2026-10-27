import { createFileRoute, redirect } from "@tanstack/react-router";

// "To reply" is now the Waiting filter of the one Reviews screen (P0.3-09, Design 3). The old address, which emails and
// saved links still use, lands there: ?f=needs is Waiting's old name and still works.
export const Route = createFileRoute("/_authenticated/app/inbox")({
  beforeLoad: () => {
    throw redirect({ to: "/app/reviews", search: { f: "needs" }, replace: true });
  },
});
