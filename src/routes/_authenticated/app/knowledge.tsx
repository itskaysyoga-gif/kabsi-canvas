import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/_authenticated/app/knowledge")({ head: () => ({ meta: [{ title: "Knowledge — Kabsi" }, { name: "description", content: "Your business information will appear here." }, { property: "og:title", content: "Knowledge — Kabsi" }, { property: "og:description", content: "Your business information will appear here." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <PlaceholderPage title="Knowledge" sentence="Your business information will appear here." />; }
