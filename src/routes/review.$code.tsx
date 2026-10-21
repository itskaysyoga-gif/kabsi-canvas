import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ReviewPageLoading,
  ReviewPageUnavailable,
  ReviewPageView,
} from "@/components/review-link/review-page-view";
import { fetchReviewPage } from "@/lib/review-page";

// The page a review link opens when its owner switched it to "Show the page" (P0.8-05, K-132). Reached from
// go.kabsi.co/{CODE}; a link left on "Go straight to Google" never lands here. Public, not indexed.
export const Route = createFileRoute("/review/$code")({
  head: () => ({
    meta: [{ title: "Leave a Google review" }, { name: "robots", content: "noindex" }],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { code } = Route.useParams();
  const clean = code
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .slice(0, 6);
  const page = useQuery({
    queryKey: ["review-page", clean],
    queryFn: () => fetchReviewPage(clean),
    retry: 1,
  });
  if (page.isLoading) return <ReviewPageLoading />;
  if (!page.data) return <ReviewPageUnavailable />;
  return <ReviewPageView data={page.data} />;
}
