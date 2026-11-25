import { createFileRoute, redirect } from "@tanstack/react-router";

// APP-2 (R-163): "Where you show up" draws the Visibility Map and AI answers, which are switched off, so the old address
// goes to Home. The page is kept in src/components/insights/where-you-show-up.tsx and nothing is removed from the database.
export const Route = createFileRoute("/_authenticated/app/insights")({
  beforeLoad: () => {
    throw redirect({ to: "/app", replace: true });
  },
});
