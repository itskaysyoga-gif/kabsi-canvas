import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/_authenticated/app/hours")({ head: () => ({ meta: [{ title: "Hours — Kabsi" }, { name: "description", content: "Your business hours will appear here." }, { property: "og:title", content: "Hours — Kabsi" }, { property: "og:description", content: "Your business hours will appear here." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <PlaceholderPage title="Hours" sentence="Your business hours will appear here." />; }
