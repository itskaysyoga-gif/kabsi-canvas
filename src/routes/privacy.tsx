import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/marketing/legal";
import { CONTACT_EMAIL, CONTACT_PHONE, OPERATOR_LINE, pageHead } from "@/lib/site";

// Privacy policy, written to match the system as built. Every retention period and processor here
// is implemented: see migrations 019 (deletion), 020 (retention) and docs/KABSI-PLAN.md Appendix A. No em dashes.
export const Route = createFileRoute("/privacy")({
  head: () =>
    pageHead({
      title: "Privacy policy | Kabsi",
      description:
        "What Kabsi collects, why, who processes it, how long it's kept, how Google data is used, and how to delete it.",
      path: "/privacy",
      crumbs: [{ name: "Privacy policy", path: "/privacy" }],
    }),
  component: Page,
});

const UPDATED = "4 October 2026";

function Page() {
  return (
    <LegalPage kind="privacy" title="Privacy" updated={UPDATED}>
      <section>
        <p>
          This policy explains what Kabsi collects, why, who helps us process it, how long we keep
          it and what you can ask us to do. It covers the website, the Kabsi app, emails from Kabsi,
          the free review link tool and Kabsi cards and review links.
        </p>
      </section>

      <section>
        <h2>Who is responsible</h2>
        <p>
          {OPERATOR_LINE}. The operator is also the data controller for the personal data described
          here.
        </p>
      </section>

      <section>
        <h2>1. Who we are</h2>
        <p>
          Kabsi is an independent business based in Beirut, Lebanon, and is responsible for the
          personal data described here. Contact: {CONTACT_EMAIL}, or {CONTACT_PHONE} (phone or
          WhatsApp).
        </p>
        <p>
          Kabsi is not affiliated with, endorsed by or sponsored by Google. Google and Google
          Business Profile are trademarks of Google LLC.
        </p>
      </section>

      <section>
        <h2>2. What we collect</h2>
        <p>
          <b>If you chat with Nora</b> (the AI assistant on our pages): your messages, the page you
          asked from, the country your connection comes from, your browser's time zone and language,
          the kind of device and the site that sent you (never your IP address), and any contact
          details you choose to give (name, email, business name, phone, city). We use them to
          answer, to send the Kabsi team a short report of each chat, to follow up and, only if you
          say yes, to send you occasional Kabsi news. Nora is an AI model run by Anthropic on our
          behalf; if she passes your question to a person, we reply from hello@kabsi.co.
        </p>
        <p>
          <b>If you use Kabsi for your business:</b>
        </p>
        <ul>
          <li>
            Your email address (to sign in with a code and to receive Kabsi emails), and any extra
            alert addresses you add.
          </li>
          <li>
            Your business name, address, country, time zone and Google identifiers (Place ID and
            Business Profile location).
          </li>
          <li>
            The facts you give Kabsi for drafting: sign-off, tone, phone number, hours note, what to
            mention, staff names and answers to customer questions.
          </li>
          <li>
            Your Google reviews (reviewer's public name, rating, text and dates), the replies we
            draft and the replies you post; posts, photos and special hours you prepare; your
            listing's name, phone, address, hours, website and category, to detect changes.
          </li>
          <li>
            Your plan and payments, including the method and any USDT transaction ID you send.
          </li>
          <li>
            The date and wording of the authorisation you gave Kabsi, and which partner introduced
            you, if any.
          </li>
          <li>A log of the emails we send you (address, subject, time and delivery status).</li>
        </ul>
        <p>
          <b>If you tap or scan a Kabsi card or open a Kabsi review link:</b> the card code, the
          time, the country the request came from, whether the phone was Android or iPhone, whether
          it came from the chip or the QR code, and whether it looked like an automated crawler. We
          don't know who you are and we never store your IP address. You're sent to Google's own
          review page, which Google's privacy policy covers.
        </p>
        <p>
          <b>If you use the free review link tool:</b> your search text is sent to Google's Places
          API to find the business. To stop abuse we keep a one-way, salted hash of your IP address
          for one hour, never the address itself. Nothing else is stored.
        </p>
        <p>
          <b>If you write to us through a form:</b> what you enter (for example name, email,
          Instagram handle, country and message).
        </p>
        <p>
          <b>If you're a partner:</b> your contact details, the businesses you invite (owner email
          and business name), your invoices and payment claims.
        </p>
        <p>
          <b>When you visit the website or app:</b> anonymous usage statistics and error reports
          (see section 7).
        </p>
      </section>

      <section>
        <h2>3. Why we use it</h2>
        <ul>
          <li>
            To provide Kabsi: draft replies and posts, send your emails, watch your listing, publish
            what you approve, and run your plan. We rely on our contract with you.
          </li>
          <li>
            To process reviews written by your customers so you can answer them. This is in your
            legitimate interest and theirs: the reviews are public and replies go on the same public
            page.
          </li>
          <li>
            To keep Kabsi secure, prevent abuse and fix errors. This is our legitimate interest.
          </li>
          <li>To keep payment records, because tax and accounting law requires it.</li>
          <li>To answer messages you send us.</li>
        </ul>
        <p>
          We don't sell or rent personal data, we don't use it for advertising, and we don't send
          marketing emails without asking you first.
        </p>
      </section>

      <section>
        <h2>4. Google data</h2>
        <ul>
          <li>
            You give Kabsi access by inviting the Kabsi business group (ID 5481006796) as a Manager
            on your Business Profile. Kabsi uses Google's official Business Profile APIs to read
            your reviews and profile information and to publish only what you approve. We also use
            the Places API for public details such as your category, area and public rating.
          </li>
          <li>
            We use Google data only to provide and improve the Kabsi features you use. We never
            sell, rent or share it with third parties except the service providers in section 6 that
            help us run Kabsi, and never use it for advertising or to train AI models.
          </li>
          <li>
            Kabsi's use of information received from Google APIs adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </li>
          <li>
            Kabsi's access to Google is held on our servers only. It never reaches your browser or
            anyone else's.
          </li>
          <li>
            To remove our access, on your Business Profile open <b>Menu</b> (or <b>More</b>), then{" "}
            <b>Business Profile settings</b>, then <b>People and access</b>, select{" "}
            <b>hello@kabsi.co</b> and choose <b>Remove person</b>. Kabsi stops reading and posting
            at once. If access stays removed for 30 days, we delete your reviews, drafts and listing
            history automatically.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. How drafts are written</h2>
        <ul>
          <li>
            Review text and your business facts are sent to Anthropic's API to draft replies and
            posts, and photos to check they suit Google. Anthropic does not use this data to train
            its models.
          </li>
          <li>
            For posts, Kabsi may also use your category and area, phrases from your reviews and,
            once connected, the search terms Google reports for your profile.
          </li>
          <li>
            A person, you, approves every reply, post, photo and listing change before it's
            published. Kabsi makes no automated decisions that have legal or similarly significant
            effects on anyone.
          </li>
          <li>We never put a reviewer's personal details into a reply.</li>
        </ul>
      </section>

      <section>
        <h2>6. Who helps us (processors)</h2>
        <ul>
          <li>Supabase: database, sign-in and file storage, in Frankfurt, Germany.</li>
          <li>Cloudflare: card and review links (go.kabsi.co).</li>
          <li>Vercel: hosting the website and app.</li>
          <li>Resend: sending email, through Amazon's EU (Ireland) region.</li>
          <li>Anthropic: drafting replies and posts, checking photos.</li>
          <li>Google: Business Profile and Places APIs.</li>
          <li>Sentry: error reports, EU region, without IP addresses or review content.</li>
          <li>PostHog: anonymous usage statistics, in the United States.</li>
        </ul>
        <p>
          Some of these providers are outside Lebanon and the European Union, for example in the
          United States. They process data only on our instructions and under their data protection
          terms, including standard contractual clauses where the law requires them.
        </p>
      </section>

      <section>
        <h2>7. Cookies and similar storage</h2>
        <ul>
          <li>
            Sign-in: your browser stores your session so you stay logged in. This is essential.
          </li>
          <li>
            Preferences: the app remembers which business you last opened, in your browser only.
          </li>
          <li>
            Statistics: PostHog stores an anonymous identifier to count visits and see which pages
            are used. Screen recordings are made only on public pages, never inside the app, and
            never contain review text, names or email addresses. IP addresses are anonymised.
          </li>
          <li>We use no advertising cookies and don't track you on other sites.</li>
        </ul>
      </section>

      <section>
        <h2>8. Partners</h2>
        <p>
          If a partner introduced you, they see your business name, country, whether your service is
          live, and how many times your card or link was used. They cannot see your reviews, drafts,
          replies, photos or reports, and they can't approve anything for you.
        </p>
      </section>

      <section>
        <h2>9. How long we keep it</h2>
        <ul>
          <li>
            Your business data: while you use Kabsi. If you ask us to delete a business (Settings,
            or by email), everything is deleted 7 days later.
          </li>
          <li>
            Review text and reviewer names from Google: at most 30 days after Google last sent them
            to us, as Google's rules require. The star rating, dates and your own replies stay.
            Public rating history, the quotes in weekly reports and the before and after values of
            listing changes are also removed after 30 days. Your business category and area, read
            from Google, are refreshed at least every 30 days.
          </li>
          <li>
            Assistant conversations: 12 months after the last message. Contact details you gave the
            assistant: until you ask us to remove them, and news emails stop the moment you
            unsubscribe.
          </li>
          <li>
            Google data after access is removed: deleted automatically after 30 days, unless access
            comes back.
          </li>
          <li>
            The email log: 12 months. Internal job logs: 90 days. Email action links: expire after 7
            days and are removed 30 days later.
          </li>
          <li>
            Payment records: as long as tax and accounting law requires, with the business link
            removed when the business is deleted.
          </li>
          <li>Card and link taps: kept without personal data, for counts.</li>
          <li>Free tool abuse limits: 1 hour.</li>
        </ul>
      </section>

      <section>
        <h2>10. Your rights</h2>
        <p>
          You can ask to see the personal data we hold about you, correct it, delete it, receive a
          copy in a common format, or object to how we use it. You can do most of this in the app.
          For anything else, email {CONTACT_EMAIL} from the address on your account and we reply
          within 30 days. If you think we got something wrong, you can also complain to the data
          protection authority where you live.
        </p>
        <p>
          If you left a review for a business that uses Kabsi and have a question about it, contact
          us and we'll help, together with that business.
        </p>
      </section>

      <section>
        <h2>11. Deleting your data</h2>
        <p>
          In Settings, choose <b>Delete this business</b> (you have 7 days to change your mind), or
          email {CONTACT_EMAIL} from your account email. We delete the business's reviews, drafts,
          posts, photos, reports and settings, and confirm by email. To stop Kabsi reaching your
          Google profile, also remove the Kabsi group as described in section 4. To delete your
          login as well, say so in your email.
        </p>
      </section>

      <section>
        <h2>12. Security</h2>
        <p>
          Data is encrypted in transit. Each business's data is separated at the database level so
          only its members, and Kabsi staff when helping you, can read it. Email action links are
          single-use and stored only as a hash. Access to Google and to our providers is held on our
          servers and limited to what Kabsi needs.
        </p>
      </section>

      <section>
        <h2>13. Children</h2>
        <p>Kabsi is for businesses and is not meant for anyone under 18.</p>
      </section>

      <section>
        <h2>14. Changes</h2>
        <p>
          If we change this policy in a way that matters, we email account holders before the change
          applies. The date at the top shows the latest version.
        </p>
      </section>
    </LegalPage>
  );
}
