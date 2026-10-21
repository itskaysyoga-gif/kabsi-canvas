// Mock of the categories list (Business Information API, categories.list): a short list with made-up resource names.
import { RELATED } from "../../coach/categories.ts";
import type { Category } from "../../coach/categories.ts";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const ALL: Category[] = [...new Set(RELATED.flat())].map((displayName) => ({ name: `categories/gcid:${slug(displayName)}`, displayName }));

export const findCategory = (_region: string, displayName: string): Promise<Category | null> =>
  Promise.resolve(ALL.find((c) => c.displayName.toLowerCase() === displayName.trim().toLowerCase()) ?? null);
