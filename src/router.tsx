import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { QUERY_DEFAULTS } from "./lib/query-defaults";

export const getRouter = () => {
  // One retry and a read timeout, so a screen shows its error state within 5 seconds (Fix 1, QA 2 L9).
  const queryClient = new QueryClient({ defaultOptions: QUERY_DEFAULTS });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // A new page opens at its top at once, and Back returns to the old place at once (App 4, 30.31 item 4). The site's
    // html has scroll-behavior: smooth for #links on the same page; without "instant" the router's jump to the top was
    // animated too, so a page opened scrolled down and slid up, and stopped part way when the page grew while loading.
    scrollRestorationBehavior: "instant",
    defaultPreloadStaleTime: 0,
  });

  return router;
};
