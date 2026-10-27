import { Languages, Star, AlertTriangle } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InboxReview } from "@/lib/reviews";

// The head of the one review card (K-15): who wrote it, the stars, the date, the language and the words. It lives in its
// own small file so the public website can show the real thing without loading the reviews screen's code.

const LANG: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  ar: "Arabic",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  tr: "Turkish",
  nl: "Dutch",
  franco: "Franco-Arabic",
};

export function Stars({ n, className }: { n: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${n} of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          aria-hidden="true"
          className={cn("size-4", s <= n ? "fill-kb-black text-text-1" : "text-line-strong")}
        />
      ))}
    </span>
  );
}

export function ReviewHead({ review }: { review: InboxReview }) {
  const date = review.review_created_at
    ? fmtDate(
        review.review_created_at,
        new Date(review.review_created_at).getFullYear() !== new Date().getFullYear(),
      )
    : "";
  const lang =
    review.language && review.language !== "none" ? (LANG[review.language] ?? null) : null;
  const name = review.reviewer_name ?? "A customer";
  return (
    <>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-kb-carbon text-body font-bold text-kb-white"
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-bold">{name}</p>
            {review.risk === "high" ? (
              <span className="inline-flex items-center gap-1 rounded-pill bg-bad px-2.5 py-0.5 text-label font-bold text-kb-white">
                <AlertTriangle className="size-3.5" aria-hidden="true" /> High risk
              </span>
            ) : review.risk === "medium" ? (
              <span className="rounded-pill bg-warn-soft px-2.5 py-0.5 text-label font-bold text-warn">
                Medium risk
              </span>
            ) : null}
            {review.is_backlog ? (
              <span className="rounded-pill bg-surface-2 px-2.5 py-0.5 text-label font-bold text-text-2">
                Older review
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-text-2">
            <Stars n={review.star_rating} />
            {date ? <span>{date}</span> : null}
            {lang ? (
              <span className="inline-flex items-center gap-1">
                <Languages className="size-3.5" aria-hidden="true" /> {lang}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <p dir="auto" className="mt-4 whitespace-pre-wrap text-[17px] leading-7">
        {review.comment || <span className="text-text-2">No written review, just a rating.</span>}
      </p>
    </>
  );
}
