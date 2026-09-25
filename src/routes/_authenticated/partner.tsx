import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layouts/app-layout";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/_authenticated/partner")({ head: () => ({ meta: [{ title: "Partner — Kabsi" }, { name: "description", content: "Kabsi partner workspace." }, { property: "og:title", content: "Partner — Kabsi" }, { property: "og:description", content: "Kabsi partner workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <AppLayout area="partner"><PlaceholderPage title="Partner" sentence="Your partner workspace will appear here." /></AppLayout>; }
