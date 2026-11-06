// Harvey 4A part C: kabsi.co/staff/outbound with a made-up staff session (every Supabase call answered here, nothing
// reaches Supabase) and fictional example.com drafts, at 390 and 1440 px with axe. The page shows each draft's source,
// approves Email 1 with its follow-up, approves all only what is shown, and has no control that opens sending.
import { expect, test } from "@playwright/test";
import { axeClean, noBanner } from "./helpers/page";
import { signInFake } from "./helpers/fake-auth";

const P = {
  business_name: "Rose Lane Salon",
  city: "Exampleton",
  country: "GB",
  source_page: "https://roselanesalon.example.com/contact",
  source_date: "2026-11-06",
  detail_used:
    "Your site lists your opening hours, and keeping Google's hours the same saves wasted trips.",
  company_number: "00000000",
  company_status: "test",
  company_status_date: "2026-11-06",
  test: true,
};
const first = {
  id: "11111111-1111-4111-8111-111111111111",
  prospect_id: "p1",
  parent_id: null,
  kind: "first",
  to_address: "inbox@test.example.com",
  subject: "Rose Lane Salon's Google profile",
  status: "draft",
  send_after: "2026-11-09T09:00:00Z",
  prospect: P,
  body: "Hi Rose Lane Salon team,\n\nI came across Rose Lane Salon looking at hair salons in Exampleton.\n\nRashid Abou Hamzy, founder of Kabsi\nkabsi.co",
};
const follow = {
  ...first,
  id: "22222222-2222-4222-8222-222222222222",
  parent_id: first.id,
  kind: "follow_up",
  send_after: null,
  subject: "Re: Rose Lane Salon's Google profile",
  body: "Hi again. Happy to run that free check of Rose Lane Salon's Google profile if useful.",
};
const reply = {
  id: 7,
  prospect_id: "p2",
  intent: "yes",
  reply_subject: "Re: Harbor Barbers's Google profile",
  reply_text: "Yes please",
  received_at: "2026-11-06T12:00:00Z",
  prospect: { ...P, business_name: "Harbor Barbers" },
};
const answer = {
  ...first,
  id: "33333333-3333-4333-8333-333333333333",
  prospect_id: "p2",
  kind: "reply",
  subject: "Re: Harbor Barbers's Google profile",
  body: "Hi Harbor Barbers team,\n\nThanks for the yes. Here is the free check: kabsi.co/scan/TESTCHECK",
  prospect: reply.prospect,
};

test("the day's drafts, their sources, the replies, the lock read only", async ({ page }) => {
  await noBanner(page);
  const calls: { path: string; body: string }[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/rest/v1/rpc/staff_outbound"))
      calls.push({ path: new URL(r.url()).pathname, body: r.postData() ?? "" });
  });
  await signInFake(page, {
    staff: true,
    rest: {
      "/rest/v1/outbound_settings": {
        sending_open: false,
        test_mode: true,
        stopped_reason: null,
        stopped_at: null,
        started_on: null,
      },
      "/rest/v1/outbound_messages": [first, follow, answer],
      "/rest/v1/outbound_events": [reply],
    },
  });
  await page.goto("/staff/outbound");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Emails waiting for your yes");
  await expect(
    page.getByText("Sending is locked. Test mode: only the test addresses receive mail."),
  ).toBeVisible();
  const card = page.getByRole("article", { name: "Email 1 to Rose Lane Salon" });
  await expect(card.getByText(P.source_page)).toBeVisible();
  await expect(card.getByText(P.detail_used)).toBeVisible();
  await expect(
    card.getByText("Follow-up, day 4 or 5, same thread. Stops on any reply."),
  ).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: "Reply from Harbor Barbers" })
      .getByText("Your answer, ready to send"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /open sending|start sending|unlock/i }),
  ).toHaveCount(0);
  await axeClean(page, "staff outbound");
  await page.screenshot({
    path: `test-results/harvey4a-outbound-${page.viewportSize()!.width}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Approve all 1" }).click();
  await expect
    .poll(() => calls.map((c) => c.path))
    .toContain("/rest/v1/rpc/staff_outbound_approve_all");
  expect(calls.find((c) => c.path.endsWith("approve_all"))!.body).toContain(first.id);
});
