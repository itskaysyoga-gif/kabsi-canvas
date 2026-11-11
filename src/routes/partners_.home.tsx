import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// Partners 2, moved to /partners/home by Fix 5 (R-158 item 2; /partner answers 301 here): a thin route; the page loads on its own (src/components/partners/), so the route list every page carries
// stays small (Speed gate budget on /pricing). noindex.
const Page = lazy(() => import("@/components/partners/partner-home"));

export const Route = createFileRoute("/partners_/home")({
  head: () => ({
    meta: [{ title: "Your partner home | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  ),
});
