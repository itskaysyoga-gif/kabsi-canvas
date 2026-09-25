import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/public-layout";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/faq")({ head: () => ({ meta: [{ title: "Frequently asked questions — Kabsi" }, { name: "description", content: "Answers to common questions about Kabsi will appear here." }, { property: "og:title", content: "Frequently asked questions — Kabsi" }, { property: "og:description", content: "Answers to common questions about Kabsi will appear here." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <PublicLayout><PlaceholderPage title="Frequently asked questions" sentence="Answers to common questions about Kabsi will appear here." /></PublicLayout>; }
