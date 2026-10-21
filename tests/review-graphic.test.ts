import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { ReviewGraphic } from "../src/components/reviews/review-graphic";
import { GRAPHIC_SIZES, graphicEligible } from "../src/lib/review-graphic";

// P0.8-07 (K-134): "Make a graphic" appears only on 4 and 5 star reviews that still have words; the image is made
// on request and never stored. The rendering, cutting and cleaning are tested in Deno (_shared/review-graphic).
const base = {
  id: "11111111-1111-4111-8111-111111111111",
  location_id: "loc",
  star_rating: 5,
  comment: "Friendly team.",
};
const html = (review: Parameters<typeof ReviewGraphic>[0]["review"]) =>
  renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(ReviewGraphic, { review }),
    ),
  );

describe("who gets the button", () => {
  it("a 4 and a 5 star review with words", () => {
    expect(graphicEligible({ ...base, star_rating: 5 })).toBe(true);
    expect(graphicEligible({ ...base, star_rating: 4 })).toBe(true);
    expect(html(base)).toContain("Make a graphic");
  });

  it("not a 3 star review, a rating only, or a review whose words were removed after 30 days", () => {
    expect(html({ ...base, star_rating: 3 })).toBe("");
    expect(html({ ...base, comment: null })).toBe("");
    expect(html({ ...base, comment: "   " })).toBe("");
    expect(html({ ...base, content_purged_at: "2026-09-01T00:00:00Z" })).toBe("");
  });

  it("offers a square and a story", () => {
    expect(GRAPHIC_SIZES.map((s) => s.id)).toEqual(["square", "story"]);
  });
});

describe("nothing is posted and nothing is kept", () => {
  const strip = (file: string) =>
    readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

  it("the function reads the review, checks Pro and returns the image: no storage, no write, no model", () => {
    for (const file of [
      "supabase/functions/review-graphic/index.ts",
      "supabase/functions/_shared/review-graphic/handler.ts",
      "supabase/functions/_shared/review-graphic/render.ts",
    ]) {
      expect(strip(file), file).not.toMatch(
        /\.storage\b|\.insert\(|\.upsert\(|\.update\(|\.delete\(|writeFile|anthropic|openai/i,
      );
    }
    expect(strip("supabase/functions/review-graphic/index.ts")).toContain("feature_access");
  });

  it("the app calls the function and hands the image to the owner: no upload, no post", () => {
    for (const file of ["src/lib/review-graphic.ts", "src/components/reviews/review-graphic.tsx"]) {
      expect(strip(file), file).not.toMatch(
        /\.storage\b|\.insert\(|\.upsert\(|localStorage|postReply|publish/i,
      );
    }
  });

  it("the image uses the design tokens only", () => {
    const code = strip("supabase/functions/_shared/review-graphic/render.ts");
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(code).toContain("TOKENS.");
  });
});
