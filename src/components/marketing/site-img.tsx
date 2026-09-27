// One <img> for every marketing photo (D256): WebP srcset, explicit size (no layout shift), descriptive alt,
// lazy by default, eager with high fetch priority for the page's main image.
// Renders nothing for an id the registry doesn't know, so a half-synced preview can't crash the page (KABSI-WEB-2).
import { photoFallback, photoOf, photoSrcSet, type PhotoId } from "@/lib/site-photos";

export function SiteImg({
  id,
  sizes,
  className,
  min = 800,
  priority = false,
}: {
  id: PhotoId;
  sizes: string;
  className?: string;
  /** Width of the `src` fallback for browsers that ignore srcset. */
  min?: number;
  priority?: boolean;
}) {
  const p = photoOf(id);
  if (!p) return null;
  return (
    <img
      src={photoFallback(id, min)}
      srcSet={photoSrcSet(id)}
      sizes={sizes}
      alt={p.alt}
      width={p.w}
      height={p.h}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={className}
    />
  );
}
