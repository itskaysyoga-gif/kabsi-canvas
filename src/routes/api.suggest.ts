import { createFileRoute } from "@tanstack/react-router";

// Speed 2 part A: suggestions on kabsi.co's own address (src/server/suggest.ts). Server only; loaded on the first call.
let handler: ((req: Request) => Promise<Response>) | undefined;

export const Route = createFileRoute("/api/suggest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!handler) {
          const [{ makeSuggestHandler }, { suggestDeps }] = await Promise.all([
            import("@/server/suggest"),
            import("@/server/suggest-deps"),
          ]);
          handler = makeSuggestHandler(suggestDeps);
        }
        return handler(request);
      },
    },
  },
});
