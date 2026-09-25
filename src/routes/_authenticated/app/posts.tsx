import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export const Route = createFileRoute("/_authenticated/app/posts")({ head: () => ({ meta: [{ title: "Posts — Kabsi" }, { name: "description", content: "Your business posts will appear here." }, { property: "og:title", content: "Posts — Kabsi" }, { property: "og:description", content: "Your business posts will appear here." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Page });
function Page() { return <PlaceholderPage title="Posts" sentence="Your business posts will appear here." />; }
