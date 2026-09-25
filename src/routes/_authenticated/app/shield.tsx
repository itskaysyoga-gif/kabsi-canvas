import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/_authenticated/app/shield")({ head: () => ({ meta: [{ title: "Shield — Kabsi" }, { name: "description", content: "Your business protection tools will appear here." }, { property: "og:title", content: "Shield — Kabsi" }, { property: "og:description", content: "Your business protection tools will appear here." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <PlaceholderPage title="Shield" sentence="Your business protection tools will appear here." />; }
