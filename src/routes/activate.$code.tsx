import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/public-layout";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/activate/$code")({ head: () => ({ meta: [{ title: "Activate — Kabsi" }, { name: "description", content: "Activate your Kabsi setup." }, { property: "og:title", content: "Activate — Kabsi" }, { property: "og:description", content: "Activate your Kabsi setup." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <PublicLayout><PlaceholderPage title="Activate Kabsi" sentence="Your activation details will appear here." /></PublicLayout>; }
