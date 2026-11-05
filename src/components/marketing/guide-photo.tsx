// Style 1 part A: a guide's photo from the licensed library (docs/PHOTOS.md), chosen in src/content/guides/look.ts.
import { Img, PHOTOS, type Photo } from "@/components/kabsi/photos";
import { MORE_PHOTOS } from "@/components/kabsi/photos-more";
import { guideLook } from "@/content/guides/look";
import { cn } from "@/lib/utils";

const ALL: Record<string, Photo> = { ...PHOTOS, ...MORE_PHOTOS };
const camel = (file: string) => file.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/** The Photo for a library file name such as "bakery-window", or undefined when the library has no such photo. */
export const libraryPhoto = (file: string): Photo | undefined => ALL[camel(file)];

export const guidePhoto = (slug: string): Photo =>
  libraryPhoto(guideLook(slug).photo) ?? PHOTOS.salonTablet;

/** The charcoal-on-yellow label pill (30.32 item 3), as a span so it can sit inside a link card. */
export function TopicPill({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit rounded-full bg-kb-yellow px-3 py-1 text-label font-bold text-kb-black",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The guide's photo in a fixed frame (3:2 for the hero and the featured card, 16:9 for the list cards). */
export function GuideImage({
  slug,
  ratio,
  sizes,
  priority,
  className,
}: {
  slug: string;
  ratio: "3/2" | "16/9";
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden bg-surface-2",
        ratio === "3/2" ? "aspect-[3/2]" : "aspect-video",
        className,
      )}
    >
      <Img
        photo={guidePhoto(slug)}
        sizes={sizes}
        priority={priority}
        className="size-full object-cover"
      />
    </div>
  );
}
