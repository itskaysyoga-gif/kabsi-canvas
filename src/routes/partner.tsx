import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// Partners 2: a thin route; the page loads on its own (src/components/partners/), so the route list every page carries
// stays small (Speed gate budget on /pricing). noindex.
const Page = lazy(() => import("@/components/partners/partner-home"));

export const Route = createFileRoute("/partner")({
  head: () => ({
    meta: [{ title: "Your partner home | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  ),
});
