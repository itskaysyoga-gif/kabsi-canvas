// Style 1 part B (master plan 30.33 item 2): a library photo (docs/PHOTOS.md) at a good size in a section that was text
// only. Lazy, with srcset and sizes, and the page imports only the two files it shows, so a speed-gated page (Pricing)
// carries no other photo addresses.
import { cn } from "@/lib/utils";

export function SectionPhoto({
  large,
  small,
  alt,
  className,
  position,
}: {
  /** The 1600 px copy. */
  large: string;
  /** The 800 px copy. */
  small: string;
  alt: string;
  className?: string;
  /** An object-position for the crop, for example "50% 30%". */
  position?: string;
}) {
  return (
    <img
      src={small}
      srcSet={`${small} 800w, ${large} 1600w`}
      sizes="(min-width: 1200px) 1136px, calc(100vw - 40px)"
      width={1600}
      height={1067}
      alt={alt}
      loading="lazy"
      decoding="async"
      style={position ? { objectPosition: position } : undefined}
      className={cn(
        "aspect-[3/2] w-full rounded-panel bg-surface-2 object-cover sm:aspect-[21/9]",
        className,
      )}
    />
  );
}
