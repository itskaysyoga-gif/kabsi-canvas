import { createFileRoute } from "@tanstack/react-router";
import { NotFoundPage } from "@/components/kabsi/status-pages";
import { STAFF_SUB_PAGES } from "@/components/staff/staff-pages";

// /staff/businesses, /staff/conversations, /staff/programs, /staff/system, /staff/costs and /staff/settings (App 5).
// One route for the six, so the route tree every website page loads gains one entry. Under the staff layout, so a
// session that is not staff never reaches this page (route.tsx). An unknown name is the not-found page.
// The head reads only this small list: anything it imports ships with every page of the website, so the pages
// themselves are reached only from the component, which is split into its own file.
const TITLES: Record<string, string> = {
  businesses: "Businesses",
  conversations: "Conversations",
  programs: "Programs",
  outbound: "Outbound",
  system: "System",
  costs: "Costs",
  settings: "Settings",
};

export const Route = createFileRoute("/_authenticated/staff/$page")({
  head: ({ params }) => ({
    meta: [
      { title: `${TITLES[params.page] ? `${TITLES[params.page]} | ` : ""}Staff | Kabsi` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffSubPage,
});

function StaffSubPage() {
  const { page } = Route.useParams();
  const Page = Object.hasOwn(STAFF_SUB_PAGES, page)
    ? STAFF_SUB_PAGES[page as keyof typeof STAFF_SUB_PAGES]
    : null;
  return Page ? <Page /> : <NotFoundPage />;
}
