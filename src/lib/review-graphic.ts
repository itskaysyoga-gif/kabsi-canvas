// Review graphics (P0.8-07, K-134, Pro): a square or story image for a 4 or 5 star review, made on request by the
// review-graphic Edge Function from the stored review and handed back. Nothing is posted anywhere and nothing is
// stored: the owner downloads it or shares it from the phone's share sheet.
import { anonHeaders, supabase, supabaseUrl } from "@/lib/supabase";

export type GraphicSize = "square" | "story";
export const GRAPHIC_SIZES: { id: GraphicSize; label: string; hint: string }[] = [
  { id: "square", label: "Square", hint: "For posts and your website" },
  { id: "story", label: "Story", hint: "For Instagram and WhatsApp stories" },
];

export class GraphicError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** A 4 or 5 star review that still has its words (Kabsi keeps review text for 30 days). */
export const graphicEligible = (r: {
  star_rating: number;
  comment: string | null;
  content_purged_at?: string | null;
}) => r.star_rating >= 4 && !!r.comment?.trim() && !r.content_purged_at;

/** Asks for the image. The server checks the business, Pro, the rating and the words again. */
export async function requestGraphic(reviewId: string, size: GraphicSize): Promise<Blob> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new GraphicError("sign_in_required", "Sign in to make a graphic.");
  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/review-graphic`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...anonHeaders,
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ review_id: reviewId, size }),
    });
  } catch {
    throw new GraphicError(
      "network",
      "We could not reach Kabsi. Check your connection and try again.",
    );
  }
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new GraphicError(
      j.error ?? "failed",
      j.message || "The graphic could not be made. Try again.",
    );
  }
  return await res.blob();
}
