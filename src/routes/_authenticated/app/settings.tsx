import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/_authenticated/app/settings")({ head: () => ({ meta: [{ title: "Settings — Kabsi" }, { name: "description", content: "Your Kabsi settings will appear here." }, { property: "og:title", content: "Settings — Kabsi" }, { property: "og:description", content: "Your Kabsi settings will appear here." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <PlaceholderPage title="Settings" sentence="Your Kabsi settings will appear here." />; }
