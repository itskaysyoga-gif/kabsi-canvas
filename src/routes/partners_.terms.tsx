import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/marketing/legal";
import { CONTACT_EMAIL, OPERATOR_LINE, OPERATOR_NAME, pageHead } from "@/lib/site";

// Kabsi Partners terms (master plan 29.1, 29.2, 29.4, 29.5; Ops 1 part B). Their own page, linked from the Partners page, the
// terms and the privacy policy. The lawyer reads them with the other terms before the first payout (master plan 29.8).
// The file name partners_.terms.tsx makes /partners/terms its own page and not a child of /partners. No em dashes.
export const Route = createFileRoute("/partners_/terms")({
  head: () =>
    pageHead({
      title: "Kabsi Partners terms | Kabsi",
      description:
        "The terms for Kabsi Partners: the 25 percent commission, the 30 day hold, payouts, how a referral is credited and the rules every partner follows.",
      path: "/partners/terms",
      crumbs: [
        { name: "Partners", path: "/partners" },
        { name: "Partner terms", path: "/partners/terms" },
      ],
    }),
  component: Page,
});

const UPDATED = "26 October 2026";

function Page() {
  return (
    <LegalPage kind="terms" title="Kabsi Partners terms" updated={UPDATED}>
      <section>
        <p>{OPERATOR_LINE}</p>
      </section>

      <section>
        <p>
          These terms are the agreement between you and Kabsi, an independent business operated by{" "}
          {OPERATOR_NAME}, for the Kabsi Partners program. They apply from the day you accept them
          when you apply. Kabsi Partners opens at launch; until then nothing here is paid. The{" "}
          <Link to="/terms">terms of service</Link> and the{" "}
          <Link to="/privacy">privacy policy</Link> apply to everyone who uses Kabsi, partners
          included.
        </p>
      </section>

      <section>
        <h2>1. What the program is</h2>
        <ul>
          <li>
            Kabsi Partners is an affiliate program. You recommend Kabsi to local business owners,
            and Kabsi pays you a share of what the businesses you bring pay. You do not resell
            Kabsi, you do not set prices and you do not run a customer's account.
          </li>
          <li>
            Anyone can apply. Kabsi approves each partner and answers within 2 working days. A
            decline is kind and says why, and you can apply again after 90 days.
          </li>
          <li>
            You are an independent partner, not an employee, agent or representative of Kabsi. You
            cannot sign for Kabsi or promise anything on its behalf.
          </li>
          <li>
            The first 20 partners Kabsi approves are Founding Partners. They get a badge, Kabsi Pro
            free for their own business from day one, a monthly 20 minute call with the founder,
            first look at new features and a say in the partner kit. Their commission is the same as
            everyone's.
          </li>
          <li>
            Kabsi is independent. It is not affiliated with, endorsed by or sponsored by Google, and
            you must never say or suggest otherwise.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Your commission</h2>
        <ul>
          <li>
            You earn 25 percent of the subscription revenue Kabsi collects from a business you
            referred, for as long as that subscription stays paid, extra locations included. One
            rate for everyone.
          </li>
          <li>
            Revenue collected means what Creem, our merchant of record, confirms Kabsi was paid, not
            counting sales tax or VAT, refunds or chargebacks. Trials earn nothing, only payments
            do. Commission stops when the subscription stops being paid.
          </li>
          <li>
            Kabsi keeps its own ledger of payments, refunds and chargebacks, and that ledger is the
            record of what you have earned. You see the same numbers in WhatsApp and on your partner
            page.
          </li>
          <li>
            Kabsi does not promise how much you will earn. It depends on the businesses you bring
            and whether they stay.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Hold and payout</h2>
        <ul>
          <li>
            Each commission line waits 30 days before it can be paid. If the payment is refunded
            during that time, the line is cancelled. If a chargeback comes after a payout, the
            amount comes off your next payout.
          </li>
          <li>
            Each commission line waits 30 days from the payment. Kabsi pays on the 5th of each month
            everyone with 25 US dollars or more cleared. Below 25 dollars, your balance rolls over
            to the next month. Every payout comes with a statement of the lines it pays.
          </li>
          <li>
            You choose how to be paid when your first 25 dollars clears: USDT or USDC sent from
            Kabsi's own wallet, or PayPal. Bank transfer and Wise may come later. Kabsi pays the
            transfer fee. Every payout comes with a WhatsApp message and a PDF statement.
          </li>
          <li>
            Your payout details are kept encrypted and shown only as the last 4 characters. You are
            responsible for the details being right and for any tax you owe on what you earn.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. How a referral is credited</h2>
        <ul>
          <li>
            A referral comes from your partner page, a short link or QR code, a scan you send, a
            link with your code (via=CODE), or a WhatsApp message with "Code P-" and your name. The
            code is written down at the first real action: a scan, a sign-up or a WhatsApp message.
          </li>
          <li>
            A referral counts for 60 days from the first real action. If a person follows more than
            one partner, the last partner before the business signs up counts, and the earlier one
            earns nothing for that business. When the business signs up, the partner is saved on the
            business and never changed afterwards, even if the owner later follows another partner's
            link. Kabsi's own records decide which partner was last.
          </li>
          <li>
            Businesses that come through a partner get a 30 day Pro trial instead of 14 days. There
            are no discount codes and no cash to customers. There is one trial for each Google
            business.
          </li>
          <li>
            A business never pays a partner commission and an owner referral reward at the same
            time: one source for each business.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. The rules every partner follows</h2>
        <ul>
          <li>Say clearly that you are a paid partner on every post and message about Kabsi.</li>
          <li>
            Never say or suggest that Kabsi works with Google, is approved by Google or is a Google
            partner.
          </li>
          <li>
            Never promise rankings, reviews, calls, customers or revenue, and never promise that a
            review will be removed.
          </li>
          <li>
            Never offer anything in exchange for a review, and never suggest asking only happy
            customers for reviews.
          </li>
          <li>
            No bulk or unsolicited WhatsApp, SMS or email. Send Kabsi to people yourself, one to
            one, from your own account.
          </li>
          <li>No advertising that uses the Kabsi name, and no coupon or cashback sites.</li>
          <li>No fake accounts and no referring yourself.</li>
          <li>Use only the claims in the partner kit. If a line is not in the kit, ask first.</li>
          <li>
            Country rules are yours to follow: the advertiser permit in the UAE, the ASA and CAP
            labelling in the UK, the FTC disclosure rules in the US, and the rules of any other
            country you work in.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Fraud, warnings and ending the partnership</h2>
        <ul>
          <li>
            There is no commission on a referral of yourself: when the owner's email, phone or
            WhatsApp number, or Google business matches yours, or the business is one you own or
            run. Kabsi checks this at sign-up and again at every payment.
          </li>
          <li>
            Brand bidding, coupon sites and spam end the partnership. For other breaches Kabsi sends
            one warning that names the exact post. If it happens again, your page is switched off
            and commission you have not been paid is withheld.
          </li>
          <li>
            Any claim of a Google partnership, any incentive for reviews and any spam ends the
            partnership at once.
          </li>
          <li>
            You can leave at any time by sending "Leave the program" on WhatsApp. Your page then
            shows "This page is no longer active". Commission already cleared is still paid on the
            next payout date.
          </li>
          <li>
            Kabsi may change or stop the program. If it changes these terms in a way that matters,
            it tells partners at least 14 days before. Commission earned before the change is paid.
          </li>
        </ul>
      </section>

      <section>
        <h2>7. What you see about the businesses you bring</h2>
        <p>
          You see the trade and area of a business that joined through you, and counts of visits,
          scans, trials, payments and what you earned. You never see its name, reviews or data,
          unless the owner says yes, once, to "Can we tell you they joined?". A cancelled trial
          shows only as a count. A scan you run for a business you know is shown to that business as
          "Prepared for" its name, "shared by" you, and you must only scan businesses for the
          purpose of telling them about Kabsi. How we handle your own data is in section 2 of our{" "}
          <Link to="/privacy">privacy policy</Link>.
        </p>
      </section>

      <section>
        <h2>8. Liability and law</h2>
        <ul>
          <li>
            Kabsi is not liable for lost earnings or indirect losses, and its total liability to you
            is limited to the commission you have earned and not been paid. This does not limit
            liability the law does not allow us to limit, such as for fraud.
          </li>
          <li>
            You are responsible for what you say and post about Kabsi, and for claims caused by
            breaking section 5.
          </li>
          <li>
            These terms are governed by the laws of the United Arab Emirates, and the courts of
            Dubai have jurisdiction, without taking away any protection the law of your country
            gives you.
          </li>
        </ul>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>
          Questions about the program or a payout: {CONTACT_EMAIL}, or "Talk to a person" on
          WhatsApp. A person replies.
        </p>
      </section>
    </LegalPage>
  );
}
