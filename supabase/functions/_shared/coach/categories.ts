// More categories for the Google profile (P0.8-09, K-136.2): up to three extra categories that belong with the main one, for
// the owner to choose from. Kabsi never proposes a different main category: that change is the owner's alone, signed in
// (apply_profile_field), and no screen offers it. Google's own list gives each category its resource name; the lookup is
// passed in so the mock (a short list) and the live read (categories.list, mock until Gate A) share this code.
export type Category = { name: string; displayName: string };

// Categories that sit together. A main category in one of these lines gets the others as suggestions.
export const RELATED: readonly (readonly string[])[] = [
  ["Coffee shop", "Cafe", "Bakery", "Breakfast restaurant", "Tea house", "Dessert shop"],
  ["Restaurant", "Cafe", "Bar", "Takeout restaurant", "Fast food restaurant", "Pizza restaurant"],
  ["Bakery", "Cafe", "Pastry shop", "Dessert shop", "Coffee shop"],
  ["Hair salon", "Beauty salon", "Barber shop", "Hair care", "Nail salon"],
  ["Beauty salon", "Hair salon", "Nail salon", "Spa", "Skin care clinic"],
  ["Barber shop", "Hair salon", "Men's hair salon"],
  ["Dentist", "Dental clinic", "Cosmetic dentist", "Emergency dental service"],
  ["Gym", "Fitness center", "Yoga studio", "Personal trainer"],
  ["Plumber", "Water heater installation service", "Drainage service", "Plumbing supply store"],
  ["Electrician", "Electrical installation service", "Lighting store"],
  ["Auto repair shop", "Car repair and maintenance service", "Tire shop", "Auto parts store"],
  ["Florist", "Gift shop", "Flower delivery"],
];

const key = (s: string) => s.trim().toLowerCase();

/** The extra categories to offer: related to the main one, not already on the profile, at most `max`. */
export async function suggestCategories(
  primary: string,
  additional: string[],
  lookup: (displayName: string) => Promise<Category | null>,
  max = 3,
): Promise<Category[]> {
  const have = new Set([primary, ...additional].map(key));
  const group = RELATED.find((g) => g.some((n) => key(n) === key(primary)));
  if (!group) return [];
  const out: Category[] = [];
  for (const name of group) {
    if (out.length >= max) break;
    if (have.has(key(name))) continue;
    const found = await lookup(name);
    if (found) out.push(found);
  }
  return out;
}
