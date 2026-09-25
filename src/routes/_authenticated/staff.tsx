import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layouts/app-layout";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/_authenticated/staff")({ head: () => ({ meta: [{ title: "Staff — Kabsi" }, { name: "description", content: "Kabsi staff workspace." }, { property: "og:title", content: "Staff — Kabsi" }, { property: "og:description", content: "Kabsi staff workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <AppLayout area="staff"><PlaceholderPage title="Staff" sentence="Your staff workspace will appear here." /></AppLayout>; }
