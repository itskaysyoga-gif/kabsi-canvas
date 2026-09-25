import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/public-layout";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/pricing")({ head: () => ({ meta: [{ title: "Pricing — Kabsi" }, { name: "description", content: "Straightforward plans for local businesses will appear here." }, { property: "og:title", content: "Pricing — Kabsi" }, { property: "og:description", content: "Straightforward plans for local businesses will appear here." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <PublicLayout><PlaceholderPage title="Pricing" sentence="Straightforward plans for local businesses will appear here." /></PublicLayout>; }
