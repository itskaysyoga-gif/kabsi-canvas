import { createFileRoute } from "@tanstack/react-router";
import { foundingCountResponse } from "@/lib/founding-count";

// Speed 2 part B: the Founding 25 count on kabsi.co's own address, kept at Vercel's edge (src/lib/founding-count.ts).
export const Route = createFileRoute("/api/founding-count")({
  server: {
    handlers: {
      GET: () => foundingCountResponse(),
    },
  },
});
