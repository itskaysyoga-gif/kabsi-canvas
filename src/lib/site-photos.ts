// Marketing photos (KABSI-BRAND "Imagery": plain Lebanese places, no people, no real brands).
// Generated on Higgsfield, imported and vision-checked by the internal `site-assets` Edge Function,
// served from the public `site` Storage bucket at 800 and 1600 px wide.
import { supabaseUrl } from "@/lib/supabase";

const BASE = `${supabaseUrl}/storage/v1/object/public/site/photos`;

export const PHOTOS = {
  cafe: {
    file: "cafe-counter",
    ratio: [1600, 1194],
    alt: "An empty cafe counter in Beirut with an espresso machine and glass cups in morning light",
  },
  bakery: {
    file: "bakery-oven",
    ratio: [1600, 1194],
    alt: "A stone bakery oven glowing, with fresh flatbreads cooling on a rack",
  },
  street: {
    file: "beirut-street",
    ratio: [1600, 904],
    alt: "An old Beirut street with green shutters and bougainvillea at golden hour",
  },
  clinic: {
    file: "clinic-desk",
    ratio: [1600, 1194],
    alt: "A calm clinic reception desk with a plant and a small bell in daylight",
  },
  receipt: {
    file: "receipt-table",
    ratio: [1600, 1194],
    alt: "A marble cafe table with a folded receipt, two small coffees and fresh mint",
  },
  grocery: {
    file: "grocery-shelves",
    ratio: [1600, 1194],
    alt: "A neighbourhood grocery shop with jars on wooden shelves and fresh vegetables",
  },
} as const;

export type PhotoId = keyof typeof PHOTOS;

export function photoSrc(id: PhotoId, width: 800 | 1600 = 800) {
  return `${BASE}/${PHOTOS[id].file}-${width}.jpg`;
}
