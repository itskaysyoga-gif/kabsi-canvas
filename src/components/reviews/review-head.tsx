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
          className={cn("size-4", s <= n ? "fill-kb-black text-kb-black" : "text-kb-stone/40")}
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
          className="grid size-11 shrink-0 place-items-center rounded-full bg-kb-carbon text-base font-bold text-kb-white"
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-bold">{name}</p>
            {review.risk === "high" ? (
              <span className="inline-flex items-center gap-1 rounded-pill bg-kb-red px-2.5 py-0.5 text-xs font-bold text-kb-white">
                <AlertTriangle className="size-3.5" aria-hidden="true" /> High risk
              </span>
            ) : review.risk === "medium" ? (
              <span className="rounded-pill bg-kb-amber-soft px-2.5 py-0.5 text-xs font-bold text-kb-amber">
                Medium risk
              </span>
            ) : null}
            {review.is_backlog ? (
              <span className="rounded-pill bg-kb-sand px-2.5 py-0.5 text-xs font-bold text-kb-stone">
                Older review
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-kb-stone">
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
        {review.comment || <span className="text-kb-stone">No written review, just a rating.</span>}
      </p>
    </>
  );
}
