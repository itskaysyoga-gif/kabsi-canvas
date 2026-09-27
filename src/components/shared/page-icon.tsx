import type { ReactNode } from "react";

/** The icon above a signed-in page title: black 2 px Lucide stroke on a yellow circle (KABSI-BRAND). */
export function PageIcon({ icon }: { icon: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="mb-4 grid size-12 place-items-center rounded-full bg-kb-yellow text-kb-black [&_svg]:size-6 [&_svg]:stroke-[2]"
    >
      {icon}
    </span>
  );
}
