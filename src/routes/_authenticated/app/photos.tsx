import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/_authenticated/app/photos")({ head: () => ({ meta: [{ title: "Photos — Kabsi" }, { name: "description", content: "Your business photos will appear here." }, { property: "og:title", content: "Photos — Kabsi" }, { property: "og:description", content: "Your business photos will appear here." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <PlaceholderPage title="Photos" sentence="Your business photos will appear here." />; }
