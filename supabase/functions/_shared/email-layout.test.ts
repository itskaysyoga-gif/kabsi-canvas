import assert from "node:assert/strict";
import { emailButton, emailLayout, emailLink } from "./email-layout.ts";

const yellow = (html: string) => html.match(/background:#FFD60A/gi)?.length ?? 0;

Deno.test("a layout with a button has exactly one yellow button", () => {
  const html = emailLayout({ preheader: "p", title: "t", bodyHtml: "<p>Hello</p>", button: { label: "Open Kabsi", url: "https://x.test/app" } });
  assert.equal(yellow(html), 1);
});

Deno.test("a layout with only text links has no yellow button", () => {
  const html = emailLayout({ preheader: "p", title: "t", bodyHtml: "<p>Hello</p>", links: [{ label: "Edit", url: "https://x.test/e" }] });
  assert.equal(yellow(html), 0);
});

Deno.test("single review email: own button, Edit, Skip and Open Kabsi links, still one yellow", () => {
  const body = emailButton("Review reply", "https://x.test/post") +
    `<div>${emailLink("Edit", "https://x.test/edit")}${emailLink("Skip", "https://x.test/skip")}${emailLink("Open Kabsi", "https://x.test/app/inbox")}</div>`;
  const html = emailLayout({ preheader: "p", title: "New review", bodyHtml: body });
  assert.equal(yellow(html), 1);
  assert.equal(html.includes("Open Kabsi"), true);
});

Deno.test("buttons and links are at least 44 px tall", () => {
  const b = emailButton("Review reply", "https://x.test/");
  const [, padB, lineB] = b.match(/padding:(\d+)px [^;]*;[^"]*line-height:(\d+)px/)!;
  assert.equal(Number(padB) * 2 + Number(lineB) >= 44, true);
  const l = emailLink("Edit", "https://x.test/");
  const [, padL, lineL] = l.match(/padding:(\d+)px [^;]*;font-size:16px;line-height:(\d+)px/)!;
  assert.equal(Number(padL) * 2 + Number(lineL) >= 44, true);
});

Deno.test("one column, 16 px body text, no side-by-side cells in the card", () => {
  const html = emailLayout({ preheader: "p", title: "t", bodyHtml: "<p>Hello</p>", button: { label: "Go", url: "https://x.test/" } });
  assert.match(html, /font-size:16px;line-height:1\.6/);
  assert.match(html, /name="viewport" content="width=device-width,initial-scale=1"/);
  const card = html.slice(html.indexOf("<h1"));
  // the only table in the card is the button (one cell); the logo row above it is the only multi-cell table
  assert.equal((card.match(/<td/g) ?? []).length <= 4, true);
});

Deno.test("button width never exceeds the phone content width", () => {
  assert.match(emailButton("Open Google Protection", "https://x.test/"), /width="100%"[^>]*max-width:320px/);
});
