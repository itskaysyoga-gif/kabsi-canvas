// The page behind a review link set to "Show the page" (P0.8-05, K-132). Everyone sees the same page: the Google
// review button first, then one line to message the manager when the business saved a WhatsApp number. Nothing here
// asks a question, reads a rating or routes anybody.
import { anonHeaders, supabaseUrl } from "@/lib/supabase-config";

export type ReviewPageData = {
  name: string;
  /** Google's review form for this business. */
  review_url: string;
  /** Digits for wa.me, or null when the business saved no WhatsApp number (the manager line is then hidden). */
  whatsapp: string | null;
};

/** The words of the second line, one place so the page and the tests read the same. */
export const MANAGER_LINE = "Need help now? Message the manager";

/** The click-to-chat link to the business's own WhatsApp, with a short neutral message. */
export function managerHref(digits: string, name: string): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(`Hello ${name}, I need some help.`)}`;
}

/** The page data for one code, or null when the link is not active or not set to show the page. */
export async function fetchReviewPage(code: string): Promise<ReviewPageData | null> {
  const res = await fetch(`${supabaseUrl}/functions/v1/review-page`, {
    method: "POST",
    headers: { "content-type": "application/json", ...anonHeaders },
    body: JSON.stringify({ code }),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("review_page_unavailable");
  return (await res.json()) as ReviewPageData;
}
