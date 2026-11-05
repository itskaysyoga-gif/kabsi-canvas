// Style 1 part B (master plan 30.33 item 2): a library photo (docs/PHOTOS.md) at a good size in a section that was text
// only. Lazy, with srcset and sizes. It takes a Photo from photos.tsx, which every public page already loads, so no page
// gains a script file (importing the image files directly made Vite split them into a chunk Home then loaded).
import { cn } from "@/lib/utils";
import type { Photo } from "./photos";

export function SectionPhoto({
  photo,
  className,
  position,
}: {
  photo: Photo;
  className?: string;
  /** An object-position for the crop, for example "50% 30%". */
  position?: string;
}) {
  return (
    <img
      src={photo.small}
      srcSet={`${photo.small} 800w, ${photo.large} 1600w`}
      sizes="(min-width: 1200px) 1136px, calc(100vw - 40px)"
      width={1600}
      height={1067}
      alt={photo.alt}
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
