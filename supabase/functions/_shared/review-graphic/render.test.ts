// P0.8-07 (K-134): a 4 or 5 star review makes both sizes; the image is a real PNG of the right dimensions.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { type GraphicInput, renderGraphic, SIZES } from "./render.ts";
import { graphicText } from "./text.ts";

const dims = (png: Uint8Array) => {
  const v = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { sig: Array.from(png.slice(0, 8)), width: v.getUint32(16), height: v.getUint32(20) };
};

for (const rating of [4, 5] as const) {
  Deno.test(`a ${rating} star review makes a square and a story image`, async () => {
    const t = graphicText({ star_rating: rating, comment: "Lovely staff and the best bread in the neighbourhood.", reviewer_name: "Maria Khoury" });
    assert(t.ok);
    const input: GraphicInput = { rating, text: t.text, name: t.name, business: "Yawmiyati" };
    for (const size of ["square", "story"] as const) {
      const png = await renderGraphic(input, size);
      const d = dims(png);
      assertEquals(d.sig, [137, 80, 78, 71, 13, 10, 26, 10]);
      assertEquals([d.width, d.height], [SIZES[size].width, SIZES[size].height]);
      assert(png.length > 5000);
    }
  });
}

Deno.test("a 200 character review still renders in both sizes", async () => {
  const t = graphicText({ star_rating: 5, comment: "Great food and friendly service. ".repeat(20), reviewer_name: "Sam" });
  assert(t.ok);
  for (const size of ["square", "story"] as const) {
    const png = await renderGraphic({ rating: 5, text: t.text, name: t.name, business: "A Business With A Fairly Long Name Cafe" }, size);
    assertEquals(dims(png).width, 1080);
  }
});
