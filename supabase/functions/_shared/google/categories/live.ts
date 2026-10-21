// Business Information API: categories.list, one category by its display name. Read only.
// https://developers.google.com/my-business/reference/businessinformation/rest/v1/categories/list
import { BI, gbp } from "../client.ts";
import type { Category } from "../../coach/categories.ts";

export async function findCategory(region: string, displayName: string): Promise<Category | null> {
  const q = new URLSearchParams({ regionCode: region, languageCode: "en", view: "BASIC", pageSize: "20", filter: `displayName=${JSON.stringify(displayName)}` });
  const r = (await gbp(`${BI}/categories?${q}`)) as { categories?: { name?: string; displayName?: string }[] };
  const hit = (r.categories ?? []).find((c) => c.displayName?.toLowerCase() === displayName.trim().toLowerCase());
  return hit?.name && hit.displayName ? { name: hit.name, displayName: hit.displayName } : null;
}
