import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/_authenticated/app/report")({ head: () => ({ meta: [{ title: "Report — Kabsi" }, { name: "description", content: "Your business report will appear here." }, { property: "og:title", content: "Report — Kabsi" }, { property: "og:description", content: "Your business report will appear here." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <PlaceholderPage title="Report" sentence="Your business report will appear here." />; }
