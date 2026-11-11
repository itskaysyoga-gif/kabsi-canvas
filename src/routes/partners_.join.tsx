import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// Partners 2: a thin route; the page loads on its own (src/components/partners/), so the route list every page carries
// stays small (Speed gate budget on /pricing). noindex.
const Page = lazy(() => import("@/components/partners/join-page"));

export const Route = createFileRoute("/partners_/join")({
  head: () => ({
    meta: [{ title: "Join Kabsi Partners | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  ),
});
