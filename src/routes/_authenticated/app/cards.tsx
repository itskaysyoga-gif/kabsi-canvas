import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/_authenticated/app/cards")({ head: () => ({ meta: [{ title: "Cards — Kabsi" }, { name: "description", content: "Your Kabsi cards will appear here." }, { property: "og:title", content: "Cards — Kabsi" }, { property: "og:description", content: "Your Kabsi cards will appear here." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <PlaceholderPage title="Cards" sentence="Your Kabsi cards will appear here." />; }
