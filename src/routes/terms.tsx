import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/marketing/legal";
import {
  CONTACT_EMAIL,
  KABSI_GROUP_ID,
  KABSI_GROUP_NAME,
  LEGAL_SELLER,
  OPERATOR_LINE,
  PLAN_PRICES,
  WHATSAPP_NUMBER,
  WHATSAPP_ON,
  pageHead,
} from "@/lib/site";

// Terms of service, written to match the system as built (D254). Plain words, no em dashes.
export const Route = createFileRoute("/terms")({
  head: () =>
    pageHead({
      title: "Terms of service | Kabsi",
      description:
        "Kabsi's terms in plain words: the service, your approval, Google access, prices, refunds, fair use, liability and law.",
      path: "/terms",
      crumbs: [{ name: "Terms of service", path: "/terms" }],
    }),
  component: Page,
});

const UPDATED = "21 October 2026";

function Page() {
  return (
    <LegalPage kind="terms" title="Terms" updated={UPDATED}>
      <section>
        <p>{OPERATOR_LINE}</p>
      </section>

      <section>
        <p>
          These terms are the agreement between you and Kabsi, an independent business run by{" "}
          {LEGAL_SELLER}, who is the seller. By creating an account or paying for a plan, you accept
          them on behalf of your business. Our <Link to="/privacy">privacy policy</Link> explains
          how we handle data.
        </p>
      </section>

      <section>
        <h2>1. What Kabsi does</h2>
        <ul>
          <li>
            Helps you keep your information on Google accurate and complete, with a short list of
            suggested improvements marked Urgent, Recommended or Nice to have, each with a ready
            draft where Kabsi can write one. Kabsi does not give your profile a score.
          </li>
          <li>
            Emails you each new Google review with a reply drafted in the reviewer's language, and
            lets you approve, edit or skip it from email or the app.
          </li>
          <li>
            Drafts Google posts, checks photos, prepares special hours, and watches your listing for
            changes (Google Protection). When something changes, you choose: Google is right, or
            Keep my information.
          </li>
          <li>Sends the Weekly Care Report and shows your profile's facts in the app.</li>
          <li>
            Provides a review link and a QR code that open your Google review page for every
            customer. They work with your own QR codes and NFC cards. Kabsi sells no cards.
          </li>
          <li>
            Answers questions and helps you fill in your business facts through Nora, an AI
            assistant.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Your approval is always required</h2>
        <ul>
          <li>
            Nothing is published to or changed on your Google Business Profile unless you approve
            that exact content. There is no automatic mode, including for post drafts and suggested
            improvements.
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
            You must be at least 18 and act for a business with a verified Google Business Profile
            you're allowed to manage.
          </li>
          <li>
            The business must be eligible for a Google Business Profile under Google's guidelines:
            it makes in-person contact with customers during stated hours, or it is a service-area
            business that travels to customers. Online-only businesses, rental or for-sale
            properties, PO boxes and virtual offices used as an address, and other cases Google
            lists as not eligible can't use Kabsi. If Google's guidelines say a profile is not
            allowed, we may pause the service for it.
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
            You give access by inviting the Kabsi business group ({KABSI_GROUP_NAME}, ID{" "}
            {KABSI_GROUP_ID}) as a Manager. When Kabsi accepts, we email you within 48 hours to say
            what changed and how to remove Kabsi.
          </li>
          <li>
            You can disconnect Kabsi at any time, without asking us: in Kabsi under Settings, choose{" "}
            <b>Disconnect Kabsi from Google</b>, or remove the group from your profile under People
            and access. Kabsi then removes its own Manager access and emails you a confirmation; if
            Google does not let it, our team removes it within 7 business days of your request. The
            service stops for that business until access is back. Disconnecting does not change your
            ownership of the profile, and cancelling a plan does not remove Kabsi's access by
            itself: disconnecting is a separate step you choose.
          </li>
          <li>
            Kabsi is not part of Google. It is not affiliated with, endorsed or sponsored by Google,
            and Google does not partner with Kabsi.
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
          Replies, posts, photo notes, suggested improvements and Nora's answers are written with AI
          from your business facts and are checked before they reach you, but they can still be
          wrong or unsuitable. Read each draft before you approve it. Keep your business facts in
          Settings accurate: drafts use only what you write there.
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
            Google Protection alerts you and lets you keep your information if you choose. It can't
            lock your listing or stop people suggesting edits to Google.
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Fair use</h2>
        <p>Don't use Kabsi, its review links or QR codes to:</p>
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
          <li>break, overload, copy or resell Kabsi.</li>
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
            Kabsi Essentials is ${PLAN_PRICES.essentialsMonthly} a month or $
            {PLAN_PRICES.essentialsYearly} a year, Kabsi Pro is ${PLAN_PRICES.proMonthly} a month or
            ${PLAN_PRICES.proYearly} a year, and an extra location is $
            {PLAN_PRICES.extraLocationMonthly} a month or ${PLAN_PRICES.extraLocationYearly} a year.
            Prices are in US dollars, plus tax where it applies, and the same in every country. You
            can start with a 14-day free trial of Pro, no card. Monthly plans can be cancelled at
            any time and run to the end of the month you paid for. Yearly plans are refundable
            within 14 days (section 10).
          </li>
          <li>
            You pay by card, in US dollars. That is the only way to pay Kabsi. Card payments are
            coming; until they open there is nothing to pay. A payment counts once our payment
            provider has confirmed it.
          </li>
          <li>Any fees your own bank charges are yours.</li>
          <li>
            We may change prices for future purchases. A plan you've already paid for keeps its
            price.
          </li>
          <li>One plan covers one Google Business Profile.</li>
        </ul>
      </section>

      <section>
        <h2>9. Trial and when your plan runs</h2>
        <ul>
          <li>
            The free trial lasts 14 days and needs no card. It starts when Kabsi's access to your
            Google profile works, so waiting for access costs you nothing. There is one trial per
            Google business. If you pay during your trial, your paid plan starts the day the trial
            ends.
          </li>
          <li>
            A paid plan starts when your payment is confirmed and Kabsi's access to your Google
            profile works. Time spent waiting for access doesn't count.
          </li>
          <li>
            Paying again before a plan ends adds the new period after the current one. Plans don't
            renew automatically.
          </li>
          <li>
            When a plan ends, reply drafts, posts, Google Protection and the Weekly Care Report
            stop. Your review link and QR code keep working.
          </li>
        </ul>
      </section>

      <section>
        <h2>10. Refunds</h2>
        <ul>
          <li>
            Yearly plans are refundable in full within 14 days of the plan starting. Email{" "}
            {CONTACT_EMAIL}; we refund by the method you paid with where possible.
          </li>
          <li>
            Monthly plans are not refunded for a month already paid; cancel and the plan runs to the
            end of that month.
          </li>
          <li>
            We refund the unused part of your plan if a paid feature stops for good because Google
            changed its APIs, if we stop the service without you breaking these terms, or if we
            change these terms in a way that matters and you don't agree.
          </li>
          <li>Nothing in these terms limits a refund you're entitled to by law.</li>
        </ul>
      </section>

      <section>
        <h2>11. Review links, QR codes and NFC cards</h2>
        <ul>
          <li>
            Your review link and QR code open your Google review page, the same for every customer.
            You can write the link on your own NFC card or tag; a Kabsi card you already have keeps
            working the same way. NFC doesn't work through metal.
          </li>
          <li>
            They keep working after a plan ends, for as long as Kabsi operates. You can switch any
            of them off in the app.
          </li>
          <li>
            If you delete your business from Kabsi, its links and QR codes stop working, and so does
            any NFC card that carries them.
          </li>
        </ul>
      </section>

      <section>
        <h2>12. Stopping, pausing and deleting</h2>
        <ul>
          <li>
            You can stop at any time: disconnect Kabsi from Google (section 4), and delete your
            business in Settings if you want your data gone. Deleting takes effect 7 days after you
            ask, and you can cancel before then.
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
        <h2>16. WhatsApp</h2>
        {WHATSAPP_ON ? (
          <ul>
            <li>
              The Kabsi WhatsApp number, {WHATSAPP_NUMBER}, is for questions, sales and support. A
              person answers it, and it is not an automatic bot. We never ask for your Google
              password or a code Google sends you.
            </li>
            <li>
              If you opt in with Connect WhatsApp, we send you review alerts there and you can
              approve low and medium risk replies and posts, with 10 seconds to undo. High-risk
              reviews and changes to your business name, address, categories, map pin, phone or
              opening status are approved only on kabsi.co, signed in. You can reply STOP at any
              time to stop every message at once.
            </li>
            <li>
              Kapso provides the messaging service and Meta runs WhatsApp, which carries the
              messages. WhatsApp&apos;s own terms apply to your use of WhatsApp. What we collect and
              how long we keep it is in section 14 of our <Link to="/privacy">privacy policy</Link>.
            </li>
            <li>We do not use the Kabsi WhatsApp number for marketing messages.</li>
            <li>The assistant on WhatsApp is not available yet.</li>
          </ul>
        ) : (
          <p>
            Kabsi has no WhatsApp number at the moment. Write to {CONTACT_EMAIL} and a person
            replies. Nothing is approved, published or changed over WhatsApp, and we never ask for
            your Google password or a code Google sends you.
          </p>
        )}
      </section>

      <section>
        <h2>17. Changes to these terms</h2>
        <p>
          If we change these terms in a way that matters, we email account holders at least 14 days
          before the change applies. If you don't agree, you can stop and ask for a refund of the
          unused part of your plan.
        </p>
      </section>

      <section>
        <h2>18. Law and contact</h2>
        <p>
          These terms are governed by the laws of the United Arab Emirates, and the courts of Dubai
          have jurisdiction, without taking away any protection the law of your country gives you.
          Questions or complaints: {CONTACT_EMAIL}
          {WHATSAPP_ON ? ` or WhatsApp ${WHATSAPP_NUMBER}` : ""}. A person replies, and we try to
          settle any problem with you directly first.
        </p>
      </section>
    </LegalPage>
  );
}
