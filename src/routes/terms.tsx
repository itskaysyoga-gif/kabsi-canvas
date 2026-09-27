import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/marketing/legal";
import { CONTACT_EMAIL, CONTACT_PHONE, PRICES, pageHead } from "@/lib/site";

// Terms of service, written to match the system as built (D254). Plain words, no em dashes.
export const Route = createFileRoute("/terms")({
  head: () =>
    pageHead({
      title: "Terms | Kabsi",
      description:
        "Kabsi's terms in plain words: the service, your approval, Google access, prices, refunds, fair use, liability and law.",
      path: "/terms",
    }),
  component: Page,
});

const UPDATED = "26 September 2026";

function Page() {
  return (
    <LegalPage kind="terms" title="Terms" updated={UPDATED}>
      <section>
        <p>
          These terms are the agreement between you and Kabsi, an independent business based in
          Beirut, Lebanon. By creating an account, paying for a plan or activating a card, you
          accept them on behalf of your business. Our <Link to="/privacy">privacy policy</Link>{" "}
          explains how we handle data.
        </p>
      </section>

      <section>
        <h2>1. What Kabsi does</h2>
        <ul>
          <li>
            Emails you each new Google review with a reply drafted in the reviewer's language, and
            lets you post, edit or skip it from email or the app.
          </li>
          <li>
            Drafts Google posts (including an optional weekly draft), checks photos, prepares
            special hours, and watches your listing for changes (Listing Shield) with a one-tap way
            to put your details back.
          </li>
          <li>Sends a weekly report and shows your profile's facts in the app.</li>
          <li>
            Provides a review link, QR code and optional NFC card that open your Google review page
            for every customer.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Your approval is always required</h2>
        <ul>
          <li>
            Nothing is published to your Google Business Profile unless you approve that exact
            content. There is no automatic mode, including for weekly post drafts.
          </li>
          <li>You are responsible for what you approve, as if you had written it yourself.</li>
          <li>
            Google may hold, reject or remove content under its own policies. Kabsi tells you what
            Google reports but can't change Google's decisions.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Who can use Kabsi</h2>
        <ul>
          <li>
            You must be at least 18 and act for a business with a Google Business Profile you're
            allowed to manage.
          </li>
          <li>
            You confirm you have the right to give Kabsi Manager access to that profile, and that
            the information you give us is accurate.
          </li>
          <li>Keep access to your email secure: it's how you sign in.</li>
        </ul>
      </section>

      <section>
        <h2>4. Google access</h2>
        <ul>
          <li>
            You give access by adding hello@kabsi.co as a Manager. You can remove it at any time
            from your profile under People and access, without asking us. The service stops for that
            business until access is back.
          </li>
          <li>
            Kabsi is not part of Google and is not affiliated with, endorsed or sponsored by Google.
          </li>
          <li>
            Kabsi depends on Google's APIs. If Google changes, limits or withdraws them, parts of
            Kabsi may stop working. We'll tell you plainly and, if a paid feature stops for good,
            refund the unused part of your plan.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. AI drafts</h2>
        <p>
          Replies and posts are drafted with AI from your business facts and are checked before they
          reach you, but they can still be wrong or unsuitable. Read each draft before you approve
          it. Keep your business facts in Settings accurate: drafts use only what you write there.
        </p>
      </section>

      <section>
        <h2>6. What we don't promise</h2>
        <ul>
          <li>
            More reviews, better ratings, higher positions on Google Search or Maps, more customers
            or more revenue. Google decides its own results.
          </li>
          <li>
            We can't remove or hide reviews. Only Google can remove reviews that break its policies.
          </li>
          <li>
            Listing Shield alerts you and lets you put your details back. It can't lock your listing
            or stop people suggesting edits to Google.
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Fair use</h2>
        <p>Don't use Kabsi, its cards or links to:</p>
        <ul>
          <li>
            ask only happy customers for reviews, ask for a particular rating, or offer anything in
            exchange for a review or for changing or removing one;
          </li>
          <li>
            post fake, misleading, abusive, discriminatory or illegal content, or anyone's personal
            data;
          </li>
          <li>manage a profile you're not allowed to manage;</li>
          <li>
            break, overload, copy or resell Kabsi, except as a Kabsi partner under a partner
            agreement.
          </li>
        </ul>
        <p>
          These practices break Google's policies and can get a listing penalised. If we see them,
          we may pause or stop the service (see section 12).
        </p>
      </section>

      <section>
        <h2>8. Prices and payment</h2>
        <ul>
          <li>
            Kabsi Pro is ${PRICES.pro6} for 6 months or ${PRICES.pro12} for 12 months, each
            including one NFC card. A card on its own is ${PRICES.card}. Extra cards are $
            {PRICES.extraCard} each or ${PRICES.fiveCards} for five. Prices are in US dollars, paid
            upfront, and the same in every country.
          </li>
          <li>
            You can pay in USDT (TRC20 or Binance Pay) from anywhere, and in Lebanon also by Whish,
            OMT or cash. A payment counts once we've confirmed we received it.
          </li>
          <li>Any bank, exchange or network fees are yours.</li>
          <li>
            We may change prices for future purchases. A plan you've already paid for keeps its
            price.
          </li>
          <li>One plan covers one Google Business Profile.</li>
          <li>
            If a partner signed you up, your price and payment are agreed with that partner. These
            terms still apply to how you use Kabsi.
          </li>
        </ul>
      </section>

      <section>
        <h2>9. When your plan runs</h2>
        <ul>
          <li>
            It starts when your payment is confirmed (or your partner has you on an active plan) and
            Kabsi's access to your Google profile works. Time spent waiting for access doesn't
            count.
          </li>
          <li>
            Paying again before a plan ends adds the new period after the current one. Plans don't
            renew automatically.
          </li>
          <li>
            When a plan ends, reply drafts, posts, Listing Shield and reports stop. Your card and
            review link keep working.
          </li>
        </ul>
      </section>

      <section>
        <h2>10. Refunds</h2>
        <ul>
          <li>
            Kabsi Pro is refundable in full within 14 days of the plan starting. Email{" "}
            {CONTACT_EMAIL}; we refund by the method you paid with where possible.
          </li>
          <li>
            Cards aren't refunded once delivered. A card that's faulty on arrival is replaced free
            if you tell us within 14 days.
          </li>
          <li>Nothing in these terms limits a refund you're entitled to by law.</li>
        </ul>
      </section>

      <section>
        <h2>11. Cards and review links</h2>
        <ul>
          <li>
            A card or link opens your Google review page, the same for every customer. NFC doesn't
            work through metal.
          </li>
          <li>
            They keep working after a plan ends, for as long as Kabsi operates. You can switch any
            of them off in the app.
          </li>
          <li>
            If you delete your business from Kabsi, its links stop working and its cards are
            unlinked.
          </li>
        </ul>
      </section>

      <section>
        <h2>12. Stopping, pausing and deleting</h2>
        <ul>
          <li>
            You can stop at any time: remove Kabsi's Google access, and delete your business in
            Settings if you want your data gone.
          </li>
          <li>
            We may pause or stop the service for a business that breaks section 7, puts others at
            risk, or doesn't pay. When we can, we'll warn you first and explain why. If we stop the
            service without you breaking these terms, we refund the unused part of your plan.
          </li>
        </ul>
      </section>

      <section>
        <h2>13. Your content and ours</h2>
        <ul>
          <li>
            Your business facts, photos and approved texts stay yours. You let Kabsi use them only
            to provide the service to you.
          </li>
          <li>
            Kabsi's software, design and brand belong to Kabsi. Drafts become yours once you approve
            them.
          </li>
        </ul>
      </section>

      <section>
        <h2>14. Availability</h2>
        <p>
          We work to keep Kabsi running and your emails arriving, but we can't guarantee it will
          always be available or error-free. We may improve or change features; if a change removes
          something you pay for, we'll tell you first.
        </p>
      </section>

      <section>
        <h2>15. Liability</h2>
        <ul>
          <li>Kabsi is provided as described here, without other promises.</li>
          <li>
            Our total liability to you is limited to what you paid Kabsi in the 12 months before the
            claim.
          </li>
          <li>
            We're not liable for lost profits or indirect losses, or for what Google or other third
            parties do.
          </li>
          <li>
            None of this limits liability that the law doesn't allow us to limit, such as for fraud.
          </li>
          <li>
            You're responsible for claims caused by content you approve or by breaking section 7.
          </li>
        </ul>
      </section>

      <section>
        <h2>16. Changes to these terms</h2>
        <p>
          If we change these terms in a way that matters, we email account holders at least 14 days
          before the change applies. If you don't agree, you can stop and ask for a refund of the
          unused part of your plan.
        </p>
      </section>

      <section>
        <h2>17. Law and contact</h2>
        <p>
          These terms are governed by the laws of Lebanon, and the courts of Beirut have
          jurisdiction, without taking away any protection the law of your country gives you.
          Questions or complaints: {CONTACT_EMAIL} or {CONTACT_PHONE}. A person replies, and we try
          to settle any problem with you directly first.
        </p>
      </section>
    </LegalPage>
  );
}
