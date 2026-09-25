import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/public-layout";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/partners")({ head: () => ({ meta: [{ title: "Partners — Kabsi" }, { name: "description", content: "Kabsi gives partners a clear place to support the businesses they work with." }, { property: "og:title", content: "Partners — Kabsi" }, { property: "og:description", content: "Kabsi gives partners a clear place to support the businesses they work with." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <PublicLayout><PlaceholderPage title="Partners" sentence="Kabsi gives partners a clear place to support the businesses they work with." /></PublicLayout>; }
