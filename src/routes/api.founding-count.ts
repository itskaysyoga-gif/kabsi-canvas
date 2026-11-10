import { createFileRoute } from "@tanstack/react-router";
import { foundingCountResponse } from "@/lib/founding-count";

// Founding 1 (R-151): the Founding 25 count, only with the private invite slug (?slug=). Without it, or with an old one, 404.
export const Route = createFileRoute("/api/founding-count")({
  server: {
    handlers: {
      GET: ({ request }) => foundingCountResponse(new URL(request.url).searchParams.get("slug")),
    },
  },
});
