// The Profile Coach's weekly read of a Google profile (P0.8-09). Three numbers only: the length of the description, how
// many extra categories, how many attributes are set. Google's text is never kept, so there is nothing to clear later
// (K-40). Pure, so the Deno tests run it on a sample.
import type { Attributes, Location } from "../google/types.ts";

export type CoachNumbers = { descriptionLength: number; additionalCategories: number; attributes: number };

export function coachNumbers(location: Location, attrs: Attributes): CoachNumbers {
  return {
    descriptionLength: (location.profile?.description ?? "").trim().length,
    additionalCategories: (location.categories?.additionalCategories ?? []).length,
    attributes: (attrs.attributes ?? []).length,
  };
}

// What the mock reports: a short description, no extra categories, two attributes. Only the demo workspace shows these as
// real; every other business shows them as examples and gets no task from them.
export const MOCK_COACH: CoachNumbers = { descriptionLength: 120, additionalCategories: 0, attributes: 2 };
