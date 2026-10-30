// Web 3 part 2 (Design 6 round 2, lane R 30 Oct 2026): the one interactive phone on Home. It starts at the review and
// the ready reply (never an empty chat, also with reduced motion); Yes gives Approved with Undo for 10 seconds, then
// Sent to Google, then Live on Google with a link; Undo, Edit, Skip and the failure state each tell their own story.
// Approved, sent and live stay three separate states on the status card. Nothing here calls a service.
import { expect, test, type Page } from "@playwright/test";
import { noBanner, settle } from "./helpers/page";

const chat = (page: Page) => page.getByRole("log", { name: "The chat with Kabsi" });
const card = (page: Page) => page.getByRole("list", { name: "Where the reply is" });
const answer = (page: Page) => chat(page).getByRole("group", { name: "Your answer" });

test.describe("the Home demonstration", () => {
  test.beforeEach(async ({ page }) => {
    await noBanner(page);
    await page.goto("/");
    await settle(page);
  });

  test("starts at the ready reply, and Yes goes Approved, Sent to Google, Live on Google", async ({
    page,
  }) => {
    await expect(chat(page)).toContainText("Reply ready:");
    await expect(answer(page).getByRole("button")).toHaveText(["Yes", "Edit", "Skip"]);
    await expect(card(page)).toContainText("Approved, not yet");

    await answer(page).getByRole("button", { name: "Yes" }).click();
    await expect(chat(page)).toContainText("Approved. It goes to Google in 10 seconds.");
    await expect(card(page)).toContainText("Approved, done");
    await expect(card(page)).toContainText("Sent to Google, now");
    await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(2);

    // The Undo window is 10 real seconds, also with reduced motion; then sent, then live a moment later.
    await expect(chat(page)).toContainText("Sent to Google. I will tell you when it is live.", {
      timeout: 14_000,
    });
    await expect(card(page)).toContainText("Sent to Google, done");
    await expect(chat(page)).toContainText("Live on Google: your reply to Layla K.", {
      timeout: 6_000,
    });
    await expect(chat(page).getByRole("link", { name: "See it on Google" })).toBeVisible();
    await expect(card(page)).toContainText("Live on Google, done");
    await expect(page.locator('[aria-current="step"]')).toHaveCount(0);
  });

  test("Undo from the status card sends nothing and asks again", async ({ page }) => {
    await answer(page).getByRole("button", { name: "Yes" }).click();
    await page.getByRole("button", { name: "Undo" }).last().click();
    await expect(chat(page)).toContainText(
      "Undone. Nothing was sent. The reply waits for your yes.",
    );
    await expect(answer(page).getByRole("button")).toHaveText(["Yes", "Edit", "Skip"]);
    await expect(card(page)).toContainText("Approved, not yet");
  });

  test("Edit shows the new reply for a yes; Skip posts nothing", async ({ page }) => {
    await answer(page).getByRole("button", { name: "Edit" }).click();
    await expect(chat(page)).toContainText("New reply ready:", { timeout: 5_000 });
    await expect(answer(page).getByRole("button")).toHaveText(["Yes", "Edit", "Skip"]);
    await answer(page).getByRole("button", { name: "Skip" }).click();
    await expect(chat(page)).toContainText("Skipped. Nothing is posted.");
    await page.getByRole("button", { name: "Start again" }).first().click();
    await expect(answer(page).getByRole("button")).toHaveText(["Yes", "Edit", "Skip"]);
  });

  test("the failure state says Google did not accept it", async ({ page }) => {
    await page.getByLabel("Show what happens if Google says no").check();
    await answer(page).getByRole("button", { name: "Yes" }).click();
    await expect(chat(page)).toContainText("Google did not accept it. Nothing was changed.", {
      timeout: 16_000,
    });
    await expect(card(page)).toContainText("Sent to Google, did not go through");
    await expect(card(page)).toContainText("Live on Google, not yet");
  });
});
