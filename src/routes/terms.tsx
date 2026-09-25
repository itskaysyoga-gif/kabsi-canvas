import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/public-layout";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/terms")({ head: () => ({ meta: [{ title: "Terms — Kabsi" }, { name: "description", content: "Kabsi's terms of use will appear here." }, { property: "og:title", content: "Terms — Kabsi" }, { property: "og:description", content: "Kabsi's terms of use will appear here." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <PublicLayout><PlaceholderPage title="Terms" sentence="Kabsi's terms of use will appear here." /></PublicLayout>; }
