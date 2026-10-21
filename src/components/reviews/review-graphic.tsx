import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, ImageIcon, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useFeatureAccess } from "@/lib/feature-access";
import {
  GRAPHIC_SIZES,
  GraphicError,
  graphicEligible,
  requestGraphic,
  type GraphicSize,
} from "@/lib/review-graphic";
import { cn } from "@/lib/utils";

/**
 * "Make a graphic" on a 4 or 5 star review (P0.8-07, K-134). Pro (K-126): an Essentials business is told so and nothing
 * is made. The owner picks a size, sees the image, and downloads it or shares it. Kabsi posts nothing.
 */
export function ReviewGraphic({
  review,
}: {
  review: {
    id: string;
    location_id: string;
    star_rating: number;
    comment: string | null;
    content_purged_at?: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<GraphicSize>("square");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [image, setImage] = useState<{ url: string; blob: Blob } | null>(null);
  const access = useFeatureAccess(open ? review.location_id : undefined);

  // The image lives only in this browser tab; closing the sheet lets it go.
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.url);
    },
    [image],
  );

  // Opening the sheet on Pro makes the square straight away; the owner can switch to the story.
  const ready = open && !!access.data?.pro;
  useEffect(() => {
    if (ready && !image && !busy && !error) void make("square");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!graphicEligible(review)) return null;
  const proOnly = !!access.data && !access.data.pro;
  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    !!image &&
    navigator.canShare({ files: [new File([image.blob], "review.png", { type: "image/png" })] });

  async function make(next: GraphicSize) {
    setSize(next);
    setBusy(true);
    setError(null);
    setImage(null);
    try {
      const blob = await requestGraphic(review.id, next);
      setImage({ url: URL.createObjectURL(blob), blob });
    } catch (e) {
      const g = e instanceof GraphicError ? e : null;
      setError({
        code: g?.code ?? "failed",
        message: g?.message ?? "The graphic could not be made. Try again.",
      });
    }
    setBusy(false);
  }

  async function share() {
    if (!image) return;
    try {
      await navigator.share({
        files: [new File([image.blob], `review-${size}.png`, { type: "image/png" })],
      });
    } catch {
      // The owner closed the share sheet: nothing to do.
    }
  }

  return (
    <>
      <div className="mt-3">
        <Button variant="tertiary" className="min-h-11 text-sm" onClick={() => setOpen(true)}>
          <ImageIcon aria-hidden="true" /> Make a graphic
        </Button>
      </div>
      <Sheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setImage(null);
            setError(null);
          }
        }}
      >
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-large">
          <SheetHeader className="text-left">
            <SheetTitle>Make a graphic</SheetTitle>
            <SheetDescription>
              A picture of this review with the reviewer's first name and initial. You download it
              or share it yourself. Kabsi posts nothing.
            </SheetDescription>
          </SheetHeader>
          {proOnly ? (
            <div className="mt-4 rounded-card bg-kb-sand p-4 text-sm leading-6" role="status">
              <p className="font-bold">Review graphics are part of Pro.</p>
              <Link
                to="/app/plan"
                className="mt-1 inline-block font-bold underline underline-offset-4"
              >
                See your plan
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {GRAPHIC_SIZES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void make(s.id)}
                    className={cn(
                      "min-h-14 rounded-card border-2 px-4 py-2 text-left disabled:opacity-60",
                      image && size === s.id ? "border-kb-black bg-kb-sand" : "border-kb-hairline",
                    )}
                  >
                    <span className="block font-bold">{s.label}</span>
                    <span className="block text-sm text-kb-stone">{s.hint}</span>
                  </button>
                ))}
              </div>
              {busy ? (
                <p className="mt-4 flex items-center gap-2 text-sm text-kb-stone" role="status">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Making your graphic
                </p>
              ) : null}
              {error ? (
                <p className="mt-4 text-sm text-kb-red" role="alert">
                  {error.message}{" "}
                  {error.code === "pro_required" ? (
                    <Link to="/app/plan" className="font-bold underline underline-offset-4">
                      See your plan
                    </Link>
                  ) : null}
                </p>
              ) : null}
              {image ? (
                <div className="mt-4">
                  <img
                    src={image.url}
                    alt="The review graphic"
                    className={cn(
                      "mx-auto w-full rounded-card border border-kb-hairline",
                      size === "story" ? "max-h-[55vh] w-auto" : "max-w-sm",
                    )}
                  />
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button asChild>
                      <a href={image.url} download={`review-${size}.png`}>
                        <Download aria-hidden="true" /> Download
                      </a>
                    </Button>
                    {canShare ? (
                      <Button variant="secondary" onClick={() => void share()}>
                        <Share2 aria-hidden="true" /> Share
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
