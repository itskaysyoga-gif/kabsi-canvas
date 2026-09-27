// "Who it's for": labelled photos of the kinds of local businesses that live on Google Maps (D256).
// Plain places, no faces, no real businesses; never presented as customers.
import type { ReactNode } from "react";
import {
  BedDouble,
  Car,
  Croissant,
  Flower2,
  Scissors,
  Shirt,
  Stethoscope,
  UtensilsCrossed,
} from "lucide-react";
import type { PhotoId } from "@/lib/site-photos";
import { SiteImg } from "@/components/marketing/site-img";
import { cn } from "@/lib/utils";

const TYPES: { id: PhotoId; label: string; icon: ReactNode }[] = [
  { id: "bakery", label: "Bakeries and cafés", icon: <Croissant /> },
  { id: "restaurant", label: "Restaurants", icon: <UtensilsCrossed /> },
  { id: "dentist", label: "Clinics and dentists", icon: <Stethoscope /> },
  { id: "salon", label: "Salons and barbers", icon: <Scissors /> },
  { id: "florist", label: "Florists and shops", icon: <Flower2 /> },
  { id: "garage", label: "Garages and repairs", icon: <Car /> },
  { id: "boutique", label: "Boutiques", icon: <Shirt /> },
  { id: "hotel", label: "Hotels and B&Bs", icon: <BedDouble /> },
];

export function BusinessGrid({ className }: { className?: string }) {
  return (
    <ul data-stagger="" className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4", className)}>
      {TYPES.map((t) => {
        return (
          <li
            key={t.id}
            className="group relative aspect-[4/5] overflow-hidden rounded-large bg-kb-carbon"
          >
            <SiteImg
              id={t.id}
              min={480}
              sizes="(min-width: 1024px) 270px, 50vw"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/35 to-transparent"
            />
            <p className="absolute inset-x-3 bottom-3 flex items-center gap-2 text-[15px] font-bold leading-tight text-kb-white sm:inset-x-4 sm:bottom-4 sm:text-base">
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-kb-yellow text-kb-black [&_svg]:size-4"
              >
                {t.icon}
              </span>
              {t.label}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
