import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/public-layout";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/how-it-works")({ head: () => ({ meta: [{ title: "How it works — Kabsi" }, { name: "description", content: "See how a new review moves from a prepared draft to your final approval." }, { property: "og:title", content: "How it works — Kabsi" }, { property: "og:description", content: "See how a new review moves from a prepared draft to your final approval." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <PublicLayout><PlaceholderPage title="How it works" sentence="See how a new review moves from a prepared draft to your final approval." /></PublicLayout>; }
