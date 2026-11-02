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
    defaultPreloadStaleTime: 0,
  });

  return router;
};
