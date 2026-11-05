// Guides 3: the guide page loads only its own content file, on demand (one chunk per guide), never the whole set.
// Whether the guide is public was already decided on the server (src/lib/guides-server.ts) before this runs.
import type { GuideDoc } from "./types";

const files = import.meta.glob<{ guide: GuideDoc }>("./*.tsx");

export async function loadGuideDoc(slug: string): Promise<GuideDoc | undefined> {
  const file = files[`./${slug}.tsx`];
  if (file) return (await file()).guide;
  const { LEGACY_GUIDES } = await import("@/lib/guides");
  return LEGACY_GUIDES.find((g) => g.slug === slug);
}

// One promise per guide, so the page can read its content with use() on the server and in the browser.
const docs = new Map<string, Promise<GuideDoc | undefined>>();
export function guideDocPromise(slug: string) {
  let p = docs.get(slug);
  if (!p) {
    p = loadGuideDoc(slug);
    docs.set(slug, p);
  }
  return p;
}
