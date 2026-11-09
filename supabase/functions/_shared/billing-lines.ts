// The staff phone's line for a new paying customer or a cancellation (master plan 9.9). Pure, so a test can read it.
import { possessive } from "./possessive.ts";
import { esc } from "./email-layout.ts";
import type { EmailContent } from "./email/template.ts";
import { paymentFailed, planCancelled } from "./email/account-copy.ts";
import { ACCOUNT_STAYS_LINE, PAY_TODAY_LINE } from "./billing-words.ts";

export type Message = "scheduled_cancel" | "payment_failed" | "paused" | "ended" | "resumed";
const longDate = (d: Date | string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(d));


export function staffPlanLine(p: { paid: boolean; message: string | null; business: string; plan: string; endDate: string | null }): string {
  if (p.paid) return `New paying customer: ${p.business} on ${p.plan === "essentials" ? "Essentials" : "Pro"}`;
  if (p.message === "ended") return `${possessive(p.business)} plan has ended`;
  return `${p.business} cancelled; the plan ends on ${p.endDate ?? "its renewal date"}`;
}

// Sync 2a (EML-12): the billing messages live here, pure, so the email previews show them; billing.ts calls billingLineAt with APP_URL.
export type Line = { whatsapp: string; buttons?: { id: string; title: string }[]; email?: EmailContent };
const para = (t: string) => `<p style="margin:0 0 16px 0;">${esc(t)}</p>`;
function emailOf(subject: string, title: string, lines: string[], button?: { label: string; url: string }): EmailContent {
  return { subject, title, preheader: lines[0], bodyHtml: lines.map(para).join(""), text: lines.join("\n\n") + (button ? `\n\n${button.label}: ${button.url}` : ""), button };
}

/** The words of each billing message (10.2.9). Pure, so tests read them. */
export function billingLineAt(m: Message | "payment_reminder", c: { business: string; periodEnd?: string | null; graceEnds?: Date; portal?: string | null }, appUrl: string): Line {
  const end = c.periodEnd ? longDate(c.periodEnd) : null;
  switch (m) {
    case "scheduled_cancel": {
      const lines = [`Your Kabsi plan for ${c.business} ends on ${end ?? "the last day you paid for"}.`, "Until then everything keeps working. Changed your mind? Tap Keep my plan."];
      // Email 1: the cancellation email of 30.15 section 6 (COPY.md 25).
      return { whatsapp: lines.join(" "), buttons: [{ id: "k:keep", title: "Keep my plan" }], email: planCancelled({ business: c.business, ends: c.periodEnd ?? null }, appUrl) };
    }
    case "payment_failed":
    case "payment_reminder": {
      const until = c.graceEnds ? longDate(c.graceEnds) : null;
      const lines = [`${c.business}: your card did not go through. Update it here: ${c.portal ?? `${appUrl}/app/plan`}`, `Kabsi keeps working until ${until ?? "the grace period ends"}.`];
      // Email 1: the failed-payment email of 30.15 section 6 (COPY.md 25).
      const email = paymentFailed({ business: c.business, graceEnds: c.graceEnds ?? null, portal: c.portal ?? `${appUrl}/app/plan`, reminder: m === "payment_reminder" });
      return { whatsapp: (m === "payment_reminder" ? "Reminder. " : "") + lines.join("\n"), email };
    }
    case "paused": {
      // Sync 2a (R-142 item 3): no 30 day deletion promise (no code deletes anything on a timer) and no push to pay while cards are closed.
      const lines = [`Your Kabsi plan for ${c.business} is paused. Approvals have stopped and nothing is lost.`, ACCOUNT_STAYS_LINE, PAY_TODAY_LINE];
      return { whatsapp: lines.join(" "), email: emailOf(`${c.business}: your Kabsi plan is paused`, "Your plan is paused", lines, { label: "Open Kabsi", url: `${appUrl}/app/plan` }) };
    }
    case "ended": {
      const lines = [`Your Kabsi plan for ${c.business} has ended. Thank you for trusting Kabsi with your Google profile.`, ACCOUNT_STAYS_LINE, PAY_TODAY_LINE];
      return { whatsapp: lines.join(" "), email: emailOf(`${c.business}: your Kabsi plan has ended`, "Your plan has ended", lines, { label: "Open Kabsi", url: `${appUrl}/app/plan` }) };
    }
    case "resumed": {
      const lines = [`Your Kabsi plan for ${c.business} carries on.${end ? ` The next payment is on ${end}.` : ""}`];
      return { whatsapp: lines[0] };
    }
  }
}

