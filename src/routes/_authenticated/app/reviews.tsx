import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/_authenticated/app/reviews")({ head: () => ({ meta: [{ title: "Reviews — Kabsi" }, { name: "description", content: "Your review history will appear here." }, { property: "og:title", content: "Reviews — Kabsi" }, { property: "og:description", content: "Your review history will appear here." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <PlaceholderPage title="Reviews" sentence="Your review history will appear here." />; }
