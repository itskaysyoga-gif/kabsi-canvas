import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Kabsi — Review replies, ready for your approval" },
    { name: "description", content: "Review every drafted reply and decide what gets posted." },
    { property: "og:title", content: "Kabsi — Review replies, ready for your approval" },
    { property: "og:description", content: "Review every drafted reply and decide what gets posted." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: HomePage,
});
function HomePage() { return <PublicLayout><section className="bg-kb-carbon text-kb-white"><div className="mx-auto flex min-h-[calc(100svh-72px)] max-w-7xl flex-col justify-center px-5 py-16 sm:px-8 sm:py-24"><div className="mb-7 h-1.5 w-16 rounded-pill bg-kb-yellow" /><h1 className="max-w-5xl font-display text-[clamp(3.4rem,8vw,7.5rem)] leading-[0.9]">Every Google review, answered. You just tap Post.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-kb-stone-on-dark">New reviews arrive with a reply already written in your customer's language. Read it, change it if you like, and tap Post. Nothing goes on Google without you.</p><div className="mt-9 grid gap-3 sm:flex"><Button asChild className="w-full sm:w-auto"><Link to="/start">Get set up <ArrowRight /></Link></Button><Button asChild variant="outline" className="w-full border-kb-white text-kb-white hover:bg-kb-white/10 sm:w-auto"><Link to="/how-it-works">See how it works</Link></Button></div></div></section></PublicLayout>; }
