// Guides 4 part C (master plan 30.32 item 4 and C4): one <title> per page, in the HTML the server sends and in the page after
// it has loaded. App 4 left the 404 and error screens with the root's default "Kabsi" and their own title both.
import { expect, test } from "@playwright/test";

const PAGES: [string, RegExp][] = [
  ["/", /^Kabsi: Your business on Google/],
  [
    "/guides/how-to-verify-google-business-profile",
    /^How do I verify my Google Business Profile\? \| Kabsi$/,
  ],
  ["/this-page-does-not-exist", /^Kabsi: This page is not here\.$/],
  ["/guides/not-a-guide-at-all", /^Kabsi: This page is not here\.$/],
  ["/app", /Kabsi$/],
];

for (const [path, title] of PAGES) {
  test(`${path} has one <title>`, async ({ page, request }) => {
    const html = await (await request.get(path)).text();
    expect(html.match(/<title[ >]/g)?.length, "in the server's HTML").toBe(1);
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(title);
    expect(await page.locator("title").count(), "in the loaded page").toBe(1);
  });
}
