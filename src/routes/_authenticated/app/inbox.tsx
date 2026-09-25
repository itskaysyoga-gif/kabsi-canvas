import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/_authenticated/app/inbox")({ head: () => ({ meta: [{ title: "Inbox — Kabsi" }, { name: "description", content: "New reviews and prepared replies will appear here." }, { property: "og:title", content: "Inbox — Kabsi" }, { property: "og:description", content: "New reviews and prepared replies will appear here." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <PlaceholderPage title="Inbox" sentence="New reviews and prepared replies will appear here." />; }
