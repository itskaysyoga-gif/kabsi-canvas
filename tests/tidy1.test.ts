// Tidy 1 (R-143, master plan 30.47). Item 3: card checkout is offered only to a business whose Google access works, and the
// terms no longer say a plan paid before access works starts the day it works. The decision itself is tested in
// supabase/functions/_shared/billing-access.test.ts (Deno); here the checkout is held to call it before anything is created.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(f, "utf8");

describe("Tidy 1 item 3: checkout only once Google access works", () => {
  const billing = read("supabase/functions/_shared/billing.ts");
  const start = billing.indexOf("export async function startCheckout");
  const end = billing.indexOf("export async function portal");
  const body = billing.slice(start, end);

  it("startCheckout refuses before it reads a price family, takes a founding place or asks Creem for a checkout", () => {
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const guard = body.indexOf("accessWorks(await accessRows(org))");
    expect(guard).toBeGreaterThan(-1);
    expect(body).toContain('new BillingError("access_not_working", ACCESS_FIRST_LINE)');
    for (const later of ["billing_checkout_family", "createCheckout", "currentSub(", "productIds("])
      expect(body.indexOf(later), later).toBeGreaterThan(guard);
    // plans closed still comes first: a closed checkout never reads Google facts
    expect(body.indexOf("checkoutOpen(org)")).toBeLessThan(guard);
  });

  it("is the only place a plan checkout is created", () => {
    const creates = billing.match(/createCheckout\(/g) ?? [];
    // one for the plan (startCheckout) and one for an extra location, which needs a running plan (addLocation, mustRun)
    expect(creates.length).toBe(2);
    expect(billing.slice(billing.indexOf("export async function addLocation"))).toContain("mustRun(org)");
  });

  it("the Plan page keeps the choose buttons off until access works and says why", () => {
    const plan = read("src/routes/_authenticated/app/plan.tsx");
    expect(plan).toContain('const accessNow = sum.tier !== "none"');
    expect(plan).toContain("const open = !!sum.checkout_open && accessNow");
    expect(plan).toContain("PLAN_COPY.afterAccess");
    expect(read("src/lib/plans.ts")).toContain("You can choose a plan once Kabsi's access works.");
  });

  it("the terms and the facts no longer say a plan paid before access works starts the day it works", () => {
    const terms = read("src/routes/terms.tsx");
    expect(terms).not.toMatch(/If you pay before Kabsi's access/);
    expect(terms).not.toMatch(/starts the day\s+it works/);
    const facts = read("knowledge/facts/06-pricing-and-payment.md");
    expect(facts).not.toMatch(/If you pay before access works/);
    expect(facts).toContain("Card checkout is offered only to a business whose Google access works");
    for (const f of ["knowledge/kabsi-facts.md", "public/llms-full.txt"])
      expect(read(f), f).toContain("Card checkout is offered only to a business whose Google access works");
  });

  it("the lines carry no dash or exclamation mark", () => {
    expect(read("src/lib/plans.ts")).not.toMatch(/afterAccess:.*[–—!]/);
  });
});
