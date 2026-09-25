import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/_authenticated/app/plan")({ head: () => ({ meta: [{ title: "Plan — Kabsi" }, { name: "description", content: "Your Kabsi plan will appear here." }, { property: "og:title", content: "Plan — Kabsi" }, { property: "og:description", content: "Your Kabsi plan will appear here." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <PlaceholderPage title="Plan" sentence="Your Kabsi plan will appear here." />; }
