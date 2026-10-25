// QA 1 (30.12 item 2): the owner's journeys against production for the QA demo owner on the demo business (mock Google, R-17):
// approve a reply and Undo it, approve it and let it go, approve a post and Cancel it while it waits, and the plan page.
// Real time (no fixed clock): the 10 second Undo window is the server's. Run tests/e2e/seed/qa-reset.sql first so the two QA rows
// are waiting again. Needs KABSI_QA_CODE_DEMO; without it the tests are skipped.
import { expect, test } from "@playwright/test";
import { savedSession, signedIn } from "./helpers/auth";
import { noBanner, settle } from "./helpers/page";

test.describe.configure({ mode: "serial" });

test.describe("owner journeys (QA demo owner)", () => {
  test.skip(() => !savedSession("demo"), "no KABSI_QA_CODE_DEMO for this run");
  test.beforeEach(async ({ page, context }) => {
    await noBanner(page);
    await signedIn(context, "demo");
  });

  const reviewCard = (page: import("@playwright/test").Page) =>
    page.locator("article", { hasText: "Quinn Tester" });

  test("approve a reply, then Undo it inside the 10 seconds: nothing is sent", async ({ page }) => {
    await page.goto("/app/reviews");
    await settle(page);
    const card = reviewCard(page);
    await expect(card, "the QA review is waiting (run qa-reset.sql)").toBeVisible();
    await card.getByRole("button", { name: "Approve reply" }).click();
    const banner = page.getByRole("status").filter({ hasText: /Publishing in \d+ seconds?/ });
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "Undo" }).click();
    await expect(
      page.getByText("Undone. Nothing was sent to Google. The reply is back here."),
    ).toBeVisible();
    // The review is back among the waiting ones, with its draft.
    await expect(reviewCard(page).getByRole("button", { name: "Approve reply" })).toBeVisible();
  });

  test("approve a reply and let the 10 seconds pass: it goes on its way", async ({ page }) => {
    await page.goto("/app/reviews");
    await settle(page);
    await reviewCard(page).getByRole("button", { name: "Approve reply" }).click();
    await expect(page.getByText(/Publishing in \d+ seconds?/)).toBeVisible();
    await expect(page.getByText("Approved. On its way to Google.")).toBeVisible({
      timeout: 25_000,
    });
    await page.reload();
    await settle(page);
    // After a reload the review no longer waits for an answer (it is posted or on its way).
    await expect(reviewCard(page).getByRole("button", { name: "Approve reply" })).toHaveCount(0);
  });

  test("approve a post, then Cancel it while it waits for its day: nothing is posted", async ({
    page,
  }) => {
    await page.goto("/app/posts");
    await settle(page);
    const next = page.getByRole("tab").nth(1);
    const draft = page.locator("article", { hasText: "winter menu" });
    if (!(await draft.isVisible())) await next.click();
    await expect(draft, "the QA post is a draft (run qa-reset.sql)").toBeVisible();
    await draft.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(
      page.getByText(/Publishing in \d+ seconds?|Approved\. On its way to Google\./),
    ).toBeVisible();
    await expect(page.getByText("Approved. On its way to Google.")).toBeVisible({
      timeout: 25_000,
    });
    await page.reload();
    await settle(page);
    if (!(await page.getByText("winter menu").first().isVisible()))
      await page.getByRole("tab").nth(1).click();
    const waiting = page
      .locator("div", { hasText: "winter menu" })
      .filter({ has: page.getByRole("button", { name: "Cancel", exact: true }) })
      .last();
    await waiting.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByText("Cancelled. Nothing was posted.")).toBeVisible();
  });
});
