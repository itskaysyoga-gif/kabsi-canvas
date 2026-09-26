import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/marketing/legal";
import { CONTACT_EMAIL, CONTACT_PHONE, PRICES, pageHead } from "@/lib/site";

export const Route = createFileRoute("/terms")({
  head: () =>
    pageHead({
      title: "Terms — Kabsi",
      description:
        "Kabsi's terms in plain words: what we do, what we don't promise, your approval, prices, refunds and fair use.",
      path: "/terms",
    }),
  component: Page,
});

function Page() {
  return (
    <LegalPage title="Terms" updated="26 September 2026">
      <section>
        <h2>What Kabsi is</h2>
        <ul>
          <li>
            A service that emails you each new Google review with a drafted reply, lets you post,
            edit or skip it, watches your listing for changes, and sends a weekly report.
          </li>
          <li>
            Optional tools you approve item by item: Google posts, special hours and photos. And an
            optional NFC + QR card that opens your Google review page.
          </li>
        </ul>
      </section>

      <section>
        <h2>What we don't promise</h2>
        <ul>
          <li>
            More reviews, better ratings, higher search positions, more customers or more revenue.
          </li>
          <li>We can't remove or hide reviews.</li>
          <li>
            Listing Shield alerts you and lets you put your details back. It can't lock your
            listing.
          </li>
          <li>We are not part of Google and are not endorsed by Google.</li>
        </ul>
      </section>

      <section>
        <h2>Your approval is always required</h2>
        <ul>
          <li>
            Nothing is published to your Google Business Profile unless you approve that exact
            content. There is no automatic mode.
          </li>
          <li>You are responsible for what you approve.</li>
        </ul>
      </section>

      <section>
        <h2>Who can use Kabsi</h2>
        <p>
          A business with a verified Google Business Profile it is allowed to manage. You confirm
          you have the right to give Kabsi Manager access.
        </p>
      </section>

      <section>
        <h2>Prices and payment</h2>
        <ul>
          <li>
            Kabsi Pro ${PRICES.pro6} for 6 months or ${PRICES.pro12} for 12 months, each including
            one card. Card only ${PRICES.card}. Extra cards ${PRICES.extraCard} each, or $
            {PRICES.fiveCards} for five. Prices are in US dollars and paid upfront.
          </li>
          <li>
            Payment in USDT (TRC20 or Binance Pay) from anywhere; in Lebanon also Whish, OMT or
            cash. One plan per Google profile.
          </li>
          <li>
            Through a partner: your price and payment are agreed with your partner. Kabsi's terms on
            approvals, data and conduct still apply.
          </li>
        </ul>
      </section>

      <section>
        <h2>When your plan runs</h2>
        <ul>
          <li>
            It starts when payment is confirmed (or your partner has you on an active plan) and
            Kabsi's access to your Google profile works. Time spent waiting for access doesn't
            count.
          </li>
          <li>Paying again before it ends adds the new period after the current one.</li>
          <li>When it ends, the service stops. The card keeps working.</li>
        </ul>
      </section>

      <section>
        <h2>Refunds</h2>
        <p>
          Kabsi Pro is refundable in full within 14 days of the plan starting. Cards aren't
          refunded.
        </p>
      </section>

      <section>
        <h2>The card</h2>
        <p>
          It's yours. NFC doesn't work through metal. A card that's faulty on arrival is replaced.
        </p>
      </section>

      <section>
        <h2>Fair use</h2>
        <ul>
          <li>
            Don't use Kabsi to ask customers for a particular rating, offer anything in exchange for
            reviews, or publish abusive, dishonest or illegal content.
          </li>
          <li>
            These can get your listing penalised by Google, and we will stop the service if we see
            them.
          </li>
        </ul>
      </section>

      <section>
        <h2>Things outside our control</h2>
        <ul>
          <li>
            Kabsi depends on Google's APIs and on email delivery. If Google changes or withdraws a
            service, parts of Kabsi may stop working, and we'll tell you plainly.
          </li>
          <li>Our liability is limited to what you paid Kabsi in the last 12 months.</li>
        </ul>
      </section>

      <section>
        <h2>Law and contact</h2>
        <p>
          Lebanese law. {CONTACT_EMAIL} · {CONTACT_PHONE}.
        </p>
      </section>
    </LegalPage>
  );
}
