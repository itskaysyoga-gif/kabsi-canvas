// Launch 1 (E3): ViewContent goes with Pricing and each industry page (/for/<kind>), and with no other page.
import { describe, expect, it } from "vitest";
import { viewContentOf } from "@/lib/meta-pixel";

describe("ViewContent pages", () => {
  it("Pricing and every industry page, by name", () => {
    expect(viewContentOf("/pricing")).toEqual({ content_name: "pricing" });
    expect(viewContentOf("/for/hair-salon")).toEqual({
      content_name: "industry_hair-salon",
      content_category: "industry",
    });
    expect(viewContentOf("/for/barbershop/")).toEqual({
      content_name: "industry_barbershop",
      content_category: "industry",
    });
  });
  it("nothing for the industry list, Home or any other page", () => {
    for (const p of ["/", "/for", "/scan", "/founding", "/guides/x", "/for/a/b"])
      expect(viewContentOf(p)).toBeNull();
  });
});
