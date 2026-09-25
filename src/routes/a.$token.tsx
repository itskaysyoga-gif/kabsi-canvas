import { createFileRoute } from "@tanstack/react-router";
import { ConfirmLayout } from "@/components/layouts/confirm-layout";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/a/$token")({ head: () => ({ meta: [{ title: "Confirm — Kabsi" }, { name: "description", content: "Review and confirm in Kabsi." }, { property: "og:title", content: "Confirm — Kabsi" }, { property: "og:description", content: "Review and confirm in Kabsi." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <ConfirmLayout><PlaceholderPage title="Confirm" sentence="Your confirmation details will appear here." /></ConfirmLayout>; }
