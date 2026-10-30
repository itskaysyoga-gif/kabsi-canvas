import { describe, expect, it } from "vitest";
import {
  CATALOGUE,
  checkoutRequestId,
  creemClient,
  type CreemEvent,
  type CreemProduct,
  effectOf,
  eventModeOf,
  eventTime,
  hmacHex,
  isStale,
  ledgerOf,
  orgOf,
  parseEvent,
  patchFor,
  PRODUCT_DESCRIPTION,
  PRODUCT_KEYS,
  type ProductIds,
  sameMode,
  scrubEvent,
  setupPlan,
  signatureProblem,
  subFacts,
} from "../supabase/functions/_shared/creem";

// Session 10 (master plan section 10, R-67, 10.2.12): the signature, the replay guard, every event row of 10.2.9,
// the setup plan, the repeated checkout tap and the scheduled cancel and resume calls. The database side (one row
// per event id, entitlements per state, founding places) is supabase/tests/billing.sql.

const ORG = "91057eba-c703-4269-94db-97dba9b98f96";
const IDS: ProductIds = {
  essentials_month: "prod_em",
  essentials_year: "prod_ey",
  pro_month: "prod_pm",
  pro_year: "prod_py",
  extra_month: "prod_xm",
  extra_year: "prod_xy",
};
const NOW = new Date("2026-10-25T12:00:00Z");
const sub = (over: Record<string, unknown> = {}) => ({
  id: "sub_1",
  object: "subscription",
  product: { id: "prod_pm", price: 3900, currency: "USD" },
  customer: { id: "cust_1", object: "customer", email: "owner@example.com", name: "Owner Name" },
  items: [{ id: "item_main", product_id: "prod_pm", units: 1 }],
  status: "active",
  current_period_start_date: "2026-10-25T12:00:00Z",
  current_period_end_date: "2026-11-25T12:00:00Z",
  metadata: { referenceId: ORG, business_id: "loc" },
  mode: "test",
  last_transaction: { id: "tran_1", amount: 3900, currency: "USD" },
  ...over,
});
const ev = (
  eventType: string,
  object: Record<string, unknown>,
  created = NOW.getTime() - 60_000,
): CreemEvent => ({ id: `evt_${eventType}`, eventType, created_at: created, object });

describe("the webhook signature", () => {
  const body = JSON.stringify(ev("subscription.paid", sub()));
  it("accepts the hex HMAC-SHA256 of the raw body with the secret", async () => {
    const sig = await hmacHex("whsec_test", body);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
    expect(await signatureProblem(body, sig, "whsec_test")).toBeNull();
    expect(await signatureProblem(body, sig.toUpperCase(), "whsec_test")).toBeNull();
  });
  it("refuses a missing signature", async () => {
    expect(await signatureProblem(body, null, "whsec_test")).toBe("missing");
    expect(await signatureProblem(body, "", "whsec_test")).toBe("missing");
  });
  it("refuses a wrong signature, a changed body and a short guess", async () => {
    const sig = await hmacHex("whsec_test", body);
    expect(
      await signatureProblem(body, sig.replace(/.$/, sig.endsWith("0") ? "1" : "0"), "whsec_test"),
    ).toBe("wrong");
    expect(await signatureProblem(body + " ", sig, "whsec_test")).toBe("wrong");
    expect(await signatureProblem(body, "abc", "whsec_test")).toBe("wrong");
  });
  it("refuses an event signed with the other mode's secret, and anything when no secret is set", async () => {
    const live = await hmacHex("whsec_live", body);
    expect(await signatureProblem(body, live, "whsec_test")).toBe("wrong");
    expect(await signatureProblem(body, live, "")).toBe("wrong");
  });
});

describe("reading an event", () => {
  it("parses a Creem event and refuses anything else", () => {
    expect(parseEvent(JSON.stringify(ev("subscription.paid", sub())))?.eventType).toBe(
      "subscription.paid",
    );
    expect(parseEvent("not json")).toBeNull();
    expect(parseEvent(JSON.stringify({ eventType: "x", object: {} }))).toBeNull();
  });
  it("reads milliseconds, seconds and ISO times", () => {
    expect(eventTime({ created_at: 1728734325927 })?.toISOString()).toBe(
      "2024-10-12T11:58:45.927Z",
    );
    expect(eventTime({ created_at: 1728734325 })?.toISOString()).toBe("2024-10-12T11:58:45.000Z");
    expect(eventTime({ created_at: "2024-10-12T11:58:45Z" })?.toISOString()).toBe(
      "2024-10-12T11:58:45.000Z",
    );
  });
  it("refuses an event older than 3 days or with no time (the replay guard)", () => {
    expect(isStale(ev("subscription.paid", sub(), NOW.getTime() - 2 * 86_400_000), NOW)).toBe(
      false,
    );
    expect(
      isStale(ev("subscription.paid", sub(), NOW.getTime() - 3 * 86_400_000 - 1000), NOW),
    ).toBe(true);
    expect(isStale({ ...ev("subscription.paid", sub()), created_at: "" }, NOW)).toBe(true);
  });
  it("finds the business in metadata.referenceId, on the subscription or the checkout", () => {
    expect(orgOf(ev("subscription.paid", sub()))).toBe(ORG);
    expect(
      orgOf(
        ev("checkout.completed", {
          object: "checkout",
          metadata: { referenceId: ORG },
          subscription: { id: "sub_1" },
        }),
      ),
    ).toBe(ORG);
    expect(
      orgOf(
        ev("refund.created", {
          object: "refund",
          subscription: { id: "sub_1", metadata: { referenceId: ORG } },
        }),
      ),
    ).toBe(ORG);
    expect(
      orgOf(ev("subscription.paid", sub({ metadata: { referenceId: "not-a-uuid" } }))),
    ).toBeNull();
  });
  it("keeps the ledger facts and drops the customer's name and email", () => {
    const e = ev("subscription.paid", sub());
    expect(ledgerOf(e)).toMatchObject({
      subscriptionId: "sub_1",
      customerId: "cust_1",
      paymentId: "tran_1",
      amount: 3900,
      currency: "USD",
      mode: "test",
    });
    const refund = ev("refund.created", {
      object: "refund",
      refund_amount: 1900,
      refund_currency: "usd",
      transaction: { id: "tran_2", subscription: "sub_1" },
      subscription: { id: "sub_1" },
    });
    expect(ledgerOf(refund)).toMatchObject({
      amount: 1900,
      currency: "USD",
      subscriptionId: "sub_1",
    });
    const clean = JSON.stringify(scrubEvent(e));
    expect(clean).not.toContain("owner@example.com");
    expect(clean).not.toContain("Owner Name");
    expect(clean).toContain("cust_1");
  });
});

describe("Creem's mode on an event (Billing 2)", () => {
  // Creem's API reference names the event mode EnvironmentMode: test, prod or sandbox. A live event that says "prod" (the
  // documented value) or "live" must be applied at the live endpoint, or the first live payment is kept and never applied.
  it("reads Creem's documented live value, prod, as live", () => {
    expect(eventModeOf("prod")).toBe("live");
    expect(sameMode("prod", "live")).toBe(true);
    expect(sameMode("prod", "test")).toBe(false);
  });
  it("reads live and production as live too", () => {
    expect(sameMode("live", "live")).toBe(true);
    expect(sameMode("production", "live")).toBe(true);
    expect(sameMode("LIVE", "live")).toBe(true);
    expect(sameMode("live", "test")).toBe(false);
  });
  it("reads test, sandbox and local as test", () => {
    for (const m of ["test", "sandbox", "local"]) {
      expect(sameMode(m, "test")).toBe(true);
      expect(sameMode(m, "live")).toBe(false);
    }
  });
  it("an event with no mode belongs to the endpoint; an unknown word belongs to neither", () => {
    expect(sameMode(null, "live")).toBe(true);
    expect(sameMode("", "test")).toBe(true);
    expect(sameMode("staging", "live")).toBe(false);
    expect(sameMode("staging", "test")).toBe(false);
  });
});

describe("extra locations (Billing 2, 10.2.3)", () => {
  const extra = (over: Record<string, unknown> = {}) =>
    sub({
      id: "sub_x1",
      product: { id: "prod_xm", price: 1500, currency: "USD" },
      items: [{ id: "item_x", product_id: "prod_xm", units: 1 }],
      last_transaction: { id: "tran_x1", amount: 1500, currency: "USD" },
      ...over,
    });
  it("an Extra location subscription is read as an extra, never as a plan", () => {
    const f = subFacts(extra(), IDS);
    expect(f).toMatchObject({
      extra: true,
      plan: null,
      period: "month",
      units: 1,
      customerId: "cust_1",
    });
    expect(subFacts(sub(), IDS).extra).toBe(false);
    // A checkout names the product by id only.
    expect(subFacts({ id: "sub_x1", product: "prod_xy", customer: "cust_1" }, IDS)).toMatchObject({
      extra: true,
      period: "year",
    });
  });
  it("its payment, renewal and cancel follow the event table like a plan", () => {
    expect(effectOf(ev("subscription.paid", extra()), IDS).write).toMatchObject({
      state: "active",
    });
    expect(effectOf(ev("subscription.paid", extra()), IDS).write?.plan).toBeUndefined();
    expect(effectOf(ev("subscription.canceled", extra()), IDS).write).toMatchObject({
      state: "cancelled",
      ended: true,
    });
  });
  it("the ledger keeps what was collected for it, before tax", () => {
    expect(ledgerOf(ev("subscription.paid", extra()))).toMatchObject({
      amount: 1500,
      paymentId: "tran_x1",
    });
  });
  it("with no transaction in the event, the amount is the price times its units", () => {
    const e = ev(
      "subscription.paid",
      extra({
        last_transaction: undefined,
        items: [{ id: "item_x", product_id: "prod_xm", units: 2 }],
      }),
    );
    expect(ledgerOf(e).amount).toBe(3000);
    expect(
      ledgerOf(ev("subscription.paid", sub({ last_transaction: undefined, items: [] }))).amount,
    ).toBe(3900);
  });
});

describe("event to state (10.2.9)", () => {
  it("checkout.completed links the subscription and changes no access", () => {
    const f = effectOf(
      ev("checkout.completed", {
        object: "checkout",
        request_id: "r",
        subscription: sub(),
        customer: { id: "cust_1" },
        metadata: { referenceId: ORG },
      }),
      IDS,
    );
    expect(f.write).toMatchObject({
      link: true,
      state: "incomplete",
      plan: "pro",
      period: "month",
    });
    expect(f.paid).toBe(false);
  });
  it("subscription.active and subscription.paid: paid, period end recorded, the failed payment cleared", () => {
    for (const t of ["subscription.active", "subscription.paid"]) {
      const f = effectOf(ev(t, sub()), IDS);
      expect(f.write).toMatchObject({
        state: "active",
        plan: "pro",
        period: "month",
        periodEnd: "2026-11-25T12:00:00Z",
        pastDue: "clear",
        cancelAtPeriodEnd: false,
      });
    }
    expect(effectOf(ev("subscription.paid", sub()), IDS).paid).toBe(true);
    expect(effectOf(ev("subscription.active", sub()), IDS).paid).toBe(false);
  });
  it("subscription.update records plan, interval and units (extra locations)", () => {
    const s = sub({
      product: { id: "prod_ey" },
      items: [
        { id: "i1", product_id: "prod_ey", units: 1 },
        { id: "i2", product_id: "prod_xy", units: 2 },
      ],
    });
    const f = effectOf(ev("subscription.update", s), IDS);
    expect(f.write).toMatchObject({ plan: "essentials", period: "year", units: 2 });
    expect(f.write?.state).toBeUndefined();
    expect(subFacts(s, IDS).extraItemId).toBe("i2");
  });
  it("subscription.scheduled_cancel stays paid until the period end and asks Keep my plan", () => {
    const f = effectOf(
      ev("subscription.scheduled_cancel", sub({ status: "scheduled_cancel" })),
      IDS,
    );
    expect(f.write).toEqual({ cancelAtPeriodEnd: true, periodEnd: "2026-11-25T12:00:00Z" });
    expect(f.message).toBe("scheduled_cancel");
  });
  it("subscription.past_due and subscription.unpaid start the 7-day grace and tell the owner", () => {
    for (const t of ["subscription.past_due", "subscription.unpaid"]) {
      const f = effectOf(ev(t, sub({ status: "past_due" })), IDS);
      expect(f.write).toMatchObject({ state: "past_due", pastDue: "start" });
      expect(f.message).toBe("payment_failed");
    }
  });
  it("subscription.paused and subscription.expired pause; subscription.canceled ends", () => {
    expect(effectOf(ev("subscription.paused", sub()), IDS)).toMatchObject({
      write: { state: "paused" },
      message: "paused",
    });
    expect(effectOf(ev("subscription.expired", sub()), IDS)).toMatchObject({
      write: { state: "expired", ended: true },
      message: "paused",
    });
    expect(effectOf(ev("subscription.canceled", sub()), IDS)).toMatchObject({
      write: { state: "cancelled", ended: true },
      message: "ended",
    });
  });
  it("refunds, disputes and a trialing event alert staff and change no state", () => {
    expect(effectOf(ev("refund.created", { object: "refund" }), IDS)).toMatchObject({
      write: null,
      alert: "refund",
    });
    expect(effectOf(ev("dispute.created", { object: "dispute" }), IDS)).toMatchObject({
      write: null,
      alert: "dispute",
    });
    expect(effectOf(ev("subscription.trialing", sub()), IDS)).toMatchObject({
      write: null,
      alert: "trialing",
    });
    expect(effectOf(ev("something.else", {}), IDS)).toMatchObject({
      write: null,
      alert: null,
      message: null,
    });
  });
});

describe("two events for one payment (QA 1, 25 Oct 2026)", () => {
  // Creem sends checkout.completed and subscription.paid within a second; two workers can take them together, and the one that
  // loses the insert applies its changes to the winner's row. Whichever order they land in, the paid state must be the result.
  const apply = (events: CreemEvent[]) => {
    let row: { state: string; past_due_at: string | null } | null = null;
    for (const e of events) {
      const w = effectOf(e, IDS).write!;
      const patch = patchFor(w, subFacts(sub(), IDS), e.eventType, row, new Date(e.created_at));
      row = {
        state: String(patch.state ?? row?.state ?? "incomplete"),
        past_due_at: (patch.past_due_at as string | null | undefined) ?? row?.past_due_at ?? null,
      };
    }
    return row!.state;
  };
  const checkout = ev(
    "checkout.completed",
    { object: "checkout", status: "completed", subscription: sub(), units: 1 },
    NOW.getTime() - 1000,
  );
  const paid = ev("subscription.paid", sub(), NOW.getTime() - 2000);
  it("is active when the paid event lands first, or second", () => {
    expect(apply([paid, checkout])).toBe("active");
    expect(apply([checkout, paid])).toBe("active");
  });
  it("a checkout alone is incomplete, and never moves an active plan back", () => {
    expect(apply([checkout])).toBe("incomplete");
    expect(
      patchFor(
        effectOf(checkout, IDS).write!,
        subFacts(sub(), IDS),
        "checkout.completed",
        { state: "active", past_due_at: null },
        NOW,
      ),
    ).not.toHaveProperty("state");
  });
});

describe("the products (10.2.3)", () => {
  it("are the six Kabsi products in cents, US dollars, with the copy of section 23", () => {
    expect(PRODUCT_KEYS.map((k) => CATALOGUE[k].price)).toEqual([
      1900, 19000, 3900, 39000, 1500, 15000,
    ]);
    expect(CATALOGUE.pro_year.name).toBe("Kabsi Pro, yearly");
    expect(PRODUCT_DESCRIPTION).toBe(
      "Your Google listing and reviews, managed from WhatsApp. Cancel in WhatsApp any time.",
    );
  });
  it("reuses exact matches, renames them, creates the rest and lists the others, never deleting", () => {
    const made: CreemProduct[] = [
      {
        id: "a",
        name: "Essentials",
        price: 1900,
        currency: "USD",
        billing_type: "recurring",
        billing_period: "every-month",
        status: "active",
      },
      {
        id: "b",
        name: "Essentials yearly",
        price: 19000,
        currency: "USD",
        billing_type: "recurring",
        billing_period: "every-year",
        status: "active",
      },
      {
        id: "c",
        name: "Kabsi Pro, monthly",
        description: PRODUCT_DESCRIPTION,
        price: 3900,
        currency: "USD",
        billing_type: "recurring",
        billing_period: "every-month",
        status: "active",
      },
      {
        id: "d",
        name: "Something",
        price: 4900,
        currency: "USD",
        billing_type: "recurring",
        billing_period: "every-month",
        status: "active",
      },
      {
        id: "e",
        name: "Pro trial",
        price: 3900,
        currency: "USD",
        billing_type: "recurring",
        billing_period: "every-month",
        status: "active",
        trial_period_days: 14,
      },
    ];
    const p = setupPlan(made);
    expect(p.reuse).toEqual([
      { key: "essentials_month", id: "a", rename: true },
      { key: "essentials_year", id: "b", rename: true },
      { key: "pro_month", id: "c", rename: false },
    ]);
    expect(p.create).toEqual(["pro_year", "extra_month", "extra_year"]);
    expect(p.unmatched.map((u) => u.id)).toEqual(["d", "e"]);
  });
});

describe("the client", () => {
  const fake = () => {
    const calls: { url: string; method: string; body: unknown; key: string | null }[] = [];
    const f = async (url: string, init: RequestInit) => {
      calls.push({
        url,
        method: String(init.method),
        body: init.body ? JSON.parse(String(init.body)) : null,
        key: new Headers(init.headers).get("x-api-key"),
      });
      return new Response(
        JSON.stringify({
          id: "x",
          checkout_url: "https://checkout",
          customer_portal_link: "https://portal",
          items: [],
        }),
        { status: 200 },
      );
    };
    return { calls, f };
  };
  it("uses the test base URL in test mode and sends the key only in x-api-key", async () => {
    const { calls, f } = fake();
    await creemClient("creem_test_x", "test", f).portalLink("cust_1");
    expect(calls[0]).toMatchObject({
      url: "https://test-api.creem.io/v1/customers/billing",
      method: "POST",
      body: { customer_id: "cust_1" },
      key: "creem_test_x",
    });
    await creemClient("k", "live", f).portalLink("cust_1");
    expect(calls[1].url).toBe("https://api.creem.io/v1/customers/billing");
  });
  it("cancels at the period end, never at once, and resumes", async () => {
    const { calls, f } = fake();
    const c = creemClient("k", "test", f);
    await c.cancelAtPeriodEnd("sub_1");
    await c.resume("sub_1");
    expect(calls[0]).toMatchObject({
      url: "https://test-api.creem.io/v1/subscriptions/sub_1/cancel",
      body: { mode: "scheduled", onExecute: "cancel" },
    });
    expect(calls[1]).toMatchObject({
      url: "https://test-api.creem.io/v1/subscriptions/sub_1/resume",
      method: "POST",
    });
  });
  // Price 1 (master plan 30.20 section 4): Kabsi's own Cancel is scheduled and keeps access to the period end; a portal
  // cancellation arrives as subscription.canceled and ends access at once.
  it("tells Kabsi's scheduled cancel apart from a portal cancel", async () => {
    const { calls, f } = fake();
    await creemClient("k", "live", f).cancelAtPeriodEnd("sub_1");
    expect(calls[0]!.body).toEqual({ mode: "scheduled", onExecute: "cancel" });
    const scheduled = effectOf(
      ev("subscription.scheduled_cancel", sub({ status: "scheduled_cancel" })),
      IDS,
    );
    expect(scheduled.write).toMatchObject({ cancelAtPeriodEnd: true });
    expect(scheduled.write).not.toHaveProperty("state");
    expect(scheduled.write).not.toHaveProperty("ended");
    const portal = effectOf(ev("subscription.canceled", sub({ status: "canceled" })), IDS);
    expect(portal.write).toMatchObject({ state: "cancelled", ended: true });
    expect(portal.message).toBe("ended");
  });
  it("upgrades with the charge now", async () => {
    const { calls, f } = fake();
    const c = creemClient("k", "test", f);
    await c.upgrade("sub_1", "prod_pm", "proration-charge-immediately");
    expect(calls[0].body).toEqual({
      product_id: "prod_pm",
      update_behavior: "proration-charge-immediately",
    });
    // Billing 2: Creem refuses to add an item to a subscription, so the client has no call for it.
    expect("setItems" in c).toBe(false);
  });
  it("an extra location is a second checkout on the same Creem customer, by id", async () => {
    const { calls, f } = fake();
    await creemClient("k", "test", f).createCheckout({
      productId: "prod_xm",
      requestId: "r2",
      successUrl: "https://kabsi.co/billing/done",
      email: "o@example.com",
      customerId: "cust_1",
      metadata: { referenceId: ORG, business_id: "loc", kind: "extra_location" },
    });
    expect(calls[0].url).toBe("https://test-api.creem.io/v1/checkouts");
    expect(calls[0].body).toEqual({
      product_id: "prod_xm",
      units: 1,
      request_id: "r2",
      success_url: "https://kabsi.co/billing/done",
      customer: { id: "cust_1" },
      metadata: { referenceId: ORG, business_id: "loc", kind: "extra_location" },
    });
  });
  it("sends the checkout with Kabsi's request id and the business in metadata", async () => {
    const { calls, f } = fake();
    await creemClient("k", "test", f).createCheckout({
      productId: "prod_pm",
      requestId: "r1",
      successUrl: "https://kabsi.co/billing/done",
      email: "o@example.com",
      metadata: { referenceId: ORG, business_id: "loc" },
    });
    expect(calls[0].body).toEqual({
      product_id: "prod_pm",
      units: 1,
      request_id: "r1",
      success_url: "https://kabsi.co/billing/done",
      customer: { email: "o@example.com" },
      metadata: { referenceId: ORG, business_id: "loc" },
    });
  });
  it("the second extra location of the day gets its own request id", () => {
    expect(checkoutRequestId(ORG, "extra_month", 2, NOW)).not.toBe(
      checkoutRequestId(ORG, "extra_month", 1, NOW),
    );
  });
  it("a repeated tap the same day makes the same request id", () => {
    const a = checkoutRequestId(ORG, "pro_month", 1, NOW);
    expect(checkoutRequestId(ORG, "pro_month", 1, new Date("2026-10-25T23:59:00Z"))).toBe(a);
    expect(checkoutRequestId(ORG, "pro_year", 1, NOW)).not.toBe(a);
  });
});
