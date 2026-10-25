// QA 1 (30.12 item 2): the owner's journeys against production for the QA demo owner on the demo business (mock Google, R-17):
// approve a reply and Undo it, approve it and let it go, approve a post and Cancel it while it waits, and the plan page.
// Real time (no fixed clock): the 10 second Undo window is the server's. Run tests/e2e/seed/qa-reset.sql first so the two QA rows
// are waiting again. Needs KABSI_QA_CODE_DEMO; without it the tests are skipped.
import { expect, test } from "@playwright/test";
import { savedSession, signedIn } from "./helpers/auth";
import { noBanner, settle } from "./helpers/page";

test.describe.configure({ mode: "serial" });

test.describe("owner journeys (QA demo owner)", () => {
  // The journeys change the QA rows in order and put nothing back by themselves: one size is enough.
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "m390", "the journeys run once, at phone width");
  });
  test.skip(() => !savedSession("demo"), "no KABSI_QA_CODE_DEMO for this run");
  test.beforeEach(async ({ page, context }) => {
    await noBanner(page);
    await signedIn(context, "demo");
  });

  // The Reviews list shows one line per review; opening it shows the review card with its draft and Approve reply.
  const reviewCard = (page: import("@playwright/test").Page) => page.locator("article");
  async function openQaReview(page: import("@playwright/test").Page) {
    await page.goto("/app/reviews");
    await settle(page);
    await page.getByRole("button", { name: /Quinn Tester/ }).click();
    await expect(reviewCard(page).getByText("Quinn Tester")).toBeVisible();
  }

  test("approve a reply, then Undo it inside the 10 seconds: nothing is sent", async ({ page }) => {
    await openQaReview(page);
    const card = reviewCard(page);
    await expect(
      card.getByRole("button", { name: "Approve reply" }),
      "the QA review is waiting (run qa-reset.sql)",
    ).toBeVisible();
    await card.getByRole("button", { name: "Approve reply" }).click();
    const banner = page.getByRole("status").filter({ hasText: /Publishing in \d+ seconds?/ });
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "Undo" }).click();
    // The note ("Undone. Nothing was sent to Google...") shows for a moment, and the card then reloads with the draft waiting again.
    await expect(banner).toHaveCount(0);
    await expect(reviewCard(page).getByRole("button", { name: "Approve reply" })).toBeVisible();
    await expect(reviewCard(page).getByText("Thank you, Quinn.")).toBeVisible();
  });

  test("approve a reply and let the 10 seconds pass: it goes on its way", async ({ page }) => {
    await openQaReview(page);
    await reviewCard(page).getByRole("button", { name: "Approve reply" }).click();
    await expect(page.getByText(/Publishing in \d+ seconds?/)).toBeVisible();
    // The 10 seconds run out, the banner goes, and the reply is Google's (the mock's) to take.
    await expect(page.getByText(/Publishing in \d+ seconds?/)).toHaveCount(0, { timeout: 25_000 });
    await page.goto("/app/reviews");
    await settle(page);
    // After a reload the review no longer waits for an answer: it has left "Needs reply".
    await expect(page.getByRole("button", { name: /Quinn Tester/ })).toHaveCount(0);
  });

  test("approve a post, then Cancel it while it waits for its day: nothing is posted", async ({
    page,
  }) => {
    await page.goto("/app/posts");
    await settle(page);
    const draft = page.locator("article", { hasText: "winter menu" });
    const showMonth = async () => {
      // The post is due 20 days after the reset: this month's tab or next month's.
      for (const tab of await page.getByRole("tab").all()) {
        if (await page.getByText("winter menu").first().isVisible()) return;
        await tab.click();
      }
    };
    await showMonth();
    // A first run approves the draft; a run that stopped half way finds it already waiting and goes straight on to Cancel.
    if (await draft.getByRole("button", { name: "Approve", exact: true }).isVisible()) {
      await draft.getByRole("button", { name: "Approve", exact: true }).click();
      // The banner counts to the post's own day, so there is nothing to wait for: the post now waits and can be cancelled.
      await expect(page.getByText(/Publishing in|On its way to Google/).first()).toBeVisible();
      await page.goto("/app/posts");
      await settle(page);
      await showMonth();
    }
    const cancel = page.getByRole("button", { name: "Cancel", exact: true });
    await expect(
      cancel,
      "the approved post waits for its day, so it can be cancelled",
    ).toBeVisible();
    await cancel.first().click();
    await expect(page.getByText("Cancelled. Nothing was posted.")).toBeVisible();
  });
});
