// P0.8-07 (K-134, K-113): a 3 star review is refused; a 600 character review is cut at about 200 characters at a word
// with an ellipsis; links and contact details are removed; only first name and initial appear.
import { assert, assertEquals, assertFalse, assertMatch, assertNotMatch } from "jsr:@std/assert@1";
import { cleanReviewText, cutText, graphicText, MAX_CHARS, reviewerLabel } from "./text.ts";

Deno.test("only 4 and 5 star reviews make a graphic", () => {
  for (const star_rating of [1, 2, 3]) {
    assertEquals(graphicText({ star_rating, comment: "Nice place and kind people.", reviewer_name: "Sam Lee" }), { ok: false, reason: "rating" });
  }
  for (const star_rating of [4, 5]) assert(graphicText({ star_rating, comment: "Nice place and kind people.", reviewer_name: "Sam Lee" }).ok);
});

Deno.test("a review with no words is refused", () => {
  assertEquals(graphicText({ star_rating: 5, comment: null, reviewer_name: "Sam" }), { ok: false, reason: "no_text" });
  assertEquals(graphicText({ star_rating: 5, comment: "  \u{1F600}\u{1F600} ", reviewer_name: "Sam" }), { ok: false, reason: "no_text" });
  assertEquals(graphicText({ star_rating: 5, comment: "https://example.com/x", reviewer_name: "Sam" }), { ok: false, reason: "no_text" });
});

Deno.test("a 600 character review is cut near 200 at a word with an ellipsis and no mid-word break", () => {
  const words = "wonderful friendly service delicious bread lovely terrace".split(" ");
  let raw = "";
  for (let i = 0; raw.length < 600; i++) raw += `${words[i % words.length]} `;
  const cut = cutText(cleanReviewText(raw));
  assert([...cut].length <= MAX_CHARS + 1, `length ${[...cut].length}`);
  assert([...cut].length >= 150);
  assert(cut.endsWith("…"));
  const lastWord = cut.slice(0, -1).split(" ").pop()!;
  assert(words.includes(lastWord), `the last word ${lastWord} is whole`);
});

Deno.test("short text is not touched", () => {
  assertEquals(cutText("Lovely place."), "Lovely place.");
});

Deno.test("links, contact details, hashtags and handles are removed", () => {
  const t = graphicText({
    star_rating: 5,
    comment: "Loved it! Call 01 234 567 or +1 555 010 4477, mail me@shop.com, see www.shop.com or https://shop.com/menu #bestbread @maria shop.lb/menu",
    reviewer_name: "Sam Lee",
  });
  assert(t.ok);
  assertNotMatch(t.text, /\d{3}|@|#|www|https?:|shop\.|\.lb|\.com/i);
  assertMatch(t.text, /Loved it/);
});

Deno.test("dashes and exclamation marks are softened, emoji removed", () => {
  const t = graphicText({ star_rating: 5, comment: "Amazing!!! Best coffee — ever \u{1F60D}", reviewer_name: "Sam" });
  assert(t.ok);
  assertFalse(/[–—!]|\p{Extended_Pictographic}/u.test(t.text));
});

Deno.test("only first name and initial", () => {
  assertEquals(reviewerLabel("Maria Khoury"), "Maria K.");
  assertEquals(reviewerLabel("Maria Anne Khoury"), "Maria K.");
  assertEquals(reviewerLabel("maria"), "maria");
  assertEquals(reviewerLabel(null), "A customer");
  assertEquals(reviewerLabel("A Google user"), "A customer");
  assertEquals(reviewerLabel("مريم خوري"), "A customer");
});

Deno.test("a review in a script the fonts do not cover is refused", () => {
  assertEquals(
    graphicText({ star_rating: 5, comment: "خدمة ممتازة", reviewer_name: "Sam" }),
    { ok: false, reason: "unsupported_script" },
  );
});
