import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layouts/app-layout";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/_authenticated/start")({ head: () => ({ meta: [{ title: "Get set up — Kabsi" }, { name: "description", content: "Set up Kabsi for your business." }, { property: "og:title", content: "Get set up — Kabsi" }, { property: "og:description", content: "Set up Kabsi for your business." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <AppLayout><PlaceholderPage title="Get set up" sentence="Your guided setup will appear here." /></AppLayout>; }
