import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/public-layout";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/privacy")({ head: () => ({ meta: [{ title: "Privacy — Kabsi" }, { name: "description", content: "Kabsi's privacy information will appear here." }, { property: "og:title", content: "Privacy — Kabsi" }, { property: "og:description", content: "Kabsi's privacy information will appear here." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <PublicLayout><PlaceholderPage title="Privacy" sentence="Kabsi's privacy information will appear here." /></PublicLayout>; }
